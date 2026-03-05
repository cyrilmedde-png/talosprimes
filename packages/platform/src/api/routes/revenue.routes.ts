import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/api-errors.js';

export async function revenueRoutes(fastify: FastifyInstance) {
  // Dashboard revenus — MRR, revenu par type, commissions, évolution
  fastify.get('/dashboard', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.badRequest(reply, 'Tenant ID manquant');

      const currentMonth = new Date().toISOString().slice(0, 7);

      // MRR (revenus du mois courant type abonnement)
      const mrrResult = await prisma.revenueEvent.aggregate({
        where: { tenantId, type: 'abonnement', mois: currentMonth },
        _sum: { montantHt: true },
      });
      const mrr = Number(mrrResult._sum.montantHt || 0);

      // Revenu total par type
      const revenueByType = await prisma.revenueEvent.groupBy({
        by: ['type'],
        where: { tenantId },
        _sum: { montantHt: true, montantTtc: true },
        _count: true,
      });

      // Total commissions en attente / payées
      const commissionsStats = await prisma.commission.groupBy({
        by: ['statut'],
        _sum: { montantCommission: true },
        _count: true,
      });

      // Évolution mensuelle (12 derniers mois)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const evolutionMensuelle = await prisma.revenueEvent.groupBy({
        by: ['mois'],
        where: { tenantId, createdAt: { gte: twelveMonthsAgo } },
        _sum: { montantHt: true },
        orderBy: { mois: 'asc' },
      });

      // Total général
      const totalGeneral = await prisma.revenueEvent.aggregate({
        where: { tenantId },
        _sum: { montantHt: true, montantTtc: true },
        _count: true,
      });

      return reply.send({
        success: true,
        data: {
          mrr,
          currentMonth,
          totalHt: Number(totalGeneral._sum.montantHt || 0),
          totalTtc: Number(totalGeneral._sum.montantTtc || 0),
          totalTransactions: totalGeneral._count,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          revenueByType: revenueByType.map((r: any) => ({
            type: r.type,
            totalHt: Number(r._sum.montantHt || 0),
            totalTtc: Number(r._sum.montantTtc || 0),
            count: r._count,
          })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          commissionsStats: commissionsStats.map((c: any) => ({
            statut: c.statut,
            total: Number(c._sum.montantCommission || 0),
            count: c._count,
          })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          evolutionMensuelle: evolutionMensuelle.map((e: any) => ({
            mois: e.mois,
            totalHt: Number(e._sum.montantHt || 0),
          })),
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return ApiError.internal(reply, 'Erreur lors du chargement du dashboard revenus');
    }
  });

  // Lister les commissions
  fastify.get('/commissions', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const query = request.query as { statut?: string; partnerId?: string; mois?: string };

      const where: Record<string, unknown> = {};
      if (query.statut) where.statut = query.statut;
      if (query.partnerId) where.partnerId = query.partnerId;
      if (query.mois) where.mois = query.mois;

      const commissions = await prisma.commission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          partner: { select: { id: true, nom: true, email: true } },
          clientFinal: { select: { id: true, nom: true, email: true } },
        },
      });

      return reply.send({
        success: true,
        data: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          commissions: commissions.map((c: any) => ({
            id: c.id,
            partnerId: c.partnerId,
            partnerNom: c.partner.nom,
            clientFinalId: c.clientFinalId,
            clientNom: c.clientFinal?.nom || null,
            niveau: c.niveau,
            type: c.type,
            montantBaseHt: Number(c.montantBaseHt),
            tauxApplique: Number(c.tauxApplique),
            montantCommission: Number(c.montantCommission),
            statut: c.statut,
            mois: c.mois,
            datePaiement: c.datePaiement?.toISOString() || null,
            createdAt: c.createdAt.toISOString(),
          })),
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return ApiError.internal(reply, 'Erreur lors de la récupération des commissions');
    }
  });

  // Lister les événements de revenu
  fastify.get('/events', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.badRequest(reply, 'Tenant ID manquant');

      const query = request.query as { type?: string; mois?: string; limit?: string };

      const where: Record<string, unknown> = { tenantId };
      if (query.type) where.type = query.type;
      if (query.mois) where.mois = query.mois;

      const events = await prisma.revenueEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit ? parseInt(query.limit, 10) : 100,
      });

      return reply.send({
        success: true,
        data: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          events: events.map((e: any) => ({
            id: e.id,
            type: e.type,
            montantHt: Number(e.montantHt),
            montantTtc: Number(e.montantTtc),
            description: e.description,
            mois: e.mois,
            clientFinalId: e.clientFinalId,
            partnerId: e.partnerId,
            stripePaymentId: e.stripePaymentId,
            createdAt: e.createdAt.toISOString(),
          })),
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return ApiError.internal(reply, 'Erreur lors de la récupération des événements de revenu');
    }
  });
}
