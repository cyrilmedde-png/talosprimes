import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { TransactionClient } from '../../types/prisma-helpers.js';
import { exec } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../../config/database.js';
import { eventService } from '../../services/event.service.js';
import { n8nService } from '../../services/n8n.service.js';
import { env } from '../../config/env.js';
import { authMiddleware, n8nOrAuthMiddleware, n8nOnlyMiddleware, isN8nInternalRequest } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Schema de validation pour créer un client
const createClientSchema = z.object({
  tenantId: z.string().uuid().optional(), // Optionnel : présent si appel depuis n8n
  type: z.enum(['b2b', 'b2c']),
  raisonSociale: z.string().optional(),
  nom: z.string().optional(),
  prenom: z.string().optional(),
  email: z.string().email('Email invalide'),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

// Schema de validation pour mettre à jour un client
const updateClientSchema = z.object({
  raisonSociale: z.string().optional(),
  nom: z.string().optional(),
  prenom: z.string().optional(),
  email: z.string().email('Email invalide').optional(),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  tags: z.array(z.string()).optional(),
  statut: z.enum(['actif', 'inactif', 'suspendu']).optional(),
});

// Schema de validation pour les paramètres de route
const paramsSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

/**
 * Routes pour la gestion des clients finaux
 */
export async function clientsRoutes(fastify: FastifyInstance) {
  // GET /api/clients - Liste tous les clients du tenant
  fastify.get(
    '/',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const fromN8n = request.isN8nRequest === true;

        // Pour n8n sans tenantId, lister tous les clients (accès admin interne)
        if (!tenantId && !fromN8n) {
          return ApiError.unauthorized(reply, 'Tenant ID manquant');
        }

        const whereClause: Record<string, unknown> = {};
        if (tenantId) {
          whereClause.tenantId = tenantId;
        }

        // Récupérer les clients du tenant uniquement
        const clients = await prisma.clientFinal.findMany({
          where: whereClause,
          orderBy: {
            updatedAt: 'desc',
          },
          select: {
            id: true,
            type: true,
            raisonSociale: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            adresse: true,
            tags: true,
            statut: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        reply.code(200).send({
          success: true,
          data: {
            clients,
            count: clients.length,
          },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur lors de la récupération des clients');
        return ApiError.internal(reply);
      }
    }
  );

  // GET /api/clients/:id - Récupère un client spécifique
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const params = paramsSchema.parse(request.params);

        if (!tenantId) {
          return ApiError.unauthorized(reply, 'Tenant ID manquant');
        }

        // Récupérer le client avec vérification du tenant
        const client = await prisma.clientFinal.findFirst({
          where: {
            id: params.id,
            tenantId, // Isolation tenant stricte
          },
          include: {
            subscriptions: {
              where: {
                statut: 'actif',
              },
            },
            invoices: {
              take: 10,
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        });

        if (!client) {
          return ApiError.notFound(reply, 'Client');
        }

        reply.code(200).send({
          success: true,
          data: {
            client,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }

        fastify.log.error(error, 'Erreur lors de la récupération du client');
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/clients/create-from-lead - Crée un client depuis un lead converti
  fastify.post(
    '/create-from-lead',
    {
      preHandler: [
        async (request: FastifyRequest, reply: FastifyReply) => {
          // Si l'appel vient de n8n (secret), on ne demande pas de JWT
          if (isN8nInternalRequest(request)) return;
          await fastify.authenticate(request, reply);
        },
      ],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const fromN8n = isN8nInternalRequest(request);
        // Vérifier droits si pas n8n
        if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return ApiError.forbidden(reply);
        }

        const tenantId = request.tenantId;
        const body = request.body as { leadId: string };

        if (!tenantId) {
          return ApiError.badRequest(reply, 'Tenant ID manquant');
        }

        if (!body.leadId) {
          return ApiError.badRequest(reply, 'Lead ID requis');
        }

        // Si on délègue les écritures à n8n (full no-code)
        // IMPORTANT: si l'appel vient déjà de n8n, ne pas redéléguer (évite boucle)
        if (!fromN8n && tenantId && env.USE_N8N_COMMANDS) {
          const res = await n8nService.callWorkflowReturn<{ client: unknown }>(
            tenantId,
            'client_create_from_lead',
            {
              leadId: body.leadId,
            }
          );
          return reply.status(201).send({
            success: true,
            message: 'Client créé avec succès depuis le lead via n8n',
            data: res.data,
          });
        }

        // Création directe en base uniquement si USE_N8N_COMMANDS=false (pas de délégation n8n)
        // Récupérer le lead
        const lead = await prisma.lead.findUnique({
          where: { id: body.leadId },
        });

        if (!lead) {
          return ApiError.notFound(reply, 'Lead');
        }

        // Vérifier que le client n'existe pas déjà
        const existingClient = await prisma.clientFinal.findFirst({
          where: {
            tenantId,
            email: lead.email,
          },
        });

        if (existingClient) {
          return ApiError.conflict(reply, 'Un client avec cet email existe déjà');
        }

        // Si le lead n'est pas déjà converti, le marquer comme converti
        if (lead.statut !== 'converti') {
          await prisma.lead.update({
            where: { id: body.leadId },
            data: { statut: 'converti' },
          });
        }

        // Créer le client B2C depuis le lead
        const client = await prisma.clientFinal.create({
          data: {
            tenantId,
            type: 'b2c',
            nom: lead.nom,
            prenom: lead.prenom,
            email: lead.email,
            telephone: lead.telephone,
            statut: 'actif',
          },
        });

        // Émettre événement pour n8n (client.created)
        await eventService.emit(
          tenantId,
          'client.created',
          'ClientFinal',
          client.id,
          {
            clientId: client.id,
            tenantId,
            type: client.type,
            email: client.email,
            nom: client.nom || client.raisonSociale,
          }
        );

        // NOTE: L'événement client.onboarding ne doit PAS être émis automatiquement
        // Il doit être émis uniquement lors d'un onboarding explicite via /api/clients/:id/onboarding
        // Sinon, un abonnement serait créé automatiquement pour chaque nouveau client

        return reply.status(201).send({
          success: true,
          message: 'Client créé avec succès depuis le lead',
          data: { client },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur lors de la création du client depuis le lead');
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/clients - Crée un nouveau client
  fastify.post(
    '/',
    {
      preHandler: [
        async (request: FastifyRequest, reply: FastifyReply) => {
          // Si l'appel vient de n8n (secret), on ne demande pas de JWT
          if (isN8nInternalRequest(request)) return;
          await fastify.authenticate(request, reply);
        },
      ],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const fromN8n = isN8nInternalRequest(request);

        // Valider les données (tenantId peut être dans le body si appel depuis n8n)
        const body = createClientSchema.parse(request.body);

        // Récupérer le tenantId : depuis le body si appel n8n, sinon depuis request (JWT)
        const tenantId = fromN8n
          ? (body as { tenantId?: string }).tenantId || request.tenantId
          : request.tenantId;

        if (!tenantId) {
          return ApiError.unauthorized(reply, 'Tenant ID manquant');
        }

        // Vérifier droits si pas n8n
        if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return ApiError.forbidden(reply);
        }

        // Nettoyer le body : retirer tenantId s'il était dans le body (on l'a déjà récupéré)
        const bodyWithoutTenantId = { ...body };
        if ('tenantId' in bodyWithoutTenantId) {
          delete (bodyWithoutTenantId as { tenantId?: string }).tenantId;
        }

        // Si on délègue les écritures à n8n (full no‑code)
        // IMPORTANT: si l'appel vient déjà de n8n, ne pas redéléguer (évite boucle)
        if (!fromN8n && tenantId && env.USE_N8N_COMMANDS) {
          const res = await n8nService.callWorkflowReturn<{ client: unknown }>(
            tenantId,
            'client_create',
            bodyWithoutTenantId
          );
          return reply.status(201).send({
            success: true,
            message: 'Client créé via n8n',
            data: res.data,
          });
        }

        // Vérifier que l'email n'existe pas déjà pour ce tenant
        const existingClient = await prisma.clientFinal.findFirst({
          where: {
            tenantId,
            email: bodyWithoutTenantId.email,
          },
        });

        if (existingClient) {
          return ApiError.conflict(reply, 'Un client avec cet email existe déjà');
        }

        // Validation selon le type (B2B ou B2C)
        if (bodyWithoutTenantId.type === 'b2b' && !bodyWithoutTenantId.raisonSociale) {
          return ApiError.badRequest(reply, 'La raison sociale est requise pour un client B2B');
        }

        if (bodyWithoutTenantId.type === 'b2c' && (!bodyWithoutTenantId.nom || !bodyWithoutTenantId.prenom)) {
          return ApiError.badRequest(reply, 'Le nom et prénom sont requis pour un client B2C');
        }

        // Créer le client
        const client = await prisma.clientFinal.create({
          data: {
            tenantId,
            type: bodyWithoutTenantId.type,
            raisonSociale: bodyWithoutTenantId.raisonSociale,
            nom: bodyWithoutTenantId.nom,
            prenom: bodyWithoutTenantId.prenom,
            email: bodyWithoutTenantId.email,
            telephone: bodyWithoutTenantId.telephone,
            adresse: bodyWithoutTenantId.adresse,
            tags: bodyWithoutTenantId.tags,
            statut: 'actif',
          },
        });

        // Émettre événement pour n8n (client.created)
        await eventService.emit(
          tenantId,
          'client.created',
          'ClientFinal',
          client.id,
          {
            clientId: client.id,
            tenantId,
            type: client.type,
            email: client.email,
            nom: client.nom || client.raisonSociale,
          }
        );

        // NOTE: L'événement client.onboarding ne doit PAS être émis automatiquement
        // Il doit être émis uniquement lors d'un onboarding explicite via /api/clients/:id/onboarding
        // Sinon, un abonnement serait créé automatiquement pour chaque nouveau client

        reply.code(201).send({
          success: true,
          data: {
            client,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }

        fastify.log.error(error, 'Erreur lors de la création du client');
        return ApiError.internal(reply);
      }
    }
  );

  // PUT /api/clients/:id - Met à jour un client
  fastify.put(
    '/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const params = paramsSchema.parse(request.params);
        const body = updateClientSchema.parse(request.body);

        if (!tenantId) {
          return ApiError.unauthorized(reply, 'Tenant ID manquant');
        }

        // Vérifier que le client existe et appartient au tenant
        const existingClient = await prisma.clientFinal.findFirst({
          where: {
            id: params.id,
            tenantId,
          },
        });

        if (!existingClient) {
          return ApiError.notFound(reply, 'Client');
        }

        // Vérifier l'unicité de l'email si modifié
        if (body.email && body.email !== existingClient.email) {
          const emailExists = await prisma.clientFinal.findFirst({
            where: {
              tenantId,
              email: body.email,
              id: { not: params.id },
            },
          });

          if (emailExists) {
            return ApiError.conflict(reply, 'Un client avec cet email existe déjà');
          }
        }

        // Mettre à jour le client
        const updatedClient = await prisma.clientFinal.update({
          where: {
            id: params.id,
          },
          data: {
            raisonSociale: body.raisonSociale,
            nom: body.nom,
            prenom: body.prenom,
            email: body.email,
            telephone: body.telephone,
            adresse: body.adresse,
            tags: body.tags,
            statut: body.statut,
          },
        });

        // Émettre événement pour n8n (client.updated)
        await eventService.emit(
          tenantId,
          'client.updated',
          'ClientFinal',
          updatedClient.id,
          {
            clientId: updatedClient.id,
            tenantId,
            type: updatedClient.type,
            email: updatedClient.email,
          }
        );

        reply.code(200).send({
          success: true,
          data: {
            client: updatedClient,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }

        fastify.log.error(error, 'Erreur lors de la mise à jour du client');
        return ApiError.internal(reply);
      }
    }
  );

  // DELETE /api/clients/:id - Supprime un client (soft delete)
  fastify.delete(
    '/:id',
    {
      preHandler: [
        async (request: FastifyRequest, reply: FastifyReply) => {
          // Si l'appel vient de n8n (secret), on ne demande pas de JWT
          if (isN8nInternalRequest(request)) return;
          await fastify.authenticate(request, reply);
        },
      ],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const fromN8n = isN8nInternalRequest(request);
        const params = paramsSchema.parse(request.params);

        // Si l'appel vient de n8n, on doit récupérer le tenantId depuis le client
        // Sinon, on l'obtient depuis le JWT (request.tenantId)
        let tenantId = request.tenantId;

        // Si appel depuis n8n, récupérer le client pour obtenir le tenantId
        if (fromN8n) {
          const clientForTenant = await prisma.clientFinal.findUnique({
            where: { id: params.id },
            select: { tenantId: true },
          });
          if (!clientForTenant) {
            return ApiError.notFound(reply, 'Client');
          }
          tenantId = clientForTenant.tenantId;
        }

        if (!tenantId) {
          return ApiError.unauthorized(reply, 'Tenant ID manquant');
        }

        // Vérifier droits si pas n8n
        if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return ApiError.forbidden(reply);
        }

        // Si on délègue les écritures à n8n (full no‑code)
        // IMPORTANT: si l'appel vient déjà de n8n, ne pas redéléguer (évite boucle)
        if (!fromN8n && tenantId && env.USE_N8N_COMMANDS) {
          const res = await n8nService.callWorkflowReturn<{ client: unknown }>(
            tenantId,
            'client_delete',
            { id: params.id }
          );
          return reply.status(200).send({
            success: true,
            message: 'Client supprimé via n8n',
            data: res.data,
          });
        }

        // Vérifier que le client existe et appartient au tenant
        const existingClient = await prisma.clientFinal.findFirst({
          where: {
            id: params.id,
            tenantId,
          },
        });

        if (!existingClient) {
          return ApiError.notFound(reply, 'Client');
        }

        // Suppression définitive (hard delete)
        const deletedClient = await prisma.clientFinal.delete({
          where: {
            id: params.id,
          },
        });

        // Cleanup lead SYNCHRONE via n8n — le lead doit passer en 'abandonne'
        // AVANT que le frontend ne recharge la liste (sinon race condition :
        // le lead réapparaît car il est encore 'converti' et le client n'existe plus).
        if (!fromN8n) {
          try {
            await n8nService.callWorkflowReturn(
              tenantId,
              'client_deleted_cleanup_lead',
              {
                email: deletedClient.email,
                tenantId,
              }
            );
          } catch (cleanupError) {
            // Ne pas bloquer la suppression si le cleanup lead échoue
            fastify.log.warn({ cleanupError, clientId: deletedClient.id }, 'Cleanup lead après suppression client échoué');
          }

          // Logger l'événement (async, fire-and-forget — juste pour l'historique)
          void eventService.emit(
            tenantId,
            'client.deleted',
            'ClientFinal',
            deletedClient.id,
            {
              clientId: deletedClient.id,
              tenantId,
              email: deletedClient.email,
            }
          );
        }

        reply.code(200).send({
          success: true,
          message: 'Client supprimé définitivement avec succès',
          data: {
            client: deletedClient,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }

        fastify.log.error(error, 'Erreur lors de la suppression du client');
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/clients/create-credentials - Créer Tenant et User pour un client final
  fastify.post(
    '/create-credentials',
    {
      preHandler: [n8nOnlyMiddleware],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as {
          clientId: string;
          tenantId: string; // Tenant de l'entreprise cliente
          email: string;
          password: string;
          nom?: string;
          prenom?: string;
          raisonSociale?: string | null;
          tenantName: string;
        };

        // Vérifier que le client existe
        const client = await prisma.clientFinal.findFirst({
          where: {
            id: body.clientId,
            tenantId: body.tenantId,
          },
        });

        if (!client) {
          return ApiError.notFound(reply, 'Client');
        }

        // Vérifier si un tenant existe déjà pour ce client (par email)
        let clientTenant = await prisma.tenant.findFirst({
          where: {
            emailContact: body.email,
          },
        });

        // Si le tenant n'existe pas, le créer
        if (!clientTenant) {
          clientTenant = await prisma.tenant.create({
            data: {
              nomEntreprise: body.tenantName,
              emailContact: body.email,
              metier: 'client_final',
            },
          });
        }

        // Vérifier si un utilisateur existe déjà pour ce tenant
        let user = await prisma.user.findFirst({
          where: {
            tenantId: clientTenant.id,
            email: body.email,
          },
        });

        // Hasher le mot de passe
        const { hashPassword } = await import('../../services/auth.service.js');
        const passwordHash = await hashPassword(body.password);

        // Si l'utilisateur n'existe pas, le créer
        if (!user) {
          user = await prisma.user.create({
            data: {
              tenantId: clientTenant.id,
              email: body.email,
              passwordHash,
              mustChangePassword: true,
              role: 'admin',
              nom: body.nom || null,
              prenom: body.prenom || null,
            },
          });
        } else {
          // Mettre à jour le mot de passe si l'utilisateur existe
          user = await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              passwordHash,
              mustChangePassword: true,
            },
          });
        }

        // Stocker le mot de passe temporaire dans l'abonnement du client
        // On cherche l'abonnement le plus récent pour ce client
        const subscription = await prisma.clientSubscription.findFirst({
          where: {
            clientFinalId: body.clientId,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        });

        if (subscription) {
          await prisma.clientSubscription.update({
            where: {
              id: subscription.id,
            },
            data: {
              temporaryPassword: body.password, // Stocké en clair temporairement (effacé après lecture par get-credentials)
            },
          });
        }

        return reply.status(201).send({
          success: true,
          data: {
            tenantId: clientTenant.id,
            userId: user.id,
            email: user.email,
            password: body.password, // Retourner aussi pour le workflow (si pas Stripe)
          },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur lors de la création des identifiants');
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/clients/get-credentials - Récupérer les identifiants d'un client (pour webhook Stripe)
  fastify.post(
    '/get-credentials',
    {
      preHandler: [n8nOnlyMiddleware],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as {
          clientId: string;
          tenantId: string;
        };

        // Récupérer l'abonnement avec le mot de passe temporaire
        const subscription = await prisma.clientSubscription.findFirst({
          where: {
            clientFinalId: body.clientId,
          },
          orderBy: {
            updatedAt: 'desc',
          },
          include: {
            clientFinal: true,
          },
        });

        if (!subscription) {
          return ApiError.notFound(reply, 'Subscription');
        }

        // Récupérer l'utilisateur associé au tenant du client
        const tenant = await prisma.tenant.findFirst({
          where: {
            emailContact: subscription.clientFinal.email,
          },
        });

        if (!tenant) {
          return ApiError.notFound(reply, 'Tenant');
        }

        const user = await prisma.user.findFirst({
          where: {
            tenantId: tenant.id,
            email: subscription.clientFinal.email,
          },
        });

        if (!user) {
          return ApiError.notFound(reply, 'User');
        }

        const tempPassword = subscription.temporaryPassword;

        // Sécurité : effacer le mot de passe temporaire après lecture (usage unique)
        // Cela limite la fenêtre d'exposition du mot de passe en clair
        if (tempPassword) {
          await prisma.clientSubscription.update({
            where: { id: subscription.id },
            data: { temporaryPassword: null },
          });
        }

        return reply.status(200).send({
          success: true,
          data: {
            tenantId: tenant.id,
            userId: user.id,
            email: user.email,
            password: tempPassword, // Mot de passe temporaire (effacé après cette lecture)
          },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur lors de la récupération des identifiants');
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/clients/:id/onboarding - Créer l'espace client (abonnement + modules)
  fastify.post(
    '/:id/onboarding',
    {
      preHandler: [authMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId as string;
        const params = paramsSchema.parse(request.params);
        const body = request.body as {
          nomPlan?: string;
          montantMensuel?: number;
          modulesInclus?: string[];
          dureeMois?: number;
          avecStripe?: boolean;
          avecSousDomaine?: boolean;
          sousDomaine?: string;
        };

        // Vérifier que le client existe et appartient au tenant
        const client = await prisma.clientFinal.findFirst({
          where: {
            id: params.id,
            tenantId,
          },
        });

        if (!client) {
          return ApiError.notFound(reply, 'Client');
        }

        // Vérifier si un abonnement existe déjà
        const existingSubscription = await prisma.clientSubscription.findFirst({
          where: {
            clientFinalId: client.id,
          },
        });

        if (existingSubscription) {
          return ApiError.badRequest(reply, 'Un abonnement existe déjà pour ce client');
        }

        // Plan par défaut ou personnalisé
        const plan = {
          nomPlan: body.nomPlan || 'Plan Starter',
          montantMensuel: body.montantMensuel || 29.99,
          modulesInclus: body.modulesInclus || ['facturation', 'comptabilite', 'agent_ia'],
          dureeMois: body.dureeMois || 1,
        };

        // Tout dans une transaction Prisma : si quoi que ce soit échoue, tout est rollback
        const result = await prisma.$transaction(async (tx: TransactionClient) => {
          const dateDebut = new Date();
          const dateProchainRenouvellement = new Date();
          dateProchainRenouvellement.setMonth(dateProchainRenouvellement.getMonth() + plan.dureeMois);

          // 1. Créer l'abonnement (statut en_attente si Stripe demandé, actif sinon)
          const subscription = await tx.clientSubscription.create({
            data: {
              clientFinalId: client.id,
              nomPlan: plan.nomPlan,
              dateDebut,
              dateProchainRenouvellement,
              montantMensuel: plan.montantMensuel,
              modulesInclus: plan.modulesInclus,
              statut: body.avecStripe ? 'en_attente' : 'actif',
            },
          });

          // 2. Créer l'espace client (ClientSpace) si sous-domaine demandé
          let clientSpace = null;
          if (body.avecSousDomaine && body.sousDomaine) {
            const slug = body.sousDomaine
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');

            const existingSpace = await tx.clientSpace.findFirst({
              where: { tenantSlug: slug },
            });
            if (existingSpace) {
              throw new Error(`Le sous-domaine "${slug}" est déjà utilisé`);
            }

            clientSpace = await tx.clientSpace.create({
              data: {
                tenantId,
                clientFinalId: client.id,
                tenantSlug: slug,
                status: 'en_creation',
                modulesActives: plan.modulesInclus,
              },
            });
          }

          // 3. Si Stripe demandé, appeler n8n — si ça échoue, la transaction rollback tout
          let stripeData = null;
          if (body.avecStripe && tenantId && env.USE_N8N_COMMANDS) {
            const stripeRes = await n8nService.callWorkflowReturn<{ stripe: unknown }>(
              tenantId,
              'client_onboarding',
              {
                client: {
                  id: client.id,
                  tenantId,
                  type: client.type,
                  email: client.email,
                  nom: client.nom,
                  prenom: client.prenom,
                  raisonSociale: client.raisonSociale,
                  telephone: client.telephone,
                },
                plan,
                subscriptionId: subscription.id,
                avecStripe: true,
              }
            );
            stripeData = stripeRes.data;

            // Stripe OK → passer l'abonnement en actif
            await tx.clientSubscription.update({
              where: { id: subscription.id },
              data: { statut: 'actif' },
            });
          }

          // 4. Notification
          const subdomainInfo = clientSpace ? ` (sous-domaine: ${clientSpace.tenantSlug}.talosprimes.com)` : '';
          await tx.notification.create({
            data: {
              tenantId,
              type: 'client_onboarding',
              titre: 'Espace client créé',
              message: `L'espace client et l'abonnement "${plan.nomPlan}" ont été créés avec succès pour ${client.nom || client.raisonSociale || client.email}${subdomainInfo}`,
              donnees: {
                clientId: client.id,
                subscriptionId: subscription.id,
                clientSpaceId: clientSpace?.id || null,
                sousDomaine: clientSpace?.tenantSlug || null,
              },
            },
          });

          return { subscription, clientSpace, stripeData };
        });

        // 5. Hors transaction : lancer le vhost nginx (fire-and-forget, non critique)
        if (result.clientSpace) {
          const scriptPath = resolve(__dirname, '../../../../..', 'scripts/setup-subdomain.sh');
          exec(`bash "${scriptPath}" "${result.clientSpace.tenantSlug}"`, (error, stdout, stderr) => {
            if (error) {
              fastify.log.warn({ slug: result.clientSpace!.tenantSlug, error: error.message, stderr }, 'setup-subdomain.sh echoue (non bloquant)');
            } else {
              fastify.log.info({ slug: result.clientSpace!.tenantSlug, stdout: stdout.trim() }, 'Sous-domaine configure');
            }
          });
        }

        return reply.status(201).send({
          success: true,
          message: result.clientSpace
            ? `Espace client créé avec sous-domaine ${result.clientSpace.tenantSlug}.talosprimes.com`
            : 'Espace client créé avec succès',
          data: {
            subscription: result.subscription,
            plan,
            clientSpace: result.clientSpace,
            ...(result.stripeData ? { stripe: result.stripeData } : {}),
          },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur lors de la création de l\'espace client');
        return ApiError.internal(reply);
      }
    }
  );

  // GET /api/clients/:id/subscription - Récupérer l'abonnement d'un client
  fastify.get(
    '/:id/subscription',
    {
      preHandler: [authMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId as string;
        const params = paramsSchema.parse(request.params);

        // Vérifier que le client existe et appartient au tenant
        const client = await prisma.clientFinal.findFirst({
          where: {
            id: params.id,
            tenantId,
          },
        });

        if (!client) {
          return ApiError.notFound(reply, 'Client');
        }

        // Récupérer l'abonnement
        const subscription = await prisma.clientSubscription.findFirst({
          where: {
            clientFinalId: client.id,
          },
        });

        return reply.status(200).send({
          success: true,
          data: {
            subscription: subscription || null,
          },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur lors de la récupération de l\'abonnement');
        return ApiError.internal(reply);
      }
    }
  );
}

