import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';

export async function comptabiliteRoutes(fastify: FastifyInstance) {
  // POST /api/comptabilite/init - Initialiser le plan comptable PCG + journaux + exercice
  fastify.post('/init', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const result = await n8nService.callWorkflowReturn(tenantId, 'compta_init', {});
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // GET /api/comptabilite/dashboard - KPIs comptables
  fastify.get('/dashboard', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { dateFrom?: string; dateTo?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'compta_dashboard', {
        dateFrom: query.dateFrom, dateTo: query.dateTo,
      });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // GET /api/comptabilite/plan-comptable - Liste plan comptable
  fastify.get('/plan-comptable', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { classe?: string; search?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'compta_plan_comptable_list', {
        classe: query.classe ? parseInt(query.classe) : undefined, search: query.search,
      });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // GET /api/comptabilite/ecritures - Liste des écritures
  fastify.get('/ecritures', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { page?: string; limit?: string; journalCode?: string; statut?: string; dateFrom?: string; dateTo?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'compta_ecritures_list', {
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 20,
        journalCode: query.journalCode,
        statut: query.statut,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // GET /api/comptabilite/ecritures/:id - Détail d'une écriture
  fastify.get('/ecritures/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const { id } = request.params as { id: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'compta_ecriture_get', { ecritureId: id });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // POST /api/comptabilite/ecritures - Créer une écriture
  fastify.post('/ecritures', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const body = request.body as any;
      const result = await n8nService.callWorkflowReturn(tenantId, 'compta_ecriture_create', { ...body });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // GET /api/comptabilite/grand-livre - Grand Livre
  fastify.get('/grand-livre', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { dateFrom?: string; dateTo?: string; compteFrom?: string; compteTo?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'compta_grand_livre', { ...query });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // GET /api/comptabilite/balance - Balance des comptes
  fastify.get('/balance', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { dateFrom?: string; dateTo?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'compta_balance', { ...query });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // GET /api/comptabilite/bilan - Bilan
  fastify.get('/bilan', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { dateFrom?: string; dateTo?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'compta_bilan', { ...query });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // GET /api/comptabilite/compte-resultat - Compte de Résultat
  fastify.get('/compte-resultat', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { dateFrom?: string; dateTo?: string };
      const result = await n8nService.callWorkflowReturn(tenantId, 'compta_compte_resultat', { ...query });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // GET /api/comptabilite/tva - Déclaration TVA
  fastify.get('/tva', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const query = request.query as { dateFrom: string; dateTo: string; typeDeclaration?: string };
      if (!query.dateFrom || !query.dateTo) {
        return reply.status(400).send({ success: false, error: 'dateFrom et dateTo requis' });
      }
      const result = await n8nService.callWorkflowReturn(tenantId, 'compta_tva', { ...query });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // POST /api/comptabilite/ia-agent - Agent IA Comptable
  fastify.post('/ia-agent', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const body = request.body as any;
      if (!body.action) return reply.status(400).send({ success: false, error: 'action requise' });

      const result = await n8nService.callWorkflowReturn(tenantId, 'compta_ia_agent', { ...body });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // POST /api/comptabilite/cloture - Clôture d'exercice
  fastify.post('/cloture', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const body = request.body as any;
      if (!body.exerciceId) return reply.status(400).send({ success: false, error: 'exerciceId requis' });

      const result = await n8nService.callWorkflowReturn(tenantId, 'compta_cloture', { ...body });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // POST /api/comptabilite/lettrage - Lettrage de comptes
  fastify.post('/lettrage', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const body = request.body as any;
      if (!body.numeroCompte || !body.ligneIds) {
        return reply.status(400).send({ success: false, error: 'numeroCompte et ligneIds requis' });
      }

      const result = await n8nService.callWorkflowReturn(tenantId, 'compta_lettrage', { ...body });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
}
