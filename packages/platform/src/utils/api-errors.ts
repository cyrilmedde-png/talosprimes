/**
 * Utilitaires de réponses d'erreur API standardisées.
 *
 * Format uniforme pour toutes les erreurs :
 * {
 *   success: false,
 *   error: "Titre court de l'erreur",
 *   message: "Description détaillée (optionnel)",
 *   details: [...] // Uniquement pour les erreurs de validation
 * }
 *
 * Usage dans une route :
 *   import { ApiError } from '../../utils/api-errors.js';
 *   return ApiError.unauthorized(reply, 'Token expiré');
 */

import type { FastifyReply } from 'fastify';
import { ZodError } from 'zod';

interface ErrorBody {
  success: false;
  error: string;
  message?: string;
  details?: unknown[];
}

function send(reply: FastifyReply, statusCode: number, body: ErrorBody): FastifyReply {
  return reply.status(statusCode).send(body);
}

export const ApiError = {
  // ── 400 ────────────────────────────────────────────────────────────
  badRequest(reply: FastifyReply, message: string): FastifyReply {
    return send(reply, 400, { success: false, error: 'Requête invalide', message });
  },

  validation(reply: FastifyReply, zodError: ZodError): FastifyReply {
    const messages = zodError.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    return send(reply, 400, {
      success: false,
      error: 'Validation échouée',
      message: messages,
      details: zodError.errors,
    });
  },

  // ── 401 ────────────────────────────────────────────────────────────
  unauthorized(reply: FastifyReply, message = 'Authentification requise'): FastifyReply {
    return send(reply, 401, { success: false, error: 'Non authentifié', message });
  },

  // ── 403 ────────────────────────────────────────────────────────────
  forbidden(reply: FastifyReply, message = 'Accès refusé'): FastifyReply {
    return send(reply, 403, { success: false, error: 'Accès refusé', message });
  },

  // ── 404 ────────────────────────────────────────────────────────────
  notFound(reply: FastifyReply, entity = 'Ressource'): FastifyReply {
    return send(reply, 404, {
      success: false,
      error: `${entity} non trouvé(e)`,
    });
  },

  // ── 409 ────────────────────────────────────────────────────────────
  conflict(reply: FastifyReply, message: string): FastifyReply {
    return send(reply, 409, { success: false, error: 'Conflit', message });
  },

  // ── 500 ────────────────────────────────────────────────────────────
  internal(reply: FastifyReply, message = 'Erreur interne du serveur'): FastifyReply {
    return send(reply, 500, { success: false, error: 'Erreur serveur', message });
  },
} as const;
