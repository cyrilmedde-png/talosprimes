import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireRole } from '../../middleware/auth.middleware.js';
import { n8nService } from '../../services/n8n.service.js';

// ============================================
// Types stricts — zero any, zero prisma
// ============================================

interface CatalogItem {
  id: string;
  code: string;
  nom: string;
  description: string;
  categorie: string;
  icon: string;
  setup_price: number | string;
  monthly_price: number | string;
  complexity: string;
  workflow_count: number;
  workflow_templates: string[];
  features: string[];
  is_active: boolean;
  ordre: number;
}

interface PurchaseItem {
  id: string;
  tenant_id: string;
  automation_id: string;
  status: string;
  n8n_folder_id: string | null;
  n8n_folder_name: string | null;
  n8n_workflow_ids: string[];
  setup_price_paid: number | string;
  monthly_price: number | string;
  activated_at: string | null;
  config: Record<string, unknown>;
  created_at: string;
  code: string;
  nom: string;
}

interface TenantItem {
  id: string;
  nom_entreprise: string;
}

interface EventLogItem {
  id: string;
  type_evenement: string;
  entite_type: string | null;
  entite_id: string | null;
  statut_execution: string;
  message_erreur: string | null;
  workflow_n8n_id: string | null;
  created_at: string;
}

interface AutomationStats {
  totalAutomations: number;
  actives: number;
  executionsToday: number;
  tauxReussite: number;
  erreurs24h: number;
}

interface N8nActivateResult {
  folderId?: string;
  folderName?: string;
  workflowIds?: string[];
}

interface N8nStatusResult {
  success: boolean;
  message: string;
}

interface CatalogCreateBody {
  code: string;
  nom: string;
  description: string;
  categorie: string;
  icon?: string;
  setupPrice?: number;
  monthlyPrice?: number;
  complexity?: 'simple' | 'intermediaire' | 'avance';
  workflowCount?: number;
  workflowTemplates?: string[];
  features?: string[];
}

interface CatalogUpdateBody {
  nom?: string;
  description?: string;
  categorie?: string;
  icon?: string;
  setupPrice?: number;
  monthlyPrice?: number;
  complexity?: 'simple' | 'intermediaire' | 'avance';
  workflowCount?: number;
  workflowTemplates?: string[];
  features?: string[];
  isActive?: boolean;
  ordre?: number;
}

interface ActivateBody {
  tenantId: string;
  automationId: string;
  config?: Record<string, unknown>;
}

interface DeactivateBody {
  tenantId: string;
  automationId: string;
}

interface FolderBody {
  folderId: string;
  folderName?: string;
}

/**
 * Routes automatisations — 100% n8n, zero prisma, zero fallback.
 *
 * Chaque route delegue integralement a un workflow n8n via callWorkflowReturn.
 * Si n8n tombe, la route echoue. Pas de plan B.
 *
 * === PUBLIC (auth JWT) ===
 * GET  /api/automations/catalog              → n8n: automation_catalog_list
 * GET  /api/automations/purchases            → n8n: automation_purchases_list
 * GET  /api/automations/stats                → n8n: automation_stats
 * POST /api/automations/request              → n8n: automation_request
 *
 * === ADMIN (super_admin | admin) ===
 * POST /api/automations/catalog              → n8n: automation_catalog_create
 * PUT  /api/automations/catalog/:id          → n8n: automation_catalog_update
 * DELETE /api/automations/catalog/:id        → n8n: automation_catalog_delete
 * POST /api/automations/activate             → n8n: automation_activate
 * POST /api/automations/deactivate           → n8n: automation_deactivate
 * GET  /api/automations/logs/:tenantId       → n8n: automation_logs_list
 * GET  /api/automations/logs                 → n8n: automation_logs_list
 * GET  /api/automations/tenants              → n8n: automation_tenants_list
 * GET  /api/automations/purchases/:tenantId  → n8n: automation_purchases_list
 * PUT  /api/automations/folder/:tenantId     → n8n: automation_folder_update
 * GET  /api/automations/n8n/status           → n8n: automation_n8n_status
 * GET  /api/automations/dashboard            → n8n: automation_dashboard_stats
 */
