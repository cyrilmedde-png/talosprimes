import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { eventService } from '../../services/event.service.js';
import { n8nService } from '../../services/n8n.service.js';
import { env } from '../../config/env.js';
import { authMiddleware, n8nOrAuthMiddleware, isN8nInternalRequest } from '../../middleware/auth.middleware.js';
import { Prisma, InvoiceStatus } from '@prisma/client';

// Schema de validation pour créer une facture
const createInvoiceSchema = z.object({
  tenantId: z.string().uuid().optional(), // Optionnel : présent si appel depuis n8n
  clientFinalId: z.string().uuid(),
  type: z.enum(['facture_entreprise', 'facture_client_final']).default('facture_client_final'),
  montantHt: z.number().positive(),
  tvaTaux: z.number().min(0).max(100).default(20),
  dateFacture: z.string().datetime().optional(),
  dateEcheance: z.string().datetime().optional(),
  numeroFacture: z.string().optional(),
  description: z.string().optional(),
  lienPdf: z.string().url().optional(),
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
            return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
          }
          return reply.status(200).send({
            success: true,
            data: res.data,
          });
        }

        // Sinon, récupérer depuis la base de données (fallback ou si USE_N8N_VIEWS=false)
        const page = queryParams.page ? parseInt(queryParams.page, 10) : 1;
        const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : 20;
        const skip = (page - 1) * limit;

        const where: Prisma.InvoiceWhereInput = {};
        if (tenantId) {
          where.tenantId = tenantId;
        }

        if (queryParams.statut) {
          where.statut = queryParams.statut as InvoiceStatus;
        }

        if (queryParams.clientFinalId) {
          where.clientFinalId = queryParams.clientFinalId;
        }

        if (queryParams.dateFrom || queryParams.dateTo) {
          where.dateFacture = {};
          if (queryParams.dateFrom) {
            where.dateFacture.gte = new Date(queryParams.dateFrom);
          }
          if (queryParams.dateTo) {
            where.dateFacture.lte = new Date(queryParams.dateTo);
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
        const invoiceWhere: Prisma.InvoiceWhereInput = { id: params.id };
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

        // Si on délègue les écritures à n8n (full no-code)
        // IMPORTANT: si l'appel vient déjà de n8n, ne pas redéléguer (évite boucle)
        if (!fromN8n && tenantId && env.USE_N8N_COMMANDS) {
          const res = await n8nService.callWorkflowReturn<{ invoice: unknown }>(
            tenantId,
            'invoice_create',
            {
              ...bodyWithoutTenantId,
              tenantId,
            }
          );
          if (!res.success) {
            return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
          }
          return reply.status(201).send({
            success: true,
            message: 'Facture créée via n8n',
            data: res.data,
          });
        }

        // Sinon, créer directement en base (fallback ou si USE_N8N_COMMANDS=false)
        // Auto-générer le numéro de facture si non fourni
        let numeroFacture = bodyWithoutTenantId.numeroFacture;
        if (!numeroFacture) {
          const count = await prisma.invoice.count({
            where: { tenantId },
          });
          const year = new Date().getFullYear();
          numeroFacture = `INV-${year}-${String(count + 1).padStart(6, '0')}`;
        }

        // Calculer le montant TTC
        const tvaTaux = body.tvaTaux ?? 20;
        const montantTtc = Number((body.montantHt * (1 + tvaTaux / 100)).toFixed(2));
        const dateFacture = body.dateFacture ? new Date(body.dateFacture) : new Date();
        const dateEcheance = body.dateEcheance
          ? new Date(body.dateEcheance)
          : new Date(dateFacture.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 jours

        // Créer la facture
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
            lienPdf: body.lienPdf,
            statut: 'brouillon',
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

        // Émettre événement (underscore notation pour matcher les WorkflowLinks)
        await eventService.emit(tenantId, 'invoice_create', 'Invoice', invoice.id, {
          invoiceId: invoice.id,
          clientId: invoice.clientFinalId,
          tenantId,
          numeroFacture: invoice.numeroFacture,
          montantHt: invoice.montantHt,
          montantTtc: invoice.montantTtc,
        });

        return reply.status(201).send({
          success: true,
          message: 'Facture créée avec succès',
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

        // Si on délègue les écritures à n8n (full no-code)
        // IMPORTANT: si l'appel vient déjà de n8n, ne pas redéléguer (évite boucle)
        if (!fromN8n && tenantId && env.USE_N8N_COMMANDS) {
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

        // Sinon, mettre à jour directement en base (fallback ou si USE_N8N_COMMANDS=false)
        const oldStatus = invoice.statut;

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

        // Émettre événement basé sur le changement de statut (underscore notation)
        if (body.statut && oldStatus !== body.statut) {
          let eventType = 'invoice_update';

          if (body.statut === 'payee') {
            eventType = 'invoice_paid';
          } else if (body.statut === 'envoyee') {
            eventType = 'invoice_sent';
          } else if (body.statut === 'en_retard') {
            eventType = 'invoice_overdue';
          } else if (body.statut === 'annulee') {
            eventType = 'invoice_cancelled';
          }

          await eventService.emit(tenantId, eventType, 'Invoice', updated.id, {
            invoiceId: updated.id,
            clientId: updated.clientFinalId,
            tenantId,
            numeroFacture: updated.numeroFacture,
            statut: updated.statut,
            ancienStatut: oldStatus,
          });
        }

        return reply.status(200).send({
          success: true,
          message: 'Facture mise à jour avec succès',
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
}
