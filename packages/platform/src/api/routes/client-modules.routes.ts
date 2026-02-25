import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authMiddleware, n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import type { PrismaClient } from '@prisma/client';

// Schemas de validation
const clientIdSchema = z.object({
  clientId: z.string().uuid('ID client invalide'),
});

const activateModulesSchema = z.object({
  planCode: z.string().optional(),
  modules: z.array(z.object({
    moduleCode: z.string(),
    limiteUsage: z.number().int().nullable().optional(),
    config: z.record(z.unknown()).nullable().optional(),
  })).optional(),
});

const toggleModuleSchema = z.object({
  moduleCode: z.string(),
  actif: z.boolean(),
});

/**
 * Routes pour la gestion des modules par client
 */
export async function clientModulesRoutes(fastify: FastifyInstance) {

  // GET /api/client-modules/:clientId - Liste les modules d'un client
  fastify.get(
    '/:clientId',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { clientId } = clientIdSchema.parse(request.params);

        const clientModules = await prisma.clientModule.findMany({
          where: { clientFinalId: clientId },
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
          orderBy: {
            module: { ordreAffichage: 'asc' },
          },
        });

        // Aussi récupérer l'abonnement et son plan
        const subscription = await prisma.clientSubscription.findFirst({
          where: { clientFinalId: clientId, statut: { in: ['actif', 'essai'] } },
          include: {
            plan: {
              include: {
                planModules: {
                  include: { module: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        reply.code(200).send({
          success: true,
          data: {
            clientModules,
            subscription: subscription
              ? {
                  id: subscription.id,
                  nomPlan: subscription.nomPlan,
                  statut: subscription.statut,
                  plan: subscription.plan
                    ? {
                        code: subscription.plan.code,
                        nom: subscription.plan.nom,
                        prixMensuel: subscription.plan.prixMensuel,
                      }
                    : null,
                }
              : null,
            modulesActifs: clientModules
              .filter((cm) => cm.actif)
              .map((cm) => cm.module.code),
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation',
            message: error.errors.map((e) => e.message).join(', '),
          });
          return;
        }
        fastify.log.error(error, 'Erreur lors de la récupération des modules client');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: 'Impossible de récupérer les modules du client',
        });
      }
    }
  );

  // POST /api/client-modules/:clientId/activate - Activer les modules selon un plan
  // Utilisé par n8n lors de l'onboarding ou d'un changement de plan
  fastify.post(
    '/:clientId/activate',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { clientId } = clientIdSchema.parse(request.params);
        const data = activateModulesSchema.parse(request.body);

        // Vérifier que le client existe
        const client = await prisma.clientFinal.findUnique({ where: { id: clientId } });
        if (!client) {
          reply.code(404).send({
            error: 'Client non trouvé',
            message: `Aucun client avec l'ID ${clientId}`,
          });
          return;
        }

        let modulesToActivate: Array<{
          moduleCode: string;
          limiteUsage: number | null;
          config: Record<string, unknown> | null;
        }> = [];

        if (data.planCode) {
          // Récupérer les modules du plan
          const plan = await prisma.plan.findUnique({
            where: { code: data.planCode },
            include: {
              planModules: {
                include: { module: true },
              },
            },
          });

          if (!plan) {
            reply.code(404).send({
              error: 'Plan non trouvé',
              message: `Aucun plan avec le code "${data.planCode}"`,
            });
            return;
          }

          modulesToActivate = plan.planModules.map((pm) => ({
            moduleCode: pm.module.code,
            limiteUsage: pm.limiteUsage,
            config: pm.config as Record<string, unknown> | null,
          }));

          // Mettre à jour le planId dans l'abonnement du client
          await prisma.clientSubscription.updateMany({
            where: {
              clientFinalId: clientId,
              statut: { in: ['actif', 'essai'] },
            },
            data: { planId: plan.id },
          });
        } else if (data.modules && data.modules.length > 0) {
          modulesToActivate = data.modules.map((m) => ({
            moduleCode: m.moduleCode,
            limiteUsage: m.limiteUsage ?? null,
            config: (m.config as Record<string, unknown>) ?? null,
          }));
        } else {
          reply.code(400).send({
            error: 'Données manquantes',
            message: 'Fournir planCode ou modules[]',
          });
          return;
        }

        // Transaction : désactiver les anciens, activer les nouveaux
        const result = await prisma.$transaction(async (tx) => {
          // Désactiver tous les modules existants
          await tx.clientModule.updateMany({
            where: { clientFinalId: clientId },
            data: { actif: false },
          });

          const activated: string[] = [];

          for (const m of modulesToActivate) {
            const mod = await tx.moduleMetier.findUnique({
              where: { code: m.moduleCode },
            });
            if (!mod) {
              fastify.log.warn(`Module "${m.moduleCode}" introuvable, ignoré`);
              continue;
            }

            await tx.clientModule.upsert({
              where: {
                clientFinalId_moduleId: {
                  clientFinalId: clientId,
                  moduleId: mod.id,
                },
              },
              create: {
                clientFinalId: clientId,
                moduleId: mod.id,
                actif: true,
                limiteUsage: m.limiteUsage,
                config: m.config,
              },
              update: {
                actif: true,
                limiteUsage: m.limiteUsage,
                config: m.config,
                usageActuel: 0,
              },
            });

            activated.push(m.moduleCode);
          }

          return activated;
        });

        reply.code(200).send({
          success: true,
          message: `${result.length} module(s) activé(s) pour le client`,
          data: {
            modulesActives: result,
            count: result.length,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation',
            message: error.errors.map((e) => e.message).join(', '),
          });
          return;
        }
        fastify.log.error(error, 'Erreur lors de l\'activation des modules');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: error instanceof Error ? error.message : 'Impossible d\'activer les modules',
        });
      }
    }
  );

  // PATCH /api/client-modules/:clientId/toggle - Activer/désactiver un module spécifique
  fastify.patch(
    '/:clientId/toggle',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { clientId } = clientIdSchema.parse(request.params);
        const { moduleCode, actif } = toggleModuleSchema.parse(request.body);

        const mod = await prisma.moduleMetier.findUnique({
          where: { code: moduleCode },
        });
        if (!mod) {
          reply.code(404).send({
            error: 'Module non trouvé',
            message: `Aucun module avec le code "${moduleCode}"`,
          });
          return;
        }

        const clientModule = await prisma.clientModule.upsert({
          where: {
            clientFinalId_moduleId: {
              clientFinalId: clientId,
              moduleId: mod.id,
            },
          },
          create: {
            clientFinalId: clientId,
            moduleId: mod.id,
            actif,
          },
          update: { actif },
          include: { module: true },
        });

        reply.code(200).send({
          success: true,
          message: `Module "${moduleCode}" ${actif ? 'activé' : 'désactivé'}`,
          data: { clientModule },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation',
            message: error.errors.map((e) => e.message).join(', '),
          });
          return;
        }
        fastify.log.error(error, 'Erreur lors du toggle module');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: 'Impossible de modifier le module',
        });
      }
    }
  );

  // GET /api/client-modules/stats - Stats globales sur l'utilisation des modules
  fastify.get(
    '/stats',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;

        // Nombre de clients par plan
        const clientsParPlan = await prisma.$queryRaw<Array<{
          plan_code: string | null;
          plan_nom: string | null;
          count: bigint;
        }>>`
          SELECT p.code as plan_code, p.nom as plan_nom, COUNT(cs.id) as count
          FROM client_subscriptions cs
          LEFT JOIN plans p ON p.id = cs.plan_id
          WHERE cs.tenant_id = ${tenantId}
            AND cs.statut IN ('actif', 'essai')
          GROUP BY p.code, p.nom
          ORDER BY count DESC
        `;

        // Modules les plus utilisés
        const modulesPopulaires = await prisma.$queryRaw<Array<{
          module_code: string;
          module_nom: string;
          count: bigint;
        }>>`
          SELECT mm.code as module_code, mm."nom_affiché" as module_nom, COUNT(cm.id) as count
          FROM client_modules cm
          JOIN module_metiers mm ON mm.id = cm.module_id
          JOIN client_finals cf ON cf.id = cm.client_final_id
          WHERE cf.tenant_id = ${tenantId}
            AND cm.actif = true
          GROUP BY mm.code, mm."nom_affiché"
          ORDER BY count DESC
        `;

        reply.code(200).send({
          success: true,
          data: {
            clientsParPlan: clientsParPlan.map((r) => ({
              planCode: r.plan_code,
              planNom: r.plan_nom,
              count: Number(r.count),
            })),
            modulesPopulaires: modulesPopulaires.map((r) => ({
              moduleCode: r.module_code,
              moduleNom: r.module_nom,
              count: Number(r.count),
            })),
          },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur lors de la récupération des stats modules');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: 'Impossible de récupérer les statistiques',
        });
      }
    }
  );
}
