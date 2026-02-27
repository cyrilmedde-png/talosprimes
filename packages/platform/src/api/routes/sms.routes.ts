import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import type { InputJsonValue } from '../../types/prisma-helpers.js';
import { ApiError } from '../../utils/api-errors.js';

async function logEvent(tenantId: string, typeEvenement: string, entiteType: string, entiteId: string, payload: Record<string, unknown>, statut: 'succes' | 'erreur' = 'succes', messageErreur?: string) {
  try {
    await prisma.eventLog.create({
      data: {
        tenantId,
        typeEvenement,
        entiteType,
        entiteId,
        payload: payload as InputJsonValue,
        workflowN8nDeclenche: true,
        workflowN8nId: typeEvenement,
        statutExecution: statut,
        messageErreur: messageErreur || null,
      },
    });
    // Notification uniquement en cas d'erreur
    if (statut === 'erreur') {
      await prisma.notification.create({
        data: {
          tenantId,
          type: `${typeEvenement}_erreur`,
          titre: `Erreur: ${typeEvenement}`,
          message: messageErreur || `Erreur lors de ${typeEvenement}`,
          donnees: { entiteType, entiteId, typeEvenement } as InputJsonValue,
        },
      });
    }
  } catch (e) {
    // Silent fail for logging errors
  }
}

const sendSmsSchema = z.object({
  toNumber: z.string().min(1),
  body: z.string().min(1),
});

