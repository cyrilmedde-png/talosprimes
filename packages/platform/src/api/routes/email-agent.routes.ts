import type { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '../../config/database.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-errors.js';
import { sendEmail } from '../../services/email-agent.service.js';
import { getAgentConfigForTenant } from '../../services/agent-config.service.js';

// ============================================
// Routes pour l'Agent IA Email
// - Emails entrants (logs)
// - File d'attente (queue humaine)
// - Règles de tri
// - Stats / Analytics
// ============================================

// Helper : envoi d'email avec retry (max 3 tentatives, backoff exponentiel)
async function sendEmailWithRetry(
  payload: { to: string; subject: string; html?: string; text?: string },
  emailConfig: any,
  maxRetries = 3
): Promise<{ success?: boolean; error?: string }> {
  let lastError = '';
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await sendEmail(payload, emailConfig);
    if (result.success || !result.error) return result;
    lastError = result.error;
    if (attempt < maxRetries) {
      // Backoff exponentiel : 1s, 2s, 4s
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }
  return { error: `Échec après ${maxRetries} tentatives : ${lastError}` };
}

export async function emailAgentRoutes(fastify: FastifyInstance) {

  // ──────────────────────────────────────────
  // EMAILS ENTRANTS
  // ──────────────────────────────────────────

  // GET /api/email-agent/logs — Liste des emails entrants
  fastify.get(
    '/api/email-agent/logs',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: any, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const { action, category, priority, limit = '50', offset = '0', search } = request.query as Record<string, string>;

      try {
        let where = `WHERE tenant_id = $1::uuid`;
        const params: unknown[] = [tenantId];
        let paramIdx = 2;

        if (action) {
          where += ` AND action = $${paramIdx}`;
          params.push(action);
          paramIdx++;
        }
        if (category) {
          where += ` AND classification->>'category' = $${paramIdx}`;
          params.push(category);
          paramIdx++;
        }
        if (priority) {
          where += ` AND classification->>'priority' = $${paramIdx}`;
          params.push(priority);
          paramIdx++;
        }
        if (search) {
          where += ` AND (subject ILIKE $${paramIdx} OR from_address ILIKE $${paramIdx})`;
          params.push(`%${search}%`);
          paramIdx++;
        }

        const countResult = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int as count FROM email_incoming_logs ${where}`, ...params
        ) as [{ count: number }];

        params.push(parseInt(limit as string) || 50);
        params.push(parseInt(offset as string) || 0);

        const rows = await prisma.$queryRawUnsafe(
          `SELECT id, email_id, from_address, to_address, subject, body_preview,
                  classification, action, reply_subject, reply_body, reply_confidence,
                  reply_action, reply_sent_at, tokens_used, created_at
           FROM email_incoming_logs ${where}
           ORDER BY created_at DESC
           LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
          ...params
        );

        return reply.send({
          success: true,
          data: rows,
          total: Number(countResult[0]?.count || 0),
        });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // GET /api/email-agent/logs/:id — Détail d'un email
  fastify.get(
    '/api/email-agent/logs/:id',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: any, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);
      const { id } = request.params as { id: string };

      try {
        const rows = await prisma.$queryRawUnsafe(
          `SELECT * FROM email_incoming_logs WHERE id = $1::uuid AND tenant_id = $2::uuid LIMIT 1`,
          id, tenantId
        ) as Record<string, unknown>[];
        if (!rows.length) return ApiError.notFound(reply, 'Email non trouvé');
        return reply.send({ success: true, data: rows[0] });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // ──────────────────────────────────────────
  // FILE D'ATTENTE (Queue humaine)
  // ──────────────────────────────────────────

  // GET /api/email-agent/queue — Emails en attente de validation
  fastify.get(
    '/api/email-agent/queue',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: any, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      try {
        const rows = await prisma.$queryRawUnsafe(
          `SELECT id, email_id, from_address, to_address, subject, body_preview,
                  classification, reply_subject, reply_body, reply_confidence,
                  reply_action, created_at
           FROM email_incoming_logs
           WHERE tenant_id = $1::uuid
             AND reply_action = 'queue_human'
             AND reply_sent_at IS NULL
           ORDER BY created_at DESC`,
          tenantId
        );
        return reply.send({ success: true, data: rows });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/email-agent/queue/:id/approve — Approuver et envoyer la réponse IA
  fastify.post(
    '/api/email-agent/queue/:id/approve',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: any, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);
      const { id } = request.params as { id: string };
      const { editedReply, editedSubject } = (request.body as { editedReply?: string; editedSubject?: string }) || {};

      try {
        // Récupérer l'email en attente
        const rows = await prisma.$queryRawUnsafe(
          `SELECT * FROM email_incoming_logs WHERE id = $1::uuid AND tenant_id = $2::uuid AND reply_action = 'queue_human' AND reply_sent_at IS NULL LIMIT 1`,
          id, tenantId
        ) as Record<string, unknown>[];
        if (!rows.length) return ApiError.notFound(reply, 'Email non trouvé ou déjà traité');

        const email = rows[0];
        const finalBody = editedReply || (email.reply_html as string) || (email.reply_body as string);
        const finalSubject = editedSubject || (email.reply_subject as string) || `Re: ${email.subject as string}`;
        const recipientAddress = email.from_address as string;

        if (!recipientAddress) {
          return reply.code(400).send({ success: false, error: 'Adresse destinataire manquante' });
        }

        // Récupérer la config email du tenant pour SMTP
        const agentConfig = await getAgentConfigForTenant(tenantId);

        // Envoyer l'email via SMTP (avec retry)
        const sendResult = await sendEmailWithRetry(
          {
            to: recipientAddress,
            subject: finalSubject,
            html: finalBody,
            text: finalBody?.replace(/<[^>]*>/g, '') || '',
          },
          agentConfig.email
        );

        if (sendResult.error) {
          fastify.log.error(`Échec envoi email approuvé ${id}: ${sendResult.error}`);
          return reply.code(500).send({
            success: false,
            error: `Échec de l'envoi : ${sendResult.error}`,
          });
        }

        // Mettre à jour le statut seulement si l'envoi a réussi
        await prisma.$queryRawUnsafe(
          `UPDATE email_incoming_logs
           SET reply_action = 'sent_approved',
               reply_body = $3,
               reply_subject = $4,
               reply_sent_at = NOW(),
               action = 'approved'
           WHERE id = $1::uuid AND tenant_id = $2::uuid`,
          id, tenantId, finalBody, finalSubject
        );

        return reply.send({ success: true, message: 'Réponse approuvée et envoyée avec succès' });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/email-agent/queue/:id/reject — Rejeter la réponse IA
  fastify.post(
    '/api/email-agent/queue/:id/reject',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: any, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);
      const { id } = request.params as { id: string };

      try {
        await prisma.$queryRawUnsafe(
          `UPDATE email_incoming_logs
           SET reply_action = 'rejected',
               reply_sent_at = NOW(),
               action = 'rejected'
           WHERE id = $1::uuid AND tenant_id = $2::uuid AND reply_action = 'queue_human'`,
          id, tenantId
        );
        return reply.send({ success: true, message: 'Réponse rejetée' });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // ──────────────────────────────────────────
  // ACTIONS EN MASSE (Bulk)
  // ──────────────────────────────────────────

  // POST /api/email-agent/queue/bulk-approve — Approuver plusieurs emails
  fastify.post(
    '/api/email-agent/queue/bulk-approve',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: any, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);
      const { ids } = request.body as { ids: string[] };

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return reply.code(400).send({ success: false, error: 'Liste d\'IDs requise' });
      }

      try {
        const agentConfig = await getAgentConfigForTenant(tenantId);
        const results: { id: string; status: 'sent' | 'failed'; error?: string }[] = [];

        for (const id of ids) {
          try {
            const rows = await prisma.$queryRawUnsafe(
              `SELECT * FROM email_incoming_logs WHERE id = $1::uuid AND tenant_id = $2::uuid AND reply_action = 'queue_human' AND reply_sent_at IS NULL LIMIT 1`,
              id, tenantId
            ) as Record<string, unknown>[];

            if (!rows.length) {
              results.push({ id, status: 'failed', error: 'Non trouvé ou déjà traité' });
              continue;
            }

            const email = rows[0];
            const body = (email.reply_html as string) || (email.reply_body as string);
            const subj = (email.reply_subject as string) || `Re: ${email.subject as string}`;
            const recipient = email.from_address as string;

            if (!recipient || !body) {
              results.push({ id, status: 'failed', error: 'Données manquantes' });
              continue;
            }

            const sendResult = await sendEmailWithRetry(
              { to: recipient, subject: subj, html: body, text: body.replace(/<[^>]*>/g, '') },
              agentConfig.email
            );

            if (sendResult.error) {
              results.push({ id, status: 'failed', error: sendResult.error });
              continue;
            }

            await prisma.$queryRawUnsafe(
              `UPDATE email_incoming_logs
               SET reply_action = 'sent_approved', reply_sent_at = NOW(), action = 'approved'
               WHERE id = $1::uuid AND tenant_id = $2::uuid`,
              id, tenantId
            );
            results.push({ id, status: 'sent' });
          } catch (err) {
            results.push({ id, status: 'failed', error: 'Erreur interne' });
          }
        }

        const sent = results.filter(r => r.status === 'sent').length;
        const failed = results.filter(r => r.status === 'failed').length;

        return reply.send({
          success: true,
          message: `${sent} envoyé(s), ${failed} échoué(s)`,
          data: results,
        });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/email-agent/queue/bulk-reject — Rejeter plusieurs emails
  fastify.post(
    '/api/email-agent/queue/bulk-reject',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: any, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);
      const { ids } = request.body as { ids: string[] };

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return reply.code(400).send({ success: false, error: 'Liste d\'IDs requise' });
      }

      try {
        // Utiliser une seule requête pour rejeter en masse
        const placeholders = ids.map((_, i) => `$${i + 2}::uuid`).join(', ');
        await prisma.$queryRawUnsafe(
          `UPDATE email_incoming_logs
           SET reply_action = 'rejected', reply_sent_at = NOW(), action = 'rejected'
           WHERE tenant_id = $1::uuid
             AND reply_action = 'queue_human'
             AND reply_sent_at IS NULL
             AND id IN (${placeholders})`,
          tenantId,
          ...ids
        );

        return reply.send({ success: true, message: `${ids.length} email(s) rejeté(s)` });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // ──────────────────────────────────────────
  // RÈGLES EMAIL
  // ──────────────────────────────────────────

  // GET /api/email-agent/rules — Lister les règles
  fastify.get(
    '/api/email-agent/rules',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: any, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      try {
        const rows = await prisma.$queryRawUnsafe(
          `SELECT id, nom, description, type_rule, conditions, action_type, action_config, priorite, actif, created_at
           FROM email_ai_rules
           WHERE tenant_id = $1::uuid
           ORDER BY priorite ASC, created_at DESC`,
          tenantId
        );
        return reply.send({ success: true, data: rows });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/email-agent/rules — Créer une règle
  fastify.post(
    '/api/email-agent/rules',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: any, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      const { nom, description, type_rule, conditions, action_type, action_config, priorite } =
        request.body as Record<string, unknown>;

      try {
        const rows = await prisma.$queryRawUnsafe(
          `INSERT INTO email_ai_rules (tenant_id, nom, description, type_rule, conditions, action_type, action_config, priorite)
           VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8)
           RETURNING *`,
          tenantId, nom, description || '', type_rule || 'static',
          JSON.stringify(conditions || {}), action_type || 'queue_human',
          JSON.stringify(action_config || {}), priorite || 10
        );
        return reply.code(201).send({ success: true, data: (rows as unknown[])[0] });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // PUT /api/email-agent/rules/:id — Modifier une règle
  fastify.put(
    '/api/email-agent/rules/:id',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: any, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);
      const { id } = request.params as { id: string };
      const { nom, description, type_rule, conditions, action_type, action_config, priorite, actif } =
        request.body as Record<string, unknown>;

      try {
        await prisma.$queryRawUnsafe(
          `UPDATE email_ai_rules
           SET nom = COALESCE($3, nom),
               description = COALESCE($4, description),
               type_rule = COALESCE($5, type_rule),
               conditions = COALESCE($6::jsonb, conditions),
               action_type = COALESCE($7, action_type),
               action_config = COALESCE($8::jsonb, action_config),
               priorite = COALESCE($9, priorite),
               actif = COALESCE($10, actif)
           WHERE id = $1::uuid AND tenant_id = $2::uuid`,
          id, tenantId, nom, description, type_rule,
          conditions ? JSON.stringify(conditions) : null,
          action_type,
          action_config ? JSON.stringify(action_config) : null,
          priorite, actif
        );
        return reply.send({ success: true, message: 'Règle mise à jour' });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // DELETE /api/email-agent/rules/:id — Supprimer une règle
  fastify.delete(
    '/api/email-agent/rules/:id',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: any, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);
      const { id } = request.params as { id: string };

      try {
        await prisma.$queryRawUnsafe(
          `DELETE FROM email_ai_rules WHERE id = $1::uuid AND tenant_id = $2::uuid`,
          id, tenantId
        );
        return reply.send({ success: true, message: 'Règle supprimée' });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // ──────────────────────────────────────────
  // STATISTIQUES
  // ──────────────────────────────────────────

  // ──────────────────────────────────────────
  // INGESTION (appelé par n8n ou webhook)
  // ──────────────────────────────────────────

  // POST /api/email-agent/ingest — Recevoir et logger un email entrant depuis n8n
  fastify.post(
    '/api/email-agent/ingest',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: any, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      // Accepter les deux formats : snake_case (n8n orchestrateur) et camelCase (agent IA)
      const b = request.body as Record<string, unknown>;
      const email_id = b.email_id ?? b.emailId ?? null;
      const from_address = b.from_address ?? b.fromAddress ?? '';
      const to_address = b.to_address ?? b.toAddress ?? '';
      const subject = b.subject ?? '(sans objet)';
      const body_preview = b.body_preview ?? b.bodyPreview ?? '';
      const classification = b.classification ?? {};
      const action = b.action ?? 'classified';
      const reply_subject = b.reply_subject ?? b.replySubject ?? null;
      const reply_body = b.reply_body ?? b.replyBody ?? null;
      const reply_html = b.reply_html ?? b.replyHtml ?? null;
      const reply_confidence = b.reply_confidence ?? b.replyConfidence ?? null;
      const reply_action = b.reply_action ?? b.replyAction ?? 'queue_human';
      const tokens_used = b.tokens_used ?? b.tokensUsed ?? null;

      try {
        const rows = await prisma.$queryRawUnsafe(
          `INSERT INTO email_incoming_logs
           (tenant_id, email_id, from_address, to_address, subject, body_preview,
            classification, action, reply_subject, reply_body, reply_html,
            reply_confidence, reply_action, tokens_used)
           VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14)
           RETURNING id, reply_action`,
          tenantId,
          email_id || null,
          from_address || '',
          to_address || '',
          subject || '(sans objet)',
          body_preview || '',
          classification ? JSON.stringify(classification) : '{}',
          action || 'classified',
          reply_subject || null,
          reply_body || null,
          reply_html || null,
          reply_confidence != null ? Number(reply_confidence) : null,
          reply_action || 'queue_human',
          tokens_used != null ? Number(tokens_used) : null,
        );

        const inserted = (rows as Record<string, unknown>[])[0];

        // Si reply_action === 'sent_auto' et que la confiance est suffisante, envoyer directement
        if (reply_action === 'sent_auto' && from_address && (reply_body || reply_html)) {
          const agentConfig = await getAgentConfigForTenant(tenantId);
          const sendResult = await sendEmailWithRetry(
            {
              to: from_address as string,
              subject: (reply_subject as string) || `Re: ${subject as string}`,
              html: (reply_html as string) || (reply_body as string),
              text: ((reply_body as string) || '').replace(/<[^>]*>/g, ''),
            },
            agentConfig.email
          );

          if (sendResult.success) {
            await prisma.$queryRawUnsafe(
              `UPDATE email_incoming_logs SET reply_sent_at = NOW(), action = 'auto_replied' WHERE id = $1::uuid`,
              inserted?.id
            );
          } else {
            fastify.log.warn(`Auto-reply failed for ${inserted?.id}: ${sendResult.error}`);
            // Fallback : mettre en queue humaine
            await prisma.$queryRawUnsafe(
              `UPDATE email_incoming_logs SET reply_action = 'queue_human', action = 'auto_reply_failed' WHERE id = $1::uuid`,
              inserted?.id
            );
          }
        }

        return reply.code(201).send({ success: true, data: inserted });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // GET /api/email-agent/config-check — Vérifier si SMTP/IMAP est configuré
  fastify.get(
    '/api/email-agent/config-check',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: any, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      try {
        const agentConfig = await getAgentConfigForTenant(tenantId);
        const smtpReady = !!(
          (agentConfig.email?.smtpHost) &&
          (agentConfig.email?.smtpUser) &&
          (agentConfig.email?.smtpPassword)
        );
        const imapReady = !!(
          (agentConfig.email?.imapHost) &&
          (agentConfig.email?.imapUser) &&
          (agentConfig.email?.imapPassword)
        );

        return reply.send({
          success: true,
          data: {
            smtpConfigured: smtpReady,
            imapConfigured: imapReady,
            smtpHost: agentConfig.email?.smtpHost || null,
            imapHost: agentConfig.email?.imapHost || null,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // ──────────────────────────────────────────
  // STATISTIQUES
  // ──────────────────────────────────────────

  // GET /api/email-agent/stats — Stats globales email
  fastify.get(
    '/api/email-agent/stats',
    { preHandler: [n8nOrAuthMiddleware] },
    async (request: any, reply: FastifyReply) => {
      const tenantId = request.tenantId;
      if (!tenantId) return ApiError.unauthorized(reply);

      try {
        const [totals, byAction, byCategory, byDay, avgConfidence] = await Promise.all([
          // Total emails
          prisma.$queryRawUnsafe(
            `SELECT
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE reply_action = 'queue_human' AND reply_sent_at IS NULL)::int as queue,
              COUNT(*) FILTER (WHERE reply_action = 'sent_auto')::int as auto,
              COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int as today
             FROM email_incoming_logs WHERE tenant_id = $1::uuid`,
            tenantId
          ) as Promise<[{ total: number; queue: number; auto: number; today: number }]>,
          // Par action
          prisma.$queryRawUnsafe(
            `SELECT action, COUNT(*)::int as count
             FROM email_incoming_logs WHERE tenant_id = $1::uuid
             GROUP BY action ORDER BY count DESC`,
            tenantId
          ),
          // Par catégorie
          prisma.$queryRawUnsafe(
            `SELECT classification->>'category' as category, COUNT(*)::int as count
             FROM email_incoming_logs WHERE tenant_id = $1::uuid AND classification IS NOT NULL
             GROUP BY classification->>'category' ORDER BY count DESC`,
            tenantId
          ),
          // Par jour (14 derniers jours)
          prisma.$queryRawUnsafe(
            `SELECT DATE(created_at) as day, COUNT(*)::int as count,
                    COUNT(*) FILTER (WHERE reply_action = 'sent_auto')::int as auto_count
             FROM email_incoming_logs WHERE tenant_id = $1::uuid AND created_at >= CURRENT_DATE - 14
             GROUP BY DATE(created_at) ORDER BY day DESC`,
            tenantId
          ),
          // Confiance moyenne
          prisma.$queryRawUnsafe(
            `SELECT AVG(reply_confidence) as avg
             FROM email_incoming_logs WHERE tenant_id = $1::uuid AND reply_confidence IS NOT NULL`,
            tenantId
          ) as Promise<[{ avg: number | null }]>,
        ]);

        const t = (totals as any)[0];
        return reply.send({
          success: true,
          data: {
            total: Number(t?.total || 0),
            queue: Number(t?.queue || 0),
            autoReplied: Number(t?.auto || 0),
            today: Number(t?.today || 0),
            avgConfidence: (avgConfidence as any)[0]?.avg ? Math.round(Number((avgConfidence as any)[0].avg) * 100) : 0,
            byAction,
            byCategory,
            byDay,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );
}
