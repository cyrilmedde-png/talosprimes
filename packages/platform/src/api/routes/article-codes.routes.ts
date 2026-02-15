import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';

const createSchema = z.object({
  code: z.string().min(1).max(20),
  designation: z.string().min(1),
  prixUnitaireHt: z.number().positive().optional().nullable(),
  tvaTaux: z.number().min(0).max(100).optional().nullable(),
  unite: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial().extend({
  actif: z.boolean().optional(),
});

const paramsSchema = z.object({ id: z.string().uuid() });

export async function articleCodesRoutes(fastify: FastifyInstance) {
  // GET /api/article-codes - Liste les codes articles du tenant
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });

      const articles = await prisma.articleCode.findMany({
        where: { tenantId },
        orderBy: { code: 'asc' },
      });

      return reply.send({ success: true, data: { articles } });
    } catch (error) {
      fastify.log.error(error, 'Erreur récupération codes articles');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // POST /api/article-codes - Créer un code article
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      const body = createSchema.parse(request.body);

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

      return reply.status(201).send({ success: true, data: { article } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: 'Validation échouée', details: error.errors });
      }
      // Unique constraint
      if ((error as { code?: string }).code === 'P2002') {
        return reply.status(409).send({ success: false, error: 'Ce code article existe déjà' });
      }
      fastify.log.error(error, 'Erreur création code article');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // PUT /api/article-codes/:id - Modifier un code article
  fastify.put('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      const params = paramsSchema.parse(request.params);
      const body = updateSchema.parse(request.body);

      const existing = await prisma.articleCode.findFirst({ where: { id: params.id, tenantId } });
      if (!existing) return reply.status(404).send({ success: false, error: 'Code article non trouvé' });

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

      return reply.send({ success: true, data: { article } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: 'Validation échouée', details: error.errors });
      }
      if ((error as { code?: string }).code === 'P2002') {
        return reply.status(409).send({ success: false, error: 'Ce code article existe déjà' });
      }
      fastify.log.error(error, 'Erreur modification code article');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // DELETE /api/article-codes/:id
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, error: 'Non authentifié' });
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      const params = paramsSchema.parse(request.params);
      const existing = await prisma.articleCode.findFirst({ where: { id: params.id, tenantId } });
      if (!existing) return reply.status(404).send({ success: false, error: 'Code article non trouvé' });

      await prisma.articleCode.delete({ where: { id: params.id } });
      return reply.send({ success: true, message: 'Code article supprimé' });
    } catch (error) {
      fastify.log.error(error, 'Erreur suppression code article');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });
}
