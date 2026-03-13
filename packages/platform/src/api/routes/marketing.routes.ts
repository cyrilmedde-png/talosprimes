import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { prisma } from '../../config/database.js';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-errors.js';
import { env } from '../../config/env.js';

/** Répertoire pour les images marketing */
const MARKETING_UPLOADS_DIR = join(process.cwd(), 'uploads', 'marketing');

/** Extensions autorisées */
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

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

const generateContentSchema = z.object({
  plateforme: z.enum(['facebook', 'instagram', 'tiktok']),
  type: z.enum(['module_presentation', 'astuce', 'temoignage', 'promo']),
  sujet: z.string().min(1).max(255),
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

  // ── POST /upload — Upload d'image pour publication ────────────
  fastify.post(
    '/upload',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: AuthRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      try {
        const file = await (request as any).file();
        if (!file) {
          return ApiError.badRequest(reply, 'Aucun fichier envoyé');
        }

        // Vérifier le type MIME
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          return ApiError.badRequest(reply, `Type de fichier non autorisé. Types acceptés : JPG, PNG, GIF, WebP`);
        }

        // Vérifier l'extension
        const ext = extname(file.filename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(ext)) {
          return ApiError.badRequest(reply, `Extension non autorisée. Extensions acceptées : ${[...ALLOWED_EXTENSIONS].join(', ')}`);
        }

        // Lire le contenu du fichier
        const buffer = await file.toBuffer();

        // Vérifier la taille (10 Mo max)
        if (buffer.length > 10 * 1024 * 1024) {
          return ApiError.badRequest(reply, 'Fichier trop volumineux (max 10 Mo)');
        }

        // Créer le dossier tenant si nécessaire
        const tenantDir = join(MARKETING_UPLOADS_DIR, tenantId);
        await mkdir(tenantDir, { recursive: true });

        // Générer un nom de fichier unique
        const uniqueName = `${randomUUID()}${ext}`;
        const filePath = join(tenantDir, uniqueName);

        // Écrire le fichier
        await writeFile(filePath, buffer);

        // Construire l'URL publique
        const baseUrl = env.NODE_ENV === 'production'
          ? 'https://api.talosprimes.com'
          : `http://localhost:${env.PORT}`;
        const publicUrl = `${baseUrl}/uploads/marketing/${tenantId}/${uniqueName}`;

        return reply.send({
          success: true,
          data: {
            url: publicUrl,
            filename: file.filename,
            size: buffer.length,
            mimetype: file.mimetype,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply, 'Erreur lors de l\'upload du fichier');
      }
    }
  );

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
        const body = request.body as Record<string, unknown> || {};

        // Si un postId est fourni, charger le post depuis la BDD
        let postData: Record<string, unknown> = {};
        let postRecord: { id: string; plateforme: string; type: string; sujet: string; contenuTexte: string | null; hashtags: string | null; contenuVisuelUrl: string | null } | null = null;

        if (body.postId) {
          postRecord = await prisma.marketingPost.findFirst({
            where: { id: body.postId as string, tenantId },
            select: { id: true, plateforme: true, type: true, sujet: true, contenuTexte: true, hashtags: true, contenuVisuelUrl: true },
          });

          if (!postRecord) {
            return ApiError.notFound(reply, 'Publication introuvable');
          }

          postData = {
            post_id: postRecord.id,
            plateforme: postRecord.plateforme,
            type: postRecord.type,
            sujet: postRecord.sujet,
            contenu_texte: postRecord.contenuTexte || '',
            hashtags: postRecord.hashtags || '',
            contenu_visuel_url: postRecord.contenuVisuelUrl || '',
          };
        } else {
          // Fallback : données passées dans le body (ancien comportement)
          if (body.contenuTexte) postData.contenu_texte = body.contenuTexte;
          if (body.hashtags) postData.hashtags = body.hashtags;
          if (body.sujet) postData.sujet = body.sujet;
          if (body.type) postData.type = body.type;
          if (body.plateforme) postData.plateforme = body.plateforme;
        }

        const result = await n8nService.callWorkflowReturn(tenantId, 'marketing_auto_publish', {
          manual: true,
          ...postData,
        });

        // Si le workflow n8n a répondu avec succès, mettre à jour le status du post
        if (postRecord) {
          const n8nResult = result as Record<string, unknown> | null;
          const hasError = n8nResult && (n8nResult.error || n8nResult.status === 'erreur');

          await prisma.marketingPost.update({
            where: { id: postRecord.id },
            data: {
              status: hasError ? 'erreur' : 'publie',
              datePublication: new Date(),
              ...(hasError ? { erreurDetail: String(n8nResult?.error || 'Erreur workflow') } : {}),
              ...(!hasError && n8nResult?.postExternalId ? { postExternalId: String(n8nResult.postExternalId) } : {}),
            },
          });
        }

        return reply.send({ success: true, data: result, message: 'Publication déclenchée' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur workflow n8n';

        // Si on avait un post, marquer en erreur
        const body = request.body as Record<string, unknown> || {};
        if (body.postId) {
          try {
            await prisma.marketingPost.update({
              where: { id: body.postId as string },
              data: { status: 'erreur', erreurDetail: message },
            });
          } catch { /* ignore update error */ }
        }

        return ApiError.internal(reply, `Erreur lors de la publication : ${message}`);
      }
    }
  );

  // ── POST /generate — Générer du contenu avec l'IA ──────────────
  fastify.post(
    '/generate',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: AuthRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      if (!env.OPENAI_API_KEY) {
        return ApiError.internal(reply, 'Clé OpenAI non configurée sur le serveur');
      }

      const { plateforme, type, sujet } = generateContentSchema.parse(request.body);

      const systemPrompt = `Tu es un expert en marketing digital et community management pour TalosPrimes, une plateforme SaaS de gestion tout-en-un pour TPE/PME, artisans et BTP. Tu réponds UNIQUEMENT avec du JSON valide, sans markdown, sans backticks.`;

      const userPrompt = `Plateforme: ${plateforme}
Type de contenu: ${type}
Sujet: ${sujet}

Génère un JSON valide avec cette structure exacte:
{
  "contenuTexte": "texte de la publication adapté à ${plateforme} (${plateforme === 'tiktok' ? '150 chars max, décontracté, émojis' : plateforme === 'instagram' ? '300-500 chars, pro mais accessible' : '200-400 chars, informatif, inclure https://talosprimes.com'})",
  "hashtags": "#hashtag1 #hashtag2 #hashtag3 (${plateforme === 'instagram' ? '15-20 hashtags' : plateforme === 'tiktok' ? '5-8 hashtags tendance' : '3-5 hashtags'})"
}`;

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.8,
            max_tokens: 800,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          return ApiError.internal(reply, `Erreur OpenAI (${response.status}): ${errBody.substring(0, 200)}`);
        }

        const result = await response.json() as { choices: Array<{ message: { content: string } }> };
        const rawText = result.choices?.[0]?.message?.content || '';

        // Nettoyer le texte (enlever backticks markdown si présents)
        let cleanText = rawText.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
        if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
        cleanText = cleanText.trim();

        const generated = JSON.parse(cleanText) as { contenuTexte: string; hashtags: string };

        return reply.send({
          success: true,
          data: {
            contenuTexte: generated.contenuTexte || '',
            hashtags: generated.hashtags || '',
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur génération IA';
        return ApiError.internal(reply, `Erreur IA : ${message}`);
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
