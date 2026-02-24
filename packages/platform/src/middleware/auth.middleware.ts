import type { FastifyRequest, FastifyReply } from 'fastify';
import { createHmac, timingSafeEqual } from 'crypto';
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
 * Regex UUID v4 pour valider le format du tenantId.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Middleware d'authentification dual : accepte soit un JWT Bearer,
 * soit le header X-TalosPrimes-N8N-Secret pour les appels internes n8n.
 *
 * Quand c'est un appel n8n :
 *  - request.isN8nRequest = true
 *  - request.tenantId est récupéré depuis le query param ?tenantId= ou le body.tenantId
 *  - Le tenantId DOIT être un UUID v4 valide (protection contre injection)
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

    const rawTenantId =
      query?.tenantId ||
      (body && typeof body === 'object' ? (body as Record<string, string>).tenantId : undefined) ||
      undefined;

    // Valider que le tenantId est un UUID v4 valide (prévient injection & erreurs)
    if (rawTenantId && !UUID_REGEX.test(rawTenantId)) {
      reply.code(400).send({
        error: 'Requête invalide',
        message: 'tenantId fourni par n8n n\'est pas un UUID valide',
      });
      return;
    }

    request.tenantId = rawTenantId;

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
// Middleware de vérification HMAC pour webhooks externes
// ─────────────────────────────────────────────────────────────────

/**
 * Middleware de vérification de signature Stripe (HMAC-SHA256).
 * Vérifie le header `Stripe-Signature` avec le secret STRIPE_WEBHOOK_SECRET.
 * Requiert que rawBody soit disponible sur la requête (configurer Fastify rawBody).
 *
 * Usage : fastify.post('/stripe-webhook', { preHandler: [stripeWebhookMiddleware] }, handler)
 */
export async function stripeWebhookMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    reply.code(500).send({
      error: 'Configuration manquante',
      message: 'STRIPE_WEBHOOK_SECRET non configuré',
    });
    return;
  }

  const sigHeader = request.headers['stripe-signature'];
  if (!sigHeader || typeof sigHeader !== 'string') {
    reply.code(401).send({
      error: 'Signature manquante',
      message: 'Header Stripe-Signature requis',
    });
    return;
  }

  // Extraire timestamp et signature du header Stripe
  const elements = sigHeader.split(',');
  const timestampEl = elements.find((e: string) => e.startsWith('t='));
  const signatureEl = elements.find((e: string) => e.startsWith('v1='));

  if (!timestampEl || !signatureEl) {
    reply.code(401).send({
      error: 'Signature invalide',
      message: 'Format Stripe-Signature invalide',
    });
    return;
  }

  const timestamp = timestampEl.substring(2);
  const expectedSignature = signatureEl.substring(3);

  // Vérifier que le timestamp n'est pas trop ancien (5 min max)
  const tolerance = 300; // 5 minutes en secondes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > tolerance) {
    reply.code(401).send({
      error: 'Signature expirée',
      message: 'Le timestamp de la signature est trop ancien',
    });
    return;
  }

  // Calculer la signature attendue : HMAC-SHA256(secret, timestamp.rawBody)
  const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;
  if (!rawBody) {
    reply.code(400).send({
      error: 'Corps manquant',
      message: 'rawBody requis pour la vérification Stripe',
    });
    return;
  }

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const computedSignature = createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  // Comparaison à temps constant
  const expected = Buffer.from(expectedSignature, 'utf8');
  const computed = Buffer.from(computedSignature, 'utf8');

  if (expected.length !== computed.length || !timingSafeEqual(expected, computed)) {
    reply.code(401).send({
      error: 'Signature invalide',
      message: 'La signature Stripe ne correspond pas',
    });
    return;
  }
}

/**
 * Middleware de vérification de signature Twilio (HMAC-SHA1).
 * Vérifie le header `X-Twilio-Signature` pour les webhooks entrants.
 *
 * Usage : fastify.post('/twilio-webhook', { preHandler: [twilioWebhookMiddleware] }, handler)
 *
 * Note: Nécessite TWILIO_AUTH_TOKEN dans les env vars.
 */
export async function twilioWebhookMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    // En dev, on peut laisser passer sans vérification avec un warning
    if (env.NODE_ENV === 'development') {
      request.log.warn('TWILIO_AUTH_TOKEN non configuré - vérification Twilio désactivée en dev');
      return;
    }
    reply.code(500).send({
      error: 'Configuration manquante',
      message: 'TWILIO_AUTH_TOKEN non configuré',
    });
    return;
  }

  const twilioSignature = request.headers['x-twilio-signature'];
  if (!twilioSignature || typeof twilioSignature !== 'string') {
    reply.code(401).send({
      error: 'Signature manquante',
      message: 'Header X-Twilio-Signature requis',
    });
    return;
  }

  // Construire l'URL complète de la requête
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const host = request.headers.host || '';
  const url = `${protocol}://${host}${request.url}`;

  // Construire la chaîne à signer : URL + paramètres POST triés
  let dataToSign = url;
  if (request.body && typeof request.body === 'object') {
    const params = request.body as Record<string, string>;
    const sortedKeys = Object.keys(params).sort();
    for (const key of sortedKeys) {
      dataToSign += key + params[key];
    }
  }

  // Calculer HMAC-SHA1
  const computedSignature = createHmac('sha1', authToken)
    .update(dataToSign, 'utf8')
    .digest('base64');

  // Comparaison à temps constant
  const expected = Buffer.from(twilioSignature, 'utf8');
  const computed = Buffer.from(computedSignature, 'utf8');

  if (expected.length !== computed.length || !timingSafeEqual(expected, computed)) {
    reply.code(401).send({
      error: 'Signature invalide',
      message: 'La signature Twilio ne correspond pas',
    });
    return;
  }
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

// ─────────────────────────────────────────────────────────────────
// Middleware de blocage en mode démo
// ─────────────────────────────────────────────────────────────────

const DEMO_TENANT_ID = 'de000000-0000-0000-0000-000000000001';

/**
 * Middleware qui bloque les requêtes DELETE et les modifications sensibles
 * pour le tenant démo. Les requêtes GET/POST de lecture restent autorisées.
 */
export async function demoGuardMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const tenantId = request.tenantId || request.user?.tenantId;
  if (tenantId !== DEMO_TENANT_ID) return; // Pas en mode démo, on laisse passer

  const method = request.method.toUpperCase();

  // Bloquer toutes les suppressions
  if (method === 'DELETE') {
    reply.code(403).send({
      error: 'Action non disponible en mode démo',
      message: 'Les suppressions sont désactivées en mode démonstration.',
    });
    return;
  }

  // Bloquer les modifications de paramètres entreprise (PUT/PATCH sur /settings ou /tenant)
  const url = request.url.toLowerCase();
  if ((method === 'PUT' || method === 'PATCH') && (url.includes('/settings') || url.includes('/tenant'))) {
    reply.code(403).send({
      error: 'Action non disponible en mode démo',
      message: 'La modification des paramètres est désactivée en mode démonstration.',
    });
    return;
  }
}
