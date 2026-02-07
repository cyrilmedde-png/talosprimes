import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../config/database.js';
import { z } from 'zod';
import { hashPassword } from '../../services/auth.service.js';
import type { UserRole } from '@talosprimes/shared';

// Schéma de validation pour la création d'un utilisateur
const createUserSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  role: z.enum(['admin', 'collaborateur', 'lecture_seule']).default('collaborateur'),
  nom: z.string().optional().nullable(),
  prenom: z.string().optional().nullable(),
  telephone: z.string().optional().nullable(),
  fonction: z.string().optional().nullable(),
  salaire: z.number().positive().optional().nullable(),
  dateEmbauche: z.string().datetime().optional().nullable(),
});

// Schéma de validation pour la mise à jour d'un utilisateur
const updateUserSchema = z.object({
  email: z.string().email('Email invalide').optional(),
  role: z.enum(['admin', 'collaborateur', 'lecture_seule']).optional(),
  nom: z.string().optional().nullable(),
  prenom: z.string().optional().nullable(),
  telephone: z.string().optional().nullable(),
  fonction: z.string().optional().nullable(),
  salaire: z.number().positive().optional().nullable(),
  dateEmbauche: z.string().datetime().optional().nullable(),
  statut: z.enum(['actif', 'inactif']).optional(),
});

