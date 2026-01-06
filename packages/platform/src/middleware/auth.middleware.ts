import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, type JWTPayload } from '../services/auth.service.js';

// Extension du type FastifyRequest pour inclure user
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
    tenantId?: string;
  }
}

/**
 * Middleware d'authentification JWT
 * Vérifie le token et injecte les infos utilisateur dans req.user
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Récupérer le token depuis le header Authorization
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({
        error: 'Non authentifié',
        message: 'Token manquant. Utilisez le format: Authorization: Bearer <token>',
      });
      return;
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    // Vérifier et décoder le token
    const payload = verifyAccessToken(token);

    // Injecter les infos utilisateur dans la requête
    request.user = payload;
    request.tenantId = payload.tenantId;

    // Continuer vers la route suivante
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token invalide';
    reply.code(401).send({
      error: 'Non authentifié',
      message,
    });
  }
}

/**
 * Middleware pour vérifier les rôles
 * Utilisez après authMiddleware
 */
export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      reply.code(401).send({
        error: 'Non authentifié',
        message: 'Authentification requise',
      });
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      reply.code(403).send({
        error: 'Accès refusé',
        message: `Rôle requis: ${allowedRoles.join(' ou ')}`,
      });
      return;
    }
  };
}

