import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';

async function logEvent(tenantId: string, typeEvenement: string, entiteType: string, entiteId: string, payload: Record<string, unknown>, statut: 'succes' | 'erreur' = 'succes', messageErreur?: string) {
  try {
    await prisma.eventLog.create({
      data: {
        tenantId,
        typeEvenement,
        entiteType,
        entiteId,
        payload: payload as Record<string, unknown>,
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
          donnees: { entiteType, entiteId, typeEvenement } as Record<string, unknown>,
        },
      });
    }
  } catch (e) {
    console.error('[logEvent] Erreur logging:', e);
  }
}

const createCallLogSchema = z.object({
  callSid: z.string(),
  direction: z.enum(['entrant', 'sortant']),
  callerPhone: z.string(),
  calledNumber: z.string(),
  duration: z.number().int().nonnegative(),
  status: z.enum(['completed', 'failed', 'no-answer', 'busy']),
  conversationLog: z.any().optional(),
  transcript: z.string().optional().nullable(),
  callerName: z.string().optional().nullable(),
  callerEmail: z.string().email().optional().nullable(),
  callerAddress: z.string().optional().nullable(),
  urgencyLevel: z.enum(['CRITIQUE', 'URGENT', 'STANDARD', 'INFO']).optional(),
  actionTaken: z.enum(['RDV', 'DISPATCH', 'DEVIS', 'TRANSFERT', 'INFO']).optional().nullable(),
  sentiment: z.enum(['POSITIF', 'NEUTRE', 'FRUSTRE', 'EN_DETRESSE']).optional(),
  leadId: z.string().uuid().optional().nullable(),
  appointmentDate: z.string().datetime({ offset: true }).optional().nullable(),
  niche: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  followUpRequired: z.boolean().optional().default(false),
  smsSent: z.boolean().optional().default(false),
});

const updateCallLogSchema = z.object({
  notes: z.string().optional().nullable(),
  followUpDone: z.boolean().optional(),
  status: z.enum(['completed', 'failed', 'no-answer', 'busy']).optional(),
});

const paramsSchema = z.object({ id: z.string().uuid() });

