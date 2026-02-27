import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { eventService } from '../../services/event.service.js';
import { n8nService } from '../../services/n8n.service.js';
import { env } from '../../config/env.js';
import { authMiddleware, n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-errors.js';

// Schema de validation pour le renouvellement
const renewSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
});

// Schema de validation pour l'annulation
const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
  reason: z.string().optional().default('Demande du client'),
  cancelAtPeriodEnd: z.boolean().optional().default(false),
});

// Schema de validation pour le changement de plan
const upgradeSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
  nouveauPlan: z.object({
    nomPlan: z.string(),
    montantMensuel: z.number().positive(),
    modulesInclus: z.array(z.string()).optional().default([]),
    dureeMois: z.number().int().positive().optional().default(1),
  }),
});

// Schema de validation pour la suspension
const suspendSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
  reason: z.string().optional().default('Paiement en retard'),
});

/**
 * Routes pour la gestion des abonnements clients
 */
export async function subscriptionsRoutes(fastify: FastifyInstance) {
  // POST /api/subscriptions/renew - Renouveler un abonnement
  fastify.post(
    '/renew',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const fromN8n = request.isN8nRequest === true;
        const body = renewSubscriptionSchema.parse(request.body);
        const tenantId = request.tenantId as string;

        if (!fromN8n && !tenantId) {
          return ApiError.unauthorized(reply);
        }

        // Vérifier droits
        if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return ApiError.forbidden(reply);
        }

        // Si on délègue à n8n
        if (!fromN8n && tenantId && env.USE_N8N_COMMANDS) {
          const res = await n8nService.callWorkflowReturn<{ subscription: unknown; invoice: unknown }>(
            tenantId,
            'subscription_renewal',
            { subscriptionId: body.subscriptionId }
          );
          return reply.status(200).send({
            success: true,
            message: 'Abonnement renouvelé via n8n',
            data: res.data,
          });
        }

        // Traitement direct (USE_N8N_COMMANDS=false)
        const subscription = await prisma.clientSubscription.findUnique({
          where: { id: body.subscriptionId },
          include: { clientFinal: true },
        });

        if (!subscription) {
          return ApiError.notFound(reply, 'Abonnement');
        }

        // Calculer la nouvelle date de renouvellement
        const newRenewalDate = new Date(subscription.dateProchainRenouvellement);
        newRenewalDate.setMonth(newRenewalDate.getMonth() + 1);

        // Mettre à jour l'abonnement
        const updated = await prisma.clientSubscription.update({
          where: { id: body.subscriptionId },
          data: {
            dateProchainRenouvellement: newRenewalDate,
          },
        });

        return reply.status(200).send({
          success: true,
          message: 'Abonnement renouvelé',
          data: { subscription: updated },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }
        fastify.log.error(error, 'Erreur lors du renouvellement');
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/subscriptions/cancel - Annuler un abonnement
  fastify.post(
    '/cancel',
    {
      preHandler: [authMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const body = cancelSubscriptionSchema.parse(request.body);
        const tenantId = request.tenantId as string;

        if (!tenantId) {
          return ApiError.unauthorized(reply);
        }

        // Vérifier droits
        if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return ApiError.forbidden(reply);
        }

        // Si on délègue à n8n
        if (tenantId && env.USE_N8N_COMMANDS) {
          const res = await n8nService.callWorkflowReturn<{ subscription: unknown }>(
            tenantId,
            'subscription_cancelled',
            {
              subscriptionId: body.subscriptionId,
              reason: body.reason,
              cancelAtPeriodEnd: body.cancelAtPeriodEnd,
            }
          );
          return reply.status(200).send({
            success: true,
            message: 'Abonnement annulé via n8n',
            data: res.data,
          });
        }

        // Traitement direct (USE_N8N_COMMANDS=false)
        const updated = await prisma.clientSubscription.update({
          where: { id: body.subscriptionId },
          data: { statut: 'annule' },
        });

        return reply.status(200).send({
          success: true,
          message: 'Abonnement annulé',
          data: { subscription: updated },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }
        fastify.log.error(error, 'Erreur lors de l\'annulation');
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/subscriptions/upgrade - Changer de plan
  fastify.post(
    '/upgrade',
    {
      preHandler: [authMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const body = upgradeSubscriptionSchema.parse(request.body);
        const tenantId = request.tenantId as string;

        if (!tenantId) {
          return ApiError.unauthorized(reply);
        }

        // Vérifier droits
        if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return ApiError.forbidden(reply);
        }

        // Si on délègue à n8n
        if (tenantId && env.USE_N8N_COMMANDS) {
          const res = await n8nService.callWorkflowReturn<{ subscription: unknown; prorata: unknown }>(
            tenantId,
            'subscription_upgrade',
            {
              subscriptionId: body.subscriptionId,
              nouveauPlan: body.nouveauPlan,
            }
          );
          return reply.status(200).send({
            success: true,
            message: 'Abonnement mis à jour via n8n',
            data: res.data,
          });
        }

        // Traitement direct (USE_N8N_COMMANDS=false)
        const updated = await prisma.clientSubscription.update({
          where: { id: body.subscriptionId },
          data: {
            nomPlan: body.nouveauPlan.nomPlan,
            montantMensuel: body.nouveauPlan.montantMensuel,
            modulesInclus: body.nouveauPlan.modulesInclus,
          },
        });

        return reply.status(200).send({
          success: true,
          message: 'Abonnement mis à jour',
          data: { subscription: updated },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }
        fastify.log.error(error, 'Erreur lors du changement de plan');
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/subscriptions/suspend - Suspendre un abonnement
  fastify.post(
    '/suspend',
    {
      preHandler: [authMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const body = suspendSubscriptionSchema.parse(request.body);
        const tenantId = request.tenantId as string;

        if (!tenantId) {
          return ApiError.unauthorized(reply);
        }

        // Vérifier droits
        if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return ApiError.forbidden(reply);
        }

        // Si on délègue à n8n
        if (tenantId && env.USE_N8N_COMMANDS) {
          const res = await n8nService.callWorkflowReturn<{ subscription: unknown; client: unknown }>(
            tenantId,
            'subscription_suspended',
            {
              subscriptionId: body.subscriptionId,
              reason: body.reason,
            }
          );
          return reply.status(200).send({
            success: true,
            message: 'Abonnement suspendu via n8n',
            data: res.data,
          });
        }

        // Traitement direct (USE_N8N_COMMANDS=false)
        const subscription = await prisma.clientSubscription.update({
          where: { id: body.subscriptionId },
          data: { statut: 'suspendu' },
          include: { clientFinal: true },
        });

        // Suspendre aussi l'accès du client
        await prisma.clientFinal.update({
          where: { id: subscription.clientFinalId },
          data: { statut: 'suspendu' },
        });

        return reply.status(200).send({
          success: true,
          message: 'Abonnement suspendu',
          data: { subscription },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }
        fastify.log.error(error, 'Erreur lors de la suspension');
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/subscriptions/reactivate - Réactiver un abonnement suspendu
  fastify.post(
    '/reactivate',
    {
      preHandler: [authMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const body = z.object({ subscriptionId: z.string().uuid() }).parse(request.body);
        const tenantId = request.tenantId as string;

        if (!tenantId) {
          return ApiError.unauthorized(reply);
        }

        // Vérifier droits
        if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return ApiError.forbidden(reply);
        }

        const subscription = await prisma.clientSubscription.findUnique({
          where: { id: body.subscriptionId },
          include: { clientFinal: true },
        });

        if (!subscription) {
          return ApiError.notFound(reply, 'Abonnement');
        }

        if (subscription.statut !== 'suspendu') {
          return ApiError.badRequest(reply, 'L\'abonnement n\'est pas suspendu');
        }

        // Réactiver l'abonnement
        const updated = await prisma.clientSubscription.update({
          where: { id: body.subscriptionId },
          data: { statut: 'actif' },
        });

        // Réactiver aussi l'accès du client
        await prisma.clientFinal.update({
          where: { id: subscription.clientFinalId },
          data: { statut: 'actif' },
        });

        // Émettre événement
        await eventService.emit(
          tenantId,
          'subscription.reactivated',
          'ClientSubscription',
          updated.id,
          {
            subscriptionId: updated.id,
            clientId: subscription.clientFinalId,
            tenantId,
          }
        );

        return reply.status(200).send({
          success: true,
          message: 'Abonnement réactivé',
          data: { subscription: updated },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }
        fastify.log.error(error, 'Erreur lors de la réactivation');
        return ApiError.internal(reply);
      }
    }
  );

  // GET /api/subscriptions/:id - Récupérer un abonnement
  fastify.get(
    '/:id',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const params = z.object({ id: z.string().uuid() }).parse(request.params);
        const tenantId = request.tenantId;
        const fromN8n = request.isN8nRequest === true;

        if (!tenantId && !fromN8n) {
          return ApiError.unauthorized(reply);
        }

        // Construire le filtre avec isolation tenant conditionnelle
        const subscriptionWhere: Record<string, unknown> = {
          id: params.id,
        };
        if (tenantId) {
          subscriptionWhere.clientFinal = { tenantId };
        }

        const subscription = await prisma.clientSubscription.findFirst({
          where: subscriptionWhere,
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

        if (!subscription) {
          return ApiError.notFound(reply, 'Abonnement');
        }

        return reply.status(200).send({
          success: true,
          data: { subscription },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }
        fastify.log.error(error, 'Erreur lors de la récupération');
        return ApiError.internal(reply);
      }
    }
  );

  // GET /api/subscriptions - Liste tous les abonnements
  fastify.get(
    '/',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const fromN8n = request.isN8nRequest === true;
        const queryParams = request.query as { statut?: string };

        if (!tenantId && !fromN8n) {
          return ApiError.unauthorized(reply);
        }

        const where: Record<string, unknown> = {};
        if (tenantId) {
          where.clientFinal = { tenantId };
        }

        if (queryParams.statut) {
          (where as Record<string, unknown>).statut = queryParams.statut;
        }

        const subscriptions = await prisma.clientSubscription.findMany({
          where,
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
            updatedAt: 'desc',
          },
        });

        return reply.status(200).send({
          success: true,
          data: {
            subscriptions,
            count: subscriptions.length,
          },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur lors de la récupération des abonnements');
        return ApiError.internal(reply);
      }
    }
  );
}
