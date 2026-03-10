import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
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

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_membres_list', {
        departement: query.departement, actif: query.actif, search: query.search,
      });
      return reply.send(result);
    } catch (err) {
      logger.warn({ err, tenantId }, '[equipe] n8n fallback → Prisma pour membres list');
      const where: Record<string, unknown> = { tenantId };
      if (query.actif !== undefined) where.actif = query.actif;
      if (query.departement) where.departement = query.departement;
      if (query.search) {
        where.OR = [
          { nom: { contains: query.search, mode: 'insensitive' } },
          { prenom: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ];
      }
      const membres = await prisma.equipeMember.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
      });
      return reply.send({ success: true, data: { membres } });
    }
  });

  // GET /api/equipe/membres/:id - Détail membre
  fastify.get('/membres/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_membre_get', { id });
      return reply.send(result);
    } catch {
      const membre = await prisma.equipeMember.findFirst({
        where: { id, tenantId },
        include: { absences: true, pointages: { orderBy: { date: 'desc' }, take: 30 } },
      });
      if (!membre) return ApiError.notFound(reply, 'Membre non trouvé');
      return reply.send({ success: true, data: { membre } });
    }
  });

  // POST /api/equipe/membres - Créer un membre
  fastify.post('/membres', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = request.body as Record<string, unknown>;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_membre_create', body);
      return reply.send(result);
    } catch {
      const membre = await prisma.equipeMember.create({
        data: {
          tenantId,
          nom: body.nom as string,
          prenom: body.prenom as string,
          email: body.email as string,
          telephone: body.telephone as string | undefined,
          poste: body.poste as string | undefined,
          departement: body.departement as string | undefined,
          contratType: (body.contratType as any) || 'cdi',
          dateEmbauche: body.dateEmbauche ? new Date(body.dateEmbauche as string) : undefined,
          salaireBase: body.salaireBase ? Number(body.salaireBase) : undefined,
          notes: body.notes as string | undefined,
        },
      });
      return reply.code(201).send({ success: true, data: { membre } });
    }
  });

  // PUT /api/equipe/membres/:id - Modifier un membre
  fastify.put('/membres/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_membre_update', { id, ...body });
      return reply.send(result);
    } catch {
      const data: Record<string, unknown> = {};
      if (body.nom !== undefined) data.nom = body.nom;
      if (body.prenom !== undefined) data.prenom = body.prenom;
      if (body.email !== undefined) data.email = body.email;
      if (body.telephone !== undefined) data.telephone = body.telephone;
      if (body.poste !== undefined) data.poste = body.poste;
      if (body.departement !== undefined) data.departement = body.departement;
      if (body.contratType !== undefined) data.contratType = body.contratType;
      if (body.dateEmbauche !== undefined) data.dateEmbauche = body.dateEmbauche ? new Date(body.dateEmbauche as string) : null;
      if (body.salaireBase !== undefined) data.salaireBase = body.salaireBase ? Number(body.salaireBase) : null;
      if (body.actif !== undefined) data.actif = body.actif;
      if (body.notes !== undefined) data.notes = body.notes;

      const membre = await prisma.equipeMember.update({ where: { id }, data: data as any });
      return reply.send({ success: true, data: { membre } });
    }
  });

  // DELETE /api/equipe/membres/:id - Supprimer un membre
  fastify.delete('/membres/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_membre_delete', { id });
      return reply.send(result);
    } catch {
      await prisma.equipeMember.delete({ where: { id } });
      return reply.send({ success: true, message: 'Membre supprimé' });
    }
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

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_absences_list', {
        membreId: query.membreId, type: query.type, statut: query.statut,
        dateFrom: query.dateFrom, dateTo: query.dateTo,
      });
      return reply.send(result);
    } catch {
      const where: Record<string, unknown> = { tenantId };
      if (query.membreId) where.memberId = query.membreId;
      if (query.type) where.type = query.type;
      if (query.statut) where.statut = query.statut;
      if (query.dateFrom || query.dateTo) {
        where.dateDebut = {};
        if (query.dateFrom) (where.dateDebut as any).gte = new Date(query.dateFrom);
        if (query.dateTo) (where.dateDebut as any).lte = new Date(query.dateTo);
      }
      const absences = await prisma.equipeAbsence.findMany({
        where: where as any,
        include: { member: { select: { nom: true, prenom: true } } },
        orderBy: { dateDebut: 'desc' },
      });
      return reply.send({ success: true, data: { absences } });
    }
  });

  // POST /api/equipe/absences - Créer une absence
  fastify.post('/absences', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = request.body as Record<string, unknown>;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_absence_create', body);
      return reply.send(result);
    } catch {
      const absence = await prisma.equipeAbsence.create({
        data: {
          tenantId,
          memberId: body.memberId as string,
          type: (body.type as any) || 'conge_paye',
          dateDebut: new Date(body.dateDebut as string),
          dateFin: new Date(body.dateFin as string),
          motif: body.motif as string | undefined,
          statut: 'en_attente',
        },
      });
      return reply.code(201).send({ success: true, data: { absence } });
    }
  });

  // PUT /api/equipe/absences/:id - Modifier une absence (approuver/refuser)
  fastify.put('/absences/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_absence_update', { id, ...body });
      return reply.send(result);
    } catch {
      const data: Record<string, unknown> = {};
      if (body.statut !== undefined) data.statut = body.statut;
      if (body.type !== undefined) data.type = body.type;
      if (body.dateDebut !== undefined) data.dateDebut = new Date(body.dateDebut as string);
      if (body.dateFin !== undefined) data.dateFin = new Date(body.dateFin as string);
      if (body.motif !== undefined) data.motif = body.motif;
      if (body.validePar !== undefined) data.validePar = body.validePar;

      const absence = await prisma.equipeAbsence.update({ where: { id }, data: data as any });
      return reply.send({ success: true, data: { absence } });
    }
  });

  // DELETE /api/equipe/absences/:id - Supprimer une absence
  fastify.delete('/absences/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_absence_delete', { id });
      return reply.send(result);
    } catch {
      await prisma.equipeAbsence.delete({ where: { id } });
      return reply.send({ success: true, message: 'Absence supprimée' });
    }
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

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_pointages_list', {
        membreId: query.membreId, dateFrom: query.dateFrom, dateTo: query.dateTo,
      });
      return reply.send(result);
    } catch {
      const where: Record<string, unknown> = { tenantId };
      if (query.membreId) where.memberId = query.membreId;
      if (query.dateFrom || query.dateTo) {
        where.date = {};
        if (query.dateFrom) (where.date as any).gte = new Date(query.dateFrom);
        if (query.dateTo) (where.date as any).lte = new Date(query.dateTo);
      }
      const pointages = await prisma.equipePointage.findMany({
        where: where as any,
        include: { member: { select: { nom: true, prenom: true } } },
        orderBy: { date: 'desc' },
      });
      return reply.send({ success: true, data: { pointages } });
    }
  });

  // POST /api/equipe/pointages - Créer un pointage
  fastify.post('/pointages', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = request.body as Record<string, unknown>;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_pointage_create', body);
      return reply.send(result);
    } catch {
      const heuresArrivee = body.heureArrivee as string | undefined;
      const heuresDepart = body.heureDepart as string | undefined;
      const heuresPause = Number(body.heuresPause || 0);
      let heuresTravaillees: number | undefined;
      if (heuresArrivee && heuresDepart) {
        const [hA, mA] = heuresArrivee.split(':').map(Number);
        const [hD, mD] = heuresDepart.split(':').map(Number);
        heuresTravaillees = Math.max(0, (hD + mD / 60) - (hA + mA / 60) - heuresPause);
      }
      const pointage = await prisma.equipePointage.create({
        data: {
          tenantId,
          memberId: body.memberId as string,
          date: new Date(body.date as string),
          heureArrivee: heuresArrivee,
          heureDepart: heuresDepart,
          heuresPause,
          heuresTravaillees: heuresTravaillees ? Math.round(heuresTravaillees * 100) / 100 : undefined,
          notes: body.notes as string | undefined,
        },
      });
      return reply.code(201).send({ success: true, data: { pointage } });
    }
  });

  // PUT /api/equipe/pointages/:id - Modifier un pointage
  fastify.put('/pointages/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_pointage_update', { id, ...body });
      return reply.send(result);
    } catch {
      const data: Record<string, unknown> = {};
      if (body.heureArrivee !== undefined) data.heureArrivee = body.heureArrivee;
      if (body.heureDepart !== undefined) data.heureDepart = body.heureDepart;
      if (body.heuresPause !== undefined) data.heuresPause = Number(body.heuresPause);
      if (body.notes !== undefined) data.notes = body.notes;
      if (body.heuresTravaillees !== undefined) data.heuresTravaillees = Number(body.heuresTravaillees);

      const pointage = await prisma.equipePointage.update({ where: { id }, data: data as any });
      return reply.send({ success: true, data: { pointage } });
    }
  });

  // DELETE /api/equipe/pointages/:id - Supprimer un pointage
  fastify.delete('/pointages/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_pointage_delete', { id });
      return reply.send(result);
    } catch {
      await prisma.equipePointage.delete({ where: { id } });
      return reply.send({ success: true, message: 'Pointage supprimé' });
    }
  });

  // GET /api/equipe/dashboard - KPIs équipe
  fastify.get('/dashboard', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'equipe_dashboard', {});
      return reply.send(result);
    } catch {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const [totalMembers, activeMembers, absencesThisMonth, pointagesThisMonth] = await Promise.all([
        prisma.equipeMember.count({ where: { tenantId } }),
        prisma.equipeMember.count({ where: { tenantId, actif: true } }),
        prisma.equipeAbsence.count({ where: { tenantId, dateDebut: { gte: startOfMonth } } }),
        prisma.equipePointage.findMany({
          where: { tenantId, date: { gte: startOfMonth } },
          select: { heuresTravaillees: true },
        }),
      ]);
      const totalHeures = pointagesThisMonth.reduce((sum: number, p: { heuresTravaillees: unknown }) => sum + Number(p.heuresTravaillees || 0), 0);
      const avgHoursWorked = activeMembers > 0 ? Math.round((totalHeures / activeMembers) * 10) / 10 : 0;
      return reply.send({
        success: true,
        data: { totalMembers, activeMembers, absencesThisMonth, avgHoursWorked },
      });
    }
  });
}
