import type { FastifyRequest, FastifyReply } from 'fastify';
import { timingSafeEqual } from 'crypto';
import { verifyAccessToken, type JWTPayload } from '../services/auth.service.js';
import { env } from '../config/env.js';

// Extension du type FastifyRequest pour inclure user et n8n flag
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
    tenantId?: string;
    isN8nRequest?: boolean;
  }
}

// ─────────────────────────────────────────────────────────────────
// Utilitaires n8n (centralisés ici, plus de duplication dans les routes)
// ─────────────────────────────────────────────────────────────────

/**
 * Vérifie si la requête provient de n8n via le header X-TalosPrimes-N8N-Secret.
 * Utilise une comparaison à temps constant (timingSafeEqual) pour prévenir
 * les attaques par timing sur le secret.
 */
export function isN8nInternalRequest(request: FastifyRequest): boolean {
  const secret = env.N8N_WEBHOOK_SECRET;
  if (!secret) return false;

  const header = request.headers['x-talosprimes-n8n-secret'];
  const provided = typeof header === 'string' ? header : '';

  if (!provided || provided.length !== secret.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(provided, 'utf8'),
      Buffer.from(secret, 'utf8'),
    );
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// Middleware JWT strict (inchangé – pour les routes frontend-only)
// ─────────────────────────────────────────────────────────────────

/**
 * Middleware d'authentification JWT strict.
 * Vérifie le token Bearer et injecte les infos utilisateur dans req.user.
 * À utiliser pour les routes accessibles UNIQUEMENT via le frontend.
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({
        error: 'Non authentifié',
        message: 'Token manquant. Utilisez le format: Authorization: Bearer <token>',
      });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    request.user = payload;
    request.tenantId = payload.tenantId;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token invalide';
    reply.code(401).send({
      error: 'Non authentifié',
      message,
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// Middleware Dual Auth (n8n secret OU JWT) – NOUVEAU
// ─────────────────────────────────────────────────────────────────

/**
 * Middleware d'authentification dual : accepte soit un JWT Bearer,
 * soit le header X-TalosPrimes-N8N-Secret pour les appels internes n8n.
 *
 * Quand c'est un appel n8n :
 *  - request.isN8nRequest = true
 *  - request.tenantId est récupéré depuis le query param ?tenantId= ou le body.tenantId
 *  - request.user reste undefined (pas de JWT)
 *
 * Quand c'est un appel JWT classique :
 *  - request.isN8nRequest = false
 *  - request.user et request.tenantId sont remplis depuis le JWT
 */
export async function n8nOrAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // 1. Vérifier si c'est un appel n8n valide
  if (isN8nInternalRequest(request)) {
    request.isN8nRequest = true;

    // Récupérer le tenantId depuis query OU body (pour les requêtes GET et POST)
    const query = request.query as Record<string, string | undefined>;
    const body = request.body as Record<string, unknown> | null | undefined;

    request.tenantId =
      query?.tenantId ||
      (body && typeof body === 'object' ? (body as Record<string, string>).tenantId : undefined) ||
      undefined;

    return; // Authentifié via n8n secret
  }

  // 2. Sinon, exiger un JWT classique
  request.isN8nRequest = false;
  await authMiddleware(request, reply);
}

// ─────────────────────────────────────────────────────────────────
// Middleware n8n-only (pour routes exclusivement internes)
// ─────────────────────────────────────────────────────────────────

/**
 * Middleware qui n'accepte QUE le secret n8n.
 * Pour les routes internes comme create-credentials, get-credentials.
 */
export async function n8nOnlyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!isN8nInternalRequest(request)) {
    reply.code(401).send({
      error: 'Non autorisé',
      message: 'Cette route est réservée aux appels internes n8n',
    });
    return;
  }
  request.isN8nRequest = true;
}

// ─────────────────────────────────────────────────────────────────
// Middleware de vérification des rôles (inchangé)
// ─────────────────────────────────────────────────────────────────

/**
 * Middleware pour vérifier les rôles.
 * Utilisez après authMiddleware ou n8nOrAuthMiddleware.
 * Les requêtes n8n passent automatiquement (elles ont déjà été authentifiées).
 */
export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Les requêtes n8n authentifiées passent sans vérification de rôle
    if (request.isN8nRequest) return;

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
