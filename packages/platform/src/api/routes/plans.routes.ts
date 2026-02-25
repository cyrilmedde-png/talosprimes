import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { authMiddleware, n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';

// Schemas de validation
const planIdSchema = z.object({
  id: z.string().uuid('ID plan invalide'),
});

const createPlanSchema = z.object({
  code: z.string().min(2).max(50),
  nom: z.string().min(2).max(100),
  description: z.string().optional(),
  prixMensuel: z.number().min(0),
  prixAnnuel: z.number().min(0).optional(),
  stripeProductId: z.string().optional(),
  stripePriceIdMensuel: z.string().optional(),
  stripePriceIdAnnuel: z.string().optional(),
  essaiJours: z.number().int().min(0).default(0),
  ordreAffichage: z.number().int().min(0).default(0),
  actif: z.boolean().default(true),
  couleur: z.string().optional(),
  modules: z.array(z.object({
    moduleCode: z.string(),
    limiteUsage: z.number().int().nullable().optional(),
    config: z.record(z.unknown()).nullable().optional(),
  })).optional(),
});

const updatePlanSchema = z.object({
  nom: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  prixMensuel: z.number().min(0).optional(),
  prixAnnuel: z.number().min(0).optional(),
  stripeProductId: z.string().optional(),
  stripePriceIdMensuel: z.string().optional(),
  stripePriceIdAnnuel: z.string().optional(),
  essaiJours: z.number().int().min(0).optional(),
  ordreAffichage: z.number().int().min(0).optional(),
  actif: z.boolean().optional(),
  couleur: z.string().optional(),
});

const updatePlanModulesSchema = z.object({
  modules: z.array(z.object({
    moduleCode: z.string(),
    limiteUsage: z.number().int().nullable().optional(),
    config: z.record(z.unknown()).nullable().optional(),
  })),
});

/**
 * Routes pour la gestion des plans et modules métiers
 */
export async function plansRoutes(fastify: FastifyInstance) {

  // ========================================
  // MODULES MÉTIERS (catalogue)
  // ========================================

  // GET /api/plans/modules - Liste tous les modules métiers
  fastify.get(
    '/modules',
    { preHandler: [n8nOrAuthMiddleware] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const modules = await prisma.moduleMetier.findMany({
          where: { actif: true },
          orderBy: { ordreAffichage: 'asc' },
          select: {
            id: true,
            code: true,
            nomAffiche: true,
            description: true,
            categorie: true,
            icone: true,
            prixParMois: true,
            ordreAffichage: true,
            actif: true,
          },
        });

        reply.code(200).send({
          success: true,
          data: { modules },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur lors de la récupération des modules');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: 'Impossible de récupérer les modules',
        });
      }
    }
  );

  // GET /api/plans/modules/all - Liste tous les modules (y compris inactifs) - Admin
  fastify.get(
    '/modules/all',
    { preHandler: [authMiddleware] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const modules = await prisma.moduleMetier.findMany({
          orderBy: { ordreAffichage: 'asc' },
          include: {
            _count: {
              select: { planModules: true, clientModules: true },
            },
          },
        });

        reply.code(200).send({
          success: true,
          data: { modules },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur lors de la récupération des modules');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: 'Impossible de récupérer les modules',
        });
      }
    }
  );

  // ========================================
  // PLANS
  // ========================================

  // GET /api/plans - Liste tous les plans actifs (public pour affichage pricing)
  fastify.get(
    '/',
    { preHandler: [n8nOrAuthMiddleware] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const plans = await prisma.plan.findMany({
          where: { actif: true },
          orderBy: { ordreAffichage: 'asc' },
          include: {
            planModules: {
              include: {
                module: {
                  select: {
                    id: true,
                    code: true,
                    nomAffiche: true,
                    description: true,
                    categorie: true,
                    icone: true,
                    prixParMois: true,
                  },
                },
              },
            },
            _count: {
              select: { clientSubscriptions: true },
            },
          },
        });

        reply.code(200).send({
          success: true,
          data: { plans },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur lors de la récupération des plans');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: 'Impossible de récupérer les plans',
        });
      }
    }
  );

  // GET /api/plans/all - Liste tous les plans (y compris inactifs) - Admin
  fastify.get(
    '/all',
    { preHandler: [authMiddleware] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const plans = await prisma.plan.findMany({
          orderBy: { ordreAffichage: 'asc' },
          include: {
            planModules: {
              include: {
                module: {
                  select: {
                    id: true,
                    code: true,
                    nomAffiche: true,
                    categorie: true,
                    icone: true,
                  },
                },
              },
            },
            _count: {
              select: { clientSubscriptions: true },
            },
          },
        });

        reply.code(200).send({
          success: true,
          data: { plans },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur lors de la récupération des plans');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: 'Impossible de récupérer les plans',
        });
      }
    }
  );

  // GET /api/plans/:id - Détails d'un plan
  fastify.get(
    '/:id',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = planIdSchema.parse(request.params);

        const plan = await prisma.plan.findUnique({
          where: { id },
          include: {
            planModules: {
              include: {
                module: true,
              },
            },
            _count: {
              select: { clientSubscriptions: true },
            },
          },
        });

        if (!plan) {
          reply.code(404).send({
            error: 'Plan non trouvé',
            message: `Aucun plan avec l'ID ${id}`,
          });
          return;
        }

        reply.code(200).send({
          success: true,
          data: { plan },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation',
            message: error.errors.map((e) => e.message).join(', '),
          });
          return;
        }
        fastify.log.error(error, 'Erreur lors de la récupération du plan');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: 'Impossible de récupérer le plan',
        });
      }
    }
  );

  // GET /api/plans/by-code/:code - Trouver un plan par code (utile pour n8n)
  fastify.get(
    '/by-code/:code',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { code } = z.object({ code: z.string() }).parse(request.params);

        const plan = await prisma.plan.findUnique({
          where: { code },
          include: {
            planModules: {
              include: {
                module: {
                  select: {
                    id: true,
                    code: true,
                    nomAffiche: true,
                    categorie: true,
                  },
                },
              },
            },
          },
        });

        if (!plan) {
          reply.code(404).send({
            error: 'Plan non trouvé',
            message: `Aucun plan avec le code "${code}"`,
          });
          return;
        }

        reply.code(200).send({
          success: true,
          data: { plan },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur lors de la récupération du plan par code');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: 'Impossible de récupérer le plan',
        });
      }
    }
  );

  // POST /api/plans - Créer un plan
  fastify.post(
    '/',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = createPlanSchema.parse(request.body);
        const { modules, ...planData } = data;

        const plan = await prisma.plan.create({
          data: {
            ...planData,
            planModules: modules && modules.length > 0
              ? {
                  create: await Promise.all(
                    modules.map(async (m) => {
                      const mod = await prisma.moduleMetier.findUnique({
                        where: { code: m.moduleCode },
                      });
                      if (!mod) throw new Error(`Module "${m.moduleCode}" introuvable`);
                      return {
                        module: { connect: { id: mod.id } },
                        limiteUsage: m.limiteUsage ?? null,
                        config: m.config ? (m.config as Prisma.InputJsonValue) : Prisma.JsonNull,
                      };
                    })
                  ),
                }
              : undefined,
          },
          include: {
            planModules: {
              include: { module: true },
            },
          },
        });

        reply.code(201).send({
          success: true,
          message: 'Plan créé avec succès',
          data: { plan },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation',
            message: error.errors.map((e) => e.message).join(', '),
          });
          return;
        }
        fastify.log.error(error, 'Erreur lors de la création du plan');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: error instanceof Error ? error.message : 'Impossible de créer le plan',
        });
      }
    }
  );

  // PUT /api/plans/:id - Modifier un plan
  fastify.put(
    '/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = planIdSchema.parse(request.params);
        const data = updatePlanSchema.parse(request.body);

        const plan = await prisma.plan.update({
          where: { id },
          data,
          include: {
            planModules: {
              include: { module: true },
            },
          },
        });

        reply.code(200).send({
          success: true,
          message: 'Plan mis à jour',
          data: { plan },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation',
            message: error.errors.map((e) => e.message).join(', '),
          });
          return;
        }
        fastify.log.error(error, 'Erreur lors de la mise à jour du plan');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: 'Impossible de mettre à jour le plan',
        });
      }
    }
  );

  // PUT /api/plans/:id/modules - Mettre à jour les modules d'un plan (remplacement complet)
  fastify.put(
    '/:id/modules',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = planIdSchema.parse(request.params);
        const { modules } = updatePlanModulesSchema.parse(request.body);

        // Vérifier que le plan existe
        const plan = await prisma.plan.findUnique({ where: { id } });
        if (!plan) {
          reply.code(404).send({
            error: 'Plan non trouvé',
            message: `Aucun plan avec l'ID ${id}`,
          });
          return;
        }

        // Transaction : supprimer les anciens, insérer les nouveaux
        await prisma.$transaction(async (tx) => {
          // Supprimer tous les plan_modules existants
          await tx.planModule.deleteMany({ where: { planId: id } });

          // Insérer les nouveaux
          for (const m of modules) {
            const mod = await tx.moduleMetier.findUnique({
              where: { code: m.moduleCode },
            });
            if (!mod) throw new Error(`Module "${m.moduleCode}" introuvable`);

            await tx.planModule.create({
              data: {
                plan: { connect: { id } },
                module: { connect: { id: mod.id } },
                limiteUsage: m.limiteUsage ?? null,
                config: m.config ? (m.config as Prisma.InputJsonValue) : Prisma.JsonNull,
              },
            });
          }
        });

        // Recharger le plan avec modules
        const updatedPlan = await prisma.plan.findUnique({
          where: { id },
          include: {
            planModules: {
              include: { module: true },
            },
          },
        });

        reply.code(200).send({
          success: true,
          message: 'Modules du plan mis à jour',
          data: { plan: updatedPlan },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation',
            message: error.errors.map((e) => e.message).join(', '),
          });
          return;
        }
        fastify.log.error(error, 'Erreur lors de la mise à jour des modules du plan');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: error instanceof Error ? error.message : 'Impossible de mettre à jour les modules',
        });
      }
    }
  );

  // DELETE /api/plans/:id - Supprimer un plan (soft : désactiver)
  fastify.delete(
    '/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = planIdSchema.parse(request.params);

        // Vérifier s'il y a des abonnements actifs liés
        const activeSubscriptions = await prisma.clientSubscription.count({
          where: { planId: id, statut: 'actif' },
        });

        if (activeSubscriptions > 0) {
          reply.code(409).send({
            error: 'Conflit',
            message: `Impossible de supprimer : ${activeSubscriptions} abonnement(s) actif(s) utilisent ce plan`,
          });
          return;
        }

        // Soft delete : désactiver
        await prisma.plan.update({
          where: { id },
          data: { actif: false },
        });

        reply.code(200).send({
          success: true,
          message: 'Plan désactivé avec succès',
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation',
            message: error.errors.map((e) => e.message).join(', '),
          });
          return;
        }
        fastify.log.error(error, 'Erreur lors de la suppression du plan');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: 'Impossible de supprimer le plan',
        });
      }
    }
  );
}