export async function callLogsRoutes(fastify: FastifyInstance) {
  // GET /api/call-logs - Liste
  fastify.get('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      const query = request.query as {
        page?: string;
        limit?: string;
        dateFrom?: string;
        dateTo?: string;
        urgencyLevel?: string;
        status?: string;
        sentiment?: string;
        direction?: string;
      };
      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 20;

      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ callLogs: unknown[]; count: number; total: number; totalPages: number }>(
          tenantId,
          'call_log_list',
          {
            page,
            limit,
            dateFrom: query.dateFrom,
            dateTo: query.dateTo,
            urgencyLevel: query.urgencyLevel,
            status: query.status,
            sentiment: query.sentiment,
            direction: query.direction,
          }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n — workflow call_log_list indisponible' });
        }
        const raw = res.data as { callLogs?: unknown[]; count?: number; total?: number; page?: number; limit?: number; totalPages?: number };
        const callLogs = Array.isArray(raw.callLogs) ? raw.callLogs : [];
        return reply.status(200).send({
          success: true,
          data: {
            callLogs,
            count: callLogs.length,
            total: raw.total ?? callLogs.length,
            page: raw.page ?? 1,
            limit: raw.limit ?? 20,
            totalPages: raw.totalPages ?? 1,
          },
        });
      }

      // Appel depuis n8n (callback) → lecture BDD directe
      const skip = (page - 1) * limit;
      const where: Record<string, unknown> = { tenantId };

      if (query.dateFrom || query.dateTo) {
        const dateFilter: Record<string, unknown> = {};
        if (query.dateFrom) dateFilter.gte = new Date(query.dateFrom);
        if (query.dateTo) dateFilter.lte = new Date(query.dateTo);
        where.createdAt = dateFilter;
      }

      if (query.urgencyLevel) where.urgencyLevel = query.urgencyLevel;
      if (query.status) where.status = query.status;
      if (query.sentiment) where.sentiment = query.sentiment;
      if (query.direction) where.direction = query.direction;

      const [callLogs, total] = await Promise.all([
        prisma.callLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.callLog.count({ where }),
      ]);

      return reply.status(200).send({
        success: true,
        data: { callLogs, count: callLogs.length, total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      fastify.log.error(error, 'Erreur liste call logs');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // GET /api/call-logs/stats - Statistiques
  fastify.get('/stats', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ stats: unknown }>(
          tenantId,
          'call_log_stats',
          {}
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n — workflow call_log_stats indisponible' });
        }
        return reply.status(200).send({
          success: true,
          data: res.data,
        });
      }

      // Appel depuis n8n (callback) → lecture BDD directe
      const where = { tenantId };
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [
        total,
        todayCount,
        avgDuration,
        byUrgency,
        byAction,
        sentiment,
        byDay,
      ] = await Promise.all([
        prisma.callLog.count({ where }),
        prisma.callLog.count({ where: { ...where, createdAt: { gte: today } } }),
        prisma.callLog.aggregate({
          where,
          _avg: { duration: true },
        }),
        prisma.callLog.groupBy({
          by: ['urgencyLevel'],
          where,
          _count: true,
        }),
        prisma.callLog.groupBy({
          by: ['actionTaken'],
          where,
          _count: true,
        }),
        prisma.callLog.groupBy({
          by: ['sentiment'],
          where,
          _count: true,
        }),
        prisma.callLog.groupBy({
          by: ['createdAt'],
          where: { ...where, createdAt: { gte: sevenDaysAgo } },
          _count: true,
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      return reply.status(200).send({
        success: true,
        data: {
          total,
          today: todayCount,
          avgDuration: avgDuration._avg.duration ?? 0,
          byUrgency,
          byAction,
          sentiment,
          byDay: byDay.map((d: { createdAt: Date; _count: number }) => ({
            date: d.createdAt,
            count: d._count,
          })),
        },
      });
    } catch (error) {
      fastify.log.error(error, 'Erreur statistiques call logs');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // GET /api/call-logs/:id
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

      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ callLog: unknown }>(
          tenantId,
          'call_log_get',
          { callLogId: params.id }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n — workflow call_log_get indisponible' });
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

      const callLog = await prisma.callLog.findFirst({ where });

      if (!callLog) return reply.status(404).send({ success: false, error: 'Call log non trouvé' });
      return reply.status(200).send({ success: true, data: { callLog } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur récupération call log');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // POST /api/call-logs - Créer
  fastify.post('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const body = createCallLogSchema.parse(request.body);

      const tenantId = fromN8n
        ? (body as { tenantId?: string }).tenantId || request.tenantId
        : request.tenantId;

      if (!tenantId) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      // Application no-code : création passe par n8n si appel depuis frontend
      if (!fromN8n) {
        const bodyWithoutTenantId = { ...body };
        if ('tenantId' in bodyWithoutTenantId) {
          delete (bodyWithoutTenantId as { tenantId?: string }).tenantId;
        }

        const res = await n8nService.callWorkflowReturn<{ callLog: unknown }>(
          tenantId,
          'call_log_create',
          { ...bodyWithoutTenantId, tenantId }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }

        return reply.status(201).send({
          success: true,
          message: 'Call log créé via n8n',
          data: res.data,
        });
      }

      // Appel depuis n8n (callback) : persister en base
      const callLog = await prisma.callLog.create({
        data: {
          tenantId,
          callSid: body.callSid,
          direction: body.direction,
          callerPhone: body.callerPhone,
          calledNumber: body.calledNumber,
          duration: body.duration,
          status: body.status,
          conversationLog: body.conversationLog ?? undefined,
          transcript: body.transcript ?? null,
          callerName: body.callerName ?? null,
          callerEmail: body.callerEmail ?? null,
          callerAddress: body.callerAddress ?? null,
          urgencyLevel: body.urgencyLevel ?? undefined,
          actionTaken: body.actionTaken ?? null,
          sentiment: body.sentiment ?? undefined,
          leadId: body.leadId ?? null,
          appointmentDate: body.appointmentDate ? new Date(body.appointmentDate) : null,
          niche: body.niche ?? null,
          notes: body.notes ?? null,
          followUpRequired: body.followUpRequired ?? false,
          smsSent: body.smsSent ?? false,
        },
      });

      // Log the event
      await logEvent(tenantId, 'call_log_create', 'CallLog', callLog.id, { callSid: callLog.callSid, duration: callLog.duration }, 'succes');

      return reply.status(201).send({
        success: true,
        message: 'Call log créé',
        data: { callLog },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'call_log_create', 'CallLog', 'unknown', { error: errorMessage } as Record<string, unknown>, 'erreur', errorMessage);
        }
      } catch {
        // Error handling, continue
      }
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur création call log');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // PUT /api/call-logs/:id - Mettre à jour
  fastify.put('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);
      const body = updateCallLogSchema.parse(request.body);
      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      const callLog = await prisma.callLog.findFirst({ where: { id: params.id, tenantId } });
      if (!callLog) return reply.status(404).send({ success: false, error: 'Non trouvé' });

      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ callLog: unknown }>(
          tenantId,
          'call_log_update',
          { callLogId: params.id, ...body }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }
        return reply.status(200).send({
          success: true,
          message: 'Call log mis à jour via n8n',
          data: res.data,
        });
      }

      const updateData: Record<string, unknown> = {};
      if (body.notes !== undefined) updateData.notes = body.notes;
      if (body.followUpDone !== undefined) updateData.followUpDone = body.followUpDone;
      if (body.status !== undefined) updateData.status = body.status;

      const updated = await prisma.callLog.update({
        where: { id: params.id },
        data: updateData,
      });

      // Log the event
      await logEvent(tenantId, 'call_log_update', 'CallLog', updated.id, { callSid: updated.callSid, updates: Object.keys(updateData) }, 'succes');

      return reply.status(200).send({ success: true, message: 'Call log mis à jour', data: { callLog: updated } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'call_log_update', 'CallLog', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage } as Record<string, unknown>, 'erreur', errorMessage);
        }
      } catch {
        // Error handling, continue
      }
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur mise à jour call log');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // DELETE /api/call-logs/:id
  fastify.delete('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);
      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      const callLog = await prisma.callLog.findFirst({ where: { id: params.id, tenantId } });
      if (!callLog) return reply.status(404).send({ success: false, error: 'Non trouvé' });

      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ success: boolean }>(
          tenantId,
          'call_log_delete',
          { callLogId: params.id }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }
        return reply.status(200).send({
          success: true,
          message: 'Call log supprimé via n8n',
        });
      }

      await prisma.callLog.delete({ where: { id: params.id } });

      // Log the event
      await logEvent(tenantId, 'call_log_delete', 'CallLog', params.id, { callSid: callLog.callSid }, 'succes');

      return reply.status(200).send({ success: true, message: 'Call log supprimé' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'call_log_delete', 'CallLog', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage } as Record<string, unknown>, 'erreur', errorMessage);
        }
      } catch {
        // Error handling, continue
      }
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur suppression call log');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });
}
