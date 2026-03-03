/**
 * Routes API Qonto — consultation solde & transactions.
 * GET /api/qonto/balance
 * GET /api/qonto/transactions
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { isQontoConfigured, getBalance, listTransactions } from '../../services/qonto-agent.service.js';
import type { JWTPayload } from '../../services/auth.service.js';

interface AuthRequest extends FastifyRequest {
  user?: JWTPayload;
}

export async function qontoRoutes(fastify: FastifyInstance) {

  // GET /api/qonto/status — vérifier si Qonto est configuré
  fastify.get('/status', async (_request: AuthRequest, reply: FastifyReply) => {
    return reply.send({ configured: isQontoConfigured() });
  });

  // GET /api/qonto/balance — solde du compte principal
  fastify.get('/balance', async (_request: AuthRequest, reply: FastifyReply) => {
    if (!isQontoConfigured()) {
      return reply.status(400).send({ error: 'Qonto non configuré. Ajoutez QONTO_LOGIN et QONTO_SECRET_KEY dans .env' });
    }
    try {
      const balance = await getBalance();
      return reply.send(balance);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  // GET /api/qonto/transactions — liste des transactions
  fastify.get('/transactions', async (request: AuthRequest, reply: FastifyReply) => {
    if (!isQontoConfigured()) {
      return reply.status(400).send({ error: 'Qonto non configuré. Ajoutez QONTO_LOGIN et QONTO_SECRET_KEY dans .env' });
    }

    const query = request.query as Record<string, string>;

    try {
      const result = await listTransactions({
        settled_at_from: query.settled_at_from || query.from,
        settled_at_to: query.settled_at_to || query.to,
        side: query.side as 'credit' | 'debit' | undefined,
        per_page: query.per_page ? Math.min(Number(query.per_page), 100) : 50,
        current_page: query.page ? Number(query.page) : 1,
      });
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });
}
