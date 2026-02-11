import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { chatAgent } from '../../services/agent.service.js';

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

export async function agentRoutes(fastify: FastifyInstance) {
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
