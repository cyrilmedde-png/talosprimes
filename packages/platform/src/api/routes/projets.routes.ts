import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-errors.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';

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

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'projets_list', {
        statut: query.statut,
        clientId: query.clientId,
        responsableId: query.responsableId,
        search: query.search,
      });
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n projets_list failed, fallback Prisma');

      const where: Record<string, unknown> = { tenantId };
      if (query.statut) where.statut = query.statut;
      if (query.clientId) where.clientId = query.clientId;
      if (query.responsableId) where.responsableId = query.responsableId;
      if (query.search) {
        where.OR = [
          { nom: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const projets = await prisma.projet.findMany({
        where,
        include: { client: { select: { id: true, nom: true } }, taches: { select: { id: true, statut: true } } },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ success: true, data: { projets } });
    }
  });

  // GET /api/projets/stats/dashboard - KPIs projets (MUST be before /:id)
  fastify.get('/stats/dashboard', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'projets_dashboard', {});
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n projets_dashboard failed, fallback Prisma');

      const [totalProjets, projetsActifs, projetsTermines, tachesTotal, tachesTerminees] = await Promise.all([
        prisma.projet.count({ where: { tenantId } }),
        prisma.projet.count({ where: { tenantId, statut: { in: ['en_cours', 'actif'] } } }),
        prisma.projet.count({ where: { tenantId, statut: 'termine' } }),
        prisma.projetTache.count({ where: { tenantId } }),
        prisma.projetTache.count({ where: { tenantId, statut: 'terminee' } }),
      ]);

      const projetsAvecBudget = await prisma.projet.findMany({
        where: { tenantId, budgetPrevu: { not: null } },
        select: { budgetPrevu: true, budgetConsomme: true, progression: true },
      });

      const progressionMoyenne = projetsAvecBudget.length > 0
        ? Math.round(projetsAvecBudget.reduce((sum: number, p: { progression: number }) => sum + p.progression, 0) / projetsAvecBudget.length)
        : 0;

      return reply.send({
        success: true,
        data: {
          totalProjets,
          projetsActifs,
          projetsTermines,
          tachesTotal,
          tachesTerminees,
          tauxCompletionTaches: tachesTotal > 0 ? Math.round((tachesTerminees / tachesTotal) * 100) : 0,
          progressionMoyenne,
        },
      });
    }
  });

  // GET /api/projets/:id - Détail projet
  fastify.get('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'projet_get', { id });
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n projet_get failed, fallback Prisma');

      const projet = await prisma.projet.findFirst({
        where: { id, tenantId },
        include: {
          client: { select: { id: true, nom: true } },
          taches: { orderBy: { ordre: 'asc' } },
        },
      });

      if (!projet) {
        return reply.code(404).send({ success: false, error: 'Projet non trouvé' });
      }

      return reply.send({ success: true, data: { projet } });
    }
  });

  // POST /api/projets - Créer un projet
  fastify.post('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = request.body as Record<string, unknown>;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'projet_create', body);
      return reply.code(201).send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n projet_create failed, fallback Prisma');

      const { nom, description, clientId, responsableId, statut, dateDebut, dateFin, budgetPrevu, couleur, tags, notes } = body;

      const projet = await prisma.projet.create({
        data: {
          tenantId,
          nom: nom as string,
          ...(description != null && { description: description as string }),
          ...(clientId != null && { clientId: clientId as string }),
          ...(responsableId != null && { responsableId: responsableId as string }),
          ...(statut != null && { statut: statut as string }),
          ...(dateDebut != null && { dateDebut: new Date(dateDebut as string) }),
          ...(dateFin != null && { dateFin: new Date(dateFin as string) }),
          ...(budgetPrevu != null && { budgetPrevu: budgetPrevu as number }),
          ...(couleur != null && { couleur: couleur as string }),
          ...(tags != null && { tags: tags as string[] }),
          ...(notes != null && { notes: notes as string }),
        } as any,
      });

      return reply.code(201).send({ success: true, data: { projet } });
    }
  });

  // PUT /api/projets/:id - Modifier un projet
  fastify.put('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'projet_update', { id, ...body });
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n projet_update failed, fallback Prisma');

      const existing = await prisma.projet.findFirst({ where: { id, tenantId } });
      if (!existing) {
        return reply.code(404).send({ success: false, error: 'Projet non trouvé' });
      }

      const { nom, description, clientId, responsableId, statut, dateDebut, dateFin, budgetPrevu, budgetConsomme, progression, couleur, tags, notes } = body;
      const updateData: Record<string, unknown> = {};
      if (nom !== undefined) updateData.nom = nom;
      if (description !== undefined) updateData.description = description;
      if (clientId !== undefined) updateData.clientId = clientId;
      if (responsableId !== undefined) updateData.responsableId = responsableId;
      if (statut !== undefined) updateData.statut = statut;
      if (dateDebut !== undefined) updateData.dateDebut = dateDebut ? new Date(dateDebut as string) : null;
      if (dateFin !== undefined) updateData.dateFin = dateFin ? new Date(dateFin as string) : null;
      if (budgetPrevu !== undefined) updateData.budgetPrevu = budgetPrevu;
      if (budgetConsomme !== undefined) updateData.budgetConsomme = budgetConsomme;
      if (progression !== undefined) updateData.progression = progression;
      if (couleur !== undefined) updateData.couleur = couleur;
      if (tags !== undefined) updateData.tags = tags;
      if (notes !== undefined) updateData.notes = notes;

      const projet = await prisma.projet.update({
        where: { id },
        data: updateData as any,
      });

      return reply.send({ success: true, data: { projet } });
    }
  });

  // DELETE /api/projets/:id - Supprimer un projet
  fastify.delete('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'projet_delete', { id });
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n projet_delete failed, fallback Prisma');

      const existing = await prisma.projet.findFirst({ where: { id, tenantId } });
      if (!existing) {
        return reply.code(404).send({ success: false, error: 'Projet non trouvé' });
      }

      // Supprimer les tâches associées d'abord
      await prisma.projetTache.deleteMany({ where: { projetId: id, tenantId } });
      await prisma.projet.delete({ where: { id } });

      return reply.send({ success: true, data: { message: 'Projet supprimé' } });
    }
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

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'projet_taches_list', {
        projetId,
        statut: query.statut,
        priorite: query.priorite,
        assigneA: query.assigneA,
      });
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n projet_taches_list failed, fallback Prisma');

      const where: Record<string, unknown> = { tenantId, projetId };
      if (query.statut) where.statut = query.statut;
      if (query.priorite) where.priorite = query.priorite;
      if (query.assigneA) where.assigneA = query.assigneA;

      const taches = await prisma.projetTache.findMany({
        where,
        orderBy: [{ ordre: 'asc' }, { createdAt: 'desc' }],
      });

      return reply.send({ success: true, data: { taches } });
    }
  });

  // POST /api/projets/:projetId/taches - Créer une tâche
  fastify.post('/:projetId/taches', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { projetId } = projetIdParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'projet_tache_create', { projetId, ...body });
      return reply.code(201).send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n projet_tache_create failed, fallback Prisma');

      // Vérifier que le projet existe et appartient au tenant
      const projet = await prisma.projet.findFirst({ where: { id: projetId, tenantId } });
      if (!projet) {
        return reply.code(404).send({ success: false, error: 'Projet non trouvé' });
      }

      const { titre, description, assigneA, priorite, statut, dateEcheance, heuresEstimees, ordre, parentId } = body;

      const tache = await prisma.projetTache.create({
        data: {
          tenantId,
          projetId,
          titre: titre as string,
          ...(description != null && { description: description as string }),
          ...(assigneA != null && { assigneA: assigneA as string }),
          ...(priorite != null && { priorite: priorite as string }),
          ...(statut != null && { statut: statut as string }),
          ...(dateEcheance != null && { dateEcheance: new Date(dateEcheance as string) }),
          ...(heuresEstimees != null && { heuresEstimees: heuresEstimees as number }),
          ...(ordre != null && { ordre: ordre as number }),
          ...(parentId != null && { parentId: parentId as string }),
        } as any,
      });

      return reply.code(201).send({ success: true, data: { tache } });
    }
  });

  // PUT /api/projets/taches/:id - Modifier une tâche
  fastify.put('/taches/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'projet_tache_update', { id, ...body });
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n projet_tache_update failed, fallback Prisma');

      const existing = await prisma.projetTache.findFirst({ where: { id, tenantId } });
      if (!existing) {
        return reply.code(404).send({ success: false, error: 'Tâche non trouvée' });
      }

      const { titre, description, assigneA, priorite, statut, dateEcheance, heuresEstimees, heuresReelles, ordre, parentId } = body;
      const updateData: Record<string, unknown> = {};
      if (titre !== undefined) updateData.titre = titre;
      if (description !== undefined) updateData.description = description;
      if (assigneA !== undefined) updateData.assigneA = assigneA;
      if (priorite !== undefined) updateData.priorite = priorite;
      if (statut !== undefined) updateData.statut = statut;
      if (dateEcheance !== undefined) updateData.dateEcheance = dateEcheance ? new Date(dateEcheance as string) : null;
      if (heuresEstimees !== undefined) updateData.heuresEstimees = heuresEstimees;
      if (heuresReelles !== undefined) updateData.heuresReelles = heuresReelles;
      if (ordre !== undefined) updateData.ordre = ordre;
      if (parentId !== undefined) updateData.parentId = parentId;

      const tache = await prisma.projetTache.update({
        where: { id },
        data: updateData as any,
      });

      return reply.send({ success: true, data: { tache } });
    }
  });

  // DELETE /api/projets/taches/:id - Supprimer une tâche
  fastify.delete('/taches/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'projet_tache_delete', { id });
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n projet_tache_delete failed, fallback Prisma');

      const existing = await prisma.projetTache.findFirst({ where: { id, tenantId } });
      if (!existing) {
        return reply.code(404).send({ success: false, error: 'Tâche non trouvée' });
      }

      // Supprimer les sous-tâches d'abord
      await prisma.projetTache.deleteMany({ where: { parentId: id, tenantId } });
      await prisma.projetTache.delete({ where: { id } });

      return reply.send({ success: true, data: { message: 'Tâche supprimée' } });
    }
  });
}