export async function usersRoutes(fastify: FastifyInstance) {
  // Lister les utilisateurs du tenant (nécessite authentification)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;

      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          error: 'Non authentifié',
        });
      }

      const users = await prisma.user.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        success: true,
        data: {
          users: users.map((user) => ({
            id: user.id,
            email: user.email,
            role: user.role,
            nom: user.nom || null,
            prenom: user.prenom || null,
            telephone: user.telephone || null,
            fonction: user.fonction || null,
            salaire: user.salaire ? Number(user.salaire) : null,
            dateEmbauche: user.dateEmbauche?.toISOString() || null,
            statut: user.statut,
            lastLoginAt: user.lastLoginAt?.toISOString() || null,
            createdAt: user.createdAt.toISOString(),
          })),
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération des utilisateurs',
      });
    }
  });

  // Créer un utilisateur (nécessite authentification admin)
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;

      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          error: 'Non authentifié',
        });
      }

      // Vérifier que l'utilisateur est admin ou super_admin
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({
          success: false,
          error: 'Accès refusé',
        });
      }

      // Valider les données
      const validationResult = createUserSchema.safeParse(request.body);
      
      if (!validationResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Données invalides',
          details: validationResult.error.errors,
        });
      }

      const data = validationResult.data;

      // Vérifier si l'email existe déjà pour ce tenant
      const existingUser = await prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email: data.email,
          },
        },
      });

      if (existingUser) {
        return reply.status(409).send({
          success: false,
          error: 'Un utilisateur avec cet email existe déjà',
        });
      }

      // Hasher le mot de passe
      const passwordHash = await hashPassword(data.password);

      // Créer l'utilisateur
      const userData: {
        tenantId: string;
        email: string;
        passwordHash: string;
        role: string;
        nom?: string | null;
        prenom?: string | null;
        telephone?: string | null;
        fonction?: string | null;
        salaire?: number | null;
        dateEmbauche?: Date | null;
      } = {
        tenantId,
        email: data.email,
        passwordHash,
        role: data.role as UserRole,
        statut: 'actif',
      };
      
      if (data.nom) userData.nom = data.nom;
      if (data.prenom) userData.prenom = data.prenom;
      if (data.telephone) userData.telephone = data.telephone;
      if (data.fonction) userData.fonction = data.fonction;
      if (data.salaire) userData.salaire = data.salaire;
      if (data.dateEmbauche) userData.dateEmbauche = new Date(data.dateEmbauche);

      const user = await prisma.user.create({
        data: userData,
      });

      return reply.status(201).send({
        success: true,
        message: 'Utilisateur créé avec succès',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            nom: user.nom || null,
            prenom: user.prenom || null,
            telephone: user.telephone || null,
            fonction: user.fonction || null,
            salaire: user.salaire ? Number(user.salaire) : null,
            dateEmbauche: user.dateEmbauche?.toISOString() || null,
            statut: user.statut,
            createdAt: user.createdAt.toISOString(),
          },
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erreur lors de la création de l\'utilisateur',
      });
    }
  });

  // Mettre à jour un utilisateur (nécessite authentification admin)
  fastify.put('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const params = request.params as { id: string };

      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          error: 'Non authentifié',
        });
      }

      // Vérifier que l'utilisateur est admin ou super_admin
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({
          success: false,
          error: 'Accès refusé',
        });
      }

      // Valider les données
      const validationResult = updateUserSchema.safeParse(request.body);
      
      if (!validationResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Données invalides',
          details: validationResult.error.errors,
        });
      }

      const data = validationResult.data;

      // Vérifier que l'utilisateur existe et appartient au tenant
      const existingUser = await prisma.user.findFirst({
        where: {
          id: params.id,
          tenantId,
        },
      });

      if (!existingUser) {
        return reply.status(404).send({
          success: false,
          error: 'Utilisateur non trouvé',
        });
      }

      // Mettre à jour l'utilisateur
      const updateData: {
        email?: string;
        role?: string;
        nom?: string | null;
        prenom?: string | null;
        telephone?: string | null;
        fonction?: string | null;
        salaire?: number | null;
        dateEmbauche?: Date | null;
        statut?: string;
      } = {};
      
      if (data.email) updateData.email = data.email;
      if (data.role) updateData.role = data.role as UserRole;
      if (data.statut) updateData.statut = data.statut as 'actif' | 'inactif';
      if (data.nom !== undefined) updateData.nom = data.nom;
      if (data.prenom !== undefined) updateData.prenom = data.prenom;
      if (data.telephone !== undefined) updateData.telephone = data.telephone;
      if (data.fonction !== undefined) updateData.fonction = data.fonction;
      if (data.salaire !== undefined) updateData.salaire = data.salaire ? data.salaire : null;
      if (data.dateEmbauche !== undefined) updateData.dateEmbauche = data.dateEmbauche ? new Date(data.dateEmbauche) : null;

      const user = await prisma.user.update({
        where: { id: params.id },
        data: updateData,
      });

      return reply.send({
        success: true,
        message: 'Utilisateur mis à jour',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            nom: user.nom || null,
            prenom: user.prenom || null,
            telephone: user.telephone || null,
            fonction: user.fonction || null,
            salaire: user.salaire ? Number(user.salaire) : null,
            dateEmbauche: user.dateEmbauche?.toISOString() || null,
            statut: user.statut,
            createdAt: user.createdAt.toISOString(),
          },
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erreur lors de la mise à jour de l\'utilisateur',
      });
    }
  });

  // Supprimer un utilisateur (nécessite authentification admin)
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const params = request.params as { id: string };

      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          error: 'Non authentifié',
        });
      }

      // Vérifier que l'utilisateur est admin ou super_admin
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({
          success: false,
          error: 'Accès refusé',
        });
      }

      // Vérifier que l'utilisateur existe et appartient au tenant
      const existingUser = await prisma.user.findFirst({
        where: {
          id: params.id,
          tenantId,
        },
      });

      if (!existingUser) {
        return reply.status(404).send({
          success: false,
          error: 'Utilisateur non trouvé',
        });
      }

      // Ne pas permettre la suppression de soi-même (si l'ID utilisateur est disponible)
      // Note: request.user pourrait ne pas avoir l'ID, donc on vérifie seulement si c'est le même email
      if (existingUser.email === (request.user as { email?: string })?.email) {
        return reply.status(400).send({
          success: false,
          error: 'Vous ne pouvez pas supprimer votre propre compte',
        });
      }

      // Supprimer l'utilisateur
      await prisma.user.delete({
        where: { id: params.id },
      });

      return reply.send({
        success: true,
        message: 'Utilisateur supprimé',
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erreur lors de la suppression de l\'utilisateur',
      });
    }
  });
}

