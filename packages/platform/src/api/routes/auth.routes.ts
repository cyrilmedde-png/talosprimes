import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticateUser, generateAccessToken, verifyRefreshToken } from '../../services/auth.service.js';
import type { JWTPayload } from '../../services/auth.service.js';

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
          },
        });
      } catch (error) {
        // Gestion des erreurs
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation échouée',
            message: error.errors.map((e) => e.message).join(', '),
          });
          return;
        }

        const message = error instanceof Error ? error.message : 'Erreur d\'authentification';
        reply.code(401).send({
          error: 'Authentification échouée',
          message,
        });
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
          reply.code(400).send({
            error: 'Validation échouée',
            message: error.errors.map((e) => e.message).join(', '),
          });
          return;
        }

        const message = error instanceof Error ? error.message : 'Token invalide';
        reply.code(401).send({
          error: 'Refresh token invalide',
          message,
        });
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

      reply.code(200).send({
        success: true,
        data: {
          user: {
            id: user.userId,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
          },
        },
      });
    }
  );
}

