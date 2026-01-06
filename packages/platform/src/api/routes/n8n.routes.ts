import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { n8nService } from '../../services/n8n.service.js';
import { requireRole } from '../../middleware/auth.middleware.js';

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

        reply.code(result.success ? 200 : 500).send({
          success: result.success,
          message: result.message,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        reply.code(500).send({
          error: 'Erreur serveur',
          message,
        });
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
          reply.code(401).send({
            error: 'Non authentifié',
            message: 'Tenant ID manquant',
          });
          return;
        }

        const workflows = await n8nService.listWorkflows(tenantId);

        reply.code(200).send({
          success: true,
          data: {
            workflows,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        reply.code(500).send({
          error: 'Erreur serveur',
          message,
        });
      }
    }
  );
}

