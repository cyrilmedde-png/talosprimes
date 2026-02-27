import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticateUser, generateAccessToken, verifyRefreshToken } from '../../services/auth.service.js';
import type { JWTPayload } from '../../services/auth.service.js';
import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/api-errors.js';

// Schema de validation pour le login
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères'),
});

// Schema de validation pour le refresh token
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requis'),
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

}

