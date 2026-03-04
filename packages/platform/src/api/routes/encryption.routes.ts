/**
 * Routes API pour le chiffrement post-conversation
 *
 * POST /api/encryption/encrypt-completed  → Chiffre toutes les conversations terminées
 * POST /api/encryption/encrypt/:id        → Chiffre un CallLog spécifique
 * GET  /api/encryption/status             → Stats de chiffrement
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-errors.js';
import {
  encryptCompletedConversations,
  encryptCallLog,
} from '../../services/encryption.service.js';

const paramsSchema = z.object({ id: z.string().uuid() });

const encryptCompletedSchema = z.object({
  minutesAgo: z.number().int().positive().default(15),
});

export async function encryptionRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/encryption/encrypt-completed
   * Chiffre toutes les conversations terminées depuis X minutes
   * Appelé par le workflow n8n (cron) ou manuellement
   */
  fastify.post('/encrypt-completed', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = encryptCompletedSchema.parse(request.body || {});
      const result = await encryptCompletedConversations(body.minutesAgo);

      return reply.status(200).send({
        success: true,
        message: `Chiffrement terminé : ${result.callLogsEncrypted} appels + ${result.smsLogsEncrypted} SMS`,
        data: result,
      });
    } catch (error) {
      fastify.log.error(error, 'Erreur chiffrement conversations');
      return ApiError.internal(reply);
    }
  });

  /**
   * POST /api/encryption/encrypt/:id
   * Chiffre un CallLog spécifique
   */
  fastify.post('/encrypt/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const params = paramsSchema.parse(request.params);
      const success = await encryptCallLog(params.id);

      return reply.status(200).send({
        success: true,
        message: success ? 'CallLog chiffré avec succès' : 'CallLog déjà chiffré',
        data: { encrypted: success },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiError.validation(reply, error);
      }
      fastify.log.error(error, 'Erreur chiffrement call log');
      return ApiError.internal(reply);
    }
  });

  /**
   * GET /api/encryption/status
   * Statistiques de chiffrement
   */
  fastify.get('/status', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const where = tenantId ? { tenantId } : {};

      const [totalCallLogs, encryptedCallLogs, totalSmsLogs, encryptedSmsLogs] =
        await Promise.all([
          prisma.callLog.count({ where }),
          prisma.callLog.count({ where: { ...where, isEncrypted: true } }),
          prisma.smsLog.count({ where }),
          prisma.smsLog.count({ where: { ...where, isEncrypted: true } }),
        ]);

      return reply.status(200).send({
        success: true,
        data: {
          callLogs: {
            total: totalCallLogs,
            encrypted: encryptedCallLogs,
            unencrypted: totalCallLogs - encryptedCallLogs,
            percentage: totalCallLogs > 0
              ? Math.round((encryptedCallLogs / totalCallLogs) * 100)
              : 0,
          },
          smsLogs: {
            total: totalSmsLogs,
            encrypted: encryptedSmsLogs,
            unencrypted: totalSmsLogs - encryptedSmsLogs,
            percentage: totalSmsLogs > 0
              ? Math.round((encryptedSmsLogs / totalSmsLogs) * 100)
              : 0,
          },
        },
      });
    } catch (error) {
      fastify.log.error(error, 'Erreur statut chiffrement');
      return ApiError.internal(reply);
    }
  });
}
