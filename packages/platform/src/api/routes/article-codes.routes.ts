import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-errors.js';

const createSchema = z.object({
  code: z.string().min(1).max(20),
  designation: z.string().min(1),
  prixUnitaireHt: z.number().nonnegative().optional().nullable(),
  tvaTaux: z.number().min(0).max(100).optional().nullable(),
  unite: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial().extend({
  actif: z.boolean().optional(),
});

const paramsSchema = z.object({ id: z.string().uuid() });

/** Convertit un code article renvoyé par n8n (snake_case SQL) en forme attendue par le front (camelCase). */
function normalizeArticleCodeFromN8n(row: Record<string, unknown>): Record<string, unknown> {
  const toStr = (v: unknown) => (v != null ? String(v) : undefined);
  const toNum = (v: unknown) => (v != null ? Number(v) : undefined);
  const toDate = (v: unknown) => (v != null ? new Date(v as string | Date).toISOString() : undefined);
  const toBool = (v: unknown) => (v != null ? Boolean(v) : undefined);
  return {
    id: row.id,
    tenantId: row.tenant_id ?? row.tenantId,
    code: toStr(row.code),
    designation: toStr(row.designation),
    prixUnitaireHt: toNum(row.prix_unitaire_ht ?? row.prixUnitaireHt),
    tvaTaux: toNum(row.tva_taux ?? row.tvaTaux),
    unite: toStr(row.unite),
    actif: toBool(row.actif),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

/**
 * Routes pour la gestion des codes articles
 */
export async function articleCodesRoutes(fastify: FastifyInstance) {
  // GET /api/article-codes - Liste les codes articles du tenant
  fastify.get(
    '/',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const fromN8n = request.isN8nRequest === true;

        if (!tenantId && !fromN8n) {
          return ApiError.unauthorized(reply);
        }

        if (!fromN8n && tenantId) {
          const res = await n8nService.callWorkflowReturn<{ articles: unknown[] }>(
            tenantId,
            'article_codes_list',
            {}
          );
          const raw = res.data as { articles?: unknown[] };
          const articles = Array.isArray(raw.articles)
            ? raw.articles.map((art) => normalizeArticleCodeFromN8n(art as Record<string, unknown>))
            : [];
          return reply.status(200).send({
            success: true,
            data: { articles },
          });
        }

        // Appel depuis n8n (callback) → lecture BDD directe
        const articles = await prisma.articleCode.findMany({
          where: { tenantId },
          orderBy: { code: 'asc' },
        });

        return reply.status(200).send({
          success: true,
          data: { articles },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur récupération codes articles');
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/article-codes - Créer un code article
  fastify.post(
    '/',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const fromN8n = request.isN8nRequest === true;

        // Valider les données (tenantId peut être dans le body si appel depuis n8n)
        const body = createSchema.parse(request.body);

        // Récupérer le tenantId : depuis le body si appel n8n, sinon depuis request (JWT)
        const tenantId = fromN8n
          ? (body as { tenantId?: string }).tenantId || request.tenantId
          : request.tenantId;

        if (!tenantId) {
          return ApiError.unauthorized(reply);
        }

        // Vérifier droits si pas n8n
        if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return ApiError.forbidden(reply);
        }

        if (!fromN8n) {
          const res = await n8nService.callWorkflowReturn<{ article: unknown }>(
            tenantId,
            'article_code_create',
            { ...body, tenantId }
          );

          return reply.status(201).send({
            success: true,
            message: 'Code article créé via n8n',
            data: res.data,
          });
        }

        // Appel depuis n8n (callback du workflow) : persister en base
        const article = await prisma.articleCode.create({
          data: {
            tenantId,
            code: body.code,
            designation: body.designation,
            prixUnitaireHt: body.prixUnitaireHt ?? undefined,
            tvaTaux: body.tvaTaux ?? undefined,
            unite: body.unite ?? undefined,
          },
        });

        return reply.status(201).send({
          success: true,
          message: 'Code article créé',
          data: { article },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }
        // Unique constraint
        if ((error as { code?: string }).code === 'P2002') {
          return ApiError.conflict(reply, 'Ce code article existe déjà');
        }
        fastify.log.error(error, 'Erreur création code article');
        return ApiError.internal(reply);
      }
    }
  );

  // PUT /api/article-codes/:id - Modifier un code article
  fastify.put(
    '/:id',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const fromN8n = request.isN8nRequest === true;
        const params = paramsSchema.parse(request.params);
        const body = updateSchema.parse(request.body);

        const tenantId = request.tenantId;

        if (!tenantId && !fromN8n) {
          return ApiError.unauthorized(reply);
        }

        // Vérifier droits si pas n8n
        if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return ApiError.forbidden(reply);
        }

        // Vérifier que le code article existe et appartient au tenant
        const existing = await prisma.articleCode.findFirst({
          where: { id: params.id, tenantId },
        });

        if (!existing) {
          return ApiError.notFound(reply, 'Code article');
        }

        if (!fromN8n) {
          if (!tenantId) return ApiError.unauthorized(reply, 'Tenant manquant');
          const res = await n8nService.callWorkflowReturn<{ article: unknown }>(
            tenantId,
            'article_code_update',
            {
              articleCodeId: params.id,
              ...body,
            }
          );

          return reply.status(200).send({
            success: true,
            message: 'Code article mis à jour via n8n',
            data: res.data,
          });
        }

        // Appel depuis n8n (callback du workflow) : persister en base
        const article = await prisma.articleCode.update({
          where: { id: params.id },
          data: {
            code: body.code,
            designation: body.designation,
            prixUnitaireHt: body.prixUnitaireHt ?? undefined,
            tvaTaux: body.tvaTaux ?? undefined,
            unite: body.unite ?? undefined,
            actif: body.actif,
          },
        });

        return reply.status(200).send({
          success: true,
          message: 'Code article mis à jour',
          data: { article },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }
        if ((error as { code?: string }).code === 'P2002') {
          return ApiError.conflict(reply, 'Ce code article existe déjà');
        }
        fastify.log.error(error, 'Erreur modification code article');
        return ApiError.internal(reply);
      }
    }
  );

  // DELETE /api/article-codes/:id
  fastify.delete(
    '/:id',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const fromN8n = request.isN8nRequest === true;
        const params = paramsSchema.parse(request.params);

        const tenantId = request.tenantId;

        if (!tenantId && !fromN8n) {
          return ApiError.unauthorized(reply);
        }

        // Vérifier droits si pas n8n
        if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return ApiError.forbidden(reply);
        }

        // Vérifier que le code article existe et appartient au tenant
        const existing = await prisma.articleCode.findFirst({
          where: { id: params.id, tenantId },
        });

        if (!existing) {
          return ApiError.notFound(reply, 'Code article');
        }

        if (!fromN8n) {
          if (!tenantId) return ApiError.unauthorized(reply, 'Tenant manquant');
          const res = await n8nService.callWorkflowReturn<{ success: boolean }>(
            tenantId,
            'article_code_delete',
            {
              articleCodeId: params.id,
            }
          );

          return reply.status(200).send({
            success: true,
            message: 'Code article supprimé via n8n',
            data: res.data,
          });
        }

        // Appel depuis n8n (callback du workflow) : supprimer en base
        await prisma.articleCode.delete({ where: { id: params.id } });

        return reply.status(200).send({
          success: true,
          message: 'Code article supprimé',
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur suppression code article');
        return ApiError.internal(reply);
      }
    }
  );
}
