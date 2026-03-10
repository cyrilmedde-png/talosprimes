import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-errors.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';

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

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_chantiers_list', {
        statut: query.statut,
        clientId: query.clientId,
        search: query.search,
      });
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n btp_chantiers_list failed, fallback Prisma');

      const where: Record<string, unknown> = { tenantId };
      if (query.statut) where.statut = query.statut;
      if (query.clientId) where.clientId = query.clientId;
      if (query.search) {
        where.OR = [
          { nom: { contains: query.search, mode: 'insensitive' } },
          { reference: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const chantiers = await prisma.btpChantier.findMany({
        where,
        include: {
          client: { select: { id: true, nom: true } },
          situations: { select: { id: true, valide: true, montantHt: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ success: true, data: { chantiers } });
    }
  });

  // GET /api/btp/dashboard - KPIs BTP (MUST be before /chantiers/:id)
  fastify.get('/dashboard', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_dashboard', {});
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n btp_dashboard failed, fallback Prisma');

      const [totalChantiers, chantiersEnCours, chantiersTermines, totalSituations, situationsValidees] = await Promise.all([
        prisma.btpChantier.count({ where: { tenantId } }),
        prisma.btpChantier.count({ where: { tenantId, statut: 'en_cours' } }),
        prisma.btpChantier.count({ where: { tenantId, statut: 'termine' } }),
        prisma.btpSituation.count({ where: { tenantId } }),
        prisma.btpSituation.count({ where: { tenantId, valide: true } }),
      ]);

      const chantiersAvecMontant = await prisma.btpChantier.findMany({
        where: { tenantId, montantMarche: { not: null } },
        select: { montantMarche: true, montantFacture: true, tauxAvancement: true },
      });

      const montantMarcheTotal = chantiersAvecMontant.reduce(
        (sum: number, c: { montantMarche: unknown }) => sum + Number(c.montantMarche || 0), 0
      );
      const montantFactureTotal = chantiersAvecMontant.reduce(
        (sum: number, c: { montantFacture: unknown }) => sum + Number(c.montantFacture || 0), 0
      );
      const avancementMoyen = chantiersAvecMontant.length > 0
        ? Math.round(chantiersAvecMontant.reduce((sum: number, c: { tauxAvancement: number }) => sum + c.tauxAvancement, 0) / chantiersAvecMontant.length)
        : 0;

      return reply.send({
        success: true,
        data: {
          totalChantiers,
          chantiersEnCours,
          chantiersTermines,
          totalSituations,
          situationsValidees,
          montantMarcheTotal,
          montantFactureTotal,
          avancementMoyen,
        },
      });
    }
  });

  // GET /api/btp/chantiers/:id - Détail chantier
  fastify.get('/chantiers/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_chantier_get', { id });
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n btp_chantier_get failed, fallback Prisma');

      const chantier = await prisma.btpChantier.findFirst({
        where: { id, tenantId },
        include: {
          client: { select: { id: true, nom: true } },
          situations: { orderBy: { numero: 'asc' } },
        },
      });

      if (!chantier) {
        return reply.code(404).send({ success: false, error: 'Chantier non trouvé' });
      }

      return reply.send({ success: true, data: { chantier } });
    }
  });

  // POST /api/btp/chantiers - Créer un chantier
  fastify.post('/chantiers', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = request.body as Record<string, unknown>;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_chantier_create', body);
      return reply.code(201).send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n btp_chantier_create failed, fallback Prisma');

      const {
        reference, nom, description, clientId, adresseChantier, codePostal, ville,
        responsableId, statut, dateDebut, dateFinPrevue, montantMarche, lotPrincipal, notes,
      } = body;

      const chantier = await prisma.btpChantier.create({
        data: {
          tenantId,
          reference: reference as string,
          nom: nom as string,
          ...(description != null && { description: description as string }),
          ...(clientId != null && { clientId: clientId as string }),
          ...(adresseChantier != null && { adresseChantier: adresseChantier as string }),
          ...(codePostal != null && { codePostal: codePostal as string }),
          ...(ville != null && { ville: ville as string }),
          ...(responsableId != null && { responsableId: responsableId as string }),
          ...(statut != null && { statut: statut as string }),
          ...(dateDebut != null && { dateDebut: new Date(dateDebut as string) }),
          ...(dateFinPrevue != null && { dateFinPrevue: new Date(dateFinPrevue as string) }),
          ...(montantMarche != null && { montantMarche: montantMarche as number }),
          ...(lotPrincipal != null && { lotPrincipal: lotPrincipal as string }),
          ...(notes != null && { notes: notes as string }),
        } as any,
      });

      return reply.code(201).send({ success: true, data: { chantier } });
    }
  });

  // PUT /api/btp/chantiers/:id - Modifier un chantier
  fastify.put('/chantiers/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_chantier_update', { id, ...body });
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n btp_chantier_update failed, fallback Prisma');

      const existing = await prisma.btpChantier.findFirst({ where: { id, tenantId } });
      if (!existing) {
        return reply.code(404).send({ success: false, error: 'Chantier non trouvé' });
      }

      const {
        reference, nom, description, clientId, adresseChantier, codePostal, ville,
        responsableId, statut, dateDebut, dateFinPrevue, dateFinReelle,
        montantMarche, montantFacture, tauxAvancement, lotPrincipal, notes,
      } = body;

      const updateData: Record<string, unknown> = {};
      if (reference !== undefined) updateData.reference = reference;
      if (nom !== undefined) updateData.nom = nom;
      if (description !== undefined) updateData.description = description;
      if (clientId !== undefined) updateData.clientId = clientId;
      if (adresseChantier !== undefined) updateData.adresseChantier = adresseChantier;
      if (codePostal !== undefined) updateData.codePostal = codePostal;
      if (ville !== undefined) updateData.ville = ville;
      if (responsableId !== undefined) updateData.responsableId = responsableId;
      if (statut !== undefined) updateData.statut = statut;
      if (dateDebut !== undefined) updateData.dateDebut = dateDebut ? new Date(dateDebut as string) : null;
      if (dateFinPrevue !== undefined) updateData.dateFinPrevue = dateFinPrevue ? new Date(dateFinPrevue as string) : null;
      if (dateFinReelle !== undefined) updateData.dateFinReelle = dateFinReelle ? new Date(dateFinReelle as string) : null;
      if (montantMarche !== undefined) updateData.montantMarche = montantMarche;
      if (montantFacture !== undefined) updateData.montantFacture = montantFacture;
      if (tauxAvancement !== undefined) updateData.tauxAvancement = tauxAvancement;
      if (lotPrincipal !== undefined) updateData.lotPrincipal = lotPrincipal;
      if (notes !== undefined) updateData.notes = notes;

      const chantier = await prisma.btpChantier.update({
        where: { id },
        data: updateData as any,
      });

      return reply.send({ success: true, data: { chantier } });
    }
  });

  // DELETE /api/btp/chantiers/:id - Supprimer un chantier
  fastify.delete('/chantiers/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_chantier_delete', { id });
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n btp_chantier_delete failed, fallback Prisma');

      const existing = await prisma.btpChantier.findFirst({ where: { id, tenantId } });
      if (!existing) {
        return reply.code(404).send({ success: false, error: 'Chantier non trouvé' });
      }

      // Supprimer les situations associées d'abord
      await prisma.btpSituation.deleteMany({ where: { chantierId: id, tenantId } });
      await prisma.btpChantier.delete({ where: { id } });

      return reply.send({ success: true, data: { message: 'Chantier supprimé' } });
    }
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

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_situations_list', { chantierId });
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n btp_situations_list failed, fallback Prisma');

      const situations = await prisma.btpSituation.findMany({
        where: { tenantId, chantierId },
        orderBy: { numero: 'asc' },
      });

      return reply.send({ success: true, data: { situations } });
    }
  });

  // POST /api/btp/chantiers/:chantierId/situations - Créer une situation
  fastify.post('/chantiers/:chantierId/situations', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { chantierId } = chantiersIdParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_situation_create', { chantierId, ...body });
      return reply.code(201).send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n btp_situation_create failed, fallback Prisma');

      // Vérifier que le chantier existe
      const chantier = await prisma.btpChantier.findFirst({ where: { id: chantierId, tenantId } });
      if (!chantier) {
        return reply.code(404).send({ success: false, error: 'Chantier non trouvé' });
      }

      // Auto-incrément du numéro de situation
      const lastSituation = await prisma.btpSituation.findFirst({
        where: { chantierId, tenantId },
        orderBy: { numero: 'desc' },
        select: { numero: true },
      });
      const nextNumero = (lastSituation?.numero ?? 0) + 1;

      const {
        type, dateDebut, dateFin, montantHt, montantTva, montantTtc,
        tauxAvancement, cumulAnterieur, retenue, observations,
      } = body;

      const situation = await prisma.btpSituation.create({
        data: {
          tenantId,
          chantierId,
          numero: (body.numero as number) ?? nextNumero,
          ...(type != null && { type: type as string }),
          dateDebut: new Date(dateDebut as string),
          dateFin: new Date(dateFin as string),
          montantHt: montantHt as number,
          ...(montantTva != null && { montantTva: montantTva as number }),
          montantTtc: montantTtc as number,
          ...(tauxAvancement != null && { tauxAvancement: tauxAvancement as number }),
          ...(cumulAnterieur != null && { cumulAnterieur: cumulAnterieur as number }),
          ...(retenue != null && { retenue: retenue as number }),
          ...(observations != null && { observations: observations as string }),
        } as any,
      });

      return reply.code(201).send({ success: true, data: { situation } });
    }
  });

  // PUT /api/btp/situations/:id - Modifier une situation
  fastify.put('/situations/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);
    const body = request.body as Record<string, unknown>;

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_situation_update', { id, ...body });
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n btp_situation_update failed, fallback Prisma');

      const existing = await prisma.btpSituation.findFirst({ where: { id, tenantId } });
      if (!existing) {
        return reply.code(404).send({ success: false, error: 'Situation non trouvée' });
      }

      if (existing.valide) {
        return reply.code(400).send({ success: false, error: 'Impossible de modifier une situation validée' });
      }

      const {
        type, dateDebut, dateFin, montantHt, montantTva, montantTtc,
        tauxAvancement, cumulAnterieur, retenue, observations,
      } = body;

      const updateData: Record<string, unknown> = {};
      if (type !== undefined) updateData.type = type;
      if (dateDebut !== undefined) updateData.dateDebut = new Date(dateDebut as string);
      if (dateFin !== undefined) updateData.dateFin = new Date(dateFin as string);
      if (montantHt !== undefined) updateData.montantHt = montantHt;
      if (montantTva !== undefined) updateData.montantTva = montantTva;
      if (montantTtc !== undefined) updateData.montantTtc = montantTtc;
      if (tauxAvancement !== undefined) updateData.tauxAvancement = tauxAvancement;
      if (cumulAnterieur !== undefined) updateData.cumulAnterieur = cumulAnterieur;
      if (retenue !== undefined) updateData.retenue = retenue;
      if (observations !== undefined) updateData.observations = observations;

      const situation = await prisma.btpSituation.update({
        where: { id },
        data: updateData as any,
      });

      return reply.send({ success: true, data: { situation } });
    }
  });

  // DELETE /api/btp/situations/:id - Supprimer une situation
  fastify.delete('/situations/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_situation_delete', { id });
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n btp_situation_delete failed, fallback Prisma');

      const existing = await prisma.btpSituation.findFirst({ where: { id, tenantId } });
      if (!existing) {
        return reply.code(404).send({ success: false, error: 'Situation non trouvée' });
      }

      if (existing.valide) {
        return reply.code(400).send({ success: false, error: 'Impossible de supprimer une situation validée' });
      }

      await prisma.btpSituation.delete({ where: { id } });

      return reply.send({ success: true, data: { message: 'Situation supprimée' } });
    }
  });

  // POST /api/btp/situations/:id/valider - Valider une situation
  fastify.post('/situations/:id/valider', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = idParamsSchema.parse(request.params);

    try {
      const result = await n8nService.callWorkflowReturn(tenantId, 'btp_situation_valider', { id });
      return reply.send(result);
    } catch (err) {
      logger.warn({ err }, 'n8n btp_situation_valider failed, fallback Prisma');

      const existing = await prisma.btpSituation.findFirst({ where: { id, tenantId } });
      if (!existing) {
        return reply.code(404).send({ success: false, error: 'Situation non trouvée' });
      }

      if (existing.valide) {
        return reply.code(400).send({ success: false, error: 'Situation déjà validée' });
      }

      const situation = await prisma.btpSituation.update({
        where: { id },
        data: { valide: true },
      });

      // Mettre à jour le taux d'avancement et le montant facturé du chantier
      const allSituations = await prisma.btpSituation.findMany({
        where: { chantierId: existing.chantierId, tenantId, valide: true },
        select: { montantHt: true, tauxAvancement: true },
      });

      const totalFacture = allSituations.reduce((sum: number, s: { montantHt: unknown }) => sum + Number(s.montantHt), 0);
      const avgAvancement = allSituations.length > 0
        ? Math.round(allSituations.reduce((sum: number, s: { tauxAvancement: number }) => sum + s.tauxAvancement, 0) / allSituations.length)
        : 0;

      await prisma.btpChantier.update({
        where: { id: existing.chantierId },
        data: { montantFacture: totalFacture, tauxAvancement: avgAvancement },
      });

      return reply.send({ success: true, data: { situation } });
    }
  });
}
