import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { chatAgent } from '../../services/agent.service.js';
import { getAgentConfigForDisplay, saveAgentConfig } from '../../services/agent-config.service.js';
import { ApiError } from '../../utils/api-errors.js';

/** Répertoire temporaire pour les fichiers uploadés par l'agent */
const AGENT_UPLOADS_DIR = join(process.cwd(), 'agent-uploads');

/** Map des fichiers uploadés: fileId → { path, filename, contentType, tenantId } */
const uploadedFiles = new Map<string, { path: string; filename: string; contentType: string; tenantId: string; uploadedAt: number }>();

/** Nettoyage automatique des fichiers de plus d'1 heure */
setInterval(() => {
  const now = Date.now();
  for (const [id, file] of uploadedFiles.entries()) {
    if (now - file.uploadedAt > 3600_000) {
      unlink(file.path).catch(() => {});
      uploadedFiles.delete(id);
    }
  }
}, 600_000); // toutes les 10 minutes

/** Récupérer un fichier uploadé (accessible depuis agent.service.ts) */
export function getUploadedFile(fileId: string, tenantId: string) {
  const file = uploadedFiles.get(fileId);
  if (!file || file.tenantId !== tenantId) return null;
  return file;
}

const chatBodySchema = z.object({
  message: z.string().min(1, 'Le message ne peut pas être vide').max(8000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
  /** IDs des fichiers uploadés via /api/agent/upload à joindre si l'agent envoie un email */
  fileIds: z.array(z.string()).optional().default([]),
  /** Requis lorsque l'appel vient de n8n (header X-TalosPrimes-N8N-Secret). Optionnel avec JWT (tenantId issu du token). */
  tenantId: z.string().uuid().optional(),
});

const configPutSchema = z.object({
  email: z
    .object({
      imapHost: z.string().optional(),
      imapPort: z.number().optional(),
      imapUser: z.string().optional(),
      imapPassword: z.string().optional(),
      imapTls: z.boolean().optional(),
      smtpHost: z.string().optional(),
      smtpPort: z.number().optional(),
      smtpUser: z.string().optional(),
      smtpPassword: z.string().optional(),
      smtpFrom: z.string().email().optional().or(z.literal('')),
    })
    .optional(),
  qonto: z
    .object({
      apiSecret: z.string().optional(),
      bankAccountId: z.string().optional(),
    })
    .optional(),
});

export async function agentRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/agent/upload — Upload de fichiers pour pièces jointes email
   * Accepte un body JSON avec les fichiers encodés en base64
   * { files: [{ filename: string, contentType: string, base64: string }] }
   */
  fastify.post(
    '/upload',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        if (!tenantId) return ApiError.unauthorized(reply);

        const body = request.body as { files?: Array<{ filename: string; contentType?: string; base64: string }> };
        if (!body?.files || !Array.isArray(body.files) || body.files.length === 0) {
          return ApiError.badRequest(reply, 'Aucun fichier reçu. Format: { files: [{ filename, base64 }] }');
        }

        if (body.files.length > 5) {
          return ApiError.badRequest(reply, '5 fichiers maximum par upload');
        }

        await mkdir(AGENT_UPLOADS_DIR, { recursive: true });
        const uploaded: Array<{ fileId: string; filename: string; size: number }> = [];

        for (const file of body.files) {
          if (!file.filename || !file.base64) continue;

          const buffer = Buffer.from(file.base64, 'base64');
          if (buffer.length > 10 * 1024 * 1024) {
            return ApiError.badRequest(reply, `Fichier ${file.filename} trop volumineux (max 10 Mo)`);
          }

          const fileId = randomUUID();
          const ext = file.filename.includes('.') ? file.filename.substring(file.filename.lastIndexOf('.')) : '';
          const safeName = `${fileId}${ext}`;
          const filePath = join(AGENT_UPLOADS_DIR, safeName);
          await writeFile(filePath, buffer);

          uploadedFiles.set(fileId, {
            path: filePath,
            filename: file.filename,
            contentType: file.contentType || 'application/octet-stream',
            tenantId,
            uploadedAt: Date.now(),
          });

          uploaded.push({ fileId, filename: file.filename, size: buffer.length });
        }

        if (uploaded.length === 0) {
          return ApiError.badRequest(reply, 'Aucun fichier valide reçu');
        }

        return reply.code(200).send({ success: true, files: uploaded });
      } catch (err) {
        fastify.log.error(err, 'Erreur agent upload');
        return ApiError.internal(reply);
      }
    }
  );

  /**
   * GET /api/agent/config — Config de l'agent (secrets masqués) pour l'onglet Paramètres
   */
  fastify.get(
    '/config',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        if (!tenantId) {
          return ApiError.unauthorized(reply);
        }
        const config = await getAgentConfigForDisplay(tenantId);
        return reply.code(200).send({ success: true, data: config });
      } catch (err) {
        fastify.log.error(err, 'Erreur GET agent config');
        return ApiError.internal(reply);
      }
    }
  );

  /**
   * PUT /api/agent/config — Enregistrer la config (email, qonto) depuis Paramètres
   */
  fastify.put(
    '/config',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        if (!tenantId) {
          return ApiError.unauthorized(reply);
        }
        const parse = configPutSchema.safeParse(request.body);
        if (!parse.success) {
          return ApiError.validation(reply, parse.error);
        }
        const patch = parse.data;
        if (patch.email && typeof patch.email.smtpFrom === 'string' && patch.email.smtpFrom === '') {
          patch.email.smtpFrom = undefined;
        }
        await saveAgentConfig(tenantId, patch);
        const config = await getAgentConfigForDisplay(tenantId);
        return reply.code(200).send({ success: true, data: config });
      } catch (err) {
        fastify.log.error(err, 'Erreur PUT agent config');
        return ApiError.internal(reply);
      }
    }
  );

  /**
   * POST /api/agent/chat
   * Envoie un message au Super Agent (outils: leads, clients, factures, emails, agenda, Qonto).
   * Auth: JWT (tenantId/user du token) OU n8n (X-TalosPrimes-N8N-Secret + tenantId dans le body).
   */
  fastify.post(
    '/chat',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const parseResult = chatBodySchema.safeParse(request.body);
        if (!parseResult.success) {
          return ApiError.validation(reply, parseResult.error);
        }

        const { message, history, fileIds, tenantId: bodyTenantId } = parseResult.data;

        let tenantId: string;
        let userRole: string;

        if (request.isN8nRequest) {
          tenantId = bodyTenantId ?? request.tenantId ?? '';
          if (!tenantId) {
            return ApiError.badRequest(reply, 'tenantId requis dans le body pour les appels depuis n8n');
          }
          userRole = 'admin';
        } else {
          tenantId = request.tenantId ?? '';
          const user = request.user;
          if (!tenantId || !user) {
            return ApiError.unauthorized(reply, 'Token invalide ou expiré');
          }
          userRole = user.role;
        }

        const result = await chatAgent({
          message,
          history,
          tenantId,
          userRole,
          fileIds: fileIds.length > 0 ? fileIds : undefined,
        });

        return reply.code(200).send({
          success: result.success,
          reply: result.reply,
          ...(result.error && { error: result.error }),
        });
      } catch (err) {
        fastify.log.error(err, 'Erreur agent chat');
        return ApiError.internal(reply);
      }
    }
  );
}
