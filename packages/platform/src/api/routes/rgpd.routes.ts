/**
 * Routes RGPD / GDPR Compliance
 *
 * POST /api/rgpd/consent          — Enregistrer un consentement
 * GET  /api/rgpd/consent/:email   — Historique des consentements
 * GET  /api/rgpd/consent/:email/status — Statut actuel des consentements
 * GET  /api/rgpd/export           — Exporter ses données (portabilité Art. 20)
 * POST /api/rgpd/anonymize        — Anonymiser un email (droit à l'oubli Art. 17)
 * POST /api/rgpd/purge            — Purge rétention (admin uniquement)
 * GET  /api/rgpd/processors       — Registre des sous-traitants (Art. 28)
 * GET  /api/rgpd/requests         — Liste des demandes RGPD
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { rgpdService } from '../../services/rgpd.service.js';
import { ApiError } from '../../utils/api-errors.js';

// Schémas de validation
const consentSchema = z.object({
  email: z.string().email(),
  consentType: z.enum(['donnees_personnelles', 'communications', 'cookies_analytics', 'partage_tiers']),
  action: z.enum(['granted', 'withdrawn']),
  version: z.string().optional(),
});

const anonymizeSchema = z.object({
  email: z.string().email(),
});

type AuthRequest = FastifyRequest & {
  tenantId?: string;
  user?: { userId: string; role: string; email?: string };
};

export async function rgpdRoutes(fastify: FastifyInstance) {

  // ── POST /consent — Enregistrer un consentement ─────────────────────
  fastify.post('/consent', {
    preHandler: [fastify.authenticate],
  }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const body = consentSchema.parse(request.body);

      await rgpdService.recordConsent({
        tenantId,
        email: body.email,
        userId: request.user?.userId,
        consentType: body.consentType,
        action: body.action,
        version: body.version,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || undefined,
      });

      return reply.status(201).send({
        success: true,
        message: `Consentement ${body.action === 'granted' ? 'enregistré' : 'retiré'} avec succès`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) return ApiError.validation(reply, error);
      fastify.log.error(error);
      return ApiError.internal(reply);
    }
  });

  // ── GET /consent/:email — Historique des consentements ──────────────
  fastify.get('/consent/:email', {
    preHandler: [fastify.authenticate],
  }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const { email } = request.params as { email: string };
      const history = await rgpdService.getConsentHistory(email);

      return reply.send({ success: true, data: { consents: history } });
    } catch (error) {
      fastify.log.error(error);
      return ApiError.internal(reply);
    }
  });

  // ── GET /consent/:email/status — Statut actuel ─────────────────────
  fastify.get('/consent/:email/status', {
    preHandler: [fastify.authenticate],
  }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const { email } = request.params as { email: string };

      const [donneesPerso, communications, cookiesAnalytics, partageTiers] = await Promise.all([
        rgpdService.hasActiveConsent(email, 'donnees_personnelles'),
        rgpdService.hasActiveConsent(email, 'communications'),
        rgpdService.hasActiveConsent(email, 'cookies_analytics'),
        rgpdService.hasActiveConsent(email, 'partage_tiers'),
      ]);

      return reply.send({
        success: true,
        data: {
          email,
          consents: {
            donnees_personnelles: donneesPerso,
            communications,
            cookies_analytics: cookiesAnalytics,
            partage_tiers: partageTiers,
          },
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return ApiError.internal(reply);
    }
  });

  // ── GET /export — Export données personnelles (Art. 20) ─────────────
  fastify.get('/export', {
    preHandler: [fastify.authenticate],
  }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const email = request.user?.email;
      if (!email) return ApiError.badRequest(reply, 'Email utilisateur requis');

      const exportData = await rgpdService.exportUserData(tenantId, email);

      // Répondre en JSON avec header Content-Disposition pour téléchargement
      reply.header('Content-Type', 'application/json; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="export-rgpd-${Date.now()}.json"`);

      return reply.send(exportData);
    } catch (error) {
      fastify.log.error(error);
      return ApiError.internal(reply);
    }
  });

  // ── POST /anonymize — Anonymisation (Art. 17 - Droit à l'oubli) ────
  fastify.post('/anonymize', {
    preHandler: [fastify.authenticate],
  }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      // Seuls les admins peuvent anonymiser
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply, 'Seul un administrateur peut anonymiser des données');
      }

      const body = anonymizeSchema.parse(request.body);

      const result = await rgpdService.anonymizeUserData(
        tenantId,
        body.email,
        request.user?.userId || 'unknown'
      );

      return reply.send({
        success: true,
        message: 'Données anonymisées avec succès (Art. 17 RGPD)',
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) return ApiError.validation(reply, error);
      fastify.log.error(error);
      return ApiError.internal(reply);
    }
  });

  // ── POST /purge — Purge rétention automatique (admin) ──────────────
  fastify.post('/purge', {
    preHandler: [fastify.authenticate],
  }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const result = await rgpdService.purgeExpiredData();

      return reply.send({
        success: true,
        message: 'Purge rétention terminée',
        data: result,
      });
    } catch (error) {
      fastify.log.error(error);
      return ApiError.internal(reply);
    }
  });

  // ── GET /processors — Registre des sous-traitants (Art. 28) ────────
  fastify.get('/processors', {
    preHandler: [fastify.authenticate],
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const processors = await rgpdService.getDataProcessors();
      return reply.send({ success: true, data: { processors } });
    } catch (error) {
      fastify.log.error(error);
      return ApiError.internal(reply);
    }
  });

  // ── GET /requests — Liste des demandes RGPD ────────────────────────
  fastify.get('/requests', {
    preHandler: [fastify.authenticate],
  }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const requests = await prisma.rgpdRequest.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ success: true, data: { requests } });
    } catch (error) {
      fastify.log.error(error);
      return ApiError.internal(reply);
    }
  });
}

// Import prisma pour les requêtes directes
import { prisma } from '../../config/database.js';
