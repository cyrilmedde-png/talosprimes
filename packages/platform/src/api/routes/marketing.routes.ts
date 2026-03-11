import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-errors.js';

// ===== ZOD SCHEMAS =====

const paramsId = z.object({ id: z.string().uuid() });

const createPostSchema = z.object({
  plateforme: z.enum(['facebook', 'instagram', 'tiktok']),
  type: z.enum(['module_presentation', 'astuce', 'temoignage', 'promo']),
  sujet: z.string().min(1).max(255),
  contenuTexte: z.string().optional().nullable(),
  contenuVisuelUrl: z.string().url().optional().nullable(),
  hashtags: z.string().optional().nullable(),
  datePublication: z.string().optional(), // ISO date
  semaineCycle: z.number().int().optional().nullable(),
});

const updatePostSchema = createPostSchema.partial().extend({
  status: z.enum(['planifie', 'publie', 'erreur']).optional(),
  postExternalId: z.string().optional().nullable(),
  engagementData: z.record(z.unknown()).optional().nullable(),
  erreurDetail: z.string().optional().nullable(),
});

const listPostsQuery = z.object({
  plateforme: z.enum(['facebook', 'instagram', 'tiktok']).optional(),
  status: z.enum(['planifie', 'publie', 'erreur']).optional(),
  type: z.enum(['module_presentation', 'astuce', 'temoignage', 'promo']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ===== TYPES =====

type AuthRequest = FastifyRequest & {
  tenantId?: string;
  user?: { role: string; nom?: string; prenom?: string };
};

// ===== ROUTES =====

export async function marketingRoutes(fastify: FastifyInstance) {

  // ── GET /posts — Liste des publications ──────────────────────
  fastify.get(
    '/posts',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: AuthRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const query = listPostsQuery.parse(request.query);

      const where: Record<string, unknown> = { tenantId };
      if (query.plateforme) where.plateforme = query.plateforme;
      if (query.status) where.status = query.status;
      if (query.type) where.type = query.type;
      if (query.dateFrom || query.dateTo) {
        where.datePublication = {
          ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
        };
      }

      const [posts, total] = await Promise.all([
        prisma.marketingPost.findMany({
          where,
          orderBy: { datePublication: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        prisma.marketingPost.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: {
          posts,
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit),
        },
      });
    }
  );

  // ── GET /posts/:id — Détail d'une publication ────────────────
  fastify.get(
    '/posts/:id',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: AuthRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const { id } = paramsId.parse(request.params);

      const post = await prisma.marketingPost.findFirst({
        where: { id, tenantId },
      });

      if (!post) return ApiError.notFound(reply, 'Publication');

      return reply.send({ success: true, data: { post } });
    }
  );

  // ── POST /posts — Créer une publication ──────────────────────
  fastify.post(
    '/posts',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: AuthRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const data = createPostSchema.parse(request.body);

      const post = await prisma.marketingPost.create({
        data: {
          tenantId,
          plateforme: data.plateforme,
          type: data.type,
          sujet: data.sujet,
          contenuTexte: data.contenuTexte ?? null,
          contenuVisuelUrl: data.contenuVisuelUrl ?? null,
          hashtags: data.hashtags ?? null,
          datePublication: data.datePublication ? new Date(data.datePublication) : new Date(),
          semaineCycle: data.semaineCycle ?? null,
          status: 'planifie',
        },
      });

      return reply.status(201).send({ success: true, data: { post } });
    }
  );

  // ── PUT /posts/:id — Modifier une publication ────────────────
  fastify.put(
    '/posts/:id',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: AuthRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const { id } = paramsId.parse(request.params);
      const data = updatePostSchema.parse(request.body);

      const existing = await prisma.marketingPost.findFirst({
        where: { id, tenantId },
      });
      if (!existing) return ApiError.notFound(reply, 'Publication');

      const updateData: Record<string, unknown> = {};
      if (data.plateforme !== undefined) updateData.plateforme = data.plateforme;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.sujet !== undefined) updateData.sujet = data.sujet;
      if (data.contenuTexte !== undefined) updateData.contenuTexte = data.contenuTexte;
      if (data.contenuVisuelUrl !== undefined) updateData.contenuVisuelUrl = data.contenuVisuelUrl;
      if (data.hashtags !== undefined) updateData.hashtags = data.hashtags;
      if (data.datePublication !== undefined) updateData.datePublication = new Date(data.datePublication);
      if (data.status !== undefined) updateData.status = data.status;
      if (data.postExternalId !== undefined) updateData.postExternalId = data.postExternalId;
      if (data.engagementData !== undefined) updateData.engagementData = data.engagementData;
      if (data.semaineCycle !== undefined) updateData.semaineCycle = data.semaineCycle;
      if (data.erreurDetail !== undefined) updateData.erreurDetail = data.erreurDetail;

      const post = await prisma.marketingPost.update({
        where: { id },
        data: updateData,
      });

      return reply.send({ success: true, data: { post } });
    }
  );

  // ── DELETE /posts/:id — Supprimer une publication ────────────
  fastify.delete(
    '/posts/:id',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: AuthRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const { id } = paramsId.parse(request.params);

      const existing = await prisma.marketingPost.findFirst({
        where: { id, tenantId },
      });
      if (!existing) return ApiError.notFound(reply, 'Publication');

      await prisma.marketingPost.delete({ where: { id } });

      return reply.send({ success: true, message: 'Publication supprimée' });
    }
  );

  // ── GET /stats — Statistiques publications ───────────────────
  fastify.get(
    '/stats',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: AuthRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const [totalPosts, parPlateforme, parStatus, parType, recent] = await Promise.all([
        prisma.marketingPost.count({ where: { tenantId } }),
        prisma.marketingPost.groupBy({
          by: ['plateforme'],
          where: { tenantId },
          _count: { id: true },
        }),
        prisma.marketingPost.groupBy({
          by: ['status'],
          where: { tenantId },
          _count: { id: true },
        }),
        prisma.marketingPost.groupBy({
          by: ['type'],
          where: { tenantId },
          _count: { id: true },
        }),
        prisma.marketingPost.findMany({
          where: { tenantId },
          orderBy: { datePublication: 'desc' },
          take: 10,
        }),
      ]);

      return reply.send({
        success: true,
        data: {
          stats: {
            totalPosts,
            parPlateforme: parPlateforme.map((p: { plateforme: string; _count: { id: number } }) => ({ plateforme: p.plateforme, count: p._count.id })),
            parStatus: parStatus.map((s: { status: string; _count: { id: number } }) => ({ status: s.status, count: s._count.id })),
            parType: parType.map((t: { type: string; _count: { id: number } }) => ({ type: t.type, count: t._count.id })),
            recentPosts: recent,
          },
        },
      });
    }
  );

  // ── GET /calendar — Calendrier éditorial (proxy n8n) ─────────
  fastify.get(
    '/calendar',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: AuthRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      try {
        const result = await n8nService.callWorkflowReturn(tenantId, 'marketing_calendar', {});
        return reply.send({ success: true, data: result });
      } catch (_error) {
        // Fallback: retourner les publications planifiées des 4 prochaines semaines
        const now = new Date();
        const in4Weeks = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

        const posts = await prisma.marketingPost.findMany({
          where: {
            tenantId,
            datePublication: { gte: now, lte: in4Weeks },
          },
          orderBy: { datePublication: 'asc' },
        });

        return reply.send({
          success: true,
          data: { calendar: posts, source: 'database' },
        });
      }
    }
  );

  // ── POST /publish — Déclencher publication via n8n ───────────
  fastify.post(
    '/publish',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: AuthRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      try {
        const result = await n8nService.callWorkflowReturn(tenantId, 'marketing_auto_publish', {
          manual: true,
        });
        return reply.send({ success: true, data: result, message: 'Publication déclenchée' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur workflow n8n';
        return ApiError.internal(reply, `Erreur lors de la publication : ${message}`);
      }
    }
  );

  // ── GET /status — Statut des dernières publications (proxy n8n) ─
  fastify.get(
    '/status',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: AuthRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      try {
        const result = await n8nService.callWorkflowReturn(tenantId, 'marketing_status', {});
        return reply.send({ success: true, data: result });
      } catch (_error) {
        // Fallback: dernières publications depuis la DB
        const posts = await prisma.marketingPost.findMany({
          where: { tenantId },
          orderBy: { datePublication: 'desc' },
          take: 20,
        });
        return reply.send({
          success: true,
          data: { posts, source: 'database' },
        });
      }
    }
  );
}
