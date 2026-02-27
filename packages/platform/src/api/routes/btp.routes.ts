import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-errors.js';

/* ── Schemas ───────────────────────────────────────────────── */

const idParamsSchema = z.object({ id: z.string().min(1) });
const chantiersListQuery = z.object({
  statut: z.string().optional(),
  clientId: z.string().optional(),
  search: z.string().optional(),
});

const chantiersIdParamsSchema = z.object({ chantierId: z.string().min(1) });

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

export async function btpRoutes(fastify: FastifyInstance) {
  // ═══════════════════════════════════════
  // CHANTIERS
  // ═══════════════════════════════════════

  // GET /api/btp/chantiers - Liste des chantiers
  fastify.get('/chantiers', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = chantiersListQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'btp_chantiers_list', {
      statut: query.statut,
      clientId: query.clientId,
      search: query.search,
    });
    return reply.send(result);
  });

  // GET /api/btp/chantiers/:id - Détail chantier
  fastify.get('/chantiers/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const result = await n8nService.callWorkflowReturn(tenantId, 'btp_chantier_get', { id });
    return reply.send(result);
  });

  // POST /api/btp/chantiers - Créer un chantier
  fastify.post('/chantiers', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = request.body as Record<string, unknown>;
    const result = await n8nService.callWorkflowReturn(tenantId, 'btp_chantier_create', body);
    return reply.send(result);
  });

  // PUT /api/btp/chantiers/:id - Modifier un chantier
  fastify.put('/chantiers/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;
    const result = await n8nService.callWorkflowReturn(tenantId, 'btp_chantier_update', { id, ...body });
    return reply.send(result);
  });

  // DELETE /api/btp/chantiers/:id - Supprimer un chantier
  fastify.delete('/chantiers/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const result = await n8nService.callWorkflowReturn(tenantId, 'btp_chantier_delete', { id });
    return reply.send(result);
  });

  // ═══════════════════════════════════════
  // SITUATIONS
  // ═══════════════════════════════════════

  // GET /api/btp/chantiers/:chantierId/situations - Liste des situations
  fastify.get('/chantiers/:chantierId/situations', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { chantierId } = chantiersIdParamsSchema.parse(request.params);
    const result = await n8nService.callWorkflowReturn(tenantId, 'btp_situations_list', { chantierId });
    return reply.send(result);
  });

  // POST /api/btp/chantiers/:chantierId/situations - Créer une situation
  fastify.post('/chantiers/:chantierId/situations', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { chantierId } = chantiersIdParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;
    const result = await n8nService.callWorkflowReturn(tenantId, 'btp_situation_create', { chantierId, ...body });
    return reply.send(result);
  });

  // PUT /api/btp/situations/:id - Modifier une situation
  fastify.put('/situations/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;
    const result = await n8nService.callWorkflowReturn(tenantId, 'btp_situation_update', { id, ...body });
    return reply.send(result);
  });

  // DELETE /api/btp/situations/:id - Supprimer une situation
  fastify.delete('/situations/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const result = await n8nService.callWorkflowReturn(tenantId, 'btp_situation_delete', { id });
    return reply.send(result);
  });

  // POST /api/btp/situations/:id/valider - Valider une situation
  fastify.post('/situations/:id/valider', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const result = await n8nService.callWorkflowReturn(tenantId, 'btp_situation_valider', { id });
    return reply.send(result);
  });

  // GET /api/btp/dashboard - KPIs BTP
  fastify.get('/dashboard', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const result = await n8nService.callWorkflowReturn(tenantId, 'btp_dashboard', {});
    return reply.send(result);
  });
}
