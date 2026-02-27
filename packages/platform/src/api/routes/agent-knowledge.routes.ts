import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { n8nService } from '../../services/n8n.service.js';
import { isN8nInternalRequest } from '../../middleware/auth.middleware.js';
import { z } from 'zod';
import { ApiError } from '../../utils/api-errors.js';

// Catégories valides
const CATEGORIES = ['faq', 'info_entreprise', 'services', 'tarifs', 'politiques', 'actions', 'autre'] as const;

// Schéma de validation pour la création
const createSchema = z.object({
  titre: z.string().min(1, 'Le titre est requis'),
  contenu: z.string().min(1, 'Le contenu est requis'),
  categorie: z.enum(CATEGORIES).optional().default('faq'),
  motsCles: z.string().optional().nullable(),
  actif: z.boolean().optional().default(true),
  ordre: z.number().int().optional().default(0),
});

// Schéma de validation pour la mise à jour
const updateSchema = z.object({
  titre: z.string().min(1).optional(),
  contenu: z.string().min(1).optional(),
  categorie: z.enum(CATEGORIES).optional(),
  motsCles: z.string().optional().nullable(),
  actif: z.boolean().optional(),
  ordre: z.number().int().optional(),
});

export async function agentKnowledgeRoutes(fastify: FastifyInstance) {
  // ═══════════════════════════════════════════════════
  // GET /  —  Liste paginée avec filtres
  // ═══════════════════════════════════════════════════
  fastify.get('/', {
    preHandler: [
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (isN8nInternalRequest(request)) return;
        await fastify.authenticate(request, reply);
      },
    ],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.badRequest(reply, 'Tenant ID manquant');

      const query = request.query as {
        categorie?: string;
        actif?: string;
        search?: string;
        page?: string;
        limit?: string;
      };

      const result = await n8nService.callWorkflowReturn<{ entries: unknown[]; total: number; page: number; limit: number; totalPages: number }>(
        tenantId,
        'agent_knowledge_list',
        {
          categorie: query.categorie || null,
          actif: query.actif !== undefined ? query.actif : null,
          search: query.search || null,
          page: query.page ? parseInt(query.page) : 1,
          limit: query.limit ? parseInt(query.limit) : 50,
        }
      );

      const raw = result.data as { entries?: unknown[]; total?: number; page?: number; limit?: number; totalPages?: number };
      const entries = Array.isArray(raw.entries) ? raw.entries : [];

      return reply.send({
        success: true,
        data: {
          entries,
          total: raw.total || 0,
          page: raw.page || 1,
          limit: raw.limit || 50,
          totalPages: raw.totalPages || 1,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur interne';
      return ApiError.internal(reply, message);
    }
  });

  // ═══════════════════════════════════════════════════
  // GET /:id  —  Détail d'une entrée
  // ═══════════════════════════════════════════════════
  fastify.get('/:id', {
    preHandler: [
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (isN8nInternalRequest(request)) return;
        await fastify.authenticate(request, reply);
      },
    ],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.badRequest(reply, 'Tenant ID manquant');

      const { id } = request.params as { id: string };
      if (!id) return ApiError.badRequest(reply, 'ID manquant');

      const result = await n8nService.callWorkflowReturn<{ entry: unknown }>(
        tenantId,
        'agent_knowledge_get',
        { id }
      );

      const raw = result.data as { entry?: unknown };
      if (!raw.entry) return ApiError.notFound(reply, 'Entrée non trouvée');

      return reply.send({
        success: true,
        data: { entry: raw.entry },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur interne';
      return ApiError.internal(reply, message);
    }
  });

  // ═══════════════════════════════════════════════════
  // POST /  —  Créer une entrée
  // ═══════════════════════════════════════════════════
  fastify.post('/', {
    preHandler: [
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (isN8nInternalRequest(request)) return;
        await fastify.authenticate(request, reply);
      },
    ],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = isN8nInternalRequest(request);
      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.badRequest(reply, 'Tenant ID manquant');

      const body = request.body as Record<string, unknown>;
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) {
        return ApiError.badRequest(reply, parsed.error.errors.map(e => e.message).join(', '));
      }

      const result = await n8nService.callWorkflowReturn<{ entry: unknown }>(
        tenantId,
        'agent_knowledge_create',
        parsed.data
      );

      const raw = result.data as { entry?: unknown };

      return reply.status(201).send({
        success: true,
        message: 'Entrée créée avec succès',
        data: { entry: raw.entry },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur interne';
      return ApiError.internal(reply, message);
    }
  });

  // ═══════════════════════════════════════════════════
  // PUT /:id  —  Modifier une entrée
  // ═══════════════════════════════════════════════════
  fastify.put('/:id', {
    preHandler: [
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (isN8nInternalRequest(request)) return;
        await fastify.authenticate(request, reply);
      },
    ],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = isN8nInternalRequest(request);
      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.badRequest(reply, 'Tenant ID manquant');

      const { id } = request.params as { id: string };
      if (!id) return ApiError.badRequest(reply, 'ID manquant');

      const body = request.body as Record<string, unknown>;
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        return ApiError.badRequest(reply, parsed.error.errors.map(e => e.message).join(', '));
      }

      const result = await n8nService.callWorkflowReturn<{ entry: unknown }>(
        tenantId,
        'agent_knowledge_update',
        { id, ...parsed.data }
      );

      const raw = result.data as { entry?: unknown };

      return reply.send({
        success: true,
        message: 'Entrée mise à jour avec succès',
        data: { entry: raw.entry },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur interne';
      return ApiError.internal(reply, message);
    }
  });

  // ═══════════════════════════════════════════════════
  // DELETE /:id  —  Supprimer une entrée
  // ═══════════════════════════════════════════════════
  fastify.delete('/:id', {
    preHandler: [
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (isN8nInternalRequest(request)) return;
        await fastify.authenticate(request, reply);
      },
    ],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = isN8nInternalRequest(request);
      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.badRequest(reply, 'Tenant ID manquant');

      const { id } = request.params as { id: string };
      if (!id) return ApiError.badRequest(reply, 'ID manquant');

      await n8nService.callWorkflowReturn(
        tenantId,
        'agent_knowledge_delete',
        { id }
      );

      return reply.send({
        success: true,
        message: 'Entrée supprimée avec succès',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur interne';
      return ApiError.internal(reply, message);
    }
  });
}