const createSmsLogSchema = z.object({
  callLogId: z.string().uuid().optional().nullable(),
  direction: z.enum(['entrant', 'sortant']),
  fromNumber: z.string().min(1),
  toNumber: z.string().min(1),
  body: z.string().min(1),
  status: z.enum(['pending', 'sent', 'delivered', 'failed', 'received']),
  twilioSid: z.string().optional().nullable(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  direction: z.enum(['entrant', 'sortant']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function smsRoutes(fastify: FastifyInstance) {
  // GET /api/sms - Liste des logs SMS
  fastify.get('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return ApiError.unauthorized(reply);
      }

      const query = listQuerySchema.parse(request.query);
      const page = query.page;
      const limit = query.limit;

      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ smsLogs: unknown[]; count: number; total: number; totalPages: number }>(
          tenantId,
          'sms_list',
          {
            page,
            limit,
            direction: query.direction || undefined,
            startDate: query.startDate || undefined,
            endDate: query.endDate || undefined,
          }
        );
        const raw = res.data as { smsLogs?: unknown[]; count?: number; total?: number; page?: number; limit?: number; totalPages?: number };
        const smsLogs = Array.isArray(raw.smsLogs) ? raw.smsLogs : [];
        return reply.status(200).send({
          success: true,
          data: {
            smsLogs,
            count: smsLogs.length,
            total: raw.total ?? smsLogs.length,
            page: raw.page ?? 1,
            limit: raw.limit ?? 20,
            totalPages: raw.totalPages ?? 1,
          },
        });
      }

      // Appel depuis n8n (callback) → lecture BDD directe
      const skip = (page - 1) * limit;
      const where: Record<string, unknown> = { tenantId };
      if (query.direction) where.direction = query.direction as 'entrant' | 'sortant';
      if (query.startDate) where.createdAt = { gte: new Date(query.startDate) };
      if (query.endDate) {
        if (where.createdAt) {
          (where.createdAt as Record<string, unknown>).lte = new Date(query.endDate);
        } else {
          where.createdAt = { lte: new Date(query.endDate) };
        }
      }

      const [smsLogs, total] = await Promise.all([
        prisma.smsLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.smsLog.count({ where }),
      ]);

      return reply.status(200).send({
        success: true,
        data: { smsLogs, count: smsLogs.length, total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      fastify.log.error(error, 'Erreur liste SMS logs');
      return ApiError.internal(reply);
    }
  });

  // GET /api/sms/stats - Statistiques SMS
  fastify.get('/stats', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return ApiError.unauthorized(reply);
      }

      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ totalSent: number; totalReceived: number; todayCount: number }>(
          tenantId,
          'sms_stats',
          {}
        );
        return reply.status(200).send({ success: true, data: res.data });
      }

      // Appel depuis n8n (callback) → lecture BDD directe
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [totalSent, totalReceived, todayCount] = await Promise.all([
        prisma.smsLog.count({ where: { tenantId, direction: 'sortant' } }),
        prisma.smsLog.count({ where: { tenantId, direction: 'entrant' } }),
        prisma.smsLog.count({ where: { tenantId, createdAt: { gte: today } } }),
      ]);

      return reply.status(200).send({
        success: true,
        data: { totalSent, totalReceived, todayCount },
      });
    } catch (error) {
      fastify.log.error(error, 'Erreur stats SMS');
      return ApiError.internal(reply);
    }
  });

  // POST /api/sms/send - Envoyer un SMS via N8N → Twilio
  fastify.post('/send', {
    preHandler: [n8nOrAuthMiddleware],
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request: FastifyRequest & { tenantId?: string; isN8nRequest?: boolean }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return ApiError.unauthorized(reply);
      }

      const body = sendSmsSchema.parse(request.body);

      // Appel depuis frontend → déclenche n8n
      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ success: boolean; twilioSid?: string; message?: string }>(
          tenantId,
          'sms_send',
          {
            toNumber: body.toNumber,
            body: body.body,
          }
        );
        await logEvent(tenantId, 'sms_send', 'sms', res.data?.twilioSid || `${body.toNumber}`, { toNumber: body.toNumber, body: body.body, twilioSid: res.data?.twilioSid });
        return reply.status(200).send({ success: true, data: res.data });
      }

      // Appel depuis n8n → retour direct
      return reply.status(200).send({ success: true, message: 'SMS queued for sending' });
    } catch (error) {
      const tenantId = request.tenantId;
      if (error instanceof z.ZodError) {
        const errorMsg = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        if (tenantId) {
          await logEvent(tenantId, 'sms_send', 'sms', 'unknown', { error: errorMsg }, 'erreur', errorMsg);
        }
        return ApiError.validation(reply, error);
      }
      if (tenantId) {
        await logEvent(tenantId, 'sms_send', 'sms', 'unknown', {}, 'erreur', error instanceof Error ? error.message : 'Erreur inconnue');
      }
      fastify.log.error(error, 'Erreur envoi SMS');
      return ApiError.internal(reply);
    }
  });

  // POST /api/sms - Créer une entrée de log SMS (callback N8N)
  fastify.post('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; isN8nRequest?: boolean }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return ApiError.unauthorized(reply);
      }

      const body = createSmsLogSchema.parse(request.body);

      // Appel depuis frontend → déclenche n8n
      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ smsLog: unknown }>(
          tenantId,
          'sms_log_create',
          {
            callLogId: body.callLogId,
            direction: body.direction,
            fromNumber: body.fromNumber,
            toNumber: body.toNumber,
            body: body.body,
            status: body.status,
            twilioSid: body.twilioSid,
          }
        );
        await logEvent(tenantId, 'sms_log_create', 'smsLog', body.twilioSid || `${body.fromNumber}_${body.toNumber}`, body);
        return reply.status(201).send({ success: true, data: res.data });
      }

      // Appel depuis n8n (callback) → création BDD directe
      const smsLog = await prisma.smsLog.create({
        data: {
          tenantId: tenantId!,
          callLogId: body.callLogId || null,
          direction: body.direction,
          fromNumber: body.fromNumber,
          toNumber: body.toNumber,
          body: body.body,
          status: body.status,
          twilioSid: body.twilioSid || null,
        },
      });

      await logEvent(tenantId as string, 'sms_log_create', 'smsLog', smsLog.id, body);

      return reply.status(201).send({ success: true, data: smsLog });
    } catch (error) {
      const tenantId = request.tenantId;
      if (error instanceof z.ZodError) {
        const errorMsg = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        if (tenantId) {
          await logEvent(tenantId, 'sms_log_create', 'smsLog', 'unknown', { error: errorMsg }, 'erreur', errorMsg);
        }
        return ApiError.validation(reply, error);
      }
      if (tenantId) {
        await logEvent(tenantId, 'sms_log_create', 'smsLog', 'unknown', {}, 'erreur', error instanceof Error ? error.message : 'Erreur inconnue');
      }
      fastify.log.error(error, 'Erreur création log SMS');
      return ApiError.internal(reply);
    }
  });
}
