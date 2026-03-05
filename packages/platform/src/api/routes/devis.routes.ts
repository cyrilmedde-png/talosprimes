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
  dateDevis: flexibleDate,
  dateValidite: flexibleDate,
  description: z.string().optional().nullable(),
  modePaiement: z.string().optional().nullable(),
  lines: z.array(lineSchema).optional(),
});

const paramsSchema = z.object({ id: z.string().uuid() });

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  statut: z.enum(['brouillon', 'envoyee', 'acceptee', 'refusee', 'expiree', 'facturee']).optional(),
  clientFinalId: z.string().uuid().optional(),
});

const updateSchema = z.object({
  clientFinalId: z.string().uuid().optional(),
  tvaTaux: z.number().min(0).max(100).optional(),
  description: z.string().optional().nullable(),
  modePaiement: z.string().optional().nullable(),
  validiteJours: z.number().int().positive().optional(),
  lines: z.array(lineSchema).optional(),
});

export async function devisRoutes(fastify: FastifyInstance) {
  // GET /api/devis - Liste
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
        const res = await n8nService.callWorkflowReturn<{ devis: unknown[]; count: number; total: number; totalPages: number }>(
          tenantId,
          'devis_list',
          {
            page,
            limit,
            statut: query.statut,
            clientFinalId: query.clientFinalId,
          }
        );
        const raw = res.data as { devis?: unknown[]; count?: number; total?: number; page?: number; limit?: number; totalPages?: number };
        const devis = Array.isArray(raw.devis) ? raw.devis : [];
        return reply.status(200).send({
          success: true,
          data: {
            devis,
            count: devis.length,
            total: raw.total ?? devis.length,
            page: raw.page ?? 1,
            limit: raw.limit ?? 20,
            totalPages: raw.totalPages ?? 1,
          },
        });
      }

      // Lecture BDD directe (callback n8n)
      const skip = (page - 1) * limit;
      const where: Record<string, unknown> = { tenantId, deletedAt: null };
      if (query.statut) where.statut = query.statut as 'brouillon' | 'envoyee' | 'acceptee' | 'refusee' | 'expiree' | 'facturee';
      if (query.clientFinalId) where.clientFinalId = query.clientFinalId;

      const [devis, total] = await Promise.all([
        prisma.devis.findMany({
          where,
          skip,
          take: limit,
          include: {
            clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
            lines: { orderBy: { ordre: 'asc' } },
          },
          orderBy: { dateDevis: 'desc' },
        }),
        prisma.devis.count({ where }),
      ]);

      return reply.status(200).send({
        success: true,
        data: { devis, count: devis.length, total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      fastify.log.error(error, 'Erreur liste devis');
      return ApiError.internal(reply);
    }
  });

  // GET /api/devis/:id
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
        const res = await n8nService.callWorkflowReturn<{ devis: unknown }>(
          tenantId,
          'devis_get',
          { devisId: params.id }
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

      const devis = await prisma.devis.findFirst({
        where,
        include: {
          clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true, adresse: true, telephone: true } },
          lines: { orderBy: { ordre: 'asc' } },
          invoice: { select: { id: true, numeroFacture: true, statut: true } },
        },
      });

      if (!devis) return ApiError.notFound(reply, 'Devis');
      return reply.status(200).send({ success: true, data: { devis } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiError.validation(reply, error);
      }
      fastify.log.error(error, 'Erreur récupération devis');
      return ApiError.internal(reply);
    }
  });

  // GET /api/devis/:id/pdf - Génère et retourne le PDF du devis
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

        const devis = await prisma.devis.findFirst({
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

        if (!devis) {
          return ApiError.notFound(reply, 'Devis');
        }

        const forPdf: DocumentForPdf = {
          numero: devis.numeroDevis,
          dateDocument: devis.dateDevis,
          dateSecondaire: devis.dateValidite,
          montantHt: Number(devis.montantHt),
          montantTtc: Number(devis.montantTtc),
          tvaTaux: devis.tvaTaux != null ? Number(devis.tvaTaux) : null,
          description: devis.description ?? undefined,
          modePaiement: devis.modePaiement ?? undefined,
          statut: devis.statut,
          lines: devis.lines.map((l: { codeArticle: string | null; designation: string; quantite: number; prixUnitaireHt: number | { toNumber(): number }; totalHt: number | { toNumber(): number } }) => ({
            codeArticle: l.codeArticle,
            designation: l.designation,
            quantite: l.quantite,
            prixUnitaireHt: typeof l.prixUnitaireHt === 'object' && 'toNumber' in l.prixUnitaireHt ? l.prixUnitaireHt.toNumber() : Number(l.prixUnitaireHt),
            totalHt: typeof l.totalHt === 'object' && 'toNumber' in l.totalHt ? l.totalHt.toNumber() : Number(l.totalHt),
          })),
          clientFinal: devis.clientFinal ?? undefined,
          tenant: devis.tenant ?? undefined,
        };

        const pdfBytes = await generateDocumentPdf(forPdf, 'devis');
        const filename = `devis-${devis.numeroDevis.replace(/\s+/g, '-')}.pdf`;

        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `inline; filename="${filename}"`)
          .send(Buffer.from(pdfBytes));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }
        fastify.log.error(error, 'Erreur génération PDF devis');
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/devis - Créer
  fastify.post('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const body = createSchema.parse(request.body);

      const tenantId = fromN8n
        ? (body as { tenantId?: string }).tenantId || request.tenantId
        : request.tenantId;

      if (!tenantId) {
        return ApiError.unauthorized(reply);
      }

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

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

        const res = await n8nService.callWorkflowReturn<{ devis: unknown }>(
          tenantId,
          'devis_create',
          { ...bodyWithoutTenantId, tenantId }
        );

        return reply.status(201).send({
          success: true,
          message: 'Devis créé via n8n',
          data: res.data,
        });
      }

      // Appel depuis n8n (callback) : persister en base
      // Validation supplémentaire pour éviter les enregistrements fantômes
      if (!body.clientFinalId || body.montantHt <= 0) {
        return ApiError.badRequest(reply, 'clientFinalId et montantHt > 0 sont requis');
      }
      const count = await prisma.devis.count({ where: { tenantId } });
      const year = new Date().getFullYear();
      const numeroDevis = `DEV-${year}-${String(count + 1).padStart(6, '0')}`;

      const tvaTaux = body.tvaTaux ?? 20;
      const montantTtc = Number((body.montantHt * (1 + tvaTaux / 100)).toFixed(2));
      const dateDevis = body.dateDevis ? new Date(body.dateDevis) : new Date();
      const dateValidite = body.dateValidite
        ? new Date(body.dateValidite)
        : new Date(dateDevis.getTime() + 30 * 24 * 60 * 60 * 1000);

      const devis = await prisma.devis.create({
        data: {
          tenantId,
          clientFinalId: body.clientFinalId,
          numeroDevis,
          dateDevis,
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
      await logEvent(tenantId, 'devis_create', 'Devis', devis.id, { numeroDevis: devis.numeroDevis, montantTtc: Number(devis.montantTtc) }, 'succes');

      return reply.status(201).send({
        success: true,
        message: 'Devis créé',
        data: { devis },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'devis_create', 'Devis', 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        return ApiError.validation(reply, error);
      }
      fastify.log.error(error, 'Erreur création devis');
      return ApiError.internal(reply);
    }
  });

  // PUT /api/devis/:id/send - Envoyer le devis (brouillon → envoyée)
  fastify.put('/:id/send', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);
      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return ApiError.unauthorized(reply);
      }

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const devis = await prisma.devis.findFirst({ where: { id: params.id, tenantId } });
      if (!devis) return ApiError.notFound(reply, 'Devis');
      if (devis.statut !== 'brouillon') return ApiError.badRequest(reply, 'Seul un brouillon peut être envoyé');

      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ devis: unknown }>(
          tenantId,
          'devis_send',
          { devisId: params.id }
        );
        return reply.status(200).send({
          success: true,
          message: 'Devis envoyé via n8n',
          data: res.data,
        });
      }

      const updated = await prisma.devis.update({
        where: { id: params.id },
        data: { statut: 'envoyee' },
        include: { clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } } },
      });

      // Log the event
      await logEvent(tenantId, 'devis_send', 'Devis', updated.id, { numeroDevis: devis.numeroDevis }, 'succes');

      return reply.status(200).send({ success: true, message: 'Devis envoyé', data: { devis: updated } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'devis_send', 'Devis', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        return ApiError.validation(reply, error);
      }
      fastify.log.error(error, 'Erreur envoi devis');
      return ApiError.internal(reply);
    }
  });

  // PUT /api/devis/:id/accept - Accepter le devis
  fastify.put('/:id/accept', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);
      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return ApiError.unauthorized(reply);
      }

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const devis = await prisma.devis.findFirst({ where: { id: params.id, tenantId } });
      if (!devis) return ApiError.notFound(reply, 'Devis');
      if (devis.statut !== 'envoyee') return ApiError.badRequest(reply, 'Seul un devis envoyé peut être accepté');

      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ devis: unknown }>(
          tenantId,
          'devis_accept',
          { devisId: params.id }
        );
        return reply.status(200).send({
          success: true,
          message: 'Devis accepté via n8n',
          data: res.data,
        });
      }

      const updated = await prisma.devis.update({
        where: { id: params.id },
        data: { statut: 'acceptee' },
        include: { clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } } },
      });

      // Log the event
      await logEvent(tenantId, 'devis_accept', 'Devis', updated.id, { numeroDevis: devis.numeroDevis }, 'succes');

      return reply.status(200).send({ success: true, message: 'Devis accepté', data: { devis: updated } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'devis_accept', 'Devis', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        return ApiError.validation(reply, error);
      }
      fastify.log.error(error, 'Erreur acceptation devis');
      return ApiError.internal(reply);
    }
  });

  // POST /api/devis/:id/convert-to-invoice - Convertir en facture
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

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const devis = await prisma.devis.findFirst({
        where: { id: params.id, tenantId },
        include: { lines: { orderBy: { ordre: 'asc' } } },
      });

      if (!devis) return ApiError.notFound(reply, 'Devis');
      if (devis.statut === 'facturee') return ApiError.badRequest(reply, 'Déjà converti en facture');
      if (devis.statut === 'refusee' || devis.statut === 'expiree') return ApiError.badRequest(reply, 'Devis refusé ou expiré');

      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ invoice: unknown; devis: unknown }>(
          tenantId,
          'devis_convert_to_invoice',
          { devisId: params.id }
        );
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
          clientFinalId: devis.clientFinalId,
          numeroFacture,
          dateFacture: new Date(),
          dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          montantHt: devis.montantHt,
          montantTtc: devis.montantTtc,
          tvaTaux: devis.tvaTaux,
          description: devis.description ? `Devis ${devis.numeroDevis} - ${devis.description}` : `Depuis devis ${devis.numeroDevis}`,
          modePaiement: devis.modePaiement,
          statut: 'brouillon',
          ...(devis.lines.length > 0 ? {
            lines: {
              create: devis.lines.map((l: { codeArticle: string | null; designation: string; quantite: number; prixUnitaireHt: number | { toNumber(): number }; totalHt: number | { toNumber(): number } }, i: number) => ({
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

      const updatedDevis = await prisma.devis.update({
        where: { id: params.id },
        data: { statut: 'facturee', invoiceId: invoice.id },
        include: {
          clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
        },
      });

      // Log the event
      await logEvent(tenantId, 'devis_convert_to_invoice', 'Devis', devis.id, { numeroDevis: devis.numeroDevis, numeroFacture }, 'succes');

      return reply.status(201).send({
        success: true,
        message: `Facture ${numeroFacture} créée depuis ${devis.numeroDevis}`,
        data: { invoice, devis: updatedDevis },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'devis_convert_to_invoice', 'Devis', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        return ApiError.validation(reply, error);
      }
      fastify.log.error(error, 'Erreur conversion devis → facture');
      return ApiError.internal(reply);
    }
  });

  // POST /api/devis/:id/convert-to-bdc - Convertir en bon de commande
  fastify.post('/:id/convert-to-bdc', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);
      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return ApiError.unauthorized(reply);
      }

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const devis = await prisma.devis.findFirst({
        where: { id: params.id, tenantId },
        include: { lines: { orderBy: { ordre: 'asc' } } },
      });

      if (!devis) return ApiError.notFound(reply, 'Devis');
      if (devis.statut !== 'acceptee') return ApiError.badRequest(reply, 'Seul un devis accepté peut être converti en bon de commande');

      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ bdc_id: string; numero_bdc: string }>(
          tenantId,
          'devis_convert_to_bdc',
          { devisId: params.id }
        );
        return reply.status(201).send({
          success: true,
          message: 'Bon de commande créé via n8n',
          data: res.data,
        });
      }

      // Appel depuis n8n (callback) : création en BDD
      const bdcCount = await prisma.bonCommande.count({ where: { tenantId } });
      const year = new Date().getFullYear();
      const numeroBdc = `BDC-${year}-${String(bdcCount + 1).padStart(6, '0')}`;

      const bon = await prisma.bonCommande.create({
        data: {
          tenantId,
          clientFinalId: devis.clientFinalId,
          numeroBdc,
          dateBdc: new Date(),
          dateValidite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          montantHt: devis.montantHt,
          montantTtc: devis.montantTtc,
          tvaTaux: devis.tvaTaux,
          description: devis.description ? `Devis ${devis.numeroDevis} - ${devis.description}` : `Depuis devis ${devis.numeroDevis}`,
          modePaiement: devis.modePaiement,
          statut: 'brouillon',
          ...(devis.lines.length > 0 ? {
            lines: {
              create: devis.lines.map((l: { codeArticle: string | null; designation: string; quantite: number; prixUnitaireHt: number | { toNumber(): number }; totalHt: number | { toNumber(): number } }, i: number) => ({
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

      // Log the event
      await logEvent(tenantId, 'devis_convert_to_bdc', 'Devis', devis.id, { numeroDevis: devis.numeroDevis, numeroBdc }, 'succes');

      return reply.status(201).send({
        success: true,
        message: `Bon de commande ${numeroBdc} créé depuis ${devis.numeroDevis}`,
        data: { bon, devisId: devis.id, numeroDevis: devis.numeroDevis },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'devis_convert_to_bdc', 'Devis', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        return ApiError.validation(reply, error);
      }
      fastify.log.error(error, 'Erreur conversion devis → bon de commande');
      return ApiError.internal(reply);
    }
  });

  // PUT /api/devis/:id - Update (allows editing even after validation)
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

      const devis = await prisma.devis.findFirst({ where: { id: params.id, tenantId } });
      if (!devis) return ApiError.notFound(reply, 'Devis');

      // Appel n8n si la requête ne vient pas de n8n
      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ devis: unknown }>(
          tenantId,
          'devis_update',
          { devisId: params.id, ...body }
        );
        return reply.status(200).send({
          success: true,
          message: 'Devis mis à jour via n8n',
          data: res.data,
        });
      }

      const clientFinalId = body.clientFinalId || devis.clientFinalId;
      if (!clientFinalId) return ApiError.badRequest(reply, 'Client requis');
      const client = await prisma.clientFinal.findFirst({
        where: { id: clientFinalId, tenantId }
      });
      if (!client) return ApiError.notFound(reply, 'Client');

      const tvaTaux = Number(body.tvaTaux ?? devis.tvaTaux ?? 20);
      const lines = body.lines ?? [];
      const montantHt = lines.length > 0
        ? Number((lines.reduce((sum, l) => sum + ((l.quantite ?? 1) * l.prixUnitaireHt), 0)).toFixed(2))
        : Number(devis.montantHt);
      const montantTtc = Number((montantHt * (1 + tvaTaux / 100)).toFixed(2));

      const updated = await prisma.$transaction(async (tx: TransactionClient) => {
        await tx.devisLine.deleteMany({ where: { devisId: params.id } });

        return tx.devis.update({
          where: { id: params.id },
          data: {
            clientFinalId,
            tvaTaux,
            montantHt,
            montantTtc,
            description: body.description ?? devis.description,
            modePaiement: body.modePaiement ?? devis.modePaiement,
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

      await logEvent(tenantId, 'devis_update', 'Devis', updated.id, { numeroDevis: updated.numeroDevis, montantTtc: Number(updated.montantTtc) }, 'succes');

      return reply.status(200).send({
        success: true,
        message: 'Devis mis à jour',
        data: { devis: updated },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'devis_update', 'Devis', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        return ApiError.validation(reply, error);
      }
      fastify.log.error(error, 'Erreur mise à jour devis');
      return ApiError.internal(reply);
    }
  });

  // DELETE /api/devis/:id
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

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const devis = await prisma.devis.findFirst({ where: { id: params.id, tenantId } });
      if (!devis) return ApiError.notFound(reply, 'Devis');
      if (devis.statut === 'facturee') return ApiError.badRequest(reply, 'Impossible de supprimer un devis déjà facturé');

      if (!fromN8n) {
        await n8nService.callWorkflowReturn<{ success: boolean }>(
          tenantId,
          'devis_delete',
          { devisId: params.id }
        );
        return reply.status(200).send({
          success: true,
          message: 'Devis supprimé via n8n',
        });
      }

      // Soft delete : archivage au lieu de suppression définitive
      await prisma.devis.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

      // Log the event
      await logEvent(tenantId, 'devis_delete', 'Devis', params.id, { numeroDevis: devis.numeroDevis }, 'succes');

      return reply.status(200).send({ success: true, message: 'Devis supprimé' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'devis_delete', 'Devis', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        return ApiError.validation(reply, error);
      }
      fastify.log.error(error, 'Erreur suppression devis');
      return ApiError.internal(reply);
    }
  });
}
