import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-errors.js';
import type { TransactionClient } from '../../types/prisma-helpers.js';

// ===== ZOD SCHEMAS =====

const paramsId = z.object({ id: z.string().uuid() });

const createSiteSchema = z.object({
  code: z.string().min(1).max(50),
  designation: z.string().min(1),
  adresse: z.string().optional().nullable(),
  telephone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  responsable: z.string().optional().nullable(),
});

const updateSiteSchema = createSiteSchema.partial().extend({
  statut: z.enum(['actif', 'inactif']).optional(),
});

const createMovementSchema = z.object({
  articleId: z.string().uuid(),
  siteId: z.string().uuid(),
  typeOperation: z.enum(['entree', 'sortie', 'ajustement']),
  quantite: z.number().nonnegative(),
  motif: z.string().optional().nullable(),
});

const createTransferSchema = z.object({
  siteFromId: z.string().uuid(),
  siteToId: z.string().uuid(),
  notes: z.string().optional().nullable(),
  lines: z.array(z.object({
    articleId: z.string().uuid(),
    quantite: z.number().positive(),
  })).min(1),
});

const createInventorySchema = z.object({
  siteId: z.string().uuid(),
  dateDebut: z.string(),
  responsable: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateInventoryItemsSchema = z.object({
  items: z.array(z.object({
    articleId: z.string().uuid(),
    quantiteComptee: z.number().nonnegative(),
    notes: z.string().optional().nullable(),
  })),
});

// ===== HELPERS =====

type AuthRequest = FastifyRequest & { tenantId?: string; user?: { role: string; nom?: string; prenom?: string } };

function getUserName(request: AuthRequest): string {
  if (request.user?.prenom && request.user?.nom) return `${request.user.prenom} ${request.user.nom}`;
  return 'Système';
}

/** Normalise les données n8n snake_case → camelCase basique */
function normalizeFromN8n(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

function normalizeArray(arr: unknown[]): unknown[] {
  return arr.map((item) => normalizeFromN8n(item as Record<string, unknown>));
}

/** Génère un numéro unique pour transferts / inventaires */
async function generateNumero(tenantId: string, prefix: string, table: 'stockTransfer' | 'inventory'): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const basePrefix = `${prefix}-${yyyy}${mm}`;

  let count = 0;
  if (table === 'stockTransfer') {
    count = await prisma.stockTransfer.count({
      where: { tenantId, numero: { startsWith: basePrefix } },
    });
  } else {
    count = await prisma.inventory.count({
      where: { tenantId, numero: { startsWith: basePrefix } },
    });
  }

  return `${basePrefix}-${String(count + 1).padStart(4, '0')}`;
}

// ===== ROUTES =====

export async function stockManagementRoutes(fastify: FastifyInstance) {

  // ==========================================
  // SITES / ENTREPÔTS
  // ==========================================

  // GET /api/stock/sites
  fastify.get('/sites', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;
      if (!tenantId && !fromN8n) return ApiError.unauthorized(reply);

      if (!fromN8n && tenantId) {
        try {
          const res = await n8nService.callWorkflowReturn<{ sites: unknown[] }>(tenantId, 'stock_sites_list', {});
          const raw = res.data as { sites?: unknown[] };
          return reply.send({ success: true, data: { sites: Array.isArray(raw.sites) ? normalizeArray(raw.sites) : [] } });
        } catch {
          // fallback Prisma
        }
      }

      const sites = await prisma.stockSite.findMany({
        where: { tenantId },
        orderBy: { code: 'asc' },
        include: {
          _count: { select: { stockLevels: true, movementsOnSite: true } },
        },
      });

      return reply.send({ success: true, data: { sites } });
    } catch (error) {
      fastify.log.error(error, 'Erreur récupération sites stock');
      return ApiError.internal(reply);
    }
  });

  // POST /api/stock/sites
  fastify.post('/sites', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const body = createSiteSchema.parse(request.body);
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      if (!fromN8n) {
        try {
          const res = await n8nService.callWorkflowReturn(tenantId, 'stock_site_create', { ...body, tenantId });
          return reply.code(201).send({ success: true, message: 'Site créé', data: res.data });
        } catch {
          // fallback Prisma
        }
      }

      const site = await prisma.stockSite.create({ data: { tenantId, ...body } });
      return reply.code(201).send({ success: true, message: 'Site créé', data: { site } });
    } catch (error) {
      if (error instanceof z.ZodError) return ApiError.validation(reply, error);
      if ((error as { code?: string }).code === 'P2002') return ApiError.conflict(reply, 'Ce code site existe déjà');
      fastify.log.error(error, 'Erreur création site stock');
      return ApiError.internal(reply);
    }
  });

  // GET /api/stock/sites/:id
  fastify.get('/sites/:id', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsId.parse(request.params);
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const site = await prisma.stockSite.findFirst({
        where: { id, tenantId },
        include: {
          _count: { select: { stockLevels: true, movementsOnSite: true, inventories: true } },
        },
      });
      if (!site) return ApiError.notFound(reply, 'Site');

      return reply.send({ success: true, data: { site } });
    } catch (error) {
      fastify.log.error(error, 'Erreur récupération site');
      return ApiError.internal(reply);
    }
  });

  // PUT /api/stock/sites/:id
  fastify.put('/sites/:id', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const { id } = paramsId.parse(request.params);
      const body = updateSiteSchema.parse(request.body);
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const existing = await prisma.stockSite.findFirst({ where: { id, tenantId } });
      if (!existing) return ApiError.notFound(reply, 'Site');

      if (!fromN8n) {
        try {
          const res = await n8nService.callWorkflowReturn(tenantId, 'stock_site_update', { siteId: id, ...body });
          return reply.send({ success: true, message: 'Site modifié', data: res.data });
        } catch {
          // fallback
        }
      }

      const site = await prisma.stockSite.update({ where: { id }, data: body });
      return reply.send({ success: true, message: 'Site modifié', data: { site } });
    } catch (error) {
      if (error instanceof z.ZodError) return ApiError.validation(reply, error);
      if ((error as { code?: string }).code === 'P2002') return ApiError.conflict(reply, 'Ce code site existe déjà');
      fastify.log.error(error, 'Erreur modification site');
      return ApiError.internal(reply);
    }
  });

  // DELETE /api/stock/sites/:id
  fastify.delete('/sites/:id', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const { id } = paramsId.parse(request.params);
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const existing = await prisma.stockSite.findFirst({ where: { id, tenantId } });
      if (!existing) return ApiError.notFound(reply, 'Site');

      // Check stock levels exist
      const levelsCount = await prisma.stockLevel.count({ where: { siteId: id } });
      if (levelsCount > 0) {
        return reply.code(400).send({ success: false, error: 'Impossible de supprimer un site contenant du stock. Videz le stock d\'abord.' });
      }

      if (!fromN8n) {
        try {
          const res = await n8nService.callWorkflowReturn(tenantId, 'stock_site_delete', { siteId: id });
          return reply.send({ success: true, message: 'Site supprimé', data: res.data });
        } catch {
          // fallback
        }
      }

      await prisma.stockSite.delete({ where: { id } });
      return reply.send({ success: true, message: 'Site supprimé' });
    } catch (error) {
      fastify.log.error(error, 'Erreur suppression site');
      return ApiError.internal(reply);
    }
  });

  // ==========================================
  // NIVEAUX DE STOCK
  // ==========================================

  // GET /api/stock/levels
  fastify.get('/levels', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const query = request.query as { siteId?: string; articleId?: string; belowMin?: string };

      if (!request.isN8nRequest) {
        try {
          const res = await n8nService.callWorkflowReturn<{ levels: unknown[] }>(tenantId, 'stock_levels_list', query);
          const raw = res.data as { levels?: unknown[] };
          return reply.send({ success: true, data: { levels: Array.isArray(raw.levels) ? normalizeArray(raw.levels) : [] } });
        } catch {
          // fallback
        }
      }

      const levels = await prisma.stockLevel.findMany({
        where: {
          tenantId,
          ...(query.siteId && { siteId: query.siteId }),
          ...(query.articleId && { articleId: query.articleId }),
        },
        include: {
          article: { select: { code: true, designation: true, prixUnitaireHt: true, unite: true } },
          site: { select: { code: true, designation: true } },
        },
        orderBy: [{ site: { code: 'asc' } }, { article: { code: 'asc' } }],
      });

      return reply.send({ success: true, data: { levels } });
    } catch (error) {
      fastify.log.error(error, 'Erreur récupération niveaux stock');
      return ApiError.internal(reply);
    }
  });

  // GET /api/stock/levels/export
  fastify.get('/levels/export', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const query = request.query as { siteId?: string };

      const levels = await prisma.stockLevel.findMany({
        where: { tenantId, ...(query.siteId && { siteId: query.siteId }) },
        include: {
          article: { select: { code: true, designation: true, prixUnitaireHt: true, unite: true } },
          site: { select: { code: true, designation: true } },
        },
        orderBy: [{ site: { code: 'asc' } }, { article: { code: 'asc' } }],
      });

      const header = 'Site;Article;Désignation;Quantité;Réservé;Disponible;Seuil Min;Seuil Max;Unité';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = levels.map((l: any) => {
        const dispo = Number(l.quantite) - Number(l.quantiteReservee);
        return [
          l.site.code, l.article.code, l.article.designation,
          l.quantite, l.quantiteReservee, dispo,
          l.seuilMinimum ?? '', l.seuilMaximum ?? '', l.article.unite ?? ''
        ].join(';');
      });

      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="niveaux-stock.csv"');
      return reply.send([header, ...rows].join('\n'));
    } catch (error) {
      fastify.log.error(error, 'Erreur export niveaux stock');
      return ApiError.internal(reply);
    }
  });

  // ==========================================
  // MOUVEMENTS DE STOCK
  // ==========================================

  // GET /api/stock/movements
  fastify.get('/movements', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const query = request.query as {
        siteId?: string; articleId?: string; typeOperation?: string;
        dateFrom?: string; dateTo?: string; page?: string; limit?: string;
      };

      if (!request.isN8nRequest) {
        try {
          const res = await n8nService.callWorkflowReturn<{ movements: unknown[] }>(tenantId, 'stock_movements_list', query);
          const raw = res.data as { movements?: unknown[] };
          return reply.send({ success: true, data: { movements: Array.isArray(raw.movements) ? normalizeArray(raw.movements) : [] } });
        } catch {
          // fallback
        }
      }

      const page = parseInt(query.page || '1');
      const limit = Math.min(parseInt(query.limit || '50'), 200);
      const skip = (page - 1) * limit;

      const where = {
        tenantId,
        ...(query.siteId && { siteId: query.siteId }),
        ...(query.articleId && { articleId: query.articleId }),
        ...(query.typeOperation && { typeOperation: query.typeOperation }),
        ...(query.dateFrom && { dateOperation: { gte: new Date(query.dateFrom) } }),
        ...(query.dateTo && { dateOperation: { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), lte: new Date(query.dateTo) } }),
      };

      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where,
          include: {
            article: { select: { code: true, designation: true } },
            site: { select: { code: true, designation: true } },
          },
          orderBy: { dateOperation: 'desc' },
          take: limit,
          skip,
        }),
        prisma.stockMovement.count({ where }),
      ]);

      return reply.send({ success: true, data: { movements, total, page, limit } });
    } catch (error) {
      fastify.log.error(error, 'Erreur récupération mouvements');
      return ApiError.internal(reply);
    }
  });

  // POST /api/stock/movements/manual
  fastify.post('/movements/manual', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const body = createMovementSchema.parse(request.body);

      if (!fromN8n) {
        try {
          const res = await n8nService.callWorkflowReturn(tenantId, 'stock_movement_create', { ...body, tenantId, utilisateurNom: getUserName(request) });
          return reply.code(201).send({ success: true, message: 'Mouvement enregistré', data: res.data });
        } catch {
          // fallback
        }
      }

      // Get or create stock level
      let level = await prisma.stockLevel.findFirst({
        where: { tenantId, articleId: body.articleId, siteId: body.siteId },
      });

      const quantiteAvant = level ? Number(level.quantite) : 0;
      let quantiteApres = quantiteAvant;

      if (body.typeOperation === 'entree') {
        quantiteApres = quantiteAvant + body.quantite;
      } else if (body.typeOperation === 'sortie') {
        if (body.quantite > quantiteAvant) {
          return reply.code(400).send({ success: false, error: 'Stock insuffisant' });
        }
        quantiteApres = quantiteAvant - body.quantite;
      } else {
        // ajustement = set absolute value
        quantiteApres = body.quantite;
      }

      // Transaction: update level + create movement
      const result = await prisma.$transaction(async (tx: TransactionClient) => {
        if (level) {
          await tx.stockLevel.update({
            where: { id: level.id },
            data: { quantite: quantiteApres },
          });
        } else {
          level = await tx.stockLevel.create({
            data: {
              tenantId,
              articleId: body.articleId,
              siteId: body.siteId,
              quantite: quantiteApres,
            },
          });
        }

        const movement = await tx.stockMovement.create({
          data: {
            tenantId,
            articleId: body.articleId,
            siteId: body.siteId,
            typeOperation: body.typeOperation,
            quantite: body.quantite,
            quantiteAvant,
            quantiteApres,
            referenceType: 'manual',
            motif: body.motif,
            utilisateurNom: getUserName(request),
          },
        });

        // Check alerts
        if (level.seuilMinimum && quantiteApres < Number(level.seuilMinimum)) {
          const existingAlert = await tx.stockAlert.findFirst({
            where: { tenantId, articleId: body.articleId, siteId: body.siteId, statut: 'active', typeAlerte: 'seuil_minimum' },
          });
          if (!existingAlert) {
            await tx.stockAlert.create({
              data: {
                tenantId,
                articleId: body.articleId,
                siteId: body.siteId,
                typeAlerte: quantiteApres <= 0 ? 'rupture' : 'seuil_minimum',
              },
            });
          }
        }

        return movement;
      });

      return reply.code(201).send({ success: true, message: 'Mouvement enregistré', data: { movement: result } });
    } catch (error) {
      if (error instanceof z.ZodError) return ApiError.validation(reply, error);
      fastify.log.error(error, 'Erreur création mouvement stock');
      return ApiError.internal(reply);
    }
  });

  // GET /api/stock/movements/export
  fastify.get('/movements/export', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const query = request.query as { siteId?: string; dateFrom?: string; dateTo?: string };

      const movements = await prisma.stockMovement.findMany({
        where: {
          tenantId,
          ...(query.siteId && { siteId: query.siteId }),
          ...(query.dateFrom && { dateOperation: { gte: new Date(query.dateFrom) } }),
          ...(query.dateTo && { dateOperation: { lte: new Date(query.dateTo) } }),
        },
        include: {
          article: { select: { code: true, designation: true } },
          site: { select: { code: true, designation: true } },
        },
        orderBy: { dateOperation: 'desc' },
      });

      const header = 'Date;Site;Article;Désignation;Type;Quantité;Avant;Après;Motif;Utilisateur';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = movements.map((m: any) => [
        m.dateOperation.toISOString().slice(0, 19), m.site.code, m.article.code, m.article.designation,
        m.typeOperation, m.quantite, m.quantiteAvant, m.quantiteApres, m.motif ?? '', m.utilisateurNom ?? ''
      ].join(';'));

      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="mouvements-stock.csv"');
      return reply.send([header, ...rows].join('\n'));
    } catch (error) {
      fastify.log.error(error, 'Erreur export mouvements');
      return ApiError.internal(reply);
    }
  });

  // ==========================================
  // TRANSFERTS INTER-SITES
  // ==========================================

  // GET /api/stock/transfers
  fastify.get('/transfers', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const query = request.query as { statut?: string };

      if (!request.isN8nRequest) {
        try {
          const res = await n8nService.callWorkflowReturn<{ transfers: unknown[] }>(tenantId, 'stock_transfers_list', query);
          const raw = res.data as { transfers?: unknown[] };
          return reply.send({ success: true, data: { transfers: Array.isArray(raw.transfers) ? normalizeArray(raw.transfers) : [] } });
        } catch {
          // fallback
        }
      }

      const transfers = await prisma.stockTransfer.findMany({
        where: { tenantId, ...(query.statut && { statut: query.statut as 'en_cours' | 'confirme' | 'recu' | 'annule' }) },
        include: {
          siteFrom: { select: { code: true, designation: true } },
          siteTo: { select: { code: true, designation: true } },
          lines: {
            include: { article: { select: { code: true, designation: true } } },
          },
        },
        orderBy: { dateCreation: 'desc' },
      });

      return reply.send({ success: true, data: { transfers } });
    } catch (error) {
      fastify.log.error(error, 'Erreur récupération transferts');
      return ApiError.internal(reply);
    }
  });

  // POST /api/stock/transfers
  fastify.post('/transfers', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return ApiError.forbidden(reply);
      }

      const body = createTransferSchema.parse(request.body);

      if (body.siteFromId === body.siteToId) {
        return reply.code(400).send({ success: false, error: 'Site source et destination doivent être différents' });
      }

      if (!fromN8n) {
        try {
          const numero = await generateNumero(tenantId, 'TRF', 'stockTransfer');
          const res = await n8nService.callWorkflowReturn(tenantId, 'stock_transfer_create', { ...body, tenantId, numero });
          return reply.code(201).send({ success: true, message: 'Transfert créé', data: res.data });
        } catch {
          // fallback
        }
      }

      const numero = await generateNumero(tenantId, 'TRF', 'stockTransfer');

      const transfer = await prisma.stockTransfer.create({
        data: {
          tenantId,
          numero,
          siteFromId: body.siteFromId,
          siteToId: body.siteToId,
          notes: body.notes,
          lines: {
            create: body.lines.map((l) => ({
              articleId: l.articleId,
              quantiteEnvoyee: l.quantite,
            })),
          },
        },
        include: {
          lines: { include: { article: { select: { code: true, designation: true } } } },
          siteFrom: { select: { code: true, designation: true } },
          siteTo: { select: { code: true, designation: true } },
        },
      });

      return reply.code(201).send({ success: true, message: 'Transfert créé', data: { transfer } });
    } catch (error) {
      if (error instanceof z.ZodError) return ApiError.validation(reply, error);
      fastify.log.error(error, 'Erreur création transfert');
      return ApiError.internal(reply);
    }
  });

  // GET /api/stock/transfers/:id
  fastify.get('/transfers/:id', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsId.parse(request.params);
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const transfer = await prisma.stockTransfer.findFirst({
        where: { id, tenantId },
        include: {
          siteFrom: { select: { code: true, designation: true } },
          siteTo: { select: { code: true, designation: true } },
          lines: { include: { article: { select: { code: true, designation: true, unite: true } } } },
        },
      });
      if (!transfer) return ApiError.notFound(reply, 'Transfert');

      return reply.send({ success: true, data: { transfer } });
    } catch (error) {
      fastify.log.error(error, 'Erreur récupération transfert');
      return ApiError.internal(reply);
    }
  });

  // PUT /api/stock/transfers/:id
  fastify.put('/transfers/:id', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsId.parse(request.params);
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const existing = await prisma.stockTransfer.findFirst({ where: { id, tenantId } });
      if (!existing) return ApiError.notFound(reply, 'Transfert');
      if (existing.statut !== 'en_cours') {
        return reply.code(400).send({ success: false, error: 'Seuls les transferts en cours peuvent être modifiés' });
      }

      const body = request.body as { notes?: string };
      const transfer = await prisma.stockTransfer.update({ where: { id }, data: { notes: body.notes } });
      return reply.send({ success: true, message: 'Transfert modifié', data: { transfer } });
    } catch (error) {
      fastify.log.error(error, 'Erreur modification transfert');
      return ApiError.internal(reply);
    }
  });

  // POST /api/stock/transfers/:id/confirm
  fastify.post('/transfers/:id/confirm', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const { id } = paramsId.parse(request.params);
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      if (!fromN8n) {
        try {
          const res = await n8nService.callWorkflowReturn(tenantId, 'stock_transfer_confirm', { transferId: id });
          return reply.send({ success: true, message: 'Transfert confirmé', data: res.data });
        } catch {
          // fallback
        }
      }

      const transfer = await prisma.stockTransfer.findFirst({
        where: { id, tenantId },
        include: { lines: true },
      });
      if (!transfer) return ApiError.notFound(reply, 'Transfert');
      if (transfer.statut !== 'en_cours') {
        return reply.code(400).send({ success: false, error: 'Ce transfert ne peut pas être confirmé' });
      }

      // Vérifier stock disponible et déduire du site source
      await prisma.$transaction(async (tx: TransactionClient) => {
        for (const line of transfer.lines) {
          const level = await tx.stockLevel.findFirst({
            where: { tenantId, articleId: line.articleId, siteId: transfer.siteFromId },
          });

          const qtyAvant = level ? Number(level.quantite) : 0;
          const qtyEnvoyee = Number(line.quantiteEnvoyee);

          if (qtyEnvoyee > qtyAvant) {
            throw new Error(`Stock insuffisant pour l'article ${line.articleId}`);
          }

          // Déduire du site source
          if (level) {
            await tx.stockLevel.update({
              where: { id: level.id },
              data: { quantite: qtyAvant - qtyEnvoyee },
            });
          }

          // Mouvement sortie
          await tx.stockMovement.create({
            data: {
              tenantId,
              articleId: line.articleId,
              siteId: transfer.siteFromId,
              typeOperation: 'transfer_out',
              quantite: qtyEnvoyee,
              quantiteAvant: qtyAvant,
              quantiteApres: qtyAvant - qtyEnvoyee,
              referenceType: 'transfer',
              referenceId: transfer.id,
              utilisateurNom: getUserName(request),
            },
          });
        }

        await tx.stockTransfer.update({
          where: { id },
          data: { statut: 'confirme', dateEnvoi: new Date() },
        });
      });

      return reply.send({ success: true, message: 'Transfert confirmé, stock déduit du site source' });
    } catch (error) {
      if ((error as Error).message?.includes('Stock insuffisant')) {
        return reply.code(400).send({ success: false, error: (error as Error).message });
      }
      fastify.log.error(error, 'Erreur confirmation transfert');
      return ApiError.internal(reply);
    }
  });

  // POST /api/stock/transfers/:id/receive
  fastify.post('/transfers/:id/receive', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const { id } = paramsId.parse(request.params);
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const body = request.body as { lines?: Array<{ lineId: string; quantiteRecue: number }> };

      if (!fromN8n) {
        try {
          const res = await n8nService.callWorkflowReturn(tenantId, 'stock_transfer_receive', { transferId: id, lines: body.lines });
          return reply.send({ success: true, message: 'Réception confirmée', data: res.data });
        } catch {
          // fallback
        }
      }

      const transfer = await prisma.stockTransfer.findFirst({
        where: { id, tenantId },
        include: { lines: true },
      });
      if (!transfer) return ApiError.notFound(reply, 'Transfert');
      if (transfer.statut !== 'confirme') {
        return reply.code(400).send({ success: false, error: 'Ce transfert doit être confirmé avant réception' });
      }

      await prisma.$transaction(async (tx: TransactionClient) => {
        for (const line of transfer.lines) {
          const receivedLine = body.lines?.find((l: { lineId: string; quantiteRecue: number }) => l.lineId === line.id);
          const qtyRecue = receivedLine ? receivedLine.quantiteRecue : Number(line.quantiteEnvoyee);

          // MAJ quantité reçue
          await tx.stockTransferLine.update({
            where: { id: line.id },
            data: { quantiteRecue: qtyRecue },
          });

          // Ajouter au stock destination
          const level = await tx.stockLevel.findFirst({
            where: { tenantId, articleId: line.articleId, siteId: transfer.siteToId },
          });

          const qtyAvant = level ? Number(level.quantite) : 0;

          if (level) {
            await tx.stockLevel.update({
              where: { id: level.id },
              data: { quantite: qtyAvant + qtyRecue },
            });
          } else {
            await tx.stockLevel.create({
              data: {
                tenantId,
                articleId: line.articleId,
                siteId: transfer.siteToId,
                quantite: qtyRecue,
              },
            });
          }

          // Mouvement entrée
          await tx.stockMovement.create({
            data: {
              tenantId,
              articleId: line.articleId,
              siteId: transfer.siteToId,
              typeOperation: 'transfer_in',
              quantite: qtyRecue,
              quantiteAvant: qtyAvant,
              quantiteApres: qtyAvant + qtyRecue,
              referenceType: 'transfer',
              referenceId: transfer.id,
              utilisateurNom: getUserName(request),
            },
          });
        }

        await tx.stockTransfer.update({
          where: { id },
          data: { statut: 'recu', dateReception: new Date() },
        });
      });

      return reply.send({ success: true, message: 'Réception confirmée, stock ajouté au site destination' });
    } catch (error) {
      fastify.log.error(error, 'Erreur réception transfert');
      return ApiError.internal(reply);
    }
  });

  // ==========================================
  // INVENTAIRES
  // ==========================================

  // GET /api/stock/inventories
  fastify.get('/inventories', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      if (!request.isN8nRequest) {
        try {
          const res = await n8nService.callWorkflowReturn<{ inventories: unknown[] }>(tenantId, 'stock_inventories_list', {});
          const raw = res.data as { inventories?: unknown[] };
          return reply.send({ success: true, data: { inventories: Array.isArray(raw.inventories) ? normalizeArray(raw.inventories) : [] } });
        } catch {
          // fallback
        }
      }

      const inventories = await prisma.inventory.findMany({
        where: { tenantId },
        include: {
          site: { select: { code: true, designation: true } },
          _count: { select: { items: true } },
        },
        orderBy: { dateDebut: 'desc' },
      });

      return reply.send({ success: true, data: { inventories } });
    } catch (error) {
      fastify.log.error(error, 'Erreur récupération inventaires');
      return ApiError.internal(reply);
    }
  });

  // POST /api/stock/inventories
  fastify.post('/inventories', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const body = createInventorySchema.parse(request.body);

      if (!fromN8n) {
        try {
          const numero = await generateNumero(tenantId, 'INV', 'inventory');
          const res = await n8nService.callWorkflowReturn(tenantId, 'stock_inventory_create', { ...body, tenantId, numero });
          return reply.code(201).send({ success: true, message: 'Inventaire créé', data: res.data });
        } catch {
          // fallback
        }
      }

      const numero = await generateNumero(tenantId, 'INV', 'inventory');

      // Auto-populate items from current stock levels
      const levels = await prisma.stockLevel.findMany({
        where: { tenantId, siteId: body.siteId },
      });

      const inventory = await prisma.inventory.create({
        data: {
          tenantId,
          numero,
          siteId: body.siteId,
          dateDebut: new Date(body.dateDebut),
          responsable: body.responsable,
          notes: body.notes,
          items: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            create: levels.map((l: any) => ({
              articleId: l.articleId,
              quantiteSysteme: l.quantite,
            })),
          },
        },
        include: {
          site: { select: { code: true, designation: true } },
          items: { include: { article: { select: { code: true, designation: true } } } },
        },
      });

      return reply.code(201).send({ success: true, message: 'Inventaire créé', data: { inventory } });
    } catch (error) {
      if (error instanceof z.ZodError) return ApiError.validation(reply, error);
      fastify.log.error(error, 'Erreur création inventaire');
      return ApiError.internal(reply);
    }
  });

  // GET /api/stock/inventories/:id
  fastify.get('/inventories/:id', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsId.parse(request.params);
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const inventory = await prisma.inventory.findFirst({
        where: { id, tenantId },
        include: {
          site: { select: { code: true, designation: true } },
          items: {
            include: { article: { select: { code: true, designation: true, unite: true } } },
            orderBy: { article: { code: 'asc' } },
          },
        },
      });
      if (!inventory) return ApiError.notFound(reply, 'Inventaire');

      return reply.send({ success: true, data: { inventory } });
    } catch (error) {
      fastify.log.error(error, 'Erreur récupération inventaire');
      return ApiError.internal(reply);
    }
  });

  // PUT /api/stock/inventories/:id/items
  fastify.put('/inventories/:id/items', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsId.parse(request.params);
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const inventory = await prisma.inventory.findFirst({ where: { id, tenantId } });
      if (!inventory) return ApiError.notFound(reply, 'Inventaire');
      if (inventory.statut !== 'en_cours') {
        return reply.code(400).send({ success: false, error: 'Cet inventaire n\'est plus en cours' });
      }

      const body = updateInventoryItemsSchema.parse(request.body);

      await prisma.$transaction(async (tx: TransactionClient) => {
        for (const item of body.items) {
          const existingItem = await tx.inventoryItem.findFirst({
            where: { inventoryId: id, articleId: item.articleId },
          });

          if (existingItem) {
            const ecart = item.quantiteComptee - Number(existingItem.quantiteSysteme);
            await tx.inventoryItem.update({
              where: { id: existingItem.id },
              data: { quantiteComptee: item.quantiteComptee, ecart, notes: item.notes },
            });
          } else {
            // Nouvel article non encore dans l'inventaire
            await tx.inventoryItem.create({
              data: {
                inventoryId: id,
                articleId: item.articleId,
                quantiteSysteme: 0,
                quantiteComptee: item.quantiteComptee,
                ecart: item.quantiteComptee,
                notes: item.notes,
              },
            });
          }
        }
      });

      return reply.send({ success: true, message: 'Comptage mis à jour' });
    } catch (error) {
      if (error instanceof z.ZodError) return ApiError.validation(reply, error);
      fastify.log.error(error, 'Erreur MAJ items inventaire');
      return ApiError.internal(reply);
    }
  });

  // POST /api/stock/inventories/:id/finalize
  fastify.post('/inventories/:id/finalize', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const { id } = paramsId.parse(request.params);
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      if (!fromN8n) {
        try {
          const res = await n8nService.callWorkflowReturn(tenantId, 'stock_inventory_finalize', { inventoryId: id });
          return reply.send({ success: true, message: 'Inventaire finalisé', data: res.data });
        } catch {
          // fallback
        }
      }

      const inventory = await prisma.inventory.findFirst({
        where: { id, tenantId },
        include: { items: true },
      });
      if (!inventory) return ApiError.notFound(reply, 'Inventaire');
      if (inventory.statut !== 'en_cours') {
        return reply.code(400).send({ success: false, error: 'Cet inventaire n\'est plus en cours' });
      }

      let ecartTotal = 0;

      await prisma.$transaction(async (tx: TransactionClient) => {
        for (const item of inventory.items) {
          if (item.quantiteComptee === null) continue;

          const ecart = Number(item.quantiteComptee) - Number(item.quantiteSysteme);
          ecartTotal += Math.abs(ecart);

          if (ecart !== 0) {
            // Ajuster le stock
            const level = await tx.stockLevel.findFirst({
              where: { tenantId, articleId: item.articleId, siteId: inventory.siteId },
            });

            const qtyAvant = level ? Number(level.quantite) : 0;
            const qtyApres = Number(item.quantiteComptee);

            if (level) {
              await tx.stockLevel.update({ where: { id: level.id }, data: { quantite: qtyApres } });
            } else {
              await tx.stockLevel.create({
                data: { tenantId, articleId: item.articleId, siteId: inventory.siteId, quantite: qtyApres },
              });
            }

            // Mouvement ajustement
            await tx.stockMovement.create({
              data: {
                tenantId,
                articleId: item.articleId,
                siteId: inventory.siteId,
                typeOperation: 'ajustement',
                quantite: Math.abs(ecart),
                quantiteAvant: qtyAvant,
                quantiteApres: qtyApres,
                referenceType: 'inventory',
                referenceId: inventory.id,
                motif: `Inventaire ${inventory.numero}`,
                utilisateurNom: getUserName(request),
              },
            });
          }
        }

        await tx.inventory.update({
          where: { id },
          data: { statut: 'finalisee', dateFin: new Date(), ecartTotal },
        });
      });

      return reply.send({ success: true, message: 'Inventaire finalisé, ajustements appliqués', data: { ecartTotal } });
    } catch (error) {
      fastify.log.error(error, 'Erreur finalisation inventaire');
      return ApiError.internal(reply);
    }
  });

  // ==========================================
  // ALERTES
  // ==========================================

  // GET /api/stock/alerts
  fastify.get('/alerts', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const query = request.query as { statut?: string };

      if (!request.isN8nRequest) {
        try {
          const res = await n8nService.callWorkflowReturn<{ alerts: unknown[] }>(tenantId, 'stock_alerts_list', query);
          const raw = res.data as { alerts?: unknown[] };
          return reply.send({ success: true, data: { alerts: Array.isArray(raw.alerts) ? normalizeArray(raw.alerts) : [] } });
        } catch {
          // fallback
        }
      }

      const alerts = await prisma.stockAlert.findMany({
        where: { tenantId, statut: query.statut || 'active' },
        include: {
          article: { select: { code: true, designation: true } },
          site: { select: { code: true, designation: true } },
        },
        orderBy: { dateAlerte: 'desc' },
      });

      return reply.send({ success: true, data: { alerts } });
    } catch (error) {
      fastify.log.error(error, 'Erreur récupération alertes');
      return ApiError.internal(reply);
    }
  });

  // PUT /api/stock/alerts/:id/resolve
  fastify.put('/alerts/:id/resolve', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const { id } = paramsId.parse(request.params);
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const alert = await prisma.stockAlert.findFirst({ where: { id, tenantId } });
      if (!alert) return ApiError.notFound(reply, 'Alerte');

      await prisma.stockAlert.update({
        where: { id },
        data: { statut: 'resolue', dateResolution: new Date() },
      });

      return reply.send({ success: true, message: 'Alerte résolue' });
    } catch (error) {
      fastify.log.error(error, 'Erreur résolution alerte');
      return ApiError.internal(reply);
    }
  });

  // ==========================================
  // DASHBOARD
  // ==========================================

  // GET /api/stock/dashboard
  fastify.get('/dashboard', { preHandler: [n8nOrAuthMiddleware] }, async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      if (!request.isN8nRequest) {
        try {
          const res = await n8nService.callWorkflowReturn(tenantId, 'stock_dashboard', {});
          return reply.send({ success: true, data: res.data });
        } catch {
          // fallback
        }
      }

      const [
        totalSites,
        totalArticles,
        totalAlertesActives,
        transfertsEnCours,
        inventairesEnCours,
        recentMovements,
        levels,
      ] = await Promise.all([
        prisma.stockSite.count({ where: { tenantId, statut: 'actif' } }),
        prisma.stockLevel.count({ where: { tenantId } }),
        prisma.stockAlert.count({ where: { tenantId, statut: 'active' } }),
        prisma.stockTransfer.count({ where: { tenantId, statut: 'en_cours' } }),
        prisma.inventory.count({ where: { tenantId, statut: 'en_cours' } }),
        prisma.stockMovement.findMany({
          where: { tenantId },
          include: {
            article: { select: { code: true, designation: true } },
            site: { select: { code: true } },
          },
          orderBy: { dateOperation: 'desc' },
          take: 10,
        }),
        prisma.stockLevel.findMany({
          where: { tenantId },
          include: { article: { select: { prixUnitaireHt: true } } },
        }),
      ]);

      // Calculate total stock value
      let valeurTotale = 0;
      for (const level of levels) {
        if (level.article.prixUnitaireHt) {
          valeurTotale += Number(level.quantite) * Number(level.article.prixUnitaireHt);
        }
      }

      return reply.send({
        success: true,
        data: {
          dashboard: {
            totalSites,
            totalArticles,
            totalAlertesActives,
            transfertsEnCours,
            inventairesEnCours,
            valeurTotale: Math.round(valeurTotale * 100) / 100,
            recentMovements,
          },
        },
      });
    } catch (error) {
      fastify.log.error(error, 'Erreur dashboard stock');
      return ApiError.internal(reply);
    }
  });
}
