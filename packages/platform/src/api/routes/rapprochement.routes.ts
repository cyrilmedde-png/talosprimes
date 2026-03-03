/**
 * Routes de rapprochement bancaire.
 * POST /api/rapprochement/csv      — upload CSV + rapprochement automatique
 * POST /api/rapprochement/confirm  — confirmer et marquer les factures comme payées
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { rapprochement } from '../../services/rapprochement.service.js';
import { prisma } from '../../config/database.js';
import type { JWTPayload } from '../../services/auth.service.js';

interface AuthRequest extends FastifyRequest {
  user?: JWTPayload;
}

export async function rapprochementRoutes(fastify: FastifyInstance) {

  // POST /api/rapprochement/csv — upload et analyse
  fastify.post('/csv', async (request: AuthRequest, reply: FastifyReply) => {
    const tenantId = request.user?.tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non authentifié' });

    const body = request.body as { csv?: string; autoMarkPaid?: boolean } | undefined;
    if (!body?.csv) {
      return reply.status(400).send({ error: 'Le champ "csv" est requis (contenu du fichier CSV en texte)' });
    }

    try {
      const result = await rapprochement(tenantId, body.csv, {
        autoMarkPaid: body.autoMarkPaid === true,
      });
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: message });
    }
  });

  // POST /api/rapprochement/confirm — confirmer des matchs spécifiques
  fastify.post('/confirm', async (request: AuthRequest, reply: FastifyReply) => {
    const tenantId = request.user?.tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non authentifié' });

    const body = request.body as { invoiceIds?: string[] } | undefined;
    if (!body?.invoiceIds?.length) {
      return reply.status(400).send({ error: 'invoiceIds requis (liste des factures à marquer comme payées)' });
    }

    const results = [];
    for (const invoiceId of body.invoiceIds) {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, tenantId, deletedAt: null },
      });

      if (!invoice) {
        results.push({ id: invoiceId, success: false, reason: 'Facture non trouvée' });
        continue;
      }

      if (invoice.statut === 'payee') {
        results.push({ id: invoiceId, success: false, reason: 'Déjà payée' });
        continue;
      }

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          statut: 'payee',
          modePaiement: 'virement',
        },
      });

      results.push({ id: invoiceId, success: true, numeroFacture: invoice.numeroFacture });
    }

    return reply.send({
      confirmed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      details: results,
    });
  });
}
