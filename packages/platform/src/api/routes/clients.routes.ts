import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { eventService } from '../../services/event.service.js';

// Schema de validation pour créer un client
const createClientSchema = z.object({
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
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;

        if (!tenantId) {
          reply.code(401).send({
            error: 'Non authentifié',
            message: 'Tenant ID manquant',
          });
          return;
        }

        // Récupérer les clients du tenant uniquement
        const clients = await prisma.clientFinal.findMany({
          where: {
            tenantId,
          },
          orderBy: {
            createdAt: 'desc',
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
        reply.code(500).send({
          error: 'Erreur serveur',
          message: 'Impossible de récupérer les clients',
        });
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
          reply.code(401).send({
            error: 'Non authentifié',
            message: 'Tenant ID manquant',
          });
          return;
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
          reply.code(404).send({
            error: 'Client introuvable',
            message: 'Ce client n\'existe pas ou n\'appartient pas à votre entreprise',
          });
          return;
        }

        reply.code(200).send({
          success: true,
          data: {
            client,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation échouée',
            message: error.errors.map((e) => e.message).join(', '),
          });
          return;
        }

        fastify.log.error(error, 'Erreur lors de la récupération du client');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: 'Impossible de récupérer le client',
        });
      }
    }
  );

  // POST /api/clients/create-from-lead - Crée un client depuis un lead converti
  fastify.post(
    '/create-from-lead',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
      try {
        if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
          return reply.status(403).send({ success: false, error: 'Accès refusé' });
        }

        const tenantId = request.tenantId;
        const body = request.body as { leadId: string };

        if (!tenantId) {
          return reply.status(400).send({ success: false, error: 'Tenant ID manquant' });
        }

        if (!body.leadId) {
          return reply.status(400).send({ success: false, error: 'Lead ID requis' });
        }

        // Récupérer le lead
        const lead = await prisma.lead.findUnique({
          where: { id: body.leadId },
        });

        if (!lead) {
          return reply.status(404).send({ success: false, error: 'Lead non trouvé' });
        }

        if (lead.statut !== 'converti') {
          return reply.status(400).send({ success: false, error: 'Le lead doit être converti pour créer un client' });
        }

        // Vérifier que le client n'existe pas déjà
        const existingClient = await prisma.clientFinal.findFirst({
          where: {
            tenantId,
            email: lead.email,
          },
        });

        if (existingClient) {
          return reply.status(409).send({ success: false, error: 'Un client avec cet email existe déjà' });
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

        return reply.status(201).send({
          success: true,
          message: 'Client créé avec succès depuis le lead',
          data: { client },
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur lors de la création du client depuis le lead');
        return reply.status(500).send({
          success: false,
          error: 'Erreur serveur',
          message: 'Impossible de créer le client depuis le lead',
        });
      }
    }
  );

  // POST /api/clients - Crée un nouveau client
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;

        if (!tenantId) {
          reply.code(401).send({
            error: 'Non authentifié',
            message: 'Tenant ID manquant',
          });
          return;
        }

        // Valider les données
        const body = createClientSchema.parse(request.body);

        // Vérifier que l'email n'existe pas déjà pour ce tenant
        const existingClient = await prisma.clientFinal.findFirst({
          where: {
            tenantId,
            email: body.email,
          },
        });

        if (existingClient) {
          reply.code(409).send({
            error: 'Client existant',
            message: 'Un client avec cet email existe déjà',
          });
          return;
        }

        // Validation selon le type (B2B ou B2C)
        if (body.type === 'b2b' && !body.raisonSociale) {
          reply.code(400).send({
            error: 'Validation échouée',
            message: 'La raison sociale est requise pour un client B2B',
          });
          return;
        }

        if (body.type === 'b2c' && (!body.nom || !body.prenom)) {
          reply.code(400).send({
            error: 'Validation échouée',
            message: 'Le nom et prénom sont requis pour un client B2C',
          });
          return;
        }

        // Créer le client
        const client = await prisma.clientFinal.create({
          data: {
            tenantId,
            type: body.type,
            raisonSociale: body.raisonSociale,
            nom: body.nom,
            prenom: body.prenom,
            email: body.email,
            telephone: body.telephone,
            adresse: body.adresse,
            tags: body.tags,
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

        reply.code(201).send({
          success: true,
          data: {
            client,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation échouée',
            message: error.errors.map((e) => e.message).join(', '),
          });
          return;
        }

        fastify.log.error(error, 'Erreur lors de la création du client');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: 'Impossible de créer le client',
        });
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
          reply.code(401).send({
            error: 'Non authentifié',
            message: 'Tenant ID manquant',
          });
          return;
        }

        // Vérifier que le client existe et appartient au tenant
        const existingClient = await prisma.clientFinal.findFirst({
          where: {
            id: params.id,
            tenantId,
          },
        });

        if (!existingClient) {
          reply.code(404).send({
            error: 'Client introuvable',
            message: 'Ce client n\'existe pas ou n\'appartient pas à votre entreprise',
          });
          return;
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
            reply.code(409).send({
              error: 'Email existant',
              message: 'Un client avec cet email existe déjà',
            });
            return;
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
          reply.code(400).send({
            error: 'Validation échouée',
            message: error.errors.map((e) => e.message).join(', '),
          });
          return;
        }

        fastify.log.error(error, 'Erreur lors de la mise à jour du client');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: 'Impossible de mettre à jour le client',
        });
      }
    }
  );

  // DELETE /api/clients/:id - Supprime un client (soft delete)
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const params = paramsSchema.parse(request.params);

        if (!tenantId) {
          reply.code(401).send({
            error: 'Non authentifié',
            message: 'Tenant ID manquant',
          });
          return;
        }

        // Vérifier que le client existe et appartient au tenant
        const existingClient = await prisma.clientFinal.findFirst({
          where: {
            id: params.id,
            tenantId,
          },
        });

        if (!existingClient) {
          reply.code(404).send({
            error: 'Client introuvable',
            message: 'Ce client n\'existe pas ou n\'appartient pas à votre entreprise',
          });
          return;
        }

        // Soft delete : mettre le statut à 'inactif'
        const deletedClient = await prisma.clientFinal.update({
          where: {
            id: params.id,
          },
          data: {
            statut: 'inactif',
          },
        });

        // Émettre événement pour n8n (client.deleted)
        await eventService.emit(
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

        reply.code(200).send({
          success: true,
          message: 'Client supprimé avec succès',
          data: {
            client: deletedClient,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation échouée',
            message: error.errors.map((e) => e.message).join(', '),
          });
          return;
        }

        fastify.log.error(error, 'Erreur lors de la suppression du client');
        reply.code(500).send({
          error: 'Erreur serveur',
          message: 'Impossible de supprimer le client',
        });
      }
    }
  );
}

