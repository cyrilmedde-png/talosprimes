import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { eventService } from '../../services/event.service.js';
import { n8nService } from '../../services/n8n.service.js';
import { env } from '../../config/env.js';
import { authMiddleware, n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { generateInvoicePdf } from '../../services/pdf.service.js';

async function logEvent(tenantId: string, typeEvenement: string, entiteType: string, entiteId: string, payload: Record<string, unknown>, statut: 'succes' | 'erreur' = 'succes', messageErreur?: string) {
  try {
    await prisma.eventLog.create({
      data: {
        tenantId,
        typeEvenement,
        entiteType,
        entiteId,
        payload: payload as any,
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
          donnees: { entiteType, entiteId, typeEvenement } as any,
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

const createInvoiceSchema = z.object({
  tenantId: z.string().uuid().optional(),
  clientFinalId: z.string().uuid(),
  type: z.enum(['facture_entreprise', 'facture_client_final']).default('facture_client_final'),
  montantHt: z.number().positive(),
  tvaTaux: z.number().min(0).max(100).default(20),
  dateFacture: z.string().datetime({ offset: true }).optional().nullable(),
  dateEcheance: z.string().datetime({ offset: true }).optional().nullable(),
  numeroFacture: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  modePaiement: z.string().optional().nullable(),
  lines: z.array(invoiceLineSchema).optional(),
  lienPdf: z.union([z.string().url(), z.literal('')]).optional().nullable(),
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
          if (res.success && res.data) {
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
          // Workflow non trouvé ou erreur n8n → fallback BDD pour que la liste s'affiche quand même
          fastify.log.warn({ err: res.error }, 'Liste factures: n8n indisponible, fallback BDD');
        }

        // Récupérer depuis la base de données (fallback ou si USE_N8N_VIEWS=false)
        const page = queryParams.page ? parseInt(queryParams.page, 10) : 1;
        const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : 20;
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};
        if (tenantId) {
          where.tenantId = tenantId;
        }

        if (queryParams.statut) {
          (where as any).statut = queryParams.statut;
        }

        if (queryParams.clientFinalId) {
          where.clientFinalId = queryParams.clientFinalId;
        }

        if (queryParams.dateFrom || queryParams.dateTo) {
          (where as any).dateFacture = {};
          if (queryParams.dateFrom) {
            (where as any).dateFacture.gte = new Date(queryParams.dateFrom);
          }
          if (queryParams.dateTo) {
            (where as any).dateFacture.lte = new Date(queryParams.dateTo);
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
          return reply.status(400).send({
            success: false,
            error: 'Validation échouée',
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
          lines: invoice.lines.map((l: any) => ({
            codeArticle: l.codeArticle,
            designation: l.designation,
            quantite: l.quantite,
            prixUnitaireHt: Number(l.prixUnitaireHt),
            totalHt: Number(l.totalHt),
          })),
          clientFinal: invoice.clientFinal ?? undefined,
          tenant: invoice.tenant ?? undefined,
        };

        const pdfBytes = await generateInvoicePdf(forPdf);
        const filename = `facture-${invoice.numeroFacture.replace(/\s+/g, '-')}.pdf`;

        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `inline; filename="${filename}"`)
          .send(Buffer.from(pdfBytes));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ success: false, error: 'ID invalide', details: error.errors });
        }
        console.error('=== ERREUR GENERATION PDF ===', error);
        fastify.log.error(error, 'Erreur génération PDF facture');
        return reply.status(500).send({ success: false, error: 'Erreur lors de la génération du PDF' });
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

        // Vérifier que le client existe et appartient au tenant
        const client = await prisma.clientFinal.findFirst({
          where: {
            id: body.clientFinalId,
            tenantId,
          },
        });

        if (!client) {
          return reply.status(404).send({ success: false, error: 'Client non trouvé' });
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
          // Idempotence : facture identique déjà créée récemment → retourner sans appeler n8n
          const recentCutoff = new Date(Date.now() - 30 * 1000);
          const existing = await prisma.invoice.findFirst({
            where: {
              tenantId,
              clientFinalId: body.clientFinalId,
              montantHt: body.montantHt,
              createdAt: { gte: recentCutoff },
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

        let numeroFacture = bodyWithoutTenantId.numeroFacture;
        if (!numeroFacture) {
          const count = await prisma.invoice.count({
            where: { tenantId },
          });
          const year = new Date().getFullYear();
          numeroFacture = `INV-${year}-${String(count + 1).padStart(6, '0')}`;
        }

        const tvaTaux = body.tvaTaux ?? 20;
        const montantTtc = Number((body.montantHt * (1 + tvaTaux / 100)).toFixed(2));
        const dateFacture = body.dateFacture ? new Date(body.dateFacture) : new Date();
        const dateEcheance = body.dateEcheance
          ? new Date(body.dateEcheance)
          : new Date(dateFacture.getTime() + 30 * 24 * 60 * 60 * 1000);

        const invoice = await prisma.invoice.create({
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

        return reply.status(201).send({
          success: true,
          message: 'Facture créée',
          data: { invoice },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        // Try to log the error (don't let logging failure mask the real error)
        try {
          if (fromN8n && tenantId) {
            await logEvent(tenantId, 'invoice_create', 'Invoice', 'unknown', { error: errorMessage }, 'erreur', errorMessage);
          }
        } catch (_) {}
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation échouée',
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
        // Try to log the error (don't let logging failure mask the real error)
        try {
          if (fromN8n && tenantId) {
            await logEvent(tenantId, 'invoice_update', 'Invoice', params.id, { error: errorMessage }, 'erreur', errorMessage);
          }
        } catch (_) {}
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation échouée',
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

        return reply.status(200).send({
          success: true,
          message: 'Facture envoyée avec succès',
          data: { invoice: updated },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation échouée',
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

        if (invoice.statut === 'payee') {
          return reply.status(400).send({ success: false, error: 'La facture est déjà payée' });
        }

        // Mettre à jour le statut et la référence de paiement
        const updated = await prisma.invoice.update({
          where: { id: params.id },
          data: {
            statut: 'payee',
            idExternePaiement: body.referencePayment,
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

        // Émettre événement (underscore notation)
        await eventService.emit(tenantId, 'invoice_paid', 'Invoice', updated.id, {
          invoiceId: updated.id,
          clientId: updated.clientFinalId,
          tenantId,
          numeroFacture: updated.numeroFacture,
          montantTtc: updated.montantTtc,
          referencePayment: body.referencePayment,
          datePaiement: body.datePaiement,
        });

        return reply.status(200).send({
          success: true,
          message: 'Facture marquée comme payée',
          data: { invoice: updated },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation échouée',
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
        await prisma.invoice.delete({ where: { id: params.id } });
        return reply.status(200).send({ success: true, message: 'Facture supprimée' });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ success: false, error: 'ID invalide', details: error.errors });
        }
        fastify.log.error(error, 'Erreur suppression facture');
        return reply.status(500).send({ success: false, error: 'Erreur lors de la suppression' });
      }
    }
  );
}