export async function automationsRoutes(fastify: FastifyInstance) {

  // ──────────────────────────────────────────────
  // GET /catalog — Liste le catalogue via n8n
  // ──────────────────────────────────────────────
  fastify.get('/catalog', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Non autorise' });

    const isAdmin = request.user?.role === 'super_admin' || request.user?.role === 'admin';

    try {
      const res = await n8nService.callWorkflowReturn<{ catalog: CatalogItem[] }>(
        tenantId,
        'automation_catalog_list',
        { isAdmin: String(isAdmin) }
      );
      return reply.send(res);
    } catch (error) {
      fastify.log.error(error, '[automations/catalog] Erreur n8n');
      return reply.status(502).send({ success: false, error: 'Erreur communication n8n' });
    }
  });

  // ──────────────────────────────────────────────
  // GET /purchases — Achats du tenant courant via n8n
  // ──────────────────────────────────────────────
  fastify.get('/purchases', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Non autorise' });

    try {
      const res = await n8nService.callWorkflowReturn<{ purchases: PurchaseItem[] }>(
        tenantId,
        'automation_purchases_list',
        { tenantId }
      );
      return reply.send(res);
    } catch (error) {
      fastify.log.error(error, '[automations/purchases] Erreur n8n');
      return reply.status(502).send({ success: false, error: 'Erreur communication n8n' });
    }
  });

  // ──────────────────────────────────────────────
  // GET /stats — Stats du tenant courant via n8n
  // ──────────────────────────────────────────────
  fastify.get('/stats', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Non autorise' });

    try {
      const res = await n8nService.callWorkflowReturn<{ stats: AutomationStats }>(
        tenantId,
        'automation_stats',
        { tenantId }
      );
      return reply.send(res);
    } catch (error) {
      fastify.log.error(error, '[automations/stats] Erreur n8n');
      return reply.status(502).send({ success: false, error: 'Erreur communication n8n' });
    }
  });

  // ──────────────────────────────────────────────
  // POST /request — Client demande l'activation via n8n
  // ──────────────────────────────────────────────
  fastify.post('/request', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Non autorise' });

    const { automationId } = request.body as { automationId: string };
    if (!automationId) return reply.status(400).send({ success: false, error: 'automationId requis' });

    try {
      const res = await n8nService.callWorkflowReturn<{ message: string }>(
        tenantId,
        'automation_request',
        { tenantId, automationId }
      );
      return reply.send(res);
    } catch (error) {
      fastify.log.error(error, '[automations/request] Erreur n8n');
      return reply.status(502).send({ success: false, error: 'Erreur communication n8n' });
    }
  });

  // ──────────────────────────────────────────────
  // POST /activate — Admin active pour un client via n8n
  // n8n cree le workflow, le dossier, et retourne les IDs
  // ──────────────────────────────────────────────
  fastify.post('/activate', {
    preHandler: [fastify.authenticate, requireRole('super_admin', 'admin')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as ActivateBody;
    if (!body.tenantId || !body.automationId) {
      return reply.status(400).send({ success: false, error: 'tenantId et automationId requis' });
    }

    try {
      const res = await n8nService.callWorkflowReturn<N8nActivateResult>(
        body.tenantId,
        'automation_activate',
        {
          tenantId: body.tenantId,
          automationId: body.automationId,
          config: body.config || {},
        }
      );
      return reply.send(res);
    } catch (error) {
      fastify.log.error(error, '[automations/activate] Erreur n8n');
      return reply.status(502).send({ success: false, error: 'Erreur communication n8n' });
    }
  });

  // ──────────────────────────────────────────────
  // POST /deactivate — Admin desactive pour un client via n8n
  // n8n desactive les workflows et met a jour la BDD
  // ──────────────────────────────────────────────
  fastify.post('/deactivate', {
    preHandler: [fastify.authenticate, requireRole('super_admin', 'admin')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as DeactivateBody;
    if (!body.tenantId || !body.automationId) {
      return reply.status(400).send({ success: false, error: 'tenantId et automationId requis' });
    }

    try {
      const res = await n8nService.callWorkflowReturn<{ message: string }>(
        body.tenantId,
        'automation_deactivate',
        {
          tenantId: body.tenantId,
          automationId: body.automationId,
        }
      );
      return reply.send(res);
    } catch (error) {
      fastify.log.error(error, '[automations/deactivate] Erreur n8n');
      return reply.status(502).send({ success: false, error: 'Erreur communication n8n' });
    }
  });

  // ──────────────────────────────────────────────
  // POST /catalog — Admin ajoute au catalogue via n8n
  // ──────────────────────────────────────────────
  fastify.post('/catalog', {
    preHandler: [fastify.authenticate, requireRole('super_admin', 'admin')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Non autorise' });

    const body = request.body as CatalogCreateBody;
    if (!body.code || !body.nom || !body.description || !body.categorie) {
      return reply.status(400).send({ success: false, error: 'code, nom, description, categorie requis' });
    }

    try {
      const res = await n8nService.callWorkflowReturn<{ message: string; id: string }>(
        tenantId,
        'automation_catalog_create',
        {
          code: body.code,
          nom: body.nom,
          description: body.description,
          categorie: body.categorie,
          icon: body.icon || 'general',
          setupPrice: body.setupPrice || 0,
          monthlyPrice: body.monthlyPrice || 0,
          complexity: body.complexity || 'simple',
          workflowCount: body.workflowCount || 0,
          workflowTemplates: body.workflowTemplates || [],
          features: body.features || [],
        }
      );
      return reply.send(res);
    } catch (error) {
      fastify.log.error(error, '[automations/catalog POST] Erreur n8n');
      return reply.status(502).send({ success: false, error: 'Erreur communication n8n' });
    }
  });

  // ──────────────────────────────────────────────
  // PUT /catalog/:id — Admin modifie un item via n8n
  // ──────────────────────────────────────────────
  fastify.put('/catalog/:id', {
    preHandler: [fastify.authenticate, requireRole('super_admin', 'admin')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Non autorise' });

    const { id } = request.params as { id: string };
    const body = request.body as CatalogUpdateBody;

    try {
      const res = await n8nService.callWorkflowReturn<{ message: string }>(
        tenantId,
        'automation_catalog_update',
        { id, ...body }
      );
      return reply.send(res);
    } catch (error) {
      fastify.log.error(error, '[automations/catalog PUT] Erreur n8n');
      return reply.status(502).send({ success: false, error: 'Erreur communication n8n' });
    }
  });

  // ──────────────────────────────────────────────
  // DELETE /catalog/:id — Admin supprime (soft-delete) via n8n
  // ──────────────────────────────────────────────
  fastify.delete('/catalog/:id', {
    preHandler: [fastify.authenticate, requireRole('super_admin', 'admin')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Non autorise' });

    const { id } = request.params as { id: string };

    try {
      const res = await n8nService.callWorkflowReturn<{ message: string }>(
        tenantId,
        'automation_catalog_delete',
        { id }
      );
      return reply.send(res);
    } catch (error) {
      fastify.log.error(error, '[automations/catalog DELETE] Erreur n8n');
      return reply.status(502).send({ success: false, error: 'Erreur communication n8n' });
    }
  });

  // ──────────────────────────────────────────────
  // GET /logs/:tenantId — Logs d'un tenant via n8n (admin)
  // ──────────────────────────────────────────────
  fastify.get('/logs/:tenantId', {
    preHandler: [fastify.authenticate, requireRole('super_admin', 'admin')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const adminTenantId = request.tenantId;
    if (!adminTenantId) return reply.status(401).send({ success: false, error: 'Non autorise' });

    const { tenantId } = request.params as { tenantId: string };
    const query = request.query as { limit?: string; offset?: string };

    try {
      const res = await n8nService.callWorkflowReturn<{ logs: EventLogItem[]; total: number }>(
        adminTenantId,
        'automation_logs_list',
        {
          tenantId,
          limit: query.limit || '50',
          offset: query.offset || '0',
        }
      );
      return reply.send(res);
    } catch (error) {
      fastify.log.error(error, '[automations/logs/:tenantId] Erreur n8n');
      return reply.status(502).send({ success: false, error: 'Erreur communication n8n' });
    }
  });

  // ──────────────────────────────────────────────
  // GET /logs — Logs du tenant courant via n8n
  // ──────────────────────────────────────────────
  fastify.get('/logs', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Non autorise' });

    const query = request.query as { limit?: string; offset?: string };

    try {
      const res = await n8nService.callWorkflowReturn<{ logs: EventLogItem[]; total: number }>(
        tenantId,
        'automation_logs_list',
        {
          tenantId,
          limit: query.limit || '50',
          offset: query.offset || '0',
        }
      );
      return reply.send(res);
    } catch (error) {
      fastify.log.error(error, '[automations/logs] Erreur n8n');
      return reply.status(502).send({ success: false, error: 'Erreur communication n8n' });
    }
  });

  // ──────────────────────────────────────────────
  // GET /tenants — Liste des tenants via n8n (admin)
  // ──────────────────────────────────────────────
  fastify.get('/tenants', {
    preHandler: [fastify.authenticate, requireRole('super_admin', 'admin')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Non autorise' });

    try {
      const res = await n8nService.callWorkflowReturn<{ tenants: TenantItem[] }>(
        tenantId,
        'automation_tenants_list',
        {}
      );
      return reply.send(res);
    } catch (error) {
      fastify.log.error(error, '[automations/tenants] Erreur n8n');
      return reply.status(502).send({ success: false, error: 'Erreur communication n8n' });
    }
  });

  // ──────────────────────────────────────────────
  // GET /purchases/:tenantId — Achats d'un tenant specifique via n8n (admin)
  // ──────────────────────────────────────────────
  fastify.get('/purchases/:tenantId', {
    preHandler: [fastify.authenticate, requireRole('super_admin', 'admin')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const adminTenantId = request.tenantId;
    if (!adminTenantId) return reply.status(401).send({ success: false, error: 'Non autorise' });

    const { tenantId } = request.params as { tenantId: string };

    try {
      const res = await n8nService.callWorkflowReturn<{ purchases: PurchaseItem[] }>(
        adminTenantId,
        'automation_purchases_list',
        { tenantId }
      );
      return reply.send(res);
    } catch (error) {
      fastify.log.error(error, '[automations/purchases/:tenantId] Erreur n8n');
      return reply.status(502).send({ success: false, error: 'Erreur communication n8n' });
    }
  });

  // ──────────────────────────────────────────────
  // PUT /folder/:tenantId — Associer un dossier n8n via n8n (admin)
  // ──────────────────────────────────────────────
  fastify.put('/folder/:tenantId', {
    preHandler: [fastify.authenticate, requireRole('super_admin', 'admin')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const adminTenantId = request.tenantId;
    if (!adminTenantId) return reply.status(401).send({ success: false, error: 'Non autorise' });

    const { tenantId } = request.params as { tenantId: string };
    const body = request.body as FolderBody;

    if (!body.folderId) {
      return reply.status(400).send({ success: false, error: 'folderId requis' });
    }

    try {
      const res = await n8nService.callWorkflowReturn<{ message: string }>(
        adminTenantId,
        'automation_folder_update',
        {
          tenantId,
          folderId: body.folderId,
          folderName: body.folderName || '',
        }
      );
      return reply.send(res);
    } catch (error) {
      fastify.log.error(error, '[automations/folder PUT] Erreur n8n');
      return reply.status(502).send({ success: false, error: 'Erreur communication n8n' });
    }
  });

  // ──────────────────────────────────────────────
  // GET /n8n/status — Etat de n8n via n8n (admin)
  // Si ce workflow repond, n8n est operationnel.
  // ──────────────────────────────────────────────
  fastify.get('/n8n/status', {
    preHandler: [fastify.authenticate, requireRole('super_admin', 'admin')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Non autorise' });

    try {
      const res = await n8nService.callWorkflowReturn<N8nStatusResult>(
        tenantId,
        'automation_n8n_status',
        {}
      );
      return reply.send(res);
    } catch (error) {
      fastify.log.error(error, '[automations/n8n/status] Erreur n8n');
      return reply.status(502).send({
        success: false,
        data: { success: false, message: 'n8n injoignable' },
      });
    }
  });

  // ──────────────────────────────────────────────
  // GET /dashboard — KPIs business via n8n (admin)
  // Revenus, clients actifs, top automatisations, repartition
  // ──────────────────────────────────────────────
  fastify.get('/dashboard', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Non autorise' });

    const isSuperAdmin = request.user?.role === 'super_admin';

    try {
      const res = await n8nService.callWorkflowReturn<{ dashboard: Record<string, unknown> }>(
        tenantId,
        'automation_dashboard_stats',
        {
          tenantId,
          isSuperAdmin: String(isSuperAdmin),
        }
      );
      return reply.send(res);
    } catch (error) {
      fastify.log.error(error, '[automations/dashboard] Erreur n8n');
      return reply.status(502).send({ success: false, error: 'Erreur communication n8n' });
    }
  });
}
