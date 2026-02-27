import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { generateDocumentPdf } from '../../services/pdf.service.js';
import type { DocumentForPdf } from '../../services/pdf.service.js';
import type { InputJsonValue, TransactionClient } from '../../types/prisma-helpers.js';
import { ApiError } from '../../utils/api-errors.js';

async function logEvent(tenantId: string, typeEvenement: string, entiteType: string, entiteId: string, payload: Record<string, unknown>, statut: 'succes' | 'erreur' = 'succes', messageErreur?: string) {
  try {
    await prisma.eventLog.create({
      data: {
        tenantId,
        typeEvenement,
        entiteType,
        entiteId,
        payload: payload as InputJsonValue,
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
          donnees: { entiteType, entiteId, typeEvenement } as InputJsonValue,
        },
      });
    }
  } catch (e) {
    // Silent fail for logging errors
  }
}

const lineSchema = z.object({
  codeArticle: z.string().optional().nullable(),
  designation: z.string().min(1),
  quantite: z.number().int().positive().default(1),
  prixUnitaireHt: z.number().positive(),
});

// Accepte les dates au format ISO datetime (2026-02-18T00:00:00Z) ou date simple (2026-02-18)
const flexibleDate = z.string().refine(
  (val) => !isNaN(new Date(val).getTime()),
  { message: 'Date invalide' }
).optional().nullable();

const createSchema = z.object({
  clientFinalId: z.string().uuid(),
  montantHt: z.number().positive(),
  tvaTaux: z.number().min(0).max(100).default(20),
  dateBdc: flexibleDate,
  dateValidite: flexibleDate,
  description: z.string().optional().nullable(),
  modePaiement: z.string().optional().nullable(),
  devisId: z.string().uuid().optional().nullable(),
  lines: z.array(lineSchema).optional(),
});

const paramsSchema = z.object({ id: z.string().uuid() });

const updateSchema = z.object({
  clientFinalId: z.string().uuid().optional(),
  tvaTaux: z.number().min(0).max(100).optional(),
  description: z.string().optional().nullable(),
  modePaiement: z.string().optional().nullable(),
  lines: z.array(lineSchema).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  statut: z.enum(['brouillon', 'valide', 'facture', 'annule']).optional(),
  clientFinalId: z.string().uuid().optional(),
});

