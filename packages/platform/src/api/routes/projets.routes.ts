import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';

export async function projetsRoutes(fastify: FastifyInstance) {
  // ═══════════════════════════════════════
  // PROJETS
  // ═══════════════════════════════════════

  // GET /api/projets - Liste des projets
  fastify.get('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { statut?: string; clientId?: string; responsableId?: string; search?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'projets_list', {
        statut: query.statut,
        clientId: query.clientId,
        responsableId: query.responsableId,
        search: query.search,
      });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // GET /api/projets/:id - Détail projet
  fastify.get('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'projet_get', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/projets - Créer un projet
  fastify.post('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'projet_create', body);
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // PUT /api/projets/:id - Modifier un projet
  fastify.put('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'projet_update', { id, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // DELETE /api/projets/:id - Supprimer un projet
  fastify.delete('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'projet_delete', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // ═══════════════════════════════════════
  // TÂCHES
  // ═══════════════════════════════════════

  // GET /api/projets/:projetId/taches - Liste des tâches du projet
  fastify.get('/:projetId/taches', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { projetId } = request.params as { projetId: string };
      const query = request.query as { statut?: string; priorite?: string; assigneA?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'projet_taches_list', {
        projetId,
        statut: query.statut,
        priorite: query.priorite,
        assigneA: query.assigneA,
      });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/projets/:projetId/taches - Créer une tâche
  fastify.post('/:projetId/taches', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { projetId } = request.params as { projetId: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'projet_tache_create', { projetId, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // PUT /api/projets/taches/:id - Modifier une tâche
  fastify.put('/taches/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'projet_tache_update', { id, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // DELETE /api/projets/taches/:id - Supprimer une tâche
  fastify.delete('/taches/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'projet_tache_delete', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // GET /api/projets/dashboard - KPIs projets
  fastify.get('/stats/dashboard', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const result = await n8nService.callWorkflowReturn(tenantId, 'projets_dashboard', {});
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });
}
