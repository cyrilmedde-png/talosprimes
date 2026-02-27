import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-errors.js';

/* ── Schemas ───────────────────────────────────────────────── */

const dateRangeQuery = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const ecrituresListQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  journalCode: z.string().optional(),
  statut: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const planComptableQuery = z.object({
  classe: z.coerce.number().int().optional(),
  search: z.string().optional(),
});

const tvaQuery = z.object({
  dateFrom: z.string().min(1, 'dateFrom requis'),
  dateTo: z.string().min(1, 'dateTo requis'),
  typeDeclaration: z.string().optional(),
});

const idParamsSchema = z.object({ id: z.string().min(1) });

/* ── Helpers ───────────────────────────────────────────────── */

type AuthenticatedRequest = FastifyRequest & { tenantId?: string };

function getTenantId(request: AuthenticatedRequest, reply: FastifyReply): string | null {
  const tenantId = request.tenantId;
  if (!tenantId) {
    ApiError.unauthorized(reply);
    return null;
  }
  return tenantId;
}

/* ── Routes ────────────────────────────────────────────────── */

export async function comptabiliteRoutes(fastify: FastifyInstance) {

  // POST /api/comptabilite/init - Initialiser le plan comptable PCG + journaux + exercice
  fastify.post('/init', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_init', {});
    return reply.send(result);
  });

  // GET /api/comptabilite/dashboard - KPIs comptables
  fastify.get('/dashboard', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = dateRangeQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_dashboard', query);
    return reply.send(result);
  });

  // GET /api/comptabilite/plan-comptable - Liste plan comptable
  fastify.get('/plan-comptable', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = planComptableQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_plan_comptable_list', query);
    return reply.send(result);
  });

  // GET /api/comptabilite/ecritures - Liste des écritures
  fastify.get('/ecritures', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = ecrituresListQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_ecritures_list', query);
    return reply.send(result);
  });

  // GET /api/comptabilite/ecritures/:id - Détail d'une écriture
  fastify.get('/ecritures/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_ecriture_get', { ecritureId: id });
    return reply.send(result);
  });

  // POST /api/comptabilite/ecritures - Créer une écriture
  fastify.post('/ecritures', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = request.body as Record<string, unknown>;
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_ecriture_create', { ...body });
    return reply.send(result);
  });

  // GET /api/comptabilite/grand-livre - Grand Livre
  fastify.get('/grand-livre', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = dateRangeQuery.extend({
      compteFrom: z.string().optional(),
      compteTo: z.string().optional(),
    }).parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_grand_livre', query);
    return reply.send(result);
  });

  // GET /api/comptabilite/balance - Balance des comptes
  fastify.get('/balance', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = dateRangeQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_balance', query);
    return reply.send(result);
  });

  // GET /api/comptabilite/bilan - Bilan
  fastify.get('/bilan', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = dateRangeQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_bilan', query);
    return reply.send(result);
  });

  // GET /api/comptabilite/compte-resultat - Compte de Résultat
  fastify.get('/compte-resultat', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = dateRangeQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_compte_resultat', query);
    return reply.send(result);
  });

  // GET /api/comptabilite/tva - Déclaration TVA
  fastify.get('/tva', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = tvaQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_tva', query);
    return reply.send(result);
  });

  // POST /api/comptabilite/ia-agent - Agent IA Comptable
  fastify.post('/ia-agent', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = request.body as Record<string, unknown>;
    if (!body.action) return ApiError.badRequest(reply, 'action requise');

    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_ia_agent', { ...body });
    return reply.send(result);
  });

  // GET /api/comptabilite/exercices - Liste des exercices comptables
  fastify.get('/exercices', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_exercices_list', {});
    return reply.send(result);
  });

  // POST /api/comptabilite/cloture - Clôture d'exercice
  fastify.post('/cloture', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = request.body as Record<string, unknown>;
    if (!body.exerciceId) return ApiError.badRequest(reply, 'exerciceId requis');

    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_cloture', { ...body });
    return reply.send(result);
  });

  // POST /api/comptabilite/lettrage - Lettrage de comptes
  fastify.post('/lettrage', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = request.body as Record<string, unknown>;
    if (!body.numeroCompte || !body.ligneIds) {
      return ApiError.badRequest(reply, 'numeroCompte et ligneIds requis');
    }

    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_lettrage', { ...body });
    return reply.send(result);
  });
}
