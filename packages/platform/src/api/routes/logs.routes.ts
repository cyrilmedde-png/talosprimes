import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

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
    'lead_create',
    'lead_created',
    'lead_update',
    'lead_updated',
    'lead_delete',
    'lead_deleted',
    'lead_questionnaire',
    'lead_entretien',
    'lead_confirmation',
    'lead_inscription',
    'leads_list',
    'lead_get',
    'lead_update_status',
    'lead_status_updated',
  ],
  clients: [
    'client.created',
    'client.updated',
    'client.deleted',
    'client_create',
    'client_update',
    'client_delete',
    'client_create_from_lead',
    'clients_list',
    'client_get',
  ],
};

export async function logsRoutes(fastify: FastifyInstance) {
  // GET /api/logs - Lister les logs du tenant
  fastify.get(
    '/',
    {
      preHandler: [authMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId as string;
        const query = getLogsQuerySchema.parse(request.query);

        // Construire le where clause
        const where: {
          tenantId: string;
          typeEvenement?: { in: string[] } | string;
          statutExecution?: 'en_attente' | 'succes' | 'erreur';
        } = {
          tenantId,
        };

        // Filtrer par workflow
        if (query.workflow && query.workflow !== 'all') {
          const events = WORKFLOW_EVENTS[query.workflow] || [];
          where.typeEvenement = { in: events };
        }

        // Filtrer par type d'événement si spécifié
        if (query.typeEvenement) {
          where.typeEvenement = query.typeEvenement;
        }

        // Filtrer par statut d'exécution si spécifié
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

        // Déterminer le workflow pour chaque log
        const logsWithWorkflow = logs.map((log) => {
          let workflow = 'other';
          if (WORKFLOW_EVENTS.leads.includes(log.typeEvenement)) {
            workflow = 'leads';
          } else if (WORKFLOW_EVENTS.clients.includes(log.typeEvenement)) {
            workflow = 'clients';
          }

          return {
            ...log,
            workflow,
          };
        });

        return reply.send({
          success: true,
          data: {
            logs: logsWithWorkflow,
            total,
            limit: query.limit,
            offset: query.offset,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Paramètres invalides',
            details: error.errors,
          });
        }
        fastify.log.error(error, 'Erreur récupération logs');
        return reply.status(500).send({
          success: false,
          error: 'Erreur lors de la récupération des logs',
        });
      }
    }
  );

  // GET /api/logs/stats - Statistiques des logs (erreurs, warnings, etc.)
  fastify.get(
    '/stats',
    {
      preHandler: [authMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId as string;
        const { workflow } = request.query as { workflow?: string };

        const where: {
          tenantId: string;
          typeEvenement?: { in: string[] };
        } = {
          tenantId,
        };

        // Filtrer par workflow si spécifié
        if (workflow && workflow !== 'all') {
          const events = WORKFLOW_EVENTS[workflow] || [];
          where.typeEvenement = { in: events };
        }

        const [total, succeeded, errors, enAttente] = await Promise.all([
          prisma.eventLog.count({ where }),
          prisma.eventLog.count({
            where: { ...where, statutExecution: 'succes' },
          }),
          prisma.eventLog.count({
            where: { ...where, statutExecution: 'erreur' },
          }),
          prisma.eventLog.count({
            where: { ...where, statutExecution: 'en_attente' },
          }),
        ]);

        // Statistiques par workflow
        const statsByWorkflow = {
          leads: {
            total: 0,
            errors: 0,
            succeeded: 0,
          },
          clients: {
            total: 0,
            errors: 0,
            succeeded: 0,
          },
        };

        for (const [workflowName, events] of Object.entries(WORKFLOW_EVENTS)) {
          const workflowWhere = {
            tenantId,
            typeEvenement: { in: events },
          };

          const [workflowTotal, workflowErrors, workflowSucceeded] = await Promise.all([
            prisma.eventLog.count({ where: workflowWhere }),
            prisma.eventLog.count({
              where: { ...workflowWhere, statutExecution: 'erreur' },
            }),
            prisma.eventLog.count({
              where: { ...workflowWhere, statutExecution: 'succes' },
            }),
          ]);

          statsByWorkflow[workflowName as keyof typeof statsByWorkflow] = {
            total: workflowTotal,
            errors: workflowErrors,
            succeeded: workflowSucceeded,
          };
        }

        return reply.send({
          success: true,
          data: {
            total,
            succeeded,
            errors,
            enAttente,
            byWorkflow: statsByWorkflow,
          },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur récupération stats logs');
        return reply.status(500).send({
          success: false,
          error: 'Erreur lors de la récupération des statistiques',
        });
      }
    }
  );
}

