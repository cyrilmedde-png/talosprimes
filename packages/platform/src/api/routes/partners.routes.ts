import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../config/database.js';
import { isN8nInternalRequest, n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { z } from 'zod';
import { ApiError } from '../../utils/api-errors.js';

const createPartnerSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().optional(),
  raisonSociale: z.string().min(1, 'La raison sociale est requise'),
  siret: z.string().length(14, 'Le SIRET doit contenir 14 chiffres'),
  siren: z.string().length(9, 'Le SIREN doit contenir 9 chiffres'),
  adresse: z.string().optional(),
  type: z.enum(['revendeur', 'apporteur_affaires', 'white_label']).optional().default('apporteur_affaires'),
  commissionTauxNiveau1: z.number().min(0).max(100).optional().default(10),
  commissionTauxNiveau2: z.number().min(0).max(100).optional().default(3),
  domainePersonnalise: z.string().optional(),
  nomAffiche: z.string().optional(),
  couleurPrimaire: z.string().optional(),
});

const updatePartnerSchema = z.object({
  nom: z.string().optional(),
  email: z.string().email().optional(),
  telephone: z.string().optional(),
  raisonSociale: z.string().optional(),
  siret: z.string().length(14).optional(),
  siren: z.string().length(9).optional(),
  adresse: z.string().optional(),
  type: z.enum(['revendeur', 'apporteur_affaires', 'white_label']).optional(),
  statut: z.enum(['actif', 'suspendu', 'resilie']).optional(),
  commissionTauxNiveau1: z.number().min(0).max(100).optional(),
  commissionTauxNiveau2: z.number().min(0).max(100).optional(),
  domainePersonnalise: z.string().optional(),
  nomAffiche: z.string().optional(),
  couleurPrimaire: z.string().optional(),
});

