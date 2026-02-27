import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-errors.js';

/* ── Schemas ───────────────────────────────────────────────── */

const idParamsSchema = z.object({ id: z.string().min(1) });
const projetIdParamsSchema = z.object({ projetId: z.string().min(1) });

const projetsListQuery = z.object({
  statut: z.string().optional(),
  clientId: z.string().optional(),
  responsableId: z.string().optional(),
  search: z.string().optional(),
});

const tachesListQuery = z.object({
  statut: z.string().optional(),
  priorite: z.string().optional(),
  assigneA: z.string().optional(),
});

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

export async function projetsRoutes(fastify: FastifyInstance) {
  // ═══════════════════════════════════════
  // PROJETS
  // ═══════════════════════════════════════

  // GET /api/projets - Liste des projets
  fastify.get('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = projetsListQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'projets_list', {
      statut: query.statut,
      clientId: query.clientId,
      responsableId: query.responsableId,
      search: query.search,
    });
    return reply.send(result);
  });

  // GET /api/projets/:id - Détail projet
  fastify.get('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const result = await n8nService.callWorkflowReturn(tenantId, 'projet_get', { id });
    return reply.send(result);
  });

  // POST /api/projets - Créer un projet
  fastify.post('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = request.body as Record<string, unknown>;
    const result = await n8nService.callWorkflowReturn(tenantId, 'projet_create', body);
    return reply.send(result);
  });

  // PUT /api/projets/:id - Modifier un projet
  fastify.put('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;
    const result = await n8nService.callWorkflowReturn(tenantId, 'projet_update', { id, ...body });
    return reply.send(result);
  });

  // DELETE /api/projets/:id - Supprimer un projet
  fastify.delete('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const result = await n8nService.callWorkflowReturn(tenantId, 'projet_delete', { id });
    return reply.send(result);
  });

  // ═══════════════════════════════════════
  // TÂCHES
  // ═══════════════════════════════════════

  // GET /api/projets/:projetId/taches - Liste des tâches du projet
  fastify.get('/:projetId/taches', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { projetId } = projetIdParamsSchema.parse(request.params);
    const query = tachesListQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'projet_taches_list', {
      projetId,
      statut: query.statut,
      priorite: query.priorite,
      assigneA: query.assigneA,
    });
    return reply.send(result);
  });

  // POST /api/projets/:projetId/taches - Créer une tâche
  fastify.post('/:projetId/taches', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { projetId } = projetIdParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;
    const result = await n8nService.callWorkflowReturn(tenantId, 'projet_tache_create', { projetId, ...body });
    return reply.send(result);
  });

  // PUT /api/projets/taches/:id - Modifier une tâche
  fastify.put('/taches/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;
    const result = await n8nService.callWorkflowReturn(tenantId, 'projet_tache_update', { id, ...body });
    return reply.send(result);
  });

  // DELETE /api/projets/taches/:id - Supprimer une tâche
  fastify.delete('/taches/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const result = await n8nService.callWorkflowReturn(tenantId, 'projet_tache_delete', { id });
    return reply.send(result);
  });

  // GET /api/projets/stats/dashboard - KPIs projets
  fastify.get('/stats/dashboard', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const result = await n8nService.callWorkflowReturn(tenantId, 'projets_dashboard', {});
    return reply.send(result);
  });
}
