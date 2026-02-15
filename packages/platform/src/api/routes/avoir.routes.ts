import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';

const lineSchema = z.object({
  codeArticle: z.string().optional().nullable(),
  designation: z.string().min(1),
  quantite: z.number().int().positive().default(1),
  prixUnitaireHt: z.number().positive(),
});

const createSchema = z.object({
  clientFinalId: z.string().uuid(),
  invoiceId: z.string().uuid().optional().nullable(),
  montantHt: z.number().positive(),
  tvaTaux: z.number().min(0).max(100).default(20),
  dateAvoir: z.string().datetime({ offset: true }).optional().nullable(),
  motif: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  lines: z.array(lineSchema).optional(),
});

const paramsSchema = z.object({ id: z.string().uuid() });

export async function avoirRoutes(fastify: FastifyInstance) {
  // GET /api/avoir - Liste
  fastify.get('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      const query = request.query as { page?: string; limit?: string; statut?: string; clientFinalId?: string };
      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 20;

      // Appel frontend → tout passe par n8n, pas de fallback BDD
      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ avoir: unknown[]; count: number; total: number; totalPages: number }>(
          tenantId,
          'avoir_list',
          {
            page,
            limit,
            statut: query.statut,
            clientFinalId: query.clientFinalId,
          }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n — workflow avoir_list indisponible' });
        }
        const raw = res.data as { avoir?: unknown[]; count?: number; total?: number; page?: number; limit?: number; totalPages?: number };
        const avoir = Array.isArray(raw.avoir) ? raw.avoir : [];
        return reply.status(200).send({
          success: true,
          data: {
            avoir,
            count: avoir.length,
            total: raw.total ?? avoir.length,
            page: raw.page ?? 1,
            limit: raw.limit ?? 20,
            totalPages: raw.totalPages ?? 1,
          },
        });
      }

      // Appel depuis n8n (callback) → lecture BDD directe
      const skip = (page - 1) * limit;
      const where: Record<string, unknown> = { tenantId };
      if (query.statut) where.statut = query.statut as 'brouillon' | 'validee' | 'annulee';
      if (query.clientFinalId) where.clientFinalId = query.clientFinalId;

      const [avoir, total] = await Promise.all([
        prisma.avoir.findMany({
          where,
          skip,
          take: limit,
          include: {
            clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
            lines: { orderBy: { ordre: 'asc' } },
          },
          orderBy: { dateAvoir: 'desc' },
        }),
        prisma.avoir.count({ where }),
      ]);

      return reply.status(200).send({
        success: true,
        data: { avoir, count: avoir.length, total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      fastify.log.error(error, 'Erreur liste avoir');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // GET /api/avoir/:id
  fastify.get('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      const params = paramsSchema.parse(request.params);

      // Appel frontend → tout passe par n8n, pas de fallback BDD
      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ avoir: unknown }>(
          tenantId,
          'avoir_get',
          { avoirId: params.id }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n — workflow avoir_get indisponible' });
        }
        return reply.status(200).send({
          success: true,
          data: res.data,
        });
      }

      // Appel depuis n8n (callback) → lecture BDD directe
      const where: Record<string, unknown> = { id: params.id };
      if (tenantId) {
        where.tenantId = tenantId;
      }

      const avoir = await prisma.avoir.findFirst({
        where,
        include: {
          clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true, adresse: true, telephone: true } },
          lines: { orderBy: { ordre: 'asc' } },
        },
      });

      if (!avoir) return reply.status(404).send({ success: false, error: 'Avoir non trouvé' });
      return reply.status(200).send({ success: true, data: { avoir } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: 'Validation échouée', details: error.errors });
      }
      fastify.log.error(error, 'Erreur récupération avoir');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // POST /api/avoir - Créer
  fastify.post('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const body = createSchema.parse(request.body);

      const tenantId = fromN8n
        ? (body as { tenantId?: string }).tenantId || request.tenantId
        : request.tenantId;

      if (!tenantId) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      const client = await prisma.clientFinal.findFirst({
        where: { id: body.clientFinalId, tenantId }
      });
      if (!client) return reply.status(404).send({ success: false, error: 'Client non trouvé' });

      // Application no-code : création passe par n8n si appel depuis frontend
      if (!fromN8n) {
        const bodyWithoutTenantId = { ...body };
        if ('tenantId' in bodyWithoutTenantId) {
          delete (bodyWithoutTenantId as { tenantId?: string }).tenantId;
        }

        const res = await n8nService.callWorkflowReturn<{ avoir: unknown }>(
          tenantId,
          'avoir_create',
          { ...bodyWithoutTenantId, tenantId }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }

        return reply.status(201).send({
          success: true,
          message: 'Avoir créé via n8n',
          data: res.data,
        });
      }

      // Appel depuis n8n (callback) : persister en base
      const count = await prisma.avoir.count({ where: { tenantId } });
      const year = new Date().getFullYear();
      const numeroAvoir = `AVO-${year}-${String(count + 1).padStart(6, '0')}`;

      const tvaTaux = body.tvaTaux ?? 20;
      const montantTtc = Number((body.montantHt * (1 + tvaTaux / 100)).toFixed(2));
      const dateAvoir = body.dateAvoir ? new Date(body.dateAvoir) : new Date();

      const avoir = await prisma.avoir.create({
        data: {
          tenantId,
          clientFinalId: body.clientFinalId,
          invoiceId: body.invoiceId ?? null,
          numeroAvoir,
          dateAvoir,
          montantHt: body.montantHt,
          montantTtc,
          tvaTaux,
          motif: body.motif,
          description: body.description,
          statut: 'brouillon',
          ...(body.lines && body.lines.length > 0 ? {
            lines: {
              create: body.lines.map((l, i) => ({
                codeArticle: l.codeArticle ?? null,
                designation: l.designation,
                quantite: l.quantite ?? 1,
                prixUnitaireHt: l.prixUnitaireHt,
                totalHt: (l.quantite ?? 1) * l.prixUnitaireHt,
                ordre: i,
              })),
            },
          } : {}),
        },
        include: {
          clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
          lines: true,
        },
      });

      return reply.status(201).send({
        success: true,
        message: 'Avoir créé',
        data: { avoir },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: 'Validation échouée', details: error.errors });
      }
      fastify.log.error(error, 'Erreur création avoir');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // PUT /api/avoir/:id/validate - Valider l'avoir (brouillon → validée)
  fastify.put('/:id/validate', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);
      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      const avoir = await prisma.avoir.findFirst({ where: { id: params.id, tenantId } });
      if (!avoir) return reply.status(404).send({ success: false, error: 'Non trouvé' });
      if (avoir.statut !== 'brouillon') return reply.status(400).send({ success: false, error: 'Seul un brouillon peut être validé' });

      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ avoir: unknown }>(
          tenantId,
          'avoir_validate',
          { avoirId: params.id }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }
        return reply.status(200).send({
          success: true,
          message: 'Avoir validé via n8n',
          data: res.data,
        });
      }

      const updated = await prisma.avoir.update({
        where: { id: params.id },
        data: { statut: 'validee' },
        include: { clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } } },
      });

      return reply.status(200).send({ success: true, message: 'Avoir validé', data: { avoir: updated } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: 'Validation échouée', details: error.errors });
      }
      fastify.log.error(error, 'Erreur validation avoir');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // DELETE /api/avoir/:id
  fastify.delete('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);
      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      const avoir = await prisma.avoir.findFirst({ where: { id: params.id, tenantId } });
      if (!avoir) return reply.status(404).send({ success: false, error: 'Non trouvé' });
      if (avoir.statut === 'annulee') return reply.status(400).send({ success: false, error: 'Impossible de supprimer un avoir déjà annulé' });

      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ success: boolean }>(
          tenantId,
          'avoir_delete',
          { avoirId: params.id }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }
        return reply.status(200).send({
          success: true,
          message: 'Avoir supprimé via n8n',
        });
      }

      await prisma.avoir.delete({ where: { id: params.id } });
      return reply.status(200).send({ success: true, message: 'Avoir supprimé' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: 'Validation échouée', details: error.errors });
      }
      fastify.log.error(error, 'Erreur suppression avoir');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });
}
