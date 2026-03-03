import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  authenticateUser,
  generateAccessToken,
  verifyRefreshToken,
  hashPassword,
  verifyPassword,
  generateResetToken,
  verifyResetToken,
} from '../../services/auth.service.js';
import type { JWTPayload } from '../../services/auth.service.js';
import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/api-errors.js';
import { N8nService } from '../../services/n8n.service.js';

// Schema de validation pour le login
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères'),
});

// Schema de validation pour le refresh token
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requis'),
});

// Schema de validation pour le changement de mot de passe
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit faire au moins 8 caractères'),
});

// Schema de validation pour la demande de réinitialisation
const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
});

// Schema de validation pour la réinitialisation
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit faire au moins 8 caractères'),
});

/**
 * Routes d'authentification
 */
export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/login (rate limit strict : anti brute-force)
  fastify.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Valider les données
        const body = loginSchema.parse(request.body);

        // Authentifier l'utilisateur
        const { user, tokens } = await authenticateUser(body.email, body.password);

        // Récupérer les modules actifs du tenant (depuis la subscription)
        let modulesActifs: string[] = [];
        try {
          const sub = await prisma.subscription.findUnique({
            where: { tenantId: user.tenantId },
            select: { modulesActives: true },
          });
          modulesActifs = sub?.modulesActives ?? [];
        } catch (_) { /* pas de subscription → tous modules par défaut */ }

        // Si aucun module activé (pas de subscription), activer tout par défaut
        if (modulesActifs.length === 0) {
          modulesActifs = [
            'clients', 'leads', 'facturation', 'devis', 'bons_commande',
            'avoirs', 'proformas', 'comptabilite', 'agent_telephonique',
            'articles', 'logs', 'notifications',
            'gestion_equipe', 'gestion_projet', 'btp', 'gestion_rh',
          ];
        }

        // Retourner les tokens et les infos utilisateur
        reply.code(200).send({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
              tenantId: user.tenantId,
            },
            tokens,
            modulesActifs,
          },
        });
      } catch (error) {
        // Gestion des erreurs
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }

        const message = error instanceof Error ? error.message : 'Erreur d\'authentification';
        return ApiError.unauthorized(reply, message);
      }
    }
  );

  // POST /api/auth/refresh (rate limit modéré)
  fastify.post(
    '/refresh',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Valider les données
        const body = refreshTokenSchema.parse(request.body);

        // Vérifier le refresh token
        const payload = verifyRefreshToken(body.refreshToken);

        // Générer un nouveau access token
        const newAccessToken = generateAccessToken(payload);

        reply.code(200).send({
          success: true,
          data: {
            accessToken: newAccessToken,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }

        const message = error instanceof Error ? error.message : 'Token invalide';
        return ApiError.unauthorized(reply, message);
      }
    }
  );

  // GET /api/auth/me (route protégée)
  fastify.get(
    '/me',
    {
      preHandler: [fastify.authenticate], // Middleware d'auth (à configurer)
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // req.user est injecté par le middleware auth
      const user = request.user as JWTPayload;

      // Récupérer les modules actifs du tenant
      let modulesActifs: string[] = [];
      try {
        const sub = await prisma.subscription.findUnique({
          where: { tenantId: user.tenantId },
          select: { modulesActives: true },
        });
        modulesActifs = sub?.modulesActives ?? [];
      } catch (_) { /* pas de subscription */ }

      if (modulesActifs.length === 0) {
        modulesActifs = [
          'clients', 'leads', 'facturation', 'devis', 'bons_commande',
          'avoirs', 'proformas', 'comptabilite', 'agent_telephonique',
          'articles', 'logs', 'notifications',
          'gestion_equipe', 'gestion_projet', 'btp', 'gestion_rh',
        ];
      }

      reply.code(200).send({
        success: true,
        data: {
          user: {
            id: user.userId,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
          },
          modulesActifs,
        },
      });
    }
  );

  // POST /api/auth/change-password (authentifié)
  fastify.post(
    '/change-password',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = changePasswordSchema.parse(request.body);
        const user = request.user as JWTPayload;

        // Récupérer le user en base
        const dbUser = await prisma.user.findUnique({
          where: { id: user.userId },
          select: { passwordHash: true },
        });

        if (!dbUser) {
          return ApiError.notFound(reply, 'Utilisateur non trouvé');
        }

        // Vérifier le mot de passe actuel
        const isValid = await verifyPassword(body.currentPassword, dbUser.passwordHash);
        if (!isValid) {
          return ApiError.unauthorized(reply, 'Mot de passe actuel incorrect');
        }

        // Hash et mise à jour
        const newHash = await hashPassword(body.newPassword);
        await prisma.user.update({
          where: { id: user.userId },
          data: { passwordHash: newHash, mustChangePassword: false },
        });

        reply.code(200).send({
          success: true,
          message: 'Mot de passe modifié avec succès',
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }
        const message = error instanceof Error ? error.message : 'Erreur lors du changement de mot de passe';
        return ApiError.internal(reply, message);
      }
    }
  );

  // POST /api/auth/forgot-password (public, rate limité)
  fastify.post(
    '/forgot-password',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = forgotPasswordSchema.parse(request.body);

        // Chercher le user (sans révéler s'il existe)
        const user = await prisma.user.findFirst({
          where: { email: body.email },
          select: { id: true, email: true, tenantId: true, statut: true },
        });

        if (user && user.statut === 'actif') {
          // Générer le reset token
          const resetToken = generateResetToken(user.id, user.email);

          // Appeler n8n pour envoyer l'email
          const n8nService = new N8nService();
          try {
            await n8nService.callWorkflowReturn(user.tenantId, 'password_reset_request', {
              email: user.email,
              userId: user.id,
              tenantId: user.tenantId,
              resetToken,
            });
          } catch (err) {
            // Log l'erreur mais ne pas bloquer la réponse (sécurité)
            console.error('Erreur envoi email reset:', err);
          }
        }

        // Toujours retourner succès (ne pas révéler si l'email existe)
        reply.code(200).send({
          success: true,
          message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }
        const message = error instanceof Error ? error.message : 'Erreur';
        return ApiError.internal(reply, message);
      }
    }
  );

  // POST /api/auth/reset-password (public)
  fastify.post(
    '/reset-password',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = resetPasswordSchema.parse(request.body);

        // Vérifier le token
        const { userId } = verifyResetToken(body.token);

        // Hash et mise à jour
        const newHash = await hashPassword(body.newPassword);
        await prisma.user.update({
          where: { id: userId },
          data: { passwordHash: newHash, mustChangePassword: false },
        });

        reply.code(200).send({
          success: true,
          message: 'Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.',
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }
        const message = error instanceof Error ? error.message : 'Erreur lors de la réinitialisation';
        return ApiError.unauthorized(reply, message);
      }
    }
  );

}

