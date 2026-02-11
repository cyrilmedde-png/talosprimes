/**
 * Service email pour l'agent IA : lecture IMAP, envoi SMTP.
 * Optionnel : si les variables d'environnement ne sont pas définies, les fonctions retournent une erreur explicite.
 */

import { env } from '../config/env.js';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';

const INBOX = 'INBOX';
const DEFAULT_LIMIT = 20;

export function isEmailReadConfigured(): boolean {
  return !!(env.IMAP_HOST && env.IMAP_USER && env.IMAP_PASSWORD);
}

export function isEmailSendConfigured(): boolean {
  return !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
}

function getImapClient(): ImapFlow {
  if (!isEmailReadConfigured()) {
    throw new Error('Email (lecture) non configuré : définir IMAP_HOST, IMAP_USER, IMAP_PASSWORD dans .env');
  }
  return new ImapFlow({
    host: env.IMAP_HOST!,
    port: env.IMAP_PORT ?? 993,
    secure: env.IMAP_TLS !== false,
    auth: {
      user: env.IMAP_USER!,
      pass: env.IMAP_PASSWORD!,
    },
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
  limit: number = DEFAULT_LIMIT
): Promise<{ error?: string; count?: number; emails?: EmailListItem[] }> {
  const client = getImapClient();
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
  folder: string = INBOX
): Promise<{ error?: string; email?: EmailDetail }> {
  const client = getImapClient();
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

export async function sendEmail(params: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}): Promise<{ error?: string; success?: boolean }> {
  if (!isEmailSendConfigured()) {
    return { error: 'Email (envoi) non configuré : définir SMTP_HOST, SMTP_USER, SMTP_PASSWORD (et optionnellement SMTP_FROM) dans .env' };
  }
  const from = env.SMTP_FROM || env.IMAP_USER || env.SMTP_USER;
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
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
