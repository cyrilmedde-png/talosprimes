import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';

export async function equipeRoutes(fastify: FastifyInstance) {
  // ═══════════════════════════════════════
  // MEMBRES
  // ═══════════════════════════════════════

  // GET /api/equipe/membres - Liste des membres
  fastify.get('/membres', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { departement?: string; actif?: string; search?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_membres_list', {
        departement: query.departement,
        actif: query.actif !== undefined ? query.actif === 'true' : undefined,
        search: query.search,
      });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // GET /api/equipe/membres/:id - Détail membre
  fastify.get('/membres/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_membre_get', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/equipe/membres - Créer un membre
  fastify.post('/membres', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_membre_create', body);
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // PUT /api/equipe/membres/:id - Modifier un membre
  fastify.put('/membres/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_membre_update', { id, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // DELETE /api/equipe/membres/:id - Supprimer un membre
  fastify.delete('/membres/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_membre_delete', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // ═══════════════════════════════════════
  // ABSENCES
  // ═══════════════════════════════════════

  // GET /api/equipe/absences - Liste des absences
  fastify.get('/absences', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { membreId?: string; type?: string; statut?: string; dateFrom?: string; dateTo?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_absences_list', {
        membreId: query.membreId,
        type: query.type,
        statut: query.statut,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/equipe/absences - Créer une absence
  fastify.post('/absences', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_absence_create', body);
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // PUT /api/equipe/absences/:id - Modifier une absence (approuver/refuser)
  fastify.put('/absences/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_absence_update', { id, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // DELETE /api/equipe/absences/:id - Supprimer une absence
  fastify.delete('/absences/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_absence_delete', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // ═══════════════════════════════════════
  // POINTAGE
  // ═══════════════════════════════════════

  // GET /api/equipe/pointages - Liste des pointages
  fastify.get('/pointages', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { membreId?: string; dateFrom?: string; dateTo?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_pointages_list', {
        membreId: query.membreId,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/equipe/pointages - Créer un pointage
  fastify.post('/pointages', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_pointage_create', body);
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // PUT /api/equipe/pointages/:id - Modifier un pointage
  fastify.put('/pointages/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_pointage_update', { id, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // DELETE /api/equipe/pointages/:id - Supprimer un pointage
  fastify.delete('/pointages/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_pointage_delete', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // GET /api/equipe/dashboard - KPIs équipe
  fastify.get('/dashboard', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_dashboard', {});
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });
}
