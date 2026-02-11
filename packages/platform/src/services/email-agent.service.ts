/**
 * Service email pour l'agent IA : lecture IMAP, envoi SMTP.
 * Config : base (TenantAgentConfig) ou variables d'environnement.
 */

import { env } from '../config/env.js';
import type { EmailConfig } from './agent-config.service.js';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';

const INBOX = 'INBOX';
const DEFAULT_LIMIT = 20;

export function isEmailReadConfigured(config?: EmailConfig): boolean {
  const host = config?.imapHost ?? env.IMAP_HOST;
  const user = config?.imapUser ?? env.IMAP_USER;
  const pass = config?.imapPassword ?? env.IMAP_PASSWORD;
  return !!(host && user && pass);
}

export function isEmailSendConfigured(config?: EmailConfig): boolean {
  const host = config?.smtpHost ?? env.SMTP_HOST;
  const user = config?.smtpUser ?? env.SMTP_USER;
  const pass = config?.smtpPassword ?? env.SMTP_PASSWORD;
  return !!(host && user && pass);
}

function getImapClient(config?: EmailConfig): ImapFlow {
  if (!isEmailReadConfigured(config)) {
    throw new Error('Email (lecture) non configuré. Renseignez IMAP dans Paramètres > Assistant IA.');
  }
  const host = (config?.imapHost ?? env.IMAP_HOST)!;
  const port = config?.imapPort ?? env.IMAP_PORT ?? 993;
  const secure = config?.imapTls ?? (env.IMAP_TLS !== false);
  const user = (config?.imapUser ?? env.IMAP_USER)!;
  const pass = (config?.imapPassword ?? env.IMAP_PASSWORD)!;
  return new ImapFlow({
    host,
    port: Number(port),
    secure,
    auth: { user, pass },
    logger: false,
  });
}

export interface EmailListItem {
  uid: number;
  subject: string;
  from: string;
  to?: string;
  date: string;
  seen?: boolean;
}

export async function listEmails(
  folder: string = INBOX,
  limit: number = DEFAULT_LIMIT,
  config?: EmailConfig
): Promise<{ error?: string; count?: number; emails?: EmailListItem[] }> {
  const client = getImapClient(config);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      const status = await client.status(folder, { messages: true });
      const total = status.messages ?? 0;
      if (total === 0) {
        return { count: 0, emails: [] };
      }
      const fromSeq = Math.max(1, total - limit + 1);
      const range = `${fromSeq}:*`;
      const messages = await client.fetchAll(range, {
        envelope: true,
        uid: true,
        flags: true,
      });
      const list: EmailListItem[] = messages.map((msg) => ({
        uid: msg.uid,
        subject: msg.envelope?.subject ?? '',
        from: msg.envelope?.from?.[0]?.address ?? msg.envelope?.from?.[0]?.name ?? '',
        to: msg.envelope?.to?.[0]?.address,
        date: msg.envelope?.date?.toISOString?.() ?? '',
        seen: msg.flags?.has('\\Seen') ?? false,
      }));
      list.reverse();
      return { count: list.length, emails: list };
    } finally {
      lock.release();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }
}

export interface EmailDetail {
  uid: number;
  subject: string;
  from: string;
  to?: string;
  date: string;
  text?: string;
  html?: string;
}

export async function getEmail(
  uid: number,
  folder: string = INBOX,
  config?: EmailConfig
): Promise<{ error?: string; email?: EmailDetail }> {
  const client = getImapClient(config);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      const msg = await client.fetchOne(String(uid), {
        envelope: true,
        uid: true,
        source: true,
      }, { uid: true });
      if (!msg || !msg.envelope) {
        return { error: 'Message non trouvé' };
      }
      let text: string | undefined;
      let html: string | undefined;
      if (msg.source) {
        const raw = msg.source.toString('utf-8');
        const bodyMatch = raw.match(/\r?\n\r?\n([\s\S]*)/);
        const body = bodyMatch?.[1] ?? raw;
        const envelopeAny = msg.envelope as Record<string, unknown>;
        const contentType = String(envelopeAny['content-type'] ?? '').toLowerCase();
        if (contentType.includes('text/html')) {
          html = body;
        } else {
          text = body;
        }
      }
      const detail: EmailDetail = {
        uid: msg.uid,
        subject: msg.envelope.subject ?? '',
        from: msg.envelope.from?.[0]?.address ?? msg.envelope.from?.[0]?.name ?? '',
        to: msg.envelope.to?.[0]?.address,
        date: msg.envelope.date?.toISOString?.() ?? '',
        text,
        html,
      };
      return { email: detail };
    } finally {
      lock.release();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }
}

export async function sendEmail(
  params: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    replyTo?: string;
  },
  config?: EmailConfig
): Promise<{ error?: string; success?: boolean }> {
  if (!isEmailSendConfigured(config)) {
    return { error: 'Email (envoi) non configuré. Renseignez SMTP dans Paramètres > Assistant IA.' };
  }
  const from = (config?.smtpFrom ?? env.SMTP_FROM ?? config?.imapUser ?? env.IMAP_USER ?? config?.smtpUser ?? env.SMTP_USER) as string;
  const transporter = nodemailer.createTransport({
    host: (config?.smtpHost ?? env.SMTP_HOST)!,
    port: Number(config?.smtpPort ?? env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: (config?.smtpUser ?? env.SMTP_USER)!,
      pass: (config?.smtpPassword ?? env.SMTP_PASSWORD)!,
    },
  });
  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text ?? undefined,
      html: params.html ?? undefined,
      replyTo: params.replyTo ?? undefined,
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}
