import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { n8nService } from '../../services/n8n.service.js';
import { requireRole } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-errors.js';

/**
 * Routes pour la gestion n8n (admin uniquement)
 */
export async function n8nRoutes(fastify: FastifyInstance) {
  // GET /api/n8n/test - Teste la connexion à n8n
  fastify.get(
    '/test',
    {
      preHandler: [fastify.authenticate, requireRole('super_admin', 'admin')],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await n8nService.testConnection();

        if (!result.success) {
          // Erreur de configuration / connectivité → 502 (Bad Gateway)
          return reply.status(502).send({
            success: false,
            error: 'n8n indisponible',
            message: result.message,
          });
        }

        return reply.status(200).send({
          success: true,
          message: result.message,
        });
      } catch (error) {
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/n8n/publish-all - Publie tous les workflows (re-enregistre les webhooks)
  fastify.post(
    '/publish-all',
    {
      preHandler: [fastify.authenticate, requireRole('super_admin', 'admin')],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await n8nService.publishAllWorkflows();

        if (!result.success) {
          // Erreur config (pas de clé API) → 422, erreur n8n → 502
          const statusCode = result.message.includes('non configuré') ? 422 : 502;
          return reply.status(statusCode).send({
            success: false,
            error: 'Échec publication workflows',
            message: result.message,
            count: result.count,
          });
        }

        return reply.status(200).send(result);
      } catch (error) {
        return ApiError.internal(reply);
      }
    }
  );

  // GET /api/n8n/workflows - Liste les workflows du tenant
  fastify.get(
    '/workflows',
    {
      preHandler: [fastify.authenticate, requireRole('super_admin', 'admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;

        if (!tenantId) {
          return ApiError.unauthorized(reply, 'Tenant ID manquant');
        }

        const workflows = await n8nService.listWorkflows(tenantId);

        return reply.status(200).send({
          success: true,
          data: { workflows },
        });
      } catch (error) {
        return ApiError.internal(reply);
      }
    }
  );
}
