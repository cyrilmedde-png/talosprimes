import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { eventService } from '../../services/event.service.js';
import { n8nService } from '../../services/n8n.service.js';
import { env } from '../../config/env.js';
import { authMiddleware, n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { generateInvoicePdf, generateDocumentPdf } from '../../services/pdf.service.js';
import { sendEmail, isEmailSendConfigured } from '../../services/email-agent.service.js';

async function logEvent(tenantId: string, typeEvenement: string, entiteType: string, entiteId: string, payload: Record<string, unknown>, statut: 'succes' | 'erreur' = 'succes', messageErreur?: string) {
  try {
    await prisma.eventLog.create({
      data: {
        tenantId,
        typeEvenement,
        entiteType,
        entiteId,
        payload: payload as Prisma.InputJsonValue,
        workflowN8nDeclenche: true,
        workflowN8nId: typeEvenement,
        statutExecution: statut,
        messageErreur: messageErreur || null,
      },
    });
    // Notification uniquement en cas d'erreur
    if (statut === 'erreur') {
      await prisma.notification.create({
        data: {
          tenantId,
          type: `${typeEvenement}_erreur`,
          titre: `Erreur: ${typeEvenement}`,
          message: messageErreur || `Erreur lors de ${typeEvenement}`,
          donnees: { entiteType, entiteId, typeEvenement } as Prisma.InputJsonValue,
        },
      });
    }
  } catch (e) {
    console.error('[logEvent] Erreur logging:', e);
  }
}

// Schema de validation pour créer une facture
const invoiceLineSchema = z.object({
  codeArticle: z.string().optional().nullable(),
  designation: z.string().min(1),
  quantite: z.number().int().positive().default(1),
  prixUnitaireHt: z.number().positive(),
});

const flexibleDate = z.string().refine(
  (val) => {
    if (!val) return true;
    return !isNaN(Date.parse(val));
  },
  { message: 'Date invalide' }
).optional().nullable();

const createInvoiceSchema = z.object({
  tenantId: z.string().uuid().optional(),
  clientFinalId: z.string().uuid().optional().nullable(),
  type: z.enum(['facture_entreprise', 'facture_client_final', 'facture_achat']).default('facture_client_final'),
  montantHt: z.number().positive(),
  tvaTaux: z.number().min(0).max(100).default(20),
  dateFacture: flexibleDate,
  dateEcheance: flexibleDate,
  numeroFacture: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  modePaiement: z.string().optional().nullable(),
  lines: z.array(invoiceLineSchema).optional(),
  lienPdf: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  bdcId: z.string().uuid().optional().nullable(),
  // Champs spécifiques facture d'achat (fournisseur)
  fournisseurNom: z.string().optional().nullable(),
  fournisseurSiret: z.string().optional().nullable(),
  fournisseurTvaIntra: z.string().optional().nullable(),
  fournisseurAdresse: z.string().optional().nullable(),
  categorieFrais: z.string().optional().nullable(),
  documentOriginalUrl: z.string().optional().nullable(),
  ocrData: z.any().optional().nullable(),
});

// Schema pour le scan OCR de document
const scanDocumentSchema = z.object({
  tenantId: z.string().uuid().optional(),
  documentBase64: z.string().min(1, 'Document requis (base64)'),
  fileName: z.string().optional().default('document.pdf'),
  mimeType: z.string().optional().default('application/pdf'),
});

// Schema de validation pour mettre à jour une facture
const updateInvoiceSchema = z.object({
  statut: z.enum(['brouillon', 'envoyee', 'payee', 'annulee', 'en_retard']).optional(),
  lienPdf: z.string().url().optional(),
  idExternePaiement: z.string().optional(),
});

// Schema de validation pour les paramètres de route
const paramsSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

// Schema de validation pour marquer comme payée
const markPaidSchema = z.object({
  referencePayment: z.string().optional(),
  datePaiement: z.string().datetime().optional(),
});

/** Clé création en cours → Promise résultat n8n. Évite 2 requêtes simultanées = 2 appels n8n. */
const createInvoicePending = new Map<string, Promise<{ success: boolean; data?: { invoice: unknown }; error?: string }>>();

/** Convertit une facture renvoyée par n8n (snake_case SQL) en forme attendue par le front (camelCase). */
function normalizeInvoiceFromN8n(row: Record<string, unknown>): Record<string, unknown> {
  const toStr = (v: unknown) => (v != null ? String(v) : undefined);
  const toNum = (v: unknown) => (v != null ? Number(v) : undefined);
  const toDate = (v: unknown) => (v != null ? new Date(v as string | Date).toISOString() : undefined);
  return {
    id: row.id,
    tenantId: row.tenant_id ?? row.tenantId,
    clientFinalId: row.client_final_id ?? row.clientFinalId,
    type: row.type,
    numeroFacture: toStr(row.numero_facture ?? row.numeroFacture),
    dateFacture: toDate(row.date_facture ?? row.dateFacture),
    dateEcheance: toDate(row.date_echeance ?? row.dateEcheance),
    montantHt: toNum(row.montant_ht ?? row.montantHt),
    montantTtc: toNum(row.montant_ttc ?? row.montantTtc),
    tvaTaux: toNum(row.tva_taux ?? row.tvaTaux),
    statut: row.statut,
    lienPdf: toStr(row.lien_pdf ?? row.lienPdf),
    fournisseurNom: toStr(row.fournisseur_nom ?? row.fournisseurNom),
    fournisseurSiret: toStr(row.fournisseur_siret ?? row.fournisseurSiret),
    fournisseurTvaIntra: toStr(row.fournisseur_tva_intra ?? row.fournisseurTvaIntra),
    fournisseurAdresse: toStr(row.fournisseur_adresse ?? row.fournisseurAdresse),
    categorieFrais: toStr(row.categorie_frais ?? row.categorieFrais),
    documentOriginalUrl: toStr(row.document_original_url ?? row.documentOriginalUrl),
    ocrData: row.ocr_data ?? row.ocrData ?? null,
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
    clientFinal: row.clientFinal ?? null,
  };
}

/**
 * Routes pour la gestion des factures
 */
export async function invoicesRoutes(fastify: FastifyInstance) {
  // GET /api/invoices - Liste les factures du tenant avec pagination et filtres
  fastify.get(
    '/',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const fromN8n = request.isN8nRequest === true;
        const queryParams = request.query as {
          page?: string;
          limit?: string;
          statut?: string;
          clientFinalId?: string;
          dateFrom?: string;
          dateTo?: string;
        };

        if (!tenantId && !fromN8n) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        // Si on délègue la lecture à n8n (full no-code views) — pas si c'est déjà n8n
        if (!fromN8n && tenantId && env.USE_N8N_VIEWS) {
          const res = await n8nService.callWorkflowReturn<{ invoices: unknown[]; count: number; totalPages: number }>(
            tenantId,
            'invoices_list',
            {
              page: queryParams.page ? parseInt(queryParams.page, 10) : 1,
              limit: queryParams.limit ? parseInt(queryParams.limit, 10) : 20,
              statut: queryParams.statut,
              clientFinalId: queryParams.clientFinalId,
              dateFrom: queryParams.dateFrom,
              dateTo: queryParams.dateTo,
            }
          );
          if (!res.success) {
            return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n lors de la liste des factures' });
          }
          const raw = res.data as { invoices?: unknown[]; count?: number; total?: number; page?: number; limit?: number; totalPages?: number };
          const invoices = Array.isArray(raw.invoices)
            ? raw.invoices.map((inv) => normalizeInvoiceFromN8n(inv as Record<string, unknown>))
            : [];
          return reply.status(200).send({
            success: true,
            data: {
              invoices,
              count: invoices.length,
              total: raw.total ?? invoices.length,
              page: raw.page ?? 1,
              limit: raw.limit ?? 20,
              totalPages: raw.totalPages ?? 1,
            },
          });
        }

        // Récupérer depuis la base de données (USE_N8N_VIEWS=false ou appel n8n)
        const page = queryParams.page ? parseInt(queryParams.page, 10) : 1;
        const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : 20;
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { deletedAt: null };
        if (tenantId) {
          where.tenantId = tenantId;
        }

        if (queryParams.statut) {
          (where as Record<string, unknown>).statut = queryParams.statut;
        }

        if (queryParams.clientFinalId) {
          where.clientFinalId = queryParams.clientFinalId;
        }

        if (queryParams.dateFrom || queryParams.dateTo) {
          (where as Record<string, unknown>).dateFacture = {};
          if (queryParams.dateFrom) {
            (where as Record<string, unknown>).dateFacture = { ...(where as Record<string, unknown>).dateFacture as Record<string, unknown>, gte: new Date(queryParams.dateFrom) };
          }
          if (queryParams.dateTo) {
            (where as Record<string, unknown>).dateFacture = { ...(where as Record<string, unknown>).dateFacture as Record<string, unknown>, lte: new Date(queryParams.dateTo) };
          }
        }

        const invoices = await prisma.invoice.findMany({
          where,
          skip,
          take: limit,
          include: {
            clientFinal: {
              select: {
                id: true,
                email: true,
                nom: true,
                prenom: true,
                raisonSociale: true,
              },
            },
            bonsCommande: {
              select: { id: true, numeroBdc: true, statut: true },
            },
            devis: {
              select: { id: true, numeroDevis: true, statut: true },
            },
            proformas: {
              select: { id: true, numeroProforma: true, statut: true },
            },
          },
          orderBy: {
            dateFacture: 'desc',
          },
        });

        const total = await prisma.invoice.count({ where });
        const totalPages = Math.ceil(total / limit);

        return reply.status(200).send({
          success: true,
          data: {
            invoices,
            count: invoices.length,
            total,
            page,
            limit,
            totalPages,
          },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur lors de la récupération des factures');
        return reply.status(500).send({
          success: false,
          error: 'Erreur lors de la récupération des factures',
        });
      }
    }
  );

  // GET /api/invoices/:id - Récupère une facture spécifique
  fastify.get(
    '/:id',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const fromN8n = request.isN8nRequest === true;
        const params = paramsSchema.parse(request.params);

        if (!tenantId && !fromN8n) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        // Si on délègue la lecture à n8n — pas si c'est déjà n8n
        if (!fromN8n && tenantId && env.USE_N8N_VIEWS) {
          const res = await n8nService.callWorkflowReturn<{ invoice: unknown }>(
            tenantId,
            'invoice_get',
            {
              invoiceId: params.id,
            }
          );
          if (!res.success) {
            return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
          }
          return reply.status(200).send({
            success: true,
            data: res.data,
          });
        }

        // Sinon, récupérer depuis la base de données
        const invoiceWhere: Record<string, unknown> = { id: params.id };
        if (tenantId) {
          invoiceWhere.tenantId = tenantId;
        }

        const invoice = await prisma.invoice.findFirst({
          where: invoiceWhere,
          include: {
            clientFinal: {
              select: {
                id: true,
                email: true,
                nom: true,
                prenom: true,
                raisonSociale: true,
                telephone: true,
                adresse: true,
              },
            },
            lines: { orderBy: { ordre: 'asc' } },
            bonsCommande: {
              select: { id: true, numeroBdc: true, statut: true },
            },
            devis: {
              select: { id: true, numeroDevis: true, statut: true },
            },
            proformas: {
              select: { id: true, numeroProforma: true, statut: true },
            },
          },
        });

        if (!invoice) {
          return reply.status(404).send({ success: false, error: 'Facture non trouvée' });
        }

        return reply.status(200).send({
          success: true,
          data: { invoice },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
          return reply.status(400).send({
            success: false,
            error: `Validation échouée : ${msgs}`,
            details: error.errors,
          });
        }
        fastify.log.error(error, 'Erreur lors de la récupération de la facture');
        return reply.status(500).send({
          success: false,
          error: 'Erreur lors de la récupération de la facture',
        });
      }
    }
  );

  // GET /api/invoices/:id/pdf - Génère et retourne le PDF de la facture
  fastify.get(
    '/:id/pdf',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const fromN8n = request.isN8nRequest === true;
        const params = paramsSchema.parse(request.params);

        if (!tenantId && !fromN8n) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        const invoiceWhere: Record<string, unknown> = { id: params.id };
        if (tenantId) invoiceWhere.tenantId = tenantId;

        const invoice = await prisma.invoice.findFirst({
          where: invoiceWhere,
          include: {
            tenant: {
              select: {
                nomEntreprise: true,
                siret: true,
                tvaIntracom: true,
                rib: true,
                logoBase64: true,
                adressePostale: true,
                codePostal: true,
                ville: true,
                telephone: true,
                emailContact: true,
              },
            },
            clientFinal: {
              select: {
                raisonSociale: true,
                nom: true,
                prenom: true,
                email: true,
                telephone: true,
                adresse: true,
              },
            },
            lines: {
              orderBy: { ordre: 'asc' },
              select: {
                codeArticle: true,
                designation: true,
                quantite: true,
                prixUnitaireHt: true,
                totalHt: true,
              },
            },
          },
        });

        if (!invoice) {
          return reply.status(404).send({ success: false, error: 'Facture non trouvée' });
        }

        // Utiliser le type facture_achat pour le PDF si applicable
        const isAchat = invoice.type === 'facture_achat';
        let pdfBytes: Uint8Array;

        if (isAchat) {
          const forPdf = {
            numero: invoice.numeroFacture,
            dateDocument: invoice.dateFacture,
            dateSecondaire: invoice.dateEcheance,
            montantHt: Number(invoice.montantHt),
            montantTtc: Number(invoice.montantTtc),
            tvaTaux: invoice.tvaTaux != null ? Number(invoice.tvaTaux) : null,
            description: invoice.description ?? undefined,
            modePaiement: invoice.modePaiement ?? undefined,
            statut: invoice.statut,
            lines: invoice.lines.map((l: { codeArticle: string | null; designation: string; quantite: number; prixUnitaireHt: number | { toNumber(): number }; totalHt: number | { toNumber(): number } }) => ({
              codeArticle: l.codeArticle,
              designation: l.designation,
              quantite: l.quantite,
              prixUnitaireHt: typeof l.prixUnitaireHt === 'object' && 'toNumber' in l.prixUnitaireHt ? l.prixUnitaireHt.toNumber() : Number(l.prixUnitaireHt),
              totalHt: typeof l.totalHt === 'object' && 'toNumber' in l.totalHt ? l.totalHt.toNumber() : Number(l.totalHt),
            })),
            clientFinal: undefined,
            tenant: invoice.tenant ?? undefined,
            fournisseur: {
              nom: typeof (invoice as Record<string, unknown>).fournisseurNom === 'string' ? (invoice as Record<string, unknown>).fournisseurNom as string : null,
              siret: typeof (invoice as Record<string, unknown>).fournisseurSiret === 'string' ? (invoice as Record<string, unknown>).fournisseurSiret as string : null,
              tvaIntra: typeof (invoice as Record<string, unknown>).fournisseurTvaIntra === 'string' ? (invoice as Record<string, unknown>).fournisseurTvaIntra as string : null,
              adresse: typeof (invoice as Record<string, unknown>).fournisseurAdresse === 'string' ? (invoice as Record<string, unknown>).fournisseurAdresse as string : null,
            },
          };
          pdfBytes = await generateDocumentPdf(forPdf, 'facture_achat');
        } else {
          const forPdf = {
            numeroFacture: invoice.numeroFacture,
            dateFacture: invoice.dateFacture,
            dateEcheance: invoice.dateEcheance,
            montantHt: Number(invoice.montantHt),
            montantTtc: Number(invoice.montantTtc),
            tvaTaux: invoice.tvaTaux != null ? Number(invoice.tvaTaux) : null,
            description: invoice.description ?? undefined,
            codeArticle: invoice.codeArticle ?? undefined,
            modePaiement: invoice.modePaiement ?? undefined,
            statut: invoice.statut,
            lines: invoice.lines.map((l: { codeArticle: string | null; designation: string; quantite: number; prixUnitaireHt: number | { toNumber(): number }; totalHt: number | { toNumber(): number } }) => ({
              codeArticle: l.codeArticle,
              designation: l.designation,
              quantite: l.quantite,
              prixUnitaireHt: typeof l.prixUnitaireHt === 'object' && 'toNumber' in l.prixUnitaireHt ? l.prixUnitaireHt.toNumber() : Number(l.prixUnitaireHt),
              totalHt: typeof l.totalHt === 'object' && 'toNumber' in l.totalHt ? l.totalHt.toNumber() : Number(l.totalHt),
            })),
            clientFinal: invoice.clientFinal ?? undefined,
            tenant: invoice.tenant ?? undefined,
          };
          pdfBytes = await generateInvoicePdf(forPdf);
        }
        const filename = `facture-${invoice.numeroFacture.replace(/\s+/g, '-')}.pdf`;

        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `inline; filename="${filename}"`)
          .send(Buffer.from(pdfBytes));
      } catch (error) {
        if (error instanceof z.ZodError) {
          const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
          return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
        }
        console.error('=== ERREUR GENERATION PDF ===', error);
        fastify.log.error(error, 'Erreur génération PDF facture');
        return reply.status(500).send({ success: false, error: 'Erreur lors de la génération du PDF' });
      }
    }
  );

  // POST /api/invoices/scan-document - Scanner un document fournisseur via OCR (AI Vision)
  fastify.post(
    '/scan-document',
    {
      preHandler: [authMiddleware],
      bodyLimit: 10 * 1024 * 1024, // 10 MB pour les documents base64
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        if (!tenantId) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        // Vérifier droits
        if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return reply.status(403).send({ success: false, error: 'Accès refusé' });
        }

        const body = scanDocumentSchema.parse(request.body);

        // Appel direct à OpenAI Vision (bypass n8n pour éviter les limites d'expression sur le base64)
        fastify.log.info('Lancement OCR scan document pour tenant %s (fichier: %s, type: %s, taille base64: %d)', tenantId, body.fileName, body.mimeType, body.documentBase64.length);

        if (!env.OPENAI_API_KEY) {
          return reply.status(500).send({
            success: false,
            error: 'OPENAI_API_KEY non configurée sur le serveur',
          });
        }

        // Déterminer le media type pour la data URI
        const mimeType = body.mimeType || 'image/png';
        let imageMediaType = 'image/png';
        if (mimeType === 'application/pdf') {
          imageMediaType = 'application/pdf';
        } else if (mimeType.startsWith('image/')) {
          imageMediaType = mimeType;
        }

        const systemPrompt = `Tu es un expert en extraction de données de factures fournisseur. Tu reçois une image ou un PDF de facture d'achat. Tu dois extraire les informations structurées suivantes et les retourner UNIQUEMENT en JSON valide, sans aucun texte avant ou après.

IMPORTANT : Extrais les VRAIS montants visibles sur la facture. Ne mets JAMAIS 0 pour les montants - cherche bien les prix unitaires, totaux, montants HT et TTC sur le document.

Format JSON attendu :
{
  "fournisseurNom": "Nom de l'entreprise fournisseur",
  "fournisseurSiret": "Numéro SIRET du fournisseur (14 chiffres)",
  "fournisseurTvaIntra": "Numéro TVA intracommunautaire (FR + 11 chiffres)",
  "fournisseurAdresse": "Adresse complète du fournisseur",
  "dateFacture": "YYYY-MM-DD",
  "numeroFacture": "Numéro/référence de la facture",
  "montantHt": 123.45,
  "montantTtc": 148.14,
  "tvaTaux": 20.0,
  "description": "Description générale ou objet de la facture",
  "categorieFrais": "carburant|fournitures_bureau|telecom|assurance|loyer|entretien|transport|restauration|sous_traitance|autre",
  "lignes": [
    {
      "designation": "Libellé exact de la ligne tel qu'il apparaît sur la facture",
      "quantite": 1,
      "prixUnitaireHt": 123.45,
      "totalHt": 123.45
    }
  ]
}

Règles :
- Les montants doivent être des NOMBRES avec les vraies valeurs lues sur la facture (JAMAIS 0 sauf si c'est réellement 0)
- Si tu ne trouves pas le prix unitaire d'une ligne mais que tu as le total HT de la ligne, mets le totalHt et calcule prixUnitaireHt = totalHt / quantite
- Le taux TVA doit être un pourcentage (ex: 20 pour 20%)
- La catégorie de frais doit correspondre à l'un des choix proposés
- Si la facture contient plusieurs lignes d'articles, les extraire TOUTES avec leurs montants
- Le format de date doit être YYYY-MM-DD
- Si une information n'est pas trouvée, utilise null (sauf pour les montants : cherche bien)
- Retourne UNIQUEMENT le JSON, rien d'autre`;

        try {
          // Construire le contenu utilisateur selon le type de fichier
          // - Images (PNG, JPEG, GIF, WebP) → type: "image_url" avec data URI
          // - PDFs → type: "file" avec file_data (format OpenAI files API)
          const userContent: Array<Record<string, unknown>> = [
            { type: 'text', text: 'Extrais toutes les informations de cette facture fournisseur :' },
          ];

          if (imageMediaType === 'application/pdf') {
            // Format PDF : utiliser le type "file" d'OpenAI
            userContent.push({
              type: 'file',
              file: {
                filename: body.fileName || 'document.pdf',
                file_data: `data:application/pdf;base64,${body.documentBase64}`,
              },
            });
          } else {
            // Format image : utiliser image_url avec data URI
            userContent.push({
              type: 'image_url',
              image_url: {
                url: `data:${imageMediaType};base64,${body.documentBase64}`,
              },
            });
          }

          const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              max_tokens: 2000,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
              ],
            }),
          });

          if (!openaiResponse.ok) {
            const errBody = await openaiResponse.text();
            fastify.log.error('OpenAI Vision erreur HTTP %d pour tenant %s: %s', openaiResponse.status, tenantId, errBody.slice(0, 500));
            // Extraire le message d'erreur OpenAI pour l'afficher
            let openaiErrMsg = `Erreur OpenAI (HTTP ${openaiResponse.status})`;
            try {
              const errJson = JSON.parse(errBody) as { error?: { message?: string } };
              if (errJson.error?.message) {
                openaiErrMsg = errJson.error.message;
              }
            } catch { /* garder le message générique */ }
            return reply.status(502).send({
              success: false,
              error: openaiErrMsg,
            });
          }

          const openaiData = await openaiResponse.json() as {
            choices?: Array<{ message?: { content?: string } }>;
          };

          const content = openaiData.choices?.[0]?.message?.content || '';
          if (!content) {
            fastify.log.warn('OpenAI Vision réponse vide pour tenant %s', tenantId);
            return reply.status(502).send({
              success: false,
              error: 'OpenAI Vision n\'a pas retourné de contenu. Réessayez avec une image plus nette.',
            });
          }

          // Nettoyer le contenu (enlever les backticks markdown si présents)
          const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

          let extractedData: Record<string, unknown>;
          try {
            extractedData = JSON.parse(cleanContent);
          } catch {
            fastify.log.warn('OCR parse JSON échoué pour tenant %s, contenu: %s', tenantId, cleanContent.slice(0, 300));
            return reply.status(502).send({
              success: false,
              error: 'Impossible de parser la réponse OCR. Le document n\'est peut-être pas une facture lisible.',
            });
          }

          // Nettoyer les montants (string → number)
          for (const key of ['montantHt', 'montantTtc', 'tvaTaux']) {
            if (extractedData[key] && typeof extractedData[key] === 'string') {
              extractedData[key] = parseFloat((extractedData[key] as string).replace(/[^0-9.,]/g, '').replace(',', '.'));
            }
          }

          // Nettoyer les lignes
          if (Array.isArray(extractedData.lignes)) {
            extractedData.lignes = (extractedData.lignes as Array<Record<string, unknown>>).map((l) => ({
              designation: String(l.designation || ''),
              quantite: parseInt(String(l.quantite)) || 1,
              prixUnitaireHt: parseFloat(String(l.prixUnitaireHt)) || 0,
              totalHt: parseFloat(String(l.totalHt)) || 0,
            }));
          }

          // Log la réponse OCR parsée pour debug
          fastify.log.info('OCR parsed data: montantHt=%s, montantTtc=%s, lignes=%d, lignesSample=%s',
            extractedData.montantHt,
            extractedData.montantTtc,
            Array.isArray(extractedData.lignes) ? (extractedData.lignes as unknown[]).length : 0,
            JSON.stringify((extractedData.lignes as unknown[] || []).slice(0, 2)).slice(0, 300),
          );

          fastify.log.info('OCR scan réussi pour tenant %s, clés extraites: %s', tenantId, Object.keys(extractedData).join(', '));

          return reply.status(200).send({
            success: true,
            message: 'Document scanné avec succès',
            data: extractedData,
          });

        } catch (fetchError) {
          const errMsg = fetchError instanceof Error ? fetchError.message : 'Erreur inconnue';
          fastify.log.error('OCR fetch erreur pour tenant %s: %s', tenantId, errMsg);
          return reply.status(502).send({
            success: false,
            error: `Erreur de connexion à OpenAI: ${errMsg}`,
          });
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
          return reply.status(400).send({
            success: false,
            error: `Validation échouée : ${msgs}`,
            details: error.errors,
          });
        }
        fastify.log.error(error, 'Erreur lors du scan OCR du document');
        return reply.status(500).send({
          success: false,
          error: 'Erreur lors du scan OCR du document',
        });
      }
    }
  );

  // POST /api/invoices - Crée une nouvelle facture
  fastify.post(
    '/',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const fromN8n = request.isN8nRequest === true;

        // Valider les données (tenantId peut être dans le body si appel depuis n8n)
        const body = createInvoiceSchema.parse(request.body);

        // Récupérer le tenantId : depuis le body si appel n8n, sinon depuis request (JWT)
        const tenantId = fromN8n
          ? (body as { tenantId?: string }).tenantId || request.tenantId
          : request.tenantId;

        if (!tenantId) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        // Vérifier droits si pas n8n
        if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return reply.status(403).send({ success: false, error: 'Accès refusé' });
        }

        // Vérifier que le client existe (sauf facture d'achat : pas de client)
        if (body.clientFinalId) {
          const client = await prisma.clientFinal.findFirst({
            where: {
              id: body.clientFinalId,
              tenantId,
            },
          });
          if (!client) {
            return reply.status(404).send({ success: false, error: 'Client non trouvé' });
          }
        } else if (body.type !== 'facture_achat') {
          return reply.status(400).send({ success: false, error: 'clientFinalId requis pour ce type de facture' });
        }

        // Nettoyer le body : retirer tenantId s'il était dans le body
        const bodyWithoutTenantId = { ...body };
        if ('tenantId' in bodyWithoutTenantId) {
          delete (bodyWithoutTenantId as { tenantId?: string }).tenantId;
        }

        // Application no-code : la création de facture passe uniquement par n8n.
        // Depuis le frontend : on appelle le workflow ; depuis n8n (callback) : on persiste en base.
        if (!fromN8n) {
          if (!env.USE_N8N_COMMANDS) {
            return reply.status(503).send({
              success: false,
              error: 'Création de facture uniquement via n8n. Activez USE_N8N_COMMANDS et le workflow invoice-created.',
            });
          }
          // Idempotence : header X-Idempotency-Key ou check par montant/client (60s au lieu de 30s)
          const idempotencyKey = request.headers['x-idempotency-key'] as string | undefined;
          const recentCutoff = new Date(Date.now() - 60 * 1000);
          const existing = await prisma.invoice.findFirst({
            where: {
              tenantId,
              deletedAt: null,
              ...(idempotencyKey
                ? { idExternePaiement: idempotencyKey }
                : {
                    clientFinalId: body.clientFinalId,
                    montantHt: body.montantHt,
                    createdAt: { gte: recentCutoff },
                  }),
            },
            orderBy: { createdAt: 'desc' },
          });
          if (existing) {
            return reply.status(201).send({
              success: true,
              message: 'Facture déjà créée (doublon ignoré)',
              data: { invoice: existing, invoiceId: existing.id },
            });
          }
          // Déduplication : 2 requêtes identiques en même temps = 1 seul appel n8n, la 2e attend le résultat de la 1re
          const dedupeKey = `${tenantId}:${body.clientFinalId}:${body.montantHt}`;
          let pending = createInvoicePending.get(dedupeKey);
          if (!pending) {
            pending = n8nService.callWorkflowReturn<{ invoice: unknown }>(
              tenantId,
              'invoice_create',
              { ...bodyWithoutTenantId, tenantId },
            );
            createInvoicePending.set(dedupeKey, pending);
            pending.finally(() => createInvoicePending.delete(dedupeKey));
          }
          const res = await pending;
          if (!res.success) {
            return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
          }

          // Après création via n8n, insérer les lignes d'articles en base
          if (body.lines && body.lines.length > 0) {
            try {
              // Extraire l'ID depuis la réponse n8n (structure variable)
              let invoiceId: string | undefined;
              if (res.data) {
                const d = res.data as Record<string, unknown>;
                // Tenter plusieurs structures possibles de la réponse n8n
                const inv = d.invoice as Record<string, unknown> | undefined;
                invoiceId = (inv?.id ?? d.id ?? d.invoiceId) as string | undefined;
              }

              // Si l'ID n'est pas dans la réponse, chercher en base la facture qui vient d'être créée
              if (!invoiceId) {
                const justCreated = await prisma.invoice.findFirst({
                  where: {
                    tenantId,
                    clientFinalId: body.clientFinalId,
                    montantHt: body.montantHt,
                  },
                  orderBy: { createdAt: 'desc' },
                  select: { id: true },
                });
                invoiceId = justCreated?.id;
              }

              if (invoiceId) {
                // Supprimer les lignes existantes (évite doublons si n8n en a déjà créé)
                await prisma.invoiceLine.deleteMany({ where: { invoiceId: invoiceId as string } });
                await prisma.invoiceLine.createMany({
                  data: body.lines.map((l, i) => ({
                    invoiceId: invoiceId as string,
                    codeArticle: l.codeArticle ?? null,
                    designation: l.designation,
                    quantite: l.quantite ?? 1,
                    prixUnitaireHt: l.prixUnitaireHt,
                    totalHt: (l.quantite ?? 1) * l.prixUnitaireHt,
                    ordre: i,
                  })),
                });
                fastify.log.info('Lignes de facture créées pour invoice %s (%d lignes)', invoiceId, body.lines.length);
              } else {
                fastify.log.warn('Impossible de trouver l\'ID de la facture créée par n8n pour insérer les lignes');
              }
            } catch (lineErr) {
              fastify.log.warn(lineErr, 'Impossible de créer les lignes de facture après n8n');
            }
          }

          // Si un bdcId est fourni, passer le BdC en 'facture' automatiquement
          if (body.bdcId) {
            try {
              await prisma.bonCommande.update({
                where: { id: body.bdcId, tenantId },
                data: { statut: 'facture' },
              });
              fastify.log.info('BdC %s passé en facture après création facture via n8n', body.bdcId);
            } catch (bdcErr) {
              fastify.log.warn(bdcErr, 'Impossible de passer le BdC %s en facture', body.bdcId);
            }
          }

          // Auto-init compta + comptabilisation auto (branche frontend → n8n)
          try {
            const nbComptes = await prisma.planComptable.count({ where: { tenantId } });
            if (nbComptes === 0) {
              fastify.log.info('Plan comptable vide pour tenant %s, lancement auto-init compta...', tenantId);
              const initRes = await n8nService.callWorkflowReturn(tenantId, 'compta_init', { tenantId });
              if (initRes.success) {
                fastify.log.info('Auto-init compta réussie pour tenant %s', tenantId);
              } else {
                fastify.log.warn('Auto-init compta échouée pour tenant %s: %s', tenantId, initRes.error);
              }
            }
          } catch (initErr) {
            fastify.log.warn(initErr, 'Impossible de vérifier/initialiser la comptabilité');
          }

          // Comptabilisation automatique (async, non-bloquant)
          try {
            const resData = res.data as Record<string, unknown> | undefined;
            const invoiceId = resData?.invoiceId ?? resData?.invoice_id ?? (resData?.invoice as Record<string, unknown>)?.id ?? resData?.id;
            if (invoiceId) {
              n8nService.triggerWorkflow(tenantId, 'compta_auto_facture', {
                invoiceId: String(invoiceId),
                tenantId,
              }).catch((err) => {
                fastify.log.warn(err, 'Échec comptabilisation auto pour facture %s', invoiceId);
              });
            }
          } catch (_) { /* non-bloquant */ }

          return reply.status(201).send({
            success: true,
            message: 'Facture créée via n8n',
            data: res.data,
          });
        }

        // Appel depuis n8n (callback du workflow) : persister en base, sans émettre d'événement (évite boucle)
        // Idempotence : si une facture identique a déjà été créée récemment (race doublon n8n), la renvoyer au lieu d'en créer une nouvelle
        const recentCutoffN8n = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes, aligné avec le check n8n 02b
        const existingFromN8n = await prisma.invoice.findFirst({
          where: {
            tenantId,
            clientFinalId: body.clientFinalId,
            montantHt: body.montantHt,
            createdAt: { gte: recentCutoffN8n },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            clientFinal: {
              select: {
                id: true,
                email: true,
                nom: true,
                prenom: true,
                raisonSociale: true,
              },
            },
          },
        });
        if (existingFromN8n) {
          return reply.status(201).send({
            success: true,
            message: 'Facture déjà créée (doublon ignoré)',
            data: { invoice: existingFromN8n },
          });
        }

        const tvaTaux = body.tvaTaux ?? 20;
        const montantTtc = Number((body.montantHt * (1 + tvaTaux / 100)).toFixed(2));
        const dateFacture = body.dateFacture ? new Date(body.dateFacture) : new Date();
        const dateEcheance = body.dateEcheance
          ? new Date(body.dateEcheance)
          : new Date(dateFacture.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Transaction atomique : numérotation + création = pas de doublons
        const invoice = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          let numeroFacture = bodyWithoutTenantId.numeroFacture;
          if (!numeroFacture) {
            const year = new Date().getFullYear();
            const prefix = body.type === 'facture_achat' ? `FAC-ACH-${year}-` : `INV-${year}-`;
            const result = await tx.$queryRaw<[{ next_num: bigint }]>`
              SELECT COALESCE(
                MAX(CAST(SUBSTRING(numero_facture FROM ${prefix.length + 1}) AS INTEGER)),
                0
              ) + 1 AS next_num
              FROM invoices
              WHERE tenant_id = ${tenantId}::uuid
                AND numero_facture LIKE ${prefix + '%'}
              FOR UPDATE
            `;
            const nextNum = Number(result[0]?.next_num ?? 1);
            numeroFacture = `${prefix}${String(nextNum).padStart(6, '0')}`;
          }

          return tx.invoice.create({
            data: {
              tenantId,
              type: body.type,
              clientFinalId: body.clientFinalId,
              montantHt: body.montantHt,
              montantTtc: montantTtc,
              tvaTaux: tvaTaux,
              dateFacture,
              dateEcheance,
              numeroFacture,
              description: body.description,
              modePaiement: body.modePaiement,
              lienPdf: body.lienPdf,
              statut: 'brouillon',
              // Champs fournisseur (facture d'achat)
              fournisseurNom: body.fournisseurNom ?? null,
              fournisseurSiret: body.fournisseurSiret ?? null,
              fournisseurTvaIntra: body.fournisseurTvaIntra ?? null,
              fournisseurAdresse: body.fournisseurAdresse ?? null,
              categorieFrais: body.categorieFrais ?? null,
              documentOriginalUrl: body.documentOriginalUrl ?? null,
              ocrData: body.ocrData ?? null,
              ...(body.lines && body.lines.length > 0 ? {
                lines: {
                  create: body.lines.map((l, i) => ({
                    codeArticle: l.codeArticle ?? null,
                    designation: l.designation,
                    quantite: l.quantite ?? 1,
                    prixUnitaireHt: l.prixUnitaireHt,
                    totalHt: (l.quantite ?? 1) * l.prixUnitaireHt,
                    ordre: i,
                  })),
                },
              } : {}),
            },
            include: {
              clientFinal: {
                select: {
                  id: true,
                  email: true,
                  nom: true,
                  prenom: true,
                  raisonSociale: true,
                },
              },
              lines: true,
            },
          });
        });

        // Génération automatique du lien PDF (async, non-bloquant)
        if (!invoice.lienPdf) {
          n8nService.triggerWorkflow(tenantId, 'invoice_generate_pdf', {
            invoiceId: invoice.id,
            tenantId,
            baseUrl: `${request.protocol}://${request.hostname}`,
          }).catch((err) => {
            fastify.log.warn(err, 'Échec génération PDF auto pour facture %s', invoice.id);
          });
        }

        // Log the event
        await logEvent(tenantId, 'invoice_create', 'Invoice', invoice.id, { numeroFacture: invoice.numeroFacture, montantTtc: Number(invoice.montantTtc) }, 'succes');

        // Si un bdcId est fourni, passer le BdC en 'facture' automatiquement
        if (body.bdcId) {
          try {
            await prisma.bonCommande.update({
              where: { id: body.bdcId, tenantId },
              data: { statut: 'facture' },
            });
            fastify.log.info('BdC %s passé en facture après création facture %s', body.bdcId, invoice.numeroFacture);
          } catch (bdcErr) {
            fastify.log.warn(bdcErr, 'Impossible de passer le BdC %s en facture', body.bdcId);
          }
        }

        // Auto-init compta si plan comptable vide (branche n8n callback)
        try {
          const nbComptes = await prisma.planComptable.count({ where: { tenantId } });
          if (nbComptes === 0) {
            fastify.log.info('Plan comptable vide pour tenant %s, lancement auto-init compta...', tenantId);
            const initRes = await n8nService.callWorkflowReturn(tenantId, 'compta_init', { tenantId });
            if (initRes.success) {
              fastify.log.info('Auto-init compta réussie pour tenant %s', tenantId);
            } else {
              fastify.log.warn('Auto-init compta échouée pour tenant %s: %s', tenantId, initRes.error);
            }
          }
        } catch (initErr) {
          fastify.log.warn(initErr, 'Impossible de vérifier/initialiser la comptabilité');
        }

        // Comptabilisation automatique (async, non-bloquant)
        n8nService.triggerWorkflow(tenantId, 'compta_auto_facture', {
          invoiceId: invoice.id,
          tenantId,
        }).catch((err) => {
          fastify.log.warn(err, 'Échec comptabilisation auto pour facture %s', invoice.id);
        });

        return reply.status(201).send({
          success: true,
          message: 'Facture créée',
          data: { invoice },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        
        try {
          const _tid = request.tenantId;
          if (request.isN8nRequest && _tid) {
            await logEvent(_tid, 'invoice_create', 'Invoice', 'unknown', { error: errorMessage }, 'erreur', errorMessage);
          }
        } catch (_) {}
        if (error instanceof z.ZodError) {
          const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
          return reply.status(400).send({
            success: false,
            error: `Validation échouée : ${msgs}`,
            details: error.errors,
          });
        }
        fastify.log.error(error, 'Erreur lors de la création de la facture');
        return reply.status(500).send({
          success: false,
          error: 'Erreur lors de la création de la facture',
        });
      }
    }
  );

  // PUT /api/invoices/:id - Met à jour une facture
  fastify.put(
    '/:id',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const fromN8n = request.isN8nRequest === true;
        const params = paramsSchema.parse(request.params);
        const body = updateInvoiceSchema.parse(request.body);

        const tenantId = request.tenantId as string;

        if (!tenantId) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        // Vérifier droits si pas n8n
        if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return reply.status(403).send({ success: false, error: 'Accès refusé' });
        }

        // Vérifier que la facture existe et appartient au tenant
        const invoice = await prisma.invoice.findFirst({
          where: {
            id: params.id,
            tenantId,
          },
        });

        if (!invoice) {
          return reply.status(404).send({ success: false, error: 'Facture non trouvée' });
        }

        // Application no-code : la mise à jour de facture passe uniquement par n8n.
        if (!fromN8n) {
          if (!env.USE_N8N_COMMANDS) {
            return reply.status(503).send({
              success: false,
              error: 'Mise à jour de facture uniquement via n8n. Activez USE_N8N_COMMANDS et le workflow invoice-update.',
            });
          }
          const res = await n8nService.callWorkflowReturn<{ invoice: unknown }>(
            tenantId,
            'invoice_update',
            {
              invoiceId: params.id,
              ...body,
            }
          );
          if (!res.success) {
            return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
          }
          return reply.status(200).send({
            success: true,
            message: 'Facture mise à jour via n8n',
            data: res.data,
          });
        }

        // Appel depuis n8n (callback du workflow) : persister en base
        const updated = await prisma.invoice.update({
          where: { id: params.id },
          data: {
            statut: body.statut,
            lienPdf: body.lienPdf,
            idExternePaiement: body.idExternePaiement,
          },
          include: {
            clientFinal: {
              select: {
                id: true,
                email: true,
                nom: true,
                prenom: true,
                raisonSociale: true,
              },
            },
          },
        });

        // Log the event
        await logEvent(tenantId, 'invoice_update', 'Invoice', updated.id, { numeroFacture: invoice.numeroFacture, statut: body.statut }, 'succes');

        return reply.status(200).send({
          success: true,
          message: 'Facture mise à jour',
          data: { invoice: updated },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        try {
          const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
            await logEvent(_tid, 'invoice_update', 'Invoice', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
          }
        } catch (_) {}
        if (error instanceof z.ZodError) {
          const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
          return reply.status(400).send({
            success: false,
            error: `Validation échouée : ${msgs}`,
            details: error.errors,
          });
        }
        fastify.log.error(error, 'Erreur lors de la mise à jour de la facture');
        return reply.status(500).send({
          success: false,
          error: 'Erreur lors de la mise à jour de la facture',
        });
      }
    }
  );

  // POST /api/invoices/:id/send - Envoyer une facture (changer le statut à envoyee)
  fastify.post(
    '/:id/send',
    {
      preHandler: [authMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const params = paramsSchema.parse(request.params);
        const tenantId = request.tenantId as string;

        if (!tenantId) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        // Vérifier droits
        if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return reply.status(403).send({ success: false, error: 'Accès refusé' });
        }

        // Vérifier que la facture existe et appartient au tenant
        const invoice = await prisma.invoice.findFirst({
          where: {
            id: params.id,
            tenantId,
          },
        });

        if (!invoice) {
          return reply.status(404).send({ success: false, error: 'Facture non trouvée' });
        }

        if (invoice.statut === 'envoyee') {
          return reply.status(400).send({ success: false, error: 'La facture est déjà envoyée' });
        }

        // Mettre à jour le statut
        const updated = await prisma.invoice.update({
          where: { id: params.id },
          data: { statut: 'envoyee' },
          include: {
            clientFinal: {
              select: {
                id: true,
                email: true,
                nom: true,
                prenom: true,
                raisonSociale: true,
              },
            },
          },
        });

        // Émettre événement
        await eventService.emit(tenantId, 'invoice_sent', 'Invoice', updated.id, {
          invoiceId: updated.id,
          clientId: updated.clientFinalId,
          tenantId,
          numeroFacture: updated.numeroFacture,
          emailClient: updated.clientFinal?.email,
        });

        // Envoyer l'email au client de manière asynchrone (non-bloquant)
        const clientEmail = updated.clientFinal?.email;
        if (clientEmail && isEmailSendConfigured()) {
          setImmediate(async () => {
            try {
              // Récupérer les infos du tenant pour le nom de l'entreprise
              const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { nomEntreprise: true },
              });
              const entreprise = tenant?.nomEntreprise || 'Notre entreprise';
              const clientName = updated.clientFinal?.raisonSociale
                || `${updated.clientFinal?.prenom || ''} ${updated.clientFinal?.nom || ''}`.trim()
                || 'Client';
              const numero = updated.numeroFacture || updated.id;
              const montantTTC = updated.montantTtc
                ? `${Number(updated.montantTtc).toFixed(2)} €`
                : '';

              const result = await sendEmail({
                to: clientEmail,
                subject: `Facture ${numero} - ${entreprise}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
                      Facture ${numero}
                    </h2>
                    <p>Bonjour ${clientName},</p>
                    <p>Veuillez trouver ci-dessous les détails de votre facture :</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                      <tr style="background-color: #f8f9fa;">
                        <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Numéro de facture</td>
                        <td style="padding: 10px; border: 1px solid #dee2e6;">${numero}</td>
                      </tr>
                      ${montantTTC ? `
                      <tr>
                        <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Montant TTC</td>
                        <td style="padding: 10px; border: 1px solid #dee2e6;">${montantTTC}</td>
                      </tr>
                      ` : ''}
                      <tr style="background-color: #f8f9fa;">
                        <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Date d'émission</td>
                        <td style="padding: 10px; border: 1px solid #dee2e6;">${new Date().toLocaleDateString('fr-FR')}</td>
                      </tr>
                    </table>
                    <p>Si vous avez des questions concernant cette facture, n'hésitez pas à nous contacter.</p>
                    <p style="margin-top: 30px; color: #666;">
                      Cordialement,<br/>
                      <strong>${entreprise}</strong>
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
                    <p style="font-size: 12px; color: #999;">
                      Cet email a été envoyé automatiquement. Merci de ne pas y répondre directement.
                    </p>
                  </div>
                `,
                text: `Bonjour ${clientName},\n\nVeuillez trouver ci-joint votre facture ${numero}${montantTTC ? ` d'un montant de ${montantTTC}` : ''}.\n\nCordialement,\n${entreprise}`,
              });

              if (result.error) {
                fastify.log.error(`Erreur envoi email facture ${numero} à ${clientEmail}: ${result.error}`);
              } else {
                fastify.log.info(`Email facture ${numero} envoyé à ${clientEmail}`);
              }
            } catch (emailError) {
              fastify.log.error(emailError, `Erreur envoi email facture ${updated.id}`);
            }
          });
        }

        return reply.status(200).send({
          success: true,
          message: clientEmail && isEmailSendConfigured()
            ? 'Facture envoyée et email transmis au client'
            : clientEmail
              ? 'Facture envoyée (email non configuré - SMTP manquant)'
              : 'Facture envoyée (pas d\'email client renseigné)',
          data: { invoice: updated },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
          return reply.status(400).send({
            success: false,
            error: `Validation échouée : ${msgs}`,
            details: error.errors,
          });
        }
        fastify.log.error(error, 'Erreur lors de l\'envoi de la facture');
        return reply.status(500).send({
          success: false,
          error: 'Erreur lors de l\'envoi de la facture',
        });
      }
    }
  );

  // POST /api/invoices/:id/mark-paid - Marquer une facture comme payée
  fastify.post(
    '/:id/mark-paid',
    {
      preHandler: [authMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const params = paramsSchema.parse(request.params);
        const body = markPaidSchema.parse(request.body);
        const tenantId = request.tenantId as string;

        if (!tenantId) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        // Vérifier droits
        if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return reply.status(403).send({ success: false, error: 'Accès refusé' });
        }

        // Passage obligatoire par n8n (marque payée + crée écriture comptable)
        if (!env.USE_N8N_COMMANDS) {
          return reply.status(503).send({
            success: false,
            error: 'Marquage de facture uniquement via n8n. Activez USE_N8N_COMMANDS et le workflow invoice-paid.',
          });
        }

        const res = await n8nService.callWorkflowReturn<{ success: boolean; invoice: unknown; comptabilisation: unknown }>(
          tenantId,
          'invoice_paid',
          {
            tenantId,
            invoiceId: params.id,
            referencePayment: body.referencePayment || null,
            datePaiement: body.datePaiement || new Date().toISOString().split('T')[0],
          },
        );

        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }

        // Émettre événement
        await eventService.emit(tenantId, 'invoice_paid', 'Invoice', params.id, {
          invoiceId: params.id,
          tenantId,
          referencePayment: body.referencePayment,
          datePaiement: body.datePaiement,
        });

        return reply.status(200).send({
          success: true,
          message: 'Facture marquée comme payée et comptabilisée',
          data: res.data || res,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
          return reply.status(400).send({
            success: false,
            error: `Validation échouée : ${msgs}`,
            details: error.errors,
          });
        }
        fastify.log.error(error, 'Erreur lors du marquage comme payée');
        return reply.status(500).send({
          success: false,
          error: 'Erreur lors du marquage comme payée',
        });
      }
    }
  );

  // POST /api/invoices/:id/convert-to-avoir - Créer un avoir depuis une facture
  fastify.post(
    '/:id/convert-to-avoir',
    {
      preHandler: [authMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const params = paramsSchema.parse(request.params);
        const tenantId = request.tenantId as string;

        if (!tenantId) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        // Vérifier que la facture existe et peut être convertie
        const invoice = await prisma.invoice.findFirst({
          where: { id: params.id, tenantId },
          include: {
            lines: { orderBy: { ordre: 'asc' } },
          },
        });

        if (!invoice) {
          return reply.status(404).send({ success: false, error: 'Facture non trouvée' });
        }

        if (invoice.statut === 'brouillon' || invoice.statut === 'annulee') {
          return reply.status(400).send({ success: false, error: 'Impossible de créer un avoir pour une facture en brouillon ou annulée' });
        }

        // Générer le numéro d'avoir
        const count = await prisma.avoir.count({ where: { tenantId } });
        const year = new Date().getFullYear();
        const numeroAvoir = `AVO-${year}-${String(count + 1).padStart(6, '0')}`;

        // Créer l'avoir avec les mêmes montants et lignes
        const avoir = await prisma.avoir.create({
          data: {
            tenantId,
            clientFinalId: invoice.clientFinalId,
            invoiceId: invoice.id,
            numeroAvoir,
            dateAvoir: new Date(),
            montantHt: invoice.montantHt,
            montantTtc: invoice.montantTtc,
            tvaTaux: invoice.tvaTaux ?? 20,
            motif: `Avoir sur facture ${invoice.numeroFacture}`,
            description: invoice.description,
            statut: 'brouillon',
            ...(invoice.lines && invoice.lines.length > 0 ? {
              lines: {
                create: invoice.lines.map((l: { codeArticle: string | null; designation: string; quantite: number; prixUnitaireHt: number | { toNumber: () => number }; totalHt: number | { toNumber: () => number }; ordre: number }, i: number) => ({
                  codeArticle: l.codeArticle ?? null,
                  designation: l.designation,
                  quantite: l.quantite,
                  prixUnitaireHt: typeof l.prixUnitaireHt === 'object' && 'toNumber' in l.prixUnitaireHt ? l.prixUnitaireHt.toNumber() : Number(l.prixUnitaireHt),
                  totalHt: typeof l.totalHt === 'object' && 'toNumber' in l.totalHt ? l.totalHt.toNumber() : Number(l.totalHt),
                  ordre: i,
                })),
              },
            } : {}),
          },
          include: {
            clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
            lines: true,
          },
        });

        // Marquer la facture comme annulée
        await prisma.invoice.update({
          where: { id: params.id },
          data: { statut: 'annulee' },
        });

        return reply.status(201).send({
          success: true,
          message: 'Avoir créé depuis la facture, facture marquée comme annulée',
          data: { avoir, invoiceId: invoice.id, numeroFacture: invoice.numeroFacture, invoiceStatut: 'annulee' },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
          return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
        }
        fastify.log.error(error, 'Erreur conversion facture vers avoir');
        return reply.status(500).send({ success: false, error: 'Erreur serveur' });
      }
    }
  );

  // DELETE /api/invoices/:id - Supprimer une facture (brouillon uniquement)
  fastify.delete(
    '/:id',
    {
      preHandler: [authMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const params = paramsSchema.parse(request.params);
        const tenantId = request.tenantId as string;
        if (!tenantId) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }
        const invoice = await prisma.invoice.findFirst({
          where: { id: params.id, tenantId },
        });
        if (!invoice) {
          return reply.status(404).send({ success: false, error: 'Facture non trouvée' });
        }
        const isProduction = process.env.NODE_ENV === 'production';
        if (invoice.statut !== 'brouillon' && isProduction) {
          return reply.status(400).send({
            success: false,
            error: 'Seules les factures au statut Brouillon peuvent être supprimées.',
          });
        }
        // Soft delete : on ne supprime jamais une facture, on la marque comme supprimée
        await prisma.invoice.update({
          where: { id: params.id },
          data: { deletedAt: new Date() },
        });
        return reply.status(200).send({ success: true, message: 'Facture supprimée (archivée)' });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
          return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
        }
        fastify.log.error(error, 'Erreur suppression facture');
        return reply.status(500).send({ success: false, error: 'Erreur lors de la suppression' });
      }
    }
  );
}
