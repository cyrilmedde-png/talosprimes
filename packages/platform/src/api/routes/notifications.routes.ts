import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { n8nService } from '../../services/n8n.service.js';

const createNotificationSchema = z.object({
  type: z.string().min(1),
  titre: z.string().min(1),
  message: z.string().min(1),
  donnees: z.record(z.any()).optional(),
});

export async function notificationsRoutes(fastify: FastifyInstance) {
  // POST /api/notifications - Créer une notification
  fastify.post(
    '/',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const body = createNotificationSchema.parse(request.body);
        const tenantId = request.tenantId;
        const fromN8n = request.isN8nRequest === true;

        if (!tenantId && !fromN8n) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        // Appel frontend → passe par n8n
        if (!fromN8n && tenantId) {
          const res = await n8nService.callWorkflowReturn<{ notification: unknown }>(
            tenantId,
            'notification_create',
            {
              type: body.type,
              titre: body.titre,
              message: body.message,
              donnees: body.donnees || {},
            }
          );
          if (!res.success) {
            return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n — workflow notification_create indisponible' });
          }
          return reply.status(201).send({ success: true, data: res.data });
        }

        // Appel depuis n8n (callback) → création BDD directe
        const notification = await prisma.notification.create({
          data: {
            tenantId: tenantId as string,
            type: body.type,
            titre: body.titre,
            message: body.message,
            donnees: body.donnees || {},
          },
        });

        return reply.status(201).send({
          success: true,
          data: { notification },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Données invalides',
            details: error.errors,
          });
        }
        console.error('Erreur création notification:', error);
        return reply.status(500).send({
          success: false,
          error: 'Erreur lors de la création de la notification',
        });
      }
    }
  );

  // GET /api/notifications - Lister les notifications du tenant
  fastify.get(
    '/',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const fromN8n = request.isN8nRequest === true;
        const { lu, limit = '50', offset = '0' } = request.query as {
          lu?: string;
          limit?: string;
          offset?: string;
        };

        if (!tenantId && !fromN8n) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        // Appel frontend → passe par n8n
        if (!fromN8n && tenantId) {
          const res = await n8nService.callWorkflowReturn<{ notifications: unknown[]; total: number }>(
            tenantId,
            'notifications_list',
            {
              lu,
              limit: parseInt(limit, 10),
              offset: parseInt(offset, 10),
            }
          );
          if (!res.success) {
            return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n — workflow notifications_list indisponible' });
          }
          const raw = res.data as Record<string, unknown>;
          return reply.status(200).send({
            success: true,
            data: {
              notifications: raw.notifications || [],
              total: raw.total || 0,
              limit: parseInt(limit, 10),
              offset: parseInt(offset, 10),
            },
          });
        }

        // Appel depuis n8n (callback) → lecture BDD directe
        const where: Record<string, unknown> = { tenantId };
        if (lu !== undefined) {
          where.lu = lu === 'true';
        }

        const [notifications, total] = await Promise.all([
          prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit, 10),
            skip: parseInt(offset, 10),
          }),
          prisma.notification.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: {
            notifications,
            total,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
          },
        });
      } catch (error) {
        console.error('Erreur récupération notifications:', error);
        return reply.status(500).send({
          success: false,
          error: 'Erreur lors de la récupération des notifications',
        });
      }
    }
  );

  // PATCH /api/notifications/:id/lu - Marquer une notification comme lue
  fastify.patch(
    '/:id/lu',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const { id } = request.params as { id: string };
        const { lu = true } = request.body as { lu?: boolean };
        const fromN8n = request.isN8nRequest === true;

        if (!tenantId && !fromN8n) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        // Appel frontend → passe par n8n
        if (!fromN8n && tenantId) {
          const res = await n8nService.callWorkflowReturn<unknown>(
            tenantId,
            'notification_read',
            { id, lu }
          );
          if (!res.success) {
            return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n — workflow notification_read indisponible' });
          }
          return reply.status(200).send({ success: true, message: 'Notification mise à jour' });
        }

        // Appel depuis n8n (callback) → mise à jour BDD directe
        const notification = await prisma.notification.updateMany({
          where: {
            id,
            tenantId,
          },
          data: {
            lu: Boolean(lu),
          },
        });

        if (notification.count === 0) {
          return reply.status(404).send({
            success: false,
            error: 'Notification non trouvée',
          });
        }

        return reply.send({
          success: true,
          message: 'Notification mise à jour',
        });
      } catch (error) {
        console.error('Erreur mise à jour notification:', error);
        return reply.status(500).send({
          success: false,
          error: 'Erreur lors de la mise à jour de la notification',
        });
      }
    }
  );

  // DELETE /api/notifications/:id - Supprimer une notification
  fastify.delete(
    '/:id',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const { id } = request.params as { id: string };
        const fromN8n = request.isN8nRequest === true;

        if (!tenantId && !fromN8n) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        // Appel frontend → passe par n8n
        if (!fromN8n && tenantId) {
          const res = await n8nService.callWorkflowReturn<unknown>(
            tenantId,
            'notification_delete',
            { id }
          );
          if (!res.success) {
            return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n — workflow notification_delete indisponible' });
          }
          return reply.status(200).send({ success: true, message: 'Notification supprimée' });
        }

        // Appel depuis n8n (callback) → suppression BDD directe
        const notification = await prisma.notification.deleteMany({
          where: {
            id,
            tenantId,
          },
        });

        if (notification.count === 0) {
          return reply.status(404).send({
            success: false,
            error: 'Notification non trouvée',
          });
        }

        return reply.send({
          success: true,
          message: 'Notification supprimée',
        });
      } catch (error) {
        console.error('Erreur suppression notification:', error);
        return reply.status(500).send({
          success: false,
          error: 'Erreur lors de la suppression de la notification',
        });
      }
    }
  );
}