export async function partnersRoutes(fastify: FastifyInstance) {
  // Lister les partenaires
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const query = request.query as { statut?: string; type?: string };

      const where: Record<string, unknown> = {};
      if (query.statut) where.statut = query.statut;
      if (query.type) where.type = query.type;

      const partners = await prisma.partner.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              leads: true,
              clientsApportes: true,
              commissions: true,
            },
          },
        },
      });

      return reply.send({
        success: true,
        data: {
          partners: partners.map((p) => ({
            id: p.id,
            nom: p.nom,
            email: p.email,
            telephone: p.telephone,
            raisonSociale: p.raisonSociale,
            siret: p.siret,
            siren: p.siren,
            type: p.type,
            statut: p.statut,
            commissionTauxNiveau1: Number(p.commissionTauxNiveau1),
            commissionTauxNiveau2: Number(p.commissionTauxNiveau2),
            domainePersonnalise: p.domainePersonnalise,
            nomAffiche: p.nomAffiche,
            couleurPrimaire: p.couleurPrimaire,
            leadsCount: p._count.leads,
            clientsCount: p._count.clientsApportes,
            commissionsCount: p._count.commissions,
            createdAt: p.createdAt.toISOString(),
          })),
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return ApiError.internal(reply, 'Erreur lors de la récupération des partenaires');
    }
  });

  // Créer un partenaire
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const validation = createPartnerSchema.safeParse(request.body);
      if (!validation.success) {
        return ApiError.validation(reply, validation.error);
      }

      const data = validation.data;

      // Vérifier unicité email
      const existing = await prisma.partner.findUnique({ where: { email: data.email } });
      if (existing) {
        return reply.status(409).send({
          success: false,
          error: 'Un partenaire avec cet email existe déjà',
        });
      }

      const partner = await prisma.partner.create({
        data: {
          nom: data.nom,
          email: data.email,
          telephone: data.telephone,
          raisonSociale: data.raisonSociale,
          siret: data.siret,
          siren: data.siren,
          adresse: data.adresse,
          type: data.type,
          commissionTauxNiveau1: data.commissionTauxNiveau1,
          commissionTauxNiveau2: data.commissionTauxNiveau2,
          domainePersonnalise: data.domainePersonnalise,
          nomAffiche: data.nomAffiche,
          couleurPrimaire: data.couleurPrimaire,
        },
      });

      return reply.status(201).send({
        success: true,
        message: 'Partenaire créé avec succès',
        data: { partner },
      });
    } catch (error) {
      fastify.log.error(error);
      return ApiError.internal(reply, 'Erreur lors de la création du partenaire');
    }
  });

  // Obtenir un partenaire par ID
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const { id } = request.params as { id: string };

      const partner = await prisma.partner.findUnique({
        where: { id },
        include: {
          leads: { select: { id: true, nom: true, email: true, statut: true, createdAt: true }, take: 20, orderBy: { createdAt: 'desc' } },
          clientsApportes: { select: { id: true, nom: true, email: true, statut: true, createdAt: true }, take: 20, orderBy: { createdAt: 'desc' } },
          commissions: { orderBy: { createdAt: 'desc' }, take: 50 },
        },
      });

      if (!partner) {
        return ApiError.notFound(reply, 'Partenaire');
      }

      return reply.send({
        success: true,
        data: {
          partner: {
            ...partner,
            commissionTauxNiveau1: Number(partner.commissionTauxNiveau1),
            commissionTauxNiveau2: Number(partner.commissionTauxNiveau2),
            commissions: partner.commissions.map((c) => ({
              ...c,
              montantBaseHt: Number(c.montantBaseHt),
              tauxApplique: Number(c.tauxApplique),
              montantCommission: Number(c.montantCommission),
            })),
          },
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return ApiError.internal(reply, 'Erreur lors de la récupération du partenaire');
    }
  });

  // Mettre à jour un partenaire
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const { id } = request.params as { id: string };
      const validation = updatePartnerSchema.safeParse(request.body);
      if (!validation.success) {
        return ApiError.validation(reply, validation.error);
      }

      const existing = await prisma.partner.findUnique({ where: { id } });
      if (!existing) {
        return ApiError.notFound(reply, 'Partenaire');
      }

      const partner = await prisma.partner.update({
        where: { id },
        data: validation.data,
      });

      return reply.send({
        success: true,
        message: 'Partenaire mis à jour',
        data: { partner },
      });
    } catch (error) {
      fastify.log.error(error);
      return ApiError.internal(reply, 'Erreur lors de la mise à jour du partenaire');
    }
  });

  // Dashboard partenaire — stats
  fastify.get('/:id/dashboard', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const { id } = request.params as { id: string };

      const partner = await prisma.partner.findUnique({ where: { id } });
      if (!partner) {
        return ApiError.notFound(reply, 'Partenaire');
      }

      // Clients directs (N1)
      const clientsN1 = await prisma.clientFinal.count({ where: { partnerId: id } });

      // Clients indirects (N2) — clients des clients du partenaire
      const clientsDirectIds = await prisma.clientFinal.findMany({
        where: { partnerId: id },
        select: { id: true },
      });
      const clientsN2 = await prisma.clientFinal.count({
        where: {
          apporteurClientId: { in: clientsDirectIds.map((c) => c.id) },
        },
      });

      // Commissions par statut
      const commissionsStats = await prisma.commission.groupBy({
        by: ['statut'],
        where: { partnerId: id },
        _sum: { montantCommission: true },
        _count: true,
      });

      // Commissions par mois (6 derniers mois)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const commissionsParMois = await prisma.commission.groupBy({
        by: ['mois'],
        where: { partnerId: id, createdAt: { gte: sixMonthsAgo } },
        _sum: { montantCommission: true },
        orderBy: { mois: 'asc' },
      });

      // Leads apportés
      const leadsCount = await prisma.lead.count({ where: { partnerId: id } });

      return reply.send({
        success: true,
        data: {
          partnerId: id,
          partnerNom: partner.nom,
          tauxN1: Number(partner.commissionTauxNiveau1),
          tauxN2: Number(partner.commissionTauxNiveau2),
          clientsN1,
          clientsN2,
          leadsCount,
          commissionsStats: commissionsStats.map((s) => ({
            statut: s.statut,
            total: Number(s._sum.montantCommission || 0),
            count: s._count,
          })),
          commissionsParMois: commissionsParMois.map((m) => ({
            mois: m.mois,
            total: Number(m._sum.montantCommission || 0),
          })),
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return ApiError.internal(reply, 'Erreur lors du chargement du dashboard partenaire');
    }
  });
}
