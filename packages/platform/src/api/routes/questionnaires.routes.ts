import type { Prisma } from '@prisma/client';
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
        payload: payload as Prisma.InputJsonValue,
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
          donnees: { entiteType, entiteId, typeEvenement } as Prisma.InputJsonValue,
        },
      });
    }
  } catch (e) {
    console.error('[logEvent] Erreur logging:', e);
  }
}

const questionSchema = z.object({
  question: z.string().min(1),
  answer: z.string().nullable(),
  order: z.number().int().nonnegative(),
});

const createQuestionnaireSchema = z.object({
  leadId: z.string().uuid(),
  questions: z.array(questionSchema),
  channel: z.enum(['telephone', 'sms', 'web']),
});

const updateQuestionnaireSchema = z.object({
  questions: z.array(questionSchema).optional(),
  status: z.enum(['en_cours', 'complete', 'abandonne']).optional(),
  completedAt: z.string().datetime({ offset: true }).optional().nullable(),
});

const paramsSchema = z.object({ id: z.string().uuid() });

export async function questionnairesRoutes(fastify: FastifyInstance) {
  // GET /api/questionnaires - Liste des questionnaires
  fastify.get('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      const query = request.query as { page?: string; limit?: string; status?: string; channel?: string };
      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 20;

      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ questionnaires: unknown[]; count: number; total: number; totalPages: number }>(
          tenantId,
          'questionnaire_list',
          {
            page,
            limit,
            status: query.status,
            channel: query.channel,
          }
        );
        const raw = res.data as { questionnaires?: unknown[]; count?: number; total?: number; page?: number; limit?: number; totalPages?: number };
        const questionnaires = Array.isArray(raw.questionnaires) ? raw.questionnaires : [];
        return reply.status(200).send({
          success: true,
          data: {
            questionnaires,
            count: questionnaires.length,
            total: raw.total ?? questionnaires.length,
            page: raw.page ?? 1,
            limit: raw.limit ?? 20,
            totalPages: raw.totalPages ?? 1,
          },
        });
      }

      // Appel depuis n8n (callback) → lecture BDD directe
      const skip = (page - 1) * limit;
      const where: Record<string, unknown> = { tenantId };
      if (query.status) where.status = query.status as 'en_cours' | 'complete' | 'abandonne';
      if (query.channel) where.channel = query.channel as 'telephone' | 'sms' | 'web';

      const [questionnaires, total] = await Promise.all([
        prisma.questionnaire.findMany({
          where,
          skip,
          take: limit,
          include: {
            lead: { select: { id: true, email: true, telephone: true, nom: true, prenom: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.questionnaire.count({ where }),
      ]);

      return reply.status(200).send({
        success: true,
        data: { questionnaires, count: questionnaires.length, total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      fastify.log.error(error, 'Erreur liste questionnaires');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // GET /api/questionnaires/:id - Détail d'un questionnaire
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
        const res = await n8nService.callWorkflowReturn<{ questionnaire: unknown }>(
          tenantId,
          'questionnaire_get',
          { id: params.id }
        );
        return reply.status(200).send({ success: true, data: res.data });
      }

      // Appel depuis n8n (callback) → lecture BDD directe
      const questionnaire = await prisma.questionnaire.findUnique({
        where: { id: params.id, tenantId },
        include: {
          lead: { select: { id: true, email: true, telephone: true, nom: true, prenom: true } },
        },
      });

      if (!questionnaire) {
        return reply.status(404).send({ success: false, error: 'Questionnaire non trouvé' });
      }

      return reply.status(200).send({ success: true, data: questionnaire });
    } catch (error) {
      fastify.log.error(error, 'Erreur détail questionnaire');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // POST /api/questionnaires - Créer un questionnaire
  fastify.post('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; isN8nRequest?: boolean }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      const body = createQuestionnaireSchema.parse(request.body);

      // Appel depuis frontend → déclenche n8n
      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ questionnaire: unknown }>(
          tenantId,
          'questionnaire_create',
          {
            leadId: body.leadId,
            questions: body.questions,
            channel: body.channel,
          }
        );
        await logEvent(tenantId, 'questionnaire_create', 'questionnaire', body.leadId, body);
        return reply.status(201).send({ success: true, data: res.data });
      }

      // Appel depuis n8n (callback) → création BDD directe
      const questionnaire = await prisma.questionnaire.create({
        data: {
          tenantId: tenantId!,
          leadId: body.leadId,
          channel: body.channel,
          status: 'en_cours',
          questions: body.questions as Prisma.InputJsonValue,
        },
        include: {
          lead: { select: { id: true, email: true, telephone: true, nom: true, prenom: true } },
        },
      });

      await logEvent(tenantId as string, 'questionnaire_create', 'questionnaire', questionnaire.id, body);

      return reply.status(201).send({ success: true, data: questionnaire });
    } catch (error) {
      const tenantId = request.tenantId;
      if (error instanceof z.ZodError) {
        const errorMsg = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        if (tenantId) {
          await logEvent(tenantId, 'questionnaire_create', 'questionnaire', 'unknown', { error: errorMsg }, 'erreur', errorMsg);
        }
        return reply.status(400).send({ success: false, error: 'Données invalides', details: error.errors });
      }
      if (tenantId) {
        await logEvent(tenantId, 'questionnaire_create', 'questionnaire', 'unknown', {}, 'erreur', error instanceof Error ? error.message : 'Erreur inconnue');
      }
      fastify.log.error(error, 'Erreur création questionnaire');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // PUT /api/questionnaires/:id - Mettre à jour un questionnaire
  fastify.put('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; isN8nRequest?: boolean }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      const params = paramsSchema.parse(request.params);
      const body = updateQuestionnaireSchema.parse(request.body);

      // Appel depuis frontend → déclenche n8n
      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ questionnaire: unknown }>(
          tenantId,
          'questionnaire_update',
          {
            id: params.id,
            questions: body.questions,
            status: body.status,
            completedAt: body.completedAt,
          }
        );
        await logEvent(tenantId, 'questionnaire_update', 'questionnaire', params.id, body);
        return reply.status(200).send({ success: true, data: res.data });
      }

      // Appel depuis n8n (callback) → mise à jour BDD directe
      const questionnaire = await prisma.questionnaire.findUnique({
        where: { id: params.id, tenantId },
      });

      if (!questionnaire) {
        return reply.status(404).send({ success: false, error: 'Questionnaire non trouvé' });
      }

      const updateData: Record<string, unknown> = {};
      if (body.status !== undefined) updateData.status = body.status;
      if (body.completedAt !== undefined) updateData.completedAt = body.completedAt ? new Date(body.completedAt) : null;
      if (body.questions !== undefined) updateData.questions = body.questions as Prisma.InputJsonValue;

      const updatedQuestionnaire = await prisma.questionnaire.update({
        where: { id: params.id },
        data: updateData,
        include: {
          lead: { select: { id: true, email: true, telephone: true, nom: true, prenom: true } },
        },
      });

      await logEvent(tenantId as string, 'questionnaire_update', 'questionnaire', params.id, body);

      return reply.status(200).send({ success: true, data: updatedQuestionnaire });
    } catch (error) {
      const tenantId = request.tenantId;
      if (error instanceof z.ZodError) {
        const errorMsg = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        if (tenantId) {
          await logEvent(tenantId, 'questionnaire_update', 'questionnaire', 'unknown', { error: errorMsg }, 'erreur', errorMsg);
        }
        return reply.status(400).send({ success: false, error: 'Données invalides', details: error.errors });
      }
      if (tenantId) {
        await logEvent(tenantId, 'questionnaire_update', 'questionnaire', 'unknown', {}, 'erreur', error instanceof Error ? error.message : 'Erreur inconnue');
      }
      fastify.log.error(error, 'Erreur mise à jour questionnaire');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // DELETE /api/questionnaires/:id - Supprimer un questionnaire
  fastify.delete('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; isN8nRequest?: boolean }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      const params = paramsSchema.parse(request.params);

      // Appel depuis frontend → déclenche n8n
      if (!fromN8n && tenantId) {
        await n8nService.callWorkflowReturn<{ success: boolean }>(
          tenantId,
          'questionnaire_delete',
          { id: params.id }
        );
        await logEvent(tenantId, 'questionnaire_delete', 'questionnaire', params.id, {});
        return reply.status(200).send({ success: true, message: 'Questionnaire supprimé' });
      }

      // Appel depuis n8n (callback) → suppression BDD directe
      const questionnaire = await prisma.questionnaire.findUnique({
        where: { id: params.id, tenantId },
      });

      if (!questionnaire) {
        return reply.status(404).send({ success: false, error: 'Questionnaire non trouvé' });
      }

      await prisma.questionnaire.delete({
        where: { id: params.id },
      });

      await logEvent(tenantId as string, 'questionnaire_delete', 'questionnaire', params.id, {});

      return reply.status(200).send({ success: true, message: 'Questionnaire supprimé' });
    } catch (error) {
      const tenantId = request.tenantId;
      if (error instanceof z.ZodError) {
        const errorMsg = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        if (tenantId) {
          await logEvent(tenantId, 'questionnaire_delete', 'questionnaire', 'unknown', { error: errorMsg }, 'erreur', errorMsg);
        }
        return reply.status(400).send({ success: false, error: 'Données invalides', details: error.errors });
      }
      if (tenantId) {
        await logEvent(tenantId, 'questionnaire_delete', 'questionnaire', 'unknown', {}, 'erreur', error instanceof Error ? error.message : 'Erreur inconnue');
      }
      fastify.log.error(error, 'Erreur suppression questionnaire');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });
}
