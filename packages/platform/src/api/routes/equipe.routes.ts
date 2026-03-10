import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-errors.js';

/* ── Schemas ───────────────────────────────────────────────── */

const idParamsSchema = z.object({ id: z.string().min(1) });

const membresListQuery = z.object({
  departement: z.string().optional(),
  actif: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  search: z.string().optional(),
});

const absencesListQuery = z.object({
  membreId: z.string().optional(),
  type: z.string().optional(),
  statut: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const pointagesListQuery = z.object({
  membreId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
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

export async function equipeRoutes(fastify: FastifyInstance) {
  // ═══════════════════════════════════════
  // MEMBRES
  // ═══════════════════════════════════════

  // GET /api/equipe/membres - Liste des membres
  fastify.get('/membres', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = membresListQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_membres_list', {
      departement: query.departement,
      actif: query.actif,
      search: query.search,
    });
    return reply.send(result);
  });

  // GET /api/equipe/membres/:id - Détail membre
  fastify.get('/membres/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_membre_get', { id });
    return reply.send(result);
  });

  // POST /api/equipe/membres - Créer un membre
  fastify.post('/membres', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = request.body as Record<string, unknown>;
    const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_membre_create', body);
    return reply.send(result);
  });

  // PUT /api/equipe/membres/:id - Modifier un membre
  fastify.put('/membres/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;
    const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_membre_update', { id, ...body });
    return reply.send(result);
  });

  // DELETE /api/equipe/membres/:id - Supprimer un membre
  fastify.delete('/membres/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_membre_delete', { id });
    return reply.send(result);
  });

  // ═══════════════════════════════════════
  // ABSENCES
  // ═══════════════════════════════════════

  // GET /api/equipe/absences - Liste des absences
  fastify.get('/absences', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = absencesListQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_absences_list', {
      membreId: query.membreId,
      type: query.type,
      statut: query.statut,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
    return reply.send(result);
  });

  // POST /api/equipe/absences - Créer une absence
  fastify.post('/absences', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = request.body as Record<string, unknown>;
    const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_absence_create', body);
    return reply.send(result);
  });

  // PUT /api/equipe/absences/:id - Modifier une absence (approuver/refuser)
  fastify.put('/absences/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;
    const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_absence_update', { id, ...body });
    return reply.send(result);
  });

  // DELETE /api/equipe/absences/:id - Supprimer une absence
  fastify.delete('/absences/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_absence_delete', { id });
    return reply.send(result);
  });

  // ═══════════════════════════════════════
  // POINTAGE
  // ═══════════════════════════════════════

  // GET /api/equipe/pointages - Liste des pointages
  fastify.get('/pointages', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = pointagesListQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_pointages_list', {
      membreId: query.membreId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
    return reply.send(result);
  });

  // POST /api/equipe/pointages - Créer un pointage
  fastify.post('/pointages', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = request.body as Record<string, unknown>;
    const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_pointage_create', body);
    return reply.send(result);
  });

  // PUT /api/equipe/pointages/:id - Modifier un pointage
  fastify.put('/pointages/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;
    const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_pointage_update', { id, ...body });
    return reply.send(result);
  });

  // DELETE /api/equipe/pointages/:id - Supprimer un pointage
  fastify.delete('/pointages/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_pointage_delete', { id });
    return reply.send(result);
  });

  // GET /api/equipe/dashboard - KPIs équipe
  fastify.get('/dashboard', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_dashboard', {});
    return reply.send(result);
  });
}
