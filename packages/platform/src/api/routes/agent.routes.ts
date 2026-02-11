import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { chatAgent } from '../../services/agent.service.js';
import { getAgentConfigForDisplay, saveAgentConfig } from '../../services/agent-config.service.js';

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
          return reply.code(401).send({ success: false, error: 'Non authentifié' });
        }
        const config = await getAgentConfigForDisplay(tenantId);
        return reply.code(200).send({ success: true, data: config });
      } catch (err) {
        fastify.log.error(err, 'Erreur GET agent config');
        return reply.code(500).send({ success: false, error: 'Erreur serveur' });
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
          return reply.code(401).send({ success: false, error: 'Non authentifié' });
        }
        const parse = configPutSchema.safeParse(request.body);
        if (!parse.success) {
          return reply.code(400).send({ success: false, error: 'Données invalides', details: parse.error.flatten() });
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
        return reply.code(500).send({ success: false, error: 'Erreur serveur' });
      }
    }
  );

  /**
   * POST /api/agent/chat
   * Envoie un message à l'assistant et reçoit une réponse (avec outils TalosPrimes).
   * Requiert authentification JWT (tenantId et user extraits du token).
   */
  fastify.post(
    '/chat',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const user = request.user;
        if (!tenantId || !user) {
          return reply.code(401).send({
            success: false,
            error: 'Non authentifié',
            message: 'Token invalide ou expiré',
          });
        }

        const parseResult = chatBodySchema.safeParse(request.body);
        if (!parseResult.success) {
          return reply.code(400).send({
            success: false,
            error: 'Données invalides',
            details: parseResult.error.flatten(),
          });
        }

        const { message, history } = parseResult.data;
        const result = await chatAgent({
          message,
          history,
          tenantId,
          userRole: user.role,
        });

        return reply.code(200).send({
          success: result.success,
          reply: result.reply,
          ...(result.error && { error: result.error }),
        });
      } catch (err) {
        fastify.log.error(err, 'Erreur agent chat');
        return reply.code(500).send({
          success: false,
          error: 'Erreur serveur',
          message: err instanceof Error ? err.message : 'Erreur inconnue',
        });
      }
    }
  );
}