export async function bonsCommandeRoutes(fastify: FastifyInstance) {
  // GET /api/bons-commande - Liste
  fastify.get('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return ApiError.unauthorized(reply);
      }

      const query = listQuerySchema.parse(request.query);
      const page = query.page;
      const limit = query.limit;

      // Déléguer à n8n
      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ bons: unknown[]; count: number; total: number; totalPages: number }>(
          tenantId,
          'bdc_list',
          {
            page,
            limit,
            statut: query.statut || undefined,
            clientFinalId: query.clientFinalId || undefined,
          }
        );
        const raw = res.data as { bons?: unknown[]; count?: number; total?: number; page?: number; limit?: number; totalPages?: number };
        const bons = Array.isArray(raw.bons) ? raw.bons : [];
        return reply.status(200).send({
          success: true,
          data: {
            bons,
            count: bons.length,
            total: raw.total ?? bons.length,
            page: raw.page ?? 1,
            limit: raw.limit ?? 20,
            totalPages: raw.totalPages ?? 1,
          },
        });
      }

      // Lecture BDD directe (callback n8n)
      const skip = (page - 1) * limit;
      const where: Record<string, unknown> = { tenantId, deletedAt: null };
      if (query.statut) where.statut = query.statut as 'brouillon' | 'valide' | 'facture' | 'annule';
      if (query.clientFinalId) where.clientFinalId = query.clientFinalId;

      const [bons, total] = await Promise.all([
        prisma.bonCommande.findMany({
          where,
          skip,
          take: limit,
          include: {
            clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
            lines: { orderBy: { ordre: 'asc' } },
          },
          orderBy: { dateBdc: 'desc' },
        }),
        prisma.bonCommande.count({ where }),
      ]);

      return reply.status(200).send({
        success: true,
        data: { bons, count: bons.length, total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      fastify.log.error(error, 'Erreur liste bons de commande');
      return ApiError.internal(reply);
    }
  });

  // GET /api/bons-commande/:id
  fastify.get('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return ApiError.unauthorized(reply);
      }

      const params = paramsSchema.parse(request.params);

      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ bon: unknown }>(
          tenantId,
          'bdc_get',
          { bdcId: params.id }
        );
        return reply.status(200).send({
          success: true,
          data: res.data,
        });
      }

      // Lecture BDD directe (callback n8n)
      const where: Record<string, unknown> = { id: params.id };
      if (tenantId) {
        where.tenantId = tenantId;
      }

      const bon = await prisma.bonCommande.findFirst({
        where,
        include: {
          clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true, adresse: true, telephone: true } },
          lines: { orderBy: { ordre: 'asc' } },
          invoice: { select: { id: true, numeroFacture: true, statut: true } },
        },
      });

      if (!bon) return ApiError.notFound(reply, 'BonCommande');
      return reply.status(200).send({ success: true, data: { bon } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiError.validation(reply, error);
      }
      fastify.log.error(error, 'Erreur récupération bon de commande');
      return ApiError.internal(reply);
    }
  });

  // GET /api/bons-commande/:id/pdf - Génère et retourne le PDF du bon de commande
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
          return ApiError.unauthorized(reply);
        }

        const docWhere: Record<string, unknown> = { id: params.id };
        if (tenantId) docWhere.tenantId = tenantId;

        const bon = await prisma.bonCommande.findFirst({
          where: docWhere,
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

        if (!bon) {
          return ApiError.notFound(reply, 'BonCommande');
        }

        const forPdf: DocumentForPdf = {
          numero: bon.numeroBdc,
          dateDocument: bon.dateBdc,
          dateSecondaire: bon.dateValidite,
          montantHt: Number(bon.montantHt),
          montantTtc: Number(bon.montantTtc),
          tvaTaux: bon.tvaTaux != null ? Number(bon.tvaTaux) : null,
          description: bon.description ?? undefined,
          modePaiement: bon.modePaiement ?? undefined,
          statut: bon.statut,
          lines: bon.lines.map((l: { codeArticle: string | null; designation: string; quantite: number; prixUnitaireHt: number | { toNumber(): number }; totalHt: number | { toNumber(): number } }) => ({
            codeArticle: l.codeArticle,
            designation: l.designation,
            quantite: l.quantite,
            prixUnitaireHt: typeof l.prixUnitaireHt === 'object' && 'toNumber' in l.prixUnitaireHt ? l.prixUnitaireHt.toNumber() : Number(l.prixUnitaireHt),
            totalHt: typeof l.totalHt === 'object' && 'toNumber' in l.totalHt ? l.totalHt.toNumber() : Number(l.totalHt),
          })),
          clientFinal: bon.clientFinal ?? undefined,
          tenant: bon.tenant ?? undefined,
        };

        const pdfBytes = await generateDocumentPdf(forPdf, 'bon_commande');
        const filename = `bdc-${bon.numeroBdc.replace(/\s+/g, '-')}.pdf`;

        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `inline; filename="${filename}"`)
          .send(Buffer.from(pdfBytes));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }
        fastify.log.error(error, 'Erreur génération PDF bon de commande');
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/bons-commande - Créer
  fastify.post('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const body = createSchema.parse(request.body);

      // Récupérer tenantId : depuis le body si appel n8n, sinon depuis request (JWT)
      const tenantId = fromN8n
        ? (body as { tenantId?: string }).tenantId || request.tenantId
        : request.tenantId;

      if (!tenantId) {
        return ApiError.unauthorized(reply);
      }

      // Vérifier droits si pas n8n
      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      // Vérifier que le client existe et appartient au tenant
      const client = await prisma.clientFinal.findFirst({
        where: { id: body.clientFinalId, tenantId }
      });
      if (!client) return ApiError.notFound(reply, 'Client');

      // Application no-code : création passe par n8n si appel depuis frontend
      if (!fromN8n) {
        const bodyWithoutTenantId = { ...body };
        if ('tenantId' in bodyWithoutTenantId) {
          delete (bodyWithoutTenantId as { tenantId?: string }).tenantId;
        }

        const res = await n8nService.callWorkflowReturn<{ bon: unknown }>(
          tenantId,
          'bdc_create',
          { ...bodyWithoutTenantId, tenantId }
        );

        // Si un devisId est fourni, passer le devis en 'commandee' automatiquement
        if (body.devisId) {
          try {
            await prisma.devis.update({
              where: { id: body.devisId, tenantId },
              data: { statut: 'commandee' },
            });
            fastify.log.info('Devis %s passé en commandee après création BdC via n8n', body.devisId);
          } catch (devisErr) {
            fastify.log.warn(devisErr, 'Impossible de passer le devis %s en commandee', body.devisId);
          }
        }

        return reply.status(201).send({
          success: true,
          message: 'Bon de commande créé via n8n',
          data: res.data,
        });
      }

      // Appel depuis n8n (callback) : persister en base
      const count = await prisma.bonCommande.count({ where: { tenantId } });
      const year = new Date().getFullYear();
      const numeroBdc = `BDC-${year}-${String(count + 1).padStart(6, '0')}`;

      const tvaTaux = body.tvaTaux ?? 20;
      const montantTtc = Number((body.montantHt * (1 + tvaTaux / 100)).toFixed(2));
      const dateBdc = body.dateBdc ? new Date(body.dateBdc) : new Date();
      const dateValidite = body.dateValidite
        ? new Date(body.dateValidite)
        : new Date(dateBdc.getTime() + 30 * 24 * 60 * 60 * 1000);

      const bon = await prisma.bonCommande.create({
        data: {
          tenantId,
          clientFinalId: body.clientFinalId,
          numeroBdc,
          dateBdc,
          dateValidite,
          montantHt: body.montantHt,
          montantTtc,
          tvaTaux,
          description: body.description,
          modePaiement: body.modePaiement,
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
          clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
          lines: true,
        },
      });

      // Log the event
      await logEvent(tenantId, 'bdc_create', 'BonCommande', bon.id, { numeroBdc: bon.numeroBdc, montantTtc: Number(bon.montantTtc) }, 'succes');

      // Si un devisId est fourni, passer le devis en 'commandee' automatiquement
      if (body.devisId) {
        try {
          await prisma.devis.update({
            where: { id: body.devisId, tenantId },
            data: { statut: 'commandee' },
          });
          fastify.log.info('Devis %s passé en commandee après création BdC %s', body.devisId, bon.numeroBdc);
        } catch (devisErr) {
          fastify.log.warn(devisErr, 'Impossible de passer le devis %s en commandee', body.devisId);
        }
      }

      return reply.status(201).send({
        success: true,
        message: 'Bon de commande créé',
        data: { bon },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'bdc_create', 'BonCommande', 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        return ApiError.validation(reply, error);
      }
      fastify.log.error(error, 'Erreur création bon de commande');
      return ApiError.internal(reply);
    }
  });

  // PUT /api/bons-commande/:id/validate - Valider
  fastify.put('/:id/validate', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);

      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return ApiError.unauthorized(reply);
      }

      // Vérifier droits si pas n8n
      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      // Vérifier que le bon existe et appartient au tenant
      const bon = await prisma.bonCommande.findFirst({ where: { id: params.id, tenantId } });
      if (!bon) return ApiError.notFound(reply, 'BonCommande');
      if (bon.statut !== 'brouillon') return ApiError.badRequest(reply, 'Seul un brouillon peut être validé');

      // Si appel depuis frontend, déléguer à n8n
      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ bon: unknown }>(
          tenantId,
          'bdc_validate',
          { bdcId: params.id }
        );
        return reply.status(200).send({
          success: true,
          message: 'Bon validé via n8n',
          data: res.data,
        });
      }

      // Appel depuis n8n : persister en base
      const updated = await prisma.bonCommande.update({
        where: { id: params.id },
        data: { statut: 'valide' },
        include: { clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } } },
      });

      // Log the event
      await logEvent(tenantId, 'bdc_validate', 'BonCommande', updated.id, { numeroBdc: bon.numeroBdc }, 'succes');

      return reply.status(200).send({ success: true, message: 'Bon validé', data: { bon: updated } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'bdc_validate', 'BonCommande', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        return ApiError.validation(reply, error);
      }
      fastify.log.error(error, 'Erreur validation bon de commande');
      return ApiError.internal(reply);
    }
  });

  // POST /api/bons-commande/:id/convert-to-invoice - Convertir en facture
  fastify.post('/:id/convert-to-invoice', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);

      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return ApiError.unauthorized(reply);
      }

      // Vérifier droits si pas n8n
      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      // Vérifier que le bon existe et appartient au tenant
      const bon = await prisma.bonCommande.findFirst({
        where: { id: params.id, tenantId },
        include: { lines: { orderBy: { ordre: 'asc' } } },
      });

      if (!bon) return ApiError.notFound(reply, 'BonCommande');
      if (bon.statut === 'facture') return ApiError.badRequest(reply, 'Déjà converti en facture');
      if (bon.statut === 'annule') return ApiError.badRequest(reply, 'Bon annulé');

      // Si appel depuis frontend, déléguer à n8n
      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ invoice: unknown; bon: unknown }>(
          tenantId,
          'bdc_convert_to_invoice',
          { bdcId: params.id }
        );

        // Auto-init compta si plan comptable vide (BdC→facture)
        try {
          const nbComptes = await prisma.planComptable.count({ where: { tenantId } });
          if (nbComptes === 0) {
            fastify.log.info('Plan comptable vide pour tenant %s, lancement auto-init compta (BdC→facture)...', tenantId);
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

        // Comptabilisation automatique après conversion BdC → facture
        try {
          const resData = res.data as Record<string, unknown> | undefined;
          const invoiceId = resData?.invoiceId ?? resData?.invoice_id ?? (resData?.invoice as Record<string, unknown>)?.id;
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

      // Appel depuis n8n (callback) : création en BDD
      const invoiceCount = await prisma.invoice.count({ where: { tenantId } });
      const year = new Date().getFullYear();
      const numeroFacture = `INV-${year}-${String(invoiceCount + 1).padStart(6, '0')}`;

      const invoice = await prisma.invoice.create({
        data: {
          tenantId,
          type: 'facture_client_final',
          clientFinalId: bon.clientFinalId,
          numeroFacture,
          dateFacture: new Date(),
          dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          montantHt: bon.montantHt,
          montantTtc: bon.montantTtc,
          tvaTaux: bon.tvaTaux,
          description: bon.description ? `BDC ${bon.numeroBdc} - ${bon.description}` : `Depuis BDC ${bon.numeroBdc}`,
          modePaiement: bon.modePaiement,
          statut: 'brouillon',
          ...(bon.lines.length > 0 ? {
            lines: {
              create: bon.lines.map((l: { codeArticle: string | null; designation: string; quantite: number; prixUnitaireHt: number | { toNumber(): number }; totalHt: number | { toNumber(): number } }, i: number) => ({
                codeArticle: l.codeArticle,
                designation: l.designation,
                quantite: l.quantite,
                prixUnitaireHt: Number(l.prixUnitaireHt),
                totalHt: Number(l.totalHt),
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

      // Mettre à jour le bon
      const updatedBon = await prisma.bonCommande.update({
        where: { id: params.id },
        data: { statut: 'facture', invoiceId: invoice.id },
        include: {
          clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
        },
      });

      // Log the event
      await logEvent(tenantId, 'bdc_convert_to_invoice', 'BonCommande', bon.id, { numeroBdc: bon.numeroBdc, numeroFacture }, 'succes');

      // Auto-init compta si plan comptable vide (BdC callback n8n)
      try {
        const nbComptes = await prisma.planComptable.count({ where: { tenantId } });
        if (nbComptes === 0) {
          fastify.log.info('Plan comptable vide pour tenant %s, lancement auto-init compta (BdC callback)...', tenantId);
          await n8nService.callWorkflowReturn(tenantId, 'compta_init', { tenantId });
          fastify.log.info('Auto-init compta réussie pour tenant %s', tenantId);
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
        message: `Facture ${numeroFacture} créée depuis ${bon.numeroBdc}`,
        data: { invoice, bon: updatedBon },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'bdc_convert_to_invoice', 'BonCommande', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        return ApiError.validation(reply, error);
      }
      fastify.log.error(error, 'Erreur conversion bon → facture');
      return ApiError.internal(reply);
    }
  });

  // PUT /api/bons-commande/:id - Update (allows editing even after validation)
  fastify.put('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);
      const body = updateSchema.parse(request.body);
      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return ApiError.unauthorized(reply);
      }

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const bon = await prisma.bonCommande.findFirst({ where: { id: params.id, tenantId } });
      if (!bon) return ApiError.notFound(reply, 'BonCommande');

      // Appel n8n si la requête ne vient pas de n8n
      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ bon: unknown }>(
          tenantId,
          'bdc_update',
          { bdcId: params.id, ...body }
        );
        return reply.status(200).send({
          success: true,
          message: 'Bon de commande mis à jour via n8n',
          data: res.data,
        });
      }

      const clientFinalId = body.clientFinalId || bon.clientFinalId;
      if (!clientFinalId) return ApiError.badRequest(reply, 'Client requis');
      const client = await prisma.clientFinal.findFirst({
        where: { id: clientFinalId, tenantId }
      });
      if (!client) return ApiError.notFound(reply, 'Client');

      const tvaTaux = Number(body.tvaTaux ?? bon.tvaTaux ?? 20);
      const lines = body.lines ?? [];
      const montantHt = lines.length > 0
        ? Number((lines.reduce((sum, l) => sum + ((l.quantite ?? 1) * l.prixUnitaireHt), 0)).toFixed(2))
        : Number(bon.montantHt);
      const montantTtc = Number((montantHt * (1 + tvaTaux / 100)).toFixed(2));

      const updated = await prisma.$transaction(async (tx: TransactionClient) => {
        await tx.bonCommandeLine.deleteMany({ where: { bonCommandeId: params.id } });

        return tx.bonCommande.update({
          where: { id: params.id },
          data: {
            clientFinalId,
            tvaTaux,
            montantHt,
            montantTtc,
            description: body.description ?? bon.description,
            modePaiement: body.modePaiement ?? bon.modePaiement,
            ...(lines.length > 0 ? {
              lines: {
                create: lines.map((l, i) => ({
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
            clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
            lines: { orderBy: { ordre: 'asc' } },
          },
        });
      });

      await logEvent(tenantId, 'bdc_update', 'BonCommande', updated.id, { numeroBdc: updated.numeroBdc, montantTtc: Number(updated.montantTtc) }, 'succes');

      return reply.status(200).send({
        success: true,
        message: 'Bon de commande mis à jour',
        data: { bon: updated },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'bdc_update', 'BonCommande', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        return ApiError.validation(reply, error);
      }
      fastify.log.error(error, 'Erreur mise à jour bon de commande');
      return ApiError.internal(reply);
    }
  });

  // DELETE /api/bons-commande/:id
  fastify.delete('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);

      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return ApiError.unauthorized(reply);
      }

      // Vérifier droits si pas n8n
      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      // Vérifier que le bon existe et appartient au tenant
      const bon = await prisma.bonCommande.findFirst({ where: { id: params.id, tenantId } });
      if (!bon) return ApiError.notFound(reply, 'BonCommande');
      if (bon.statut === 'facture') return ApiError.badRequest(reply, 'Impossible de supprimer un bon déjà facturé');

      // Si appel depuis frontend, déléguer à n8n
      if (!fromN8n) {
        await n8nService.callWorkflowReturn<{ success: boolean }>(
          tenantId,
          'bdc_delete',
          { bdcId: params.id }
        );
        return reply.status(200).send({
          success: true,
          message: 'Bon de commande supprimé via n8n',
        });
      }

      // Appel depuis n8n : supprimer en base
      // Soft delete : archivage au lieu de suppression définitive
      await prisma.bonCommande.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

      // Log the event
      await logEvent(tenantId, 'bdc_delete', 'BonCommande', params.id, { numeroBdc: bon.numeroBdc }, 'succes');

      return reply.status(200).send({ success: true, message: 'Bon de commande supprimé' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'bdc_delete', 'BonCommande', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        return ApiError.validation(reply, error);
      }
      fastify.log.error(error, 'Erreur suppression bon de commande');
      return ApiError.internal(reply);
    }
  });
}
