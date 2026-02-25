import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';

export async function btpRoutes(fastify: FastifyInstance) {
  // ═══════════════════════════════════════
  // CHANTIERS
  // ═══════════════════════════════════════

  // GET /api/btp/chantiers - Liste des chantiers
  fastify.get('/chantiers', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { statut?: string; clientId?: string; search?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_chantiers_list', {
        statut: query.statut,
        clientId: query.clientId,
        search: query.search,
      });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // GET /api/btp/chantiers/:id - Détail chantier
  fastify.get('/chantiers/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_chantier_get', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/btp/chantiers - Créer un chantier
  fastify.post('/chantiers', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_chantier_create', body);
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // PUT /api/btp/chantiers/:id - Modifier un chantier
  fastify.put('/chantiers/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_chantier_update', { id, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // DELETE /api/btp/chantiers/:id - Supprimer un chantier
  fastify.delete('/chantiers/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_chantier_delete', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // ═══════════════════════════════════════
  // SITUATIONS
  // ═══════════════════════════════════════

  // GET /api/btp/chantiers/:chantierId/situations - Liste des situations
  fastify.get('/chantiers/:chantierId/situations', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { chantierId } = request.params as { chantierId: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_situations_list', { chantierId });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/btp/chantiers/:chantierId/situations - Créer une situation
  fastify.post('/chantiers/:chantierId/situations', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { chantierId } = request.params as { chantierId: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_situation_create', { chantierId, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // PUT /api/btp/situations/:id - Modifier une situation
  fastify.put('/situations/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_situation_update', { id, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // DELETE /api/btp/situations/:id - Supprimer une situation
  fastify.delete('/situations/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_situation_delete', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/btp/situations/:id/valider - Valider une situation
  fastify.post('/situations/:id/valider', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_situation_valider', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // GET /api/btp/dashboard - KPIs BTP
  fastify.get('/dashboard', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_dashboard', {});
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });
}
