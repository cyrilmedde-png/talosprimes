import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { n8nService } from '../../services/n8n.service.js';
import { ApiError } from '../../utils/api-errors.js';

const paramsSchema = z.object({
  id: z.string().uuid('ID notification invalide'),
});

const listQuerySchema = z.object({
  lu: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

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
          return ApiError.unauthorized(reply);
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
          return ApiError.validation(reply, error);
        }
        fastify.log.error(error, 'Erreur création notification');
        return ApiError.internal(reply);
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
        const { lu, limit, offset } = listQuerySchema.parse(request.query);

        if (!tenantId && !fromN8n) {
          return ApiError.unauthorized(reply);
        }

        // Appel frontend → passe par n8n
        if (!fromN8n && tenantId) {
          const res = await n8nService.callWorkflowReturn<{ notifications: unknown[]; total: number }>(
            tenantId,
            'notifications_list',
            {
              lu,
              limit,
              offset,
            }
          );
          const raw = res.data as Record<string, unknown>;
          return reply.status(200).send({
            success: true,
            data: {
              notifications: raw.notifications || [],
              total: raw.total || 0,
              limit,
              offset,
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
            take: limit,
            skip: offset,
          }),
          prisma.notification.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: {
            notifications,
            total,
            limit,
            offset,
          },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur récupération notifications');
        return ApiError.internal(reply);
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
        const { id } = paramsSchema.parse(request.params);
        const { lu = true } = request.body as { lu?: boolean };
        const fromN8n = request.isN8nRequest === true;

        if (!tenantId && !fromN8n) {
          return ApiError.unauthorized(reply);
        }

        // Appel frontend → passe par n8n
        if (!fromN8n && tenantId) {
          await n8nService.callWorkflowReturn<unknown>(
            tenantId,
            'notification_read',
            { id, lu }
          );
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
          return ApiError.notFound(reply, 'Notification');
        }

        return reply.send({
          success: true,
          message: 'Notification mise à jour',
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur mise à jour notification');
        return ApiError.internal(reply);
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
        const { id } = paramsSchema.parse(request.params);
        const fromN8n = request.isN8nRequest === true;

        if (!tenantId && !fromN8n) {
          return ApiError.unauthorized(reply);
        }

        // Appel frontend → passe par n8n
        if (!fromN8n && tenantId) {
          await n8nService.callWorkflowReturn<unknown>(
            tenantId,
            'notification_delete',
            { id }
          );
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
          return ApiError.notFound(reply, 'Notification');
        }

        return reply.send({
          success: true,
          message: 'Notification supprimée',
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur suppression notification');
        return ApiError.internal(reply);
      }
    }
  );
}
