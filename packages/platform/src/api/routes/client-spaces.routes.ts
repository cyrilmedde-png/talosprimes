import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';

const paramsSchema = z.object({ id: z.string().uuid() });

const createSchema = z.object({
  clientFinalId: z.string().uuid(),
  raisonSociale: z.string().optional(),
  nom: z.string().optional(),
  prenom: z.string().optional(),
  modulesInclus: z.array(z.string()).optional(),
});

const listQuerySchema = z.object({
  status: z.string().optional(),
});

/** Normalise un espace client renvoyé par n8n (snake_case → camelCase). */
function normalizeClientSpaceFromN8n(row: Record<string, unknown>): Record<string, unknown> {
  const toStr = (v: unknown) => (v != null ? String(v) : undefined);
  const toDate = (v: unknown) => (v != null ? new Date(v as string | Date).toISOString() : undefined);
  const toArr = (v: unknown) => (Array.isArray(v) ? v : []);
  return {
    id: row.id,
    tenantId: row.tenant_id ?? row.tenantId,
    clientFinalId: row.client_final_id ?? row.clientFinalId,
    clientTenantId: row.client_tenant_id ?? row.clientTenantId,
    tenantSlug: toStr(row.tenant_slug ?? row.tenantSlug),
    folderPath: toStr(row.folder_path ?? row.folderPath),
    status: toStr(row.status),
    modulesActives: toArr(row.modules_actives ?? row.modulesActives),
    validatedAt: toDate(row.validated_at ?? row.validatedAt),
    validatedByUserId: row.validated_by_user_id ?? row.validatedByUserId,
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
    // Données client jointes
    clientNom: toStr(row.client_nom ?? row.clientNom),
    clientPrenom: toStr(row.client_prenom ?? row.clientPrenom),
    raisonSociale: toStr(row.raison_sociale ?? row.raisonSociale),
    clientEmail: toStr(row.client_email ?? row.clientEmail),
    clientTelephone: toStr(row.client_telephone ?? row.clientTelephone),
  };
}

/**
 * Routes pour la gestion des espaces clients
 * Toutes les routes passent par n8n
 */
export async function clientSpacesRoutes(fastify: FastifyInstance) {

  // POST /api/client-spaces — Créer un espace client
  fastify.post(
    '/',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const fromN8n = request.isN8nRequest === true;

        if (!tenantId && !fromN8n) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        if (!fromN8n && tenantId) {
          const body = createSchema.parse(request.body);
          const res = await n8nService.callWorkflowReturn<Record<string, unknown>>(
            tenantId,
            'client_space_create',
            body
          );
          return reply.status(201).send({ success: true, data: res.data });
        }

        // Callback depuis n8n → lecture BDD directe OK
        if (fromN8n) {
          const body = request.body as Record<string, unknown>;
          const tid = (body.tenantId ?? body.tenant_id) as string;
          if (!tid) return reply.status(400).send({ success: false, error: 'tenantId requis' });
          const spaces = await prisma.clientSpace.findMany({
            where: { tenantId: tid },
            orderBy: { createdAt: 'desc' },
          });
          return reply.status(200).send({ success: true, data: { spaces } });
        }

        return reply.status(400).send({ success: false, error: 'Requête invalide' });
      } catch (err) {
        const msg = err instanceof z.ZodError
          ? err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
          : (err instanceof Error ? err.message : 'Erreur interne');
        return reply.status(400).send({ success: false, error: msg });
      }
    }
  );

  // GET /api/client-spaces — Liste des espaces clients
  fastify.get(
    '/',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const fromN8n = request.isN8nRequest === true;

        if (!tenantId && !fromN8n) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        if (!fromN8n && tenantId) {
          const query = listQuerySchema.parse(request.query);
          const res = await n8nService.callWorkflowReturn<{ spaces: unknown[] }>(
            tenantId,
            'client_space_list',
            { status: query.status || '' }
          );
          const raw = res.data as { spaces?: unknown[] };
          const spaces = Array.isArray(raw.spaces)
            ? raw.spaces.map((s) => normalizeClientSpaceFromN8n(s as Record<string, unknown>))
            : [];
          return reply.status(200).send({ success: true, data: { spaces } });
        }

        // Callback n8n
        if (fromN8n) {
          const body = request.body as Record<string, unknown>;
          const tid = (body.tenantId ?? body.tenant_id) as string;
          if (!tid) return reply.status(400).send({ success: false, error: 'tenantId requis' });
          const spaces = await prisma.clientSpace.findMany({
            where: { tenantId: tid },
            orderBy: { createdAt: 'desc' },
          });
          return reply.status(200).send({ success: true, data: { spaces } });
        }

        return reply.status(400).send({ success: false, error: 'Requête invalide' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur interne';
        return reply.status(500).send({ success: false, error: msg });
      }
    }
  );

  // GET /api/client-spaces/:id — Détails d'un espace client
  fastify.get(
    '/:id',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const fromN8n = request.isN8nRequest === true;
        const { id } = paramsSchema.parse(request.params);

        if (!tenantId && !fromN8n) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        if (!fromN8n && tenantId) {
          const res = await n8nService.callWorkflowReturn<{ space: unknown }>(
            tenantId,
            'client_space_get',
            { clientSpaceId: id }
          );
          const raw = res.data as { space?: Record<string, unknown> };
          const space = raw.space ? normalizeClientSpaceFromN8n(raw.space) : null;
          if (!space) {
            return reply.status(404).send({ success: false, error: 'Espace client introuvable' });
          }
          return reply.status(200).send({ success: true, data: { space } });
        }

        // Callback n8n
        if (fromN8n) {
          const body = request.body as Record<string, unknown>;
          const tid = (body.tenantId ?? body.tenant_id) as string;
          if (!tid) return reply.status(400).send({ success: false, error: 'tenantId requis' });
          const space = await prisma.clientSpace.findFirst({
            where: { id, tenantId: tid },
          });
          return reply.status(200).send({ success: true, data: { space } });
        }

        return reply.status(400).send({ success: false, error: 'Requête invalide' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur interne';
        return reply.status(500).send({ success: false, error: msg });
      }
    }
  );

  // POST /api/client-spaces/:id/validate — Valider un espace client (admin)
  fastify.post(
    '/:id/validate',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: FastifyRequest & { tenantId?: string; userId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const fromN8n = request.isN8nRequest === true;
        const { id } = paramsSchema.parse(request.params);

        if (!tenantId && !fromN8n) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        if (!fromN8n && tenantId) {
          const res = await n8nService.callWorkflowReturn<Record<string, unknown>>(
            tenantId,
            'client_space_validate',
            {
              clientSpaceId: id,
              validatedByUserId: request.userId || '',
            }
          );
          return reply.status(200).send({ success: true, data: res.data });
        }

        return reply.status(400).send({ success: false, error: 'Requête invalide' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur interne';
        return reply.status(500).send({ success: false, error: msg });
      }
    }
  );

  // POST /api/client-spaces/:id/resend-email — Renvoyer les identifiants par email
  fastify.post(
    '/:id/resend-email',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const fromN8n = request.isN8nRequest === true;
        const { id } = paramsSchema.parse(request.params);

        if (!tenantId && !fromN8n) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        if (!fromN8n && tenantId) {
          const res = await n8nService.callWorkflowReturn<Record<string, unknown>>(
            tenantId,
            'client_space_resend_email',
            { clientSpaceId: id }
          );
          return reply.status(200).send({ success: true, data: res.data });
        }

        return reply.status(400).send({ success: false, error: 'Requête invalide' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur interne';
        return reply.status(500).send({ success: false, error: msg });
      }
    }
  );
}
