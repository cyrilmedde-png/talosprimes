import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { n8nService } from '../../services/n8n.service.js';

const getLogsQuerySchema = z.object({
  typeEvenement: z.string().optional(),
  statutExecution: z.enum(['en_attente', 'succes', 'erreur']).optional(),
  workflow: z.enum(['leads', 'clients', 'all']).optional().default('all'),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
  offset: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 0)),
});

// Mapper les types d'événements par workflow
const WORKFLOW_EVENTS: Record<string, string[]> = {
  leads: [
    'lead_create', 'lead_created', 'lead_update', 'lead_updated',
    'lead_delete', 'lead_deleted', 'lead_questionnaire', 'lead_entretien',
    'lead_confirmation', 'lead_inscription', 'leads_list', 'lead_get',
    'lead_update_status', 'lead_status_updated',
  ],
  clients: [
    'client.created', 'client.updated', 'client.deleted', 'client.onboarding',
    'client_create', 'client_update', 'client_delete', 'client_create_from_lead',
    'clients_list', 'client_get',
  ],
};

export async function logsRoutes(fastify: FastifyInstance) {
  // GET /api/logs - Lister les logs du tenant
  fastify.get('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      const query = getLogsQuerySchema.parse(request.query);

      // Appel frontend → passe par n8n
      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ logs: unknown[]; total: number }>(
          tenantId,
          'logs_list',
          {
            limit: query.limit,
            offset: query.offset,
            workflow: query.workflow,
            typeEvenement: query.typeEvenement,
            statutExecution: query.statutExecution,
          }
        );
        const raw = res.data as Record<string, unknown>;
        return reply.status(200).send({
          success: true,
          data: {
            logs: raw.logs || [],
            total: raw.total || 0,
            limit: raw.limit || query.limit,
            offset: raw.offset || query.offset,
          },
        });
      }

      // Appel depuis n8n (callback) → lecture BDD directe
      const where: Record<string, unknown> = { tenantId };

      if (query.workflow && query.workflow !== 'all') {
        const events = WORKFLOW_EVENTS[query.workflow] || [];
        where.typeEvenement = { in: events };
      }
      if (query.typeEvenement) {
        where.typeEvenement = query.typeEvenement;
      }
      if (query.statutExecution) {
        where.statutExecution = query.statutExecution;
      }

      const [logs, total] = await Promise.all([
        prisma.eventLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: query.limit,
          skip: query.offset,
        }),
        prisma.eventLog.count({ where }),
      ]);

      const logsWithWorkflow = await Promise.all(
        logs.map(async (log: typeof logs[0]) => {
          let workflow = 'other';
          if (WORKFLOW_EVENTS.leads.includes(log.typeEvenement)) {
            workflow = 'leads';
          } else if (WORKFLOW_EVENTS.clients.includes(log.typeEvenement)) {
            workflow = 'clients';
          }

          let entityEmail: string | null = null;
          try {
            if (log.entiteType === 'ClientFinal') {
              const client = await prisma.clientFinal.findUnique({
                where: { id: log.entiteId },
                select: { email: true, raisonSociale: true, nom: true, prenom: true },
              });
              entityEmail = client?.email || client?.raisonSociale || `${client?.nom || ''} ${client?.prenom || ''}`.trim() || null;
            } else if (log.entiteType === 'Lead') {
              const lead = await prisma.lead.findUnique({
                where: { id: log.entiteId },
                select: { email: true, nom: true, prenom: true },
              });
              entityEmail = lead?.email || `${lead?.nom || ''} ${lead?.prenom || ''}`.trim() || null;
            }
          } catch (error) {
            fastify.log.warn(error, `Impossible de récupérer l'email pour ${log.entiteType} ${log.entiteId}`);
          }

          return { ...log, workflow, entityEmail };
        })
      );

      return reply.send({
        success: true,
        data: { logs: logsWithWorkflow, total, limit: query.limit, offset: query.offset },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: 'Paramètres invalides', details: error.errors });
      }
      fastify.log.error(error, 'Erreur récupération logs');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // GET /api/logs/stats - Statistiques des logs
  fastify.get('/stats', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      const { workflow } = request.query as { workflow?: string };

      // Appel frontend → passe par n8n
      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<unknown>(
          tenantId,
          'logs_stats',
          { workflow }
        );
        return reply.status(200).send({ success: true, data: res.data });
      }

      // Appel depuis n8n (callback) → lecture BDD directe
      const where: Record<string, unknown> = { tenantId };
      if (workflow && workflow !== 'all') {
        const events = WORKFLOW_EVENTS[workflow] || [];
        where.typeEvenement = { in: events };
      }

      const [total, succeeded, errors, enAttente] = await Promise.all([
        prisma.eventLog.count({ where }),
        prisma.eventLog.count({ where: { ...where, statutExecution: 'succes' } }),
        prisma.eventLog.count({ where: { ...where, statutExecution: 'erreur' } }),
        prisma.eventLog.count({ where: { ...where, statutExecution: 'en_attente' } }),
      ]);

      const statsByWorkflow: Record<string, { total: number; errors: number; succeeded: number }> = {
        leads: { total: 0, errors: 0, succeeded: 0 },
        clients: { total: 0, errors: 0, succeeded: 0 },
      };

      for (const [workflowName, events] of Object.entries(WORKFLOW_EVENTS)) {
        const workflowWhere = { tenantId, typeEvenement: { in: events } };
        const [wTotal, wErrors, wSucceeded] = await Promise.all([
          prisma.eventLog.count({ where: workflowWhere }),
          prisma.eventLog.count({ where: { ...workflowWhere, statutExecution: 'erreur' } }),
          prisma.eventLog.count({ where: { ...workflowWhere, statutExecution: 'succes' } }),
        ]);
        statsByWorkflow[workflowName] = { total: wTotal, errors: wErrors, succeeded: wSucceeded };
      }

      return reply.send({
        success: true,
        data: { total, succeeded, errors, enAttente, byWorkflow: statsByWorkflow },
      });
    } catch (error) {
      fastify.log.error(error, 'Erreur récupération stats logs');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });
}
