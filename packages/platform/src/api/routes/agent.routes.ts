import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { chatAgent } from '../../services/agent.service.js';
import { getAgentConfigForDisplay, saveAgentConfig } from '../../services/agent-config.service.js';
import { ApiError } from '../../utils/api-errors.js';

const chatBodySchema = z.object({
  message: z.string().min(1, 'Le message ne peut pas être vide').max(8000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
  /** Requis lorsque l'appel vient de n8n (header X-TalosPrimes-N8N-Secret). Optionnel avec JWT (tenantId issu du token). */
  tenantId: z.string().uuid().optional(),
});

const configPutSchema = z.object({
  email: z
    .object({
      imapHost: z.string().optional(),
      imapPort: z.number().optional(),
      imapUser: z.string().optional(),
      imapPassword: z.string().optional(),
      imapTls: z.boolean().optional(),
      smtpHost: z.string().optional(),
      smtpPort: z.number().optional(),
      smtpUser: z.string().optional(),
      smtpPassword: z.string().optional(),
      smtpFrom: z.string().email().optional().or(z.literal('')),
    })
    .optional(),
  qonto: z
    .object({
      apiSecret: z.string().optional(),
      bankAccountId: z.string().optional(),
    })
    .optional(),
});

export async function agentRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/agent/config — Config de l'agent (secrets masqués) pour l'onglet Paramètres
   */
  fastify.get(
    '/config',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        if (!tenantId) {
          return ApiError.unauthorized(reply);
        }
        const config = await getAgentConfigForDisplay(tenantId);
        return reply.code(200).send({ success: true, data: config });
      } catch (err) {
        fastify.log.error(err, 'Erreur GET agent config');
        return ApiError.internal(reply);
      }
    }
  );

  /**
   * PUT /api/agent/config — Enregistrer la config (email, qonto) depuis Paramètres
   */
  fastify.put(
    '/config',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        if (!tenantId) {
          return ApiError.unauthorized(reply);
        }
        const parse = configPutSchema.safeParse(request.body);
        if (!parse.success) {
          return ApiError.validation(reply, parse.error);
        }
        const patch = parse.data;
        if (patch.email && typeof patch.email.smtpFrom === 'string' && patch.email.smtpFrom === '') {
          patch.email.smtpFrom = undefined;
        }
        await saveAgentConfig(tenantId, patch);
        const config = await getAgentConfigForDisplay(tenantId);
        return reply.code(200).send({ success: true, data: config });
      } catch (err) {
        fastify.log.error(err, 'Erreur PUT agent config');
        return ApiError.internal(reply);
      }
    }
  );

  /**
   * POST /api/agent/chat
   * Envoie un message au Super Agent (outils: leads, clients, factures, emails, agenda, Qonto).
   * Auth: JWT (tenantId/user du token) OU n8n (X-TalosPrimes-N8N-Secret + tenantId dans le body).
   */
  fastify.post(
    '/chat',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const parseResult = chatBodySchema.safeParse(request.body);
        if (!parseResult.success) {
          return ApiError.validation(reply, parseResult.error);
        }

        const { message, history, tenantId: bodyTenantId } = parseResult.data;

        let tenantId: string;
        let userRole: string;

        if (request.isN8nRequest) {
          tenantId = bodyTenantId ?? request.tenantId ?? '';
          if (!tenantId) {
            return ApiError.badRequest(reply, 'tenantId requis dans le body pour les appels depuis n8n');
          }
          userRole = 'admin';
        } else {
          tenantId = request.tenantId ?? '';
          const user = request.user;
          if (!tenantId || !user) {
            return ApiError.unauthorized(reply, 'Token invalide ou expiré');
          }
          userRole = user.role;
        }

        const result = await chatAgent({
          message,
          history,
          tenantId,
          userRole,
        });

        return reply.code(200).send({
          success: result.success,
          reply: result.reply,
          ...(result.error && { error: result.error }),
        });
      } catch (err) {
        fastify.log.error(err, 'Erreur agent chat');
        return ApiError.internal(reply);
      }
    }
  );
}
