import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../config/database.js';
import { requireRole } from '../../middleware/auth.middleware.js';
import { n8nService } from '../../services/n8n.service.js';

/**
 * Routes pour le catalogue d'automatisations et la gestion des achats clients.
 *
 * GET  /api/automations/catalog          → catalogue complet (public auth)
 * GET  /api/automations/purchases        → achats du tenant courant
 * GET  /api/automations/stats            → stats du tenant courant
 * POST /api/automations/request          → demander l'activation (client)
 * POST /api/automations/activate         → activer pour un client (admin)
 * PUT  /api/automations/catalog/:id      → modifier un item du catalogue (admin)
 * POST /api/automations/catalog          → ajouter un item au catalogue (admin)
 */
export async function automationsRoutes(fastify: FastifyInstance) {

  // ──────────────────────────────────────────────
  // GET /catalog - Liste le catalogue
  // ──────────────────────────────────────────────
  fastify.get('/catalog', {
    preHandler: [fastify.authenticate],
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const catalog = await prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id, code, nom, description, categorie, icon,
               setup_price, monthly_price, complexity,
               workflow_count, features, is_active, ordre
        FROM automation_catalog
        WHERE is_active = true
        ORDER BY ordre ASC
      `;
      return reply.send({ success: true, data: { catalog } });
    } catch (error) {
      fastify.log.error(error, '[automations/catalog] Erreur');
      return reply.status(500).send({ success: false, error: 'Erreur chargement catalogue' });
    }
  });

  // ──────────────────────────────────────────────
  // GET /purchases - Achats du tenant courant
  // ──────────────────────────────────────────────
  fastify.get('/purchases', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorise' });

    try {
      const purchases = await prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT ap.id, ap.automation_id, ap.status, ap.n8n_folder_id, ap.n8n_folder_name,
               ap.n8n_workflow_ids, ap.setup_price_paid, ap.monthly_price,
               ap.activated_at, ap.created_at,
               ac.code, ac.nom, ac.description, ac.categorie, ac.icon,
               ac.complexity, ac.workflow_count, ac.features
        FROM automation_purchases ap
        JOIN automation_catalog ac ON ac.id = ap.automation_id
        WHERE ap.tenant_id = ${tenantId}::uuid
        ORDER BY ap.created_at DESC
      `;
      return reply.send({ success: true, data: { purchases } });
    } catch (error) {
      fastify.log.error(error, '[automations/purchases] Erreur');
      return reply.status(500).send({ success: false, error: 'Erreur chargement achats' });
    }
  });

  // ──────────────────────────────────────────────
  // GET /stats - Stats du tenant courant
  // ──────────────────────────────────────────────
  fastify.get('/stats', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorise' });

    try {
      // Nombre d'automatisations actives pour ce tenant
      const purchaseStats = await prisma.$queryRaw<Array<{ total: bigint; actives: bigint }>>`
        SELECT
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE status = 'active')::bigint AS actives
        FROM automation_purchases
        WHERE tenant_id = ${tenantId}::uuid
      `;

      // Executions des dernieres 24h depuis event_logs
      const execStats = await prisma.$queryRaw<Array<{ total: bigint; succes: bigint; erreurs: bigint }>>`
        SELECT
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE statut_execution = 'succes')::bigint AS succes,
          COUNT(*) FILTER (WHERE statut_execution = 'erreur')::bigint AS erreurs
        FROM event_logs
        WHERE tenant_id = ${tenantId}::uuid
          AND created_at >= NOW() - INTERVAL '24 hours'
      `;

      const totalCatalog = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM automation_catalog WHERE is_active = true
      `;

      const ps = purchaseStats[0] || { total: 0n, actives: 0n };
      const es = execStats[0] || { total: 0n, succes: 0n, erreurs: 0n };
      const totalExec = Number(es.total);
      const totalSucces = Number(es.succes);

      return reply.send({
        success: true,
        data: {
          stats: {
            totalAutomations: Number(totalCatalog[0]?.count || 0n),
            actives: Number(ps.actives),
            executionsToday: totalExec,
            tauxReussite: totalExec > 0 ? Math.round((totalSucces / totalExec) * 100) : 0,
            erreurs24h: Number(es.erreurs),
          },
        },
      });
    } catch (error) {
      fastify.log.error(error, '[automations/stats] Erreur');
      return reply.status(500).send({ success: false, error: 'Erreur chargement stats' });
    }
  });

  // ──────────────────────────────────────────────
  // POST /request - Client demande l'activation
  // ──────────────────────────────────────────────
  fastify.post('/request', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorise' });

    const { automationId } = request.body as { automationId: string };
    if (!automationId) return reply.status(400).send({ error: 'automationId requis' });

    try {
      // Verifier que l'automation existe
      const automation = await prisma.$queryRaw<Array<{ id: string; nom: string }>>`
        SELECT id, nom FROM automation_catalog WHERE id = ${automationId}::uuid AND is_active = true
      `;
      if (!automation.length) {
        return reply.status(404).send({ success: false, error: 'Automatisation non trouvee' });
      }

      // Creer ou mettre a jour l'achat
      await prisma.$executeRaw`
        INSERT INTO automation_purchases (tenant_id, automation_id, status, created_at, updated_at)
        VALUES (${tenantId}::uuid, ${automationId}::uuid, 'en_attente', NOW(), NOW())
        ON CONFLICT (tenant_id, automation_id) DO UPDATE SET
          status = 'en_attente',
          updated_at = NOW()
      `;

      // Declencher le workflow n8n pour notifier l'admin
      try {
        await n8nService.triggerWorkflow(tenantId, 'automation_request', {
          tenantId,
          automationId,
          automationNom: automation[0].nom,
        });
      } catch {
        // pas bloquant si n8n n'est pas dispo
        fastify.log.warn('[automations/request] n8n notification failed');
      }

      return reply.send({ success: true, message: 'Demande envoyee' });
    } catch (error) {
      fastify.log.error(error, '[automations/request] Erreur');
      return reply.status(500).send({ success: false, error: 'Erreur envoi demande' });
    }
  });

  // ──────────────────────────────────────────────
  // POST /activate - Admin active une automatisation pour un client
  // Cree le dossier n8n au nom du client + deploie les workflows
  // ──────────────────────────────────────────────
  fastify.post('/activate', {
    preHandler: [fastify.authenticate, requireRole('super_admin', 'admin')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, automationId } = request.body as { tenantId: string; automationId: string };
    if (!tenantId || !automationId) {
      return reply.status(400).send({ error: 'tenantId et automationId requis' });
    }

    try {
      // 1. Recuperer les infos du tenant et de l'automation
      const tenant = await prisma.$queryRaw<Array<{ id: string; nom_entreprise: string }>>`
        SELECT id, nom_entreprise FROM tenants WHERE id = ${tenantId}::uuid
      `;
      if (!tenant.length) return reply.status(404).send({ error: 'Tenant non trouve' });

      const automation = await prisma.$queryRaw<Array<{ id: string; code: string; nom: string; setup_price: number; monthly_price: number }>>`
        SELECT id, code, nom, setup_price, monthly_price FROM automation_catalog WHERE id = ${automationId}::uuid
      `;
      if (!automation.length) return reply.status(404).send({ error: 'Automatisation non trouvee' });

      const folderName = tenant[0].nom_entreprise;
      const auto = automation[0];

      // 2. Declencher le workflow n8n qui cree le dossier + deploie les workflows
      const n8nResult = await n8nService.callWorkflowReturn(tenantId, 'automation_activate', {
        tenantId,
        automationCode: auto.code,
        automationNom: auto.nom,
        folderName,
      });

      const n8nFolderId = (n8nResult.data as Record<string, unknown>)?.folderId as string || null;
      const n8nFolderName = (n8nResult.data as Record<string, unknown>)?.folderName as string || folderName;
      const workflowIds = (n8nResult.data as Record<string, unknown>)?.workflowIds || [];

      // 3. Mettre a jour l'achat en base
      await prisma.$executeRaw`
        INSERT INTO automation_purchases (tenant_id, automation_id, status, n8n_folder_id, n8n_folder_name, n8n_workflow_ids, setup_price_paid, monthly_price, activated_at, created_at, updated_at)
        VALUES (${tenantId}::uuid, ${automationId}::uuid, 'active', ${n8nFolderId}, ${n8nFolderName}, ${JSON.stringify(workflowIds)}::jsonb, ${auto.setup_price}, ${auto.monthly_price}, NOW(), NOW(), NOW())
        ON CONFLICT (tenant_id, automation_id) DO UPDATE SET
          status = 'active',
          n8n_folder_id = ${n8nFolderId},
          n8n_folder_name = ${n8nFolderName},
          n8n_workflow_ids = ${JSON.stringify(workflowIds)}::jsonb,
          activated_at = NOW(),
          updated_at = NOW()
      `;

      return reply.send({
        success: true,
        message: `Automatisation "${auto.nom}" activee pour ${folderName}`,
        data: {
          folderId: n8nFolderId,
          folderName: n8nFolderName,
          workflowIds,
        },
      });
    } catch (error) {
      fastify.log.error(error, '[automations/activate] Erreur');
      return reply.status(500).send({ success: false, error: 'Erreur activation' });
    }
  });

  // ──────────────────────────────────────────────
  // POST /catalog - Admin ajoute au catalogue
  // ──────────────────────────────────────────────
  fastify.post('/catalog', {
    preHandler: [fastify.authenticate, requireRole('super_admin', 'admin')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      code: string; nom: string; description: string; categorie: string;
      icon?: string; setupPrice: number; monthlyPrice: number;
      complexity?: string; workflowCount?: number; features?: string[];
    };

    if (!body.code || !body.nom || !body.description || !body.categorie) {
      return reply.status(400).send({ error: 'code, nom, description, categorie requis' });
    }

    try {
      await prisma.$executeRaw`
        INSERT INTO automation_catalog (code, nom, description, categorie, icon, setup_price, monthly_price, complexity, workflow_count, features, created_at, updated_at)
        VALUES (
          ${body.code}, ${body.nom}, ${body.description}, ${body.categorie},
          ${body.icon || 'general'},
          ${body.setupPrice || 0}, ${body.monthlyPrice || 0},
          ${(body.complexity || 'simple') as string}::"AutomationComplexity",
          ${body.workflowCount || 0},
          ${JSON.stringify(body.features || [])}::jsonb,
          NOW(), NOW()
        )
      `;
      return reply.send({ success: true, message: 'Automatisation ajoutee au catalogue' });
    } catch (error) {
      fastify.log.error(error, '[automations/catalog POST] Erreur');
      return reply.status(500).send({ success: false, error: 'Erreur ajout catalogue' });
    }
  });

  // ──────────────────────────────────────────────
  // PUT /catalog/:id - Admin modifie un item
  // ──────────────────────────────────────────────
  fastify.put('/catalog/:id', {
    preHandler: [fastify.authenticate, requireRole('super_admin', 'admin')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    try {
      // Construire dynamiquement les champs a mettre a jour
      const fields: string[] = [];
      const values: unknown[] = [];

      if (body.nom !== undefined) { fields.push('nom'); values.push(body.nom); }
      if (body.description !== undefined) { fields.push('description'); values.push(body.description); }
      if (body.setupPrice !== undefined) { fields.push('setup_price'); values.push(body.setupPrice); }
      if (body.monthlyPrice !== undefined) { fields.push('monthly_price'); values.push(body.monthlyPrice); }
      if (body.categorie !== undefined) { fields.push('categorie'); values.push(body.categorie); }
      if (body.isActive !== undefined) { fields.push('is_active'); values.push(body.isActive); }
      if (body.workflowCount !== undefined) { fields.push('workflow_count'); values.push(body.workflowCount); }
      if (body.features !== undefined) { fields.push('features'); values.push(JSON.stringify(body.features)); }

      if (fields.length === 0) {
        return reply.status(400).send({ error: 'Aucun champ a modifier' });
      }

      // Update simple via raw SQL
      const setClauses = fields.map((f, i) => {
        if (f === 'features') return `"${f}" = $${i + 2}::jsonb`;
        return `"${f}" = $${i + 2}`;
      }).join(', ');

      await prisma.$executeRawUnsafe(
        `UPDATE automation_catalog SET ${setClauses}, updated_at = NOW() WHERE id = $1::uuid`,
        id,
        ...values,
      );

      return reply.send({ success: true, message: 'Catalogue mis a jour' });
    } catch (error) {
      fastify.log.error(error, '[automations/catalog PUT] Erreur');
      return reply.status(500).send({ success: false, error: 'Erreur modification' });
    }
  });
}
