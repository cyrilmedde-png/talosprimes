import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';

export async function rhRoutes(fastify: FastifyInstance) {
  // ═══════════════════════════════════════
  // CONTRATS
  // ═══════════════════════════════════════

  // GET /api/rh/contrats - Liste des contrats
  fastify.get('/contrats', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { membreId?: string; type?: string; statut?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_contrats_list', {
        membreId: query.membreId,
        type: query.type,
        statut: query.statut,
      });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // GET /api/rh/contrats/:id - Détail contrat
  fastify.get('/contrats/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_contrat_get', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/rh/contrats - Créer un contrat
  fastify.post('/contrats', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_contrat_create', body);
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // PUT /api/rh/contrats/:id - Modifier un contrat
  fastify.put('/contrats/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_contrat_update', { id, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // DELETE /api/rh/contrats/:id - Supprimer un contrat
  fastify.delete('/contrats/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_contrat_delete', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // ═══════════════════════════════════════
  // PAIE (Bulletins de paie)
  // ═══════════════════════════════════════

  // GET /api/rh/paie - Liste des bulletins de paie
  fastify.get('/paie', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { membreId?: string; mois?: string; annee?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_paie_list', {
        membreId: query.membreId,
        mois: query.mois,
        annee: query.annee,
      });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // GET /api/rh/paie/:id - Détail bulletin de paie
  fastify.get('/paie/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_bulletin_get', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/rh/paie - Créer un bulletin de paie
  fastify.post('/paie', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_bulletin_create', body);
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // PUT /api/rh/paie/:id - Modifier un bulletin de paie
  fastify.put('/paie/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_bulletin_update', { id, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // DELETE /api/rh/paie/:id - Supprimer un bulletin de paie
  fastify.delete('/paie/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_bulletin_delete', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // ═══════════════════════════════════════
  // CONGÉS
  // ═══════════════════════════════════════

  // GET /api/rh/conges - Liste des congés
  fastify.get('/conges', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { membreId?: string; type?: string; statut?: string; dateFrom?: string; dateTo?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_conges_list', {
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

  // GET /api/rh/conges/:id - Détail congé
  fastify.get('/conges/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_conge_get', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/rh/conges - Créer un congé
  fastify.post('/conges', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_conge_create', body);
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // PUT /api/rh/conges/:id - Modifier un congé
  fastify.put('/conges/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_conge_update', { id, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // DELETE /api/rh/conges/:id - Supprimer un congé
  fastify.delete('/conges/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_conge_delete', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/rh/conges/:id/approuver - Approuver un congé
  fastify.post('/conges/:id/approuver', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_conge_approuver', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/rh/conges/:id/rejeter - Rejeter un congé
  fastify.post('/conges/:id/rejeter', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_conge_rejeter', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // ═══════════════════════════════════════
  // DOCUMENTS RH
  // ═══════════════════════════════════════

  // GET /api/rh/documents - Liste des documents RH
  fastify.get('/documents', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { membreId?: string; type?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_documents_list', {
        membreId: query.membreId,
        type: query.type,
      });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // GET /api/rh/documents/:id - Détail document
  fastify.get('/documents/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_document_get', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/rh/documents - Créer un document RH
  fastify.post('/documents', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_document_create', body);
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // PUT /api/rh/documents/:id - Modifier un document RH
  fastify.put('/documents/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_document_update', { id, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // DELETE /api/rh/documents/:id - Supprimer un document RH
  fastify.delete('/documents/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_document_delete', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // ═══════════════════════════════════════
  // ENTRETIENS
  // ═══════════════════════════════════════

  // GET /api/rh/entretiens - Liste des entretiens
  fastify.get('/entretiens', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { membreId?: string; type?: string; dateFrom?: string; dateTo?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_entretiens_list', {
        membreId: query.membreId,
        type: query.type,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // GET /api/rh/entretiens/:id - Détail entretien
  fastify.get('/entretiens/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_entretien_get', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/rh/entretiens - Créer un entretien
  fastify.post('/entretiens', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_entretien_create', body);
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // PUT /api/rh/entretiens/:id - Modifier un entretien
  fastify.put('/entretiens/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_entretien_update', { id, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // DELETE /api/rh/entretiens/:id - Supprimer un entretien
  fastify.delete('/entretiens/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_entretien_delete', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // ═══════════════════════════════════════
  // FORMATIONS
  // ═══════════════════════════════════════

  // GET /api/rh/formations - Liste des formations
  fastify.get('/formations', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { membreId?: string; statut?: string; dateFrom?: string; dateTo?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_formations_list', {
        membreId: query.membreId,
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

  // GET /api/rh/formations/:id - Détail formation
  fastify.get('/formations/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_formation_get', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/rh/formations - Créer une formation
  fastify.post('/formations', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_formation_create', body);
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // PUT /api/rh/formations/:id - Modifier une formation
  fastify.put('/formations/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_formation_update', { id, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // DELETE /api/rh/formations/:id - Supprimer une formation
  fastify.delete('/formations/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_formation_delete', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/rh/formations/:id/inscrire - Inscrire un membre à une formation
  fastify.post('/formations/:id/inscrire', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_formation_inscrire', { id, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // ═══════════════════════════════════════
  // ÉVALUATIONS
  // ═══════════════════════════════════════

  // GET /api/rh/evaluations - Liste des évaluations
  fastify.get('/evaluations', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { membreId?: string; periode?: string; annee?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_evaluations_list', {
        membreId: query.membreId,
        periode: query.periode,
        annee: query.annee,
      });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // GET /api/rh/evaluations/:id - Détail évaluation
  fastify.get('/evaluations/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_evaluation_get', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // POST /api/rh/evaluations - Créer une évaluation
  fastify.post('/evaluations', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_evaluation_create', body);
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // PUT /api/rh/evaluations/:id - Modifier une évaluation
  fastify.put('/evaluations/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_evaluation_update', { id, ...body });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // DELETE /api/rh/evaluations/:id - Supprimer une évaluation
  fastify.delete('/evaluations/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_evaluation_delete', { id });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // ═══════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════

  // GET /api/rh/dashboard - KPIs RH
  fastify.get('/dashboard', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const result = await n8nService.callWorkflowReturn(tenantId, 'rh_dashboard', {});
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ success: false, error: message });
    }
  });
}
