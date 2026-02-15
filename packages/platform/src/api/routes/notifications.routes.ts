import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';

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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createNotificationSchema.parse(request.body);
        const fromN8n = request.isN8nRequest === true;

        // Si la requête vient de n8n, le tenantId doit être dans le body
        // Sinon, on l'extrait du JWT
        let tenantId: string;
        if (fromN8n) {
          if (!body.donnees?.tenantId) {
            return reply.status(400).send({
              success: false,
              error: 'tenantId requis dans donnees pour les requêtes n8n',
            });
          }
          tenantId = body.donnees.tenantId as string;
        } else {
          tenantId = request.tenantId || '';
        }

        const notification = await prisma.notification.create({
          data: {
            tenantId,
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
    async (request: FastifyRequest, reply: FastifyReply) => {
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

        const where: Record<string, unknown> = {};
        if (tenantId) {
          where.tenantId = tenantId;
        }
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
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = (request as any).tenantId;
        const { id } = request.params as { id: string };
        const { lu = true } = request.body as { lu?: boolean };

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
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = (request as any).tenantId;
        const { id } = request.params as { id: string };

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

