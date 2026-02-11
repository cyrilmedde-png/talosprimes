/**
 * Configuration de l'agent IA par tenant (emails, Qonto).
 * Stockée en base (TenantAgentConfig), avec repli sur les variables d'environnement.
 */

import { env } from '../config/env.js';
import { prisma } from '../config/database.js';

export interface EmailConfig {
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapPassword?: string;
  imapTls?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom?: string;
}

export interface QontoConfig {
  apiSecret?: string;
  bankAccountId?: string;
}

export interface AgentConfig {
  email?: EmailConfig;
  qonto?: QontoConfig;
}

type AgentConfigRow = { config: AgentConfig };

/** Retourne la config fusionnée (DB puis env) pour un tenant. Utilisée par l'agent à l'exécution. */
export async function getAgentConfigForTenant(tenantId: string): Promise<AgentConfig> {
  const row = await prisma.tenantAgentConfig.findUnique({
    where: { tenantId },
    select: { config: true },
  });
  const db = (row?.config as AgentConfig) ?? {};
  return {
    email: {
      imapHost: db.email?.imapHost ?? env.IMAP_HOST ?? undefined,
      imapPort: db.email?.imapPort ?? env.IMAP_PORT ?? undefined,
      imapUser: db.email?.imapUser ?? env.IMAP_USER ?? undefined,
      imapPassword: db.email?.imapPassword ?? env.IMAP_PASSWORD ?? undefined,
      imapTls: db.email?.imapTls ?? (env.IMAP_TLS !== false),
      smtpHost: db.email?.smtpHost ?? env.SMTP_HOST ?? undefined,
      smtpPort: db.email?.smtpPort ?? env.SMTP_PORT ?? undefined,
      smtpUser: db.email?.smtpUser ?? env.SMTP_USER ?? undefined,
      smtpPassword: db.email?.smtpPassword ?? env.SMTP_PASSWORD ?? undefined,
      smtpFrom: db.email?.smtpFrom ?? env.SMTP_FROM ?? undefined,
    },
    qonto: {
      apiSecret: db.qonto?.apiSecret ?? env.QONTO_API_SECRET ?? undefined,
      bankAccountId: db.qonto?.bankAccountId ?? env.QONTO_BANK_ACCOUNT_ID ?? env.QONTO_ORG_ID ?? undefined,
    },
  };
}

/** Masque les secrets pour l'affichage (GET config). */
function maskSecret(s: string | undefined): string {
  if (!s || s.length === 0) return '';
  if (s.length <= 4) return '••••';
  return '••••' + s.slice(-4);
}

/** GET config pour l'UI : config avec secrets masqués + indicateurs configured. */
export async function getAgentConfigForDisplay(tenantId: string): Promise<{
  email: EmailConfig & { configuredRead: boolean; configuredSend: boolean };
  qonto: QontoConfig & { configured: boolean };
}> {
  const full = await getAgentConfigForTenant(tenantId);
  const email = full.email ?? {};
  const qonto = full.qonto ?? {};
  return {
    email: {
      ...email,
      imapPassword: email.imapPassword ? maskSecret(email.imapPassword) : undefined,
      smtpPassword: email.smtpPassword ? maskSecret(email.smtpPassword) : undefined,
      configuredRead: !!(email.imapHost && email.imapUser && email.imapPassword),
      configuredSend: !!(email.smtpHost && email.smtpUser && email.smtpPassword),
    },
    qonto: {
      ...qonto,
      apiSecret: qonto.apiSecret ? maskSecret(qonto.apiSecret) : undefined,
      configured: !!(qonto.apiSecret && (qonto.bankAccountId ?? env.QONTO_ORG_ID)),
    },
  };
}

/** Sauvegarde partielle de la config (PUT). Seules les clés envoyées sont mises à jour. */
export async function saveAgentConfig(
  tenantId: string,
  patch: { email?: Partial<EmailConfig>; qonto?: Partial<QontoConfig> }
): Promise<AgentConfig> {
  const existing = await prisma.tenantAgentConfig.findUnique({
    where: { tenantId },
  });
  const current = (existing?.config as AgentConfig) ?? {};
  const next: AgentConfig = {
    email: patch.email ? { ...current.email, ...patch.email } : current.email,
    qonto: patch.qonto ? { ...current.qonto, ...patch.qonto } : current.qonto,
  };
  await prisma.tenantAgentConfig.upsert({
    where: { tenantId },
    create: { tenantId, config: next as object },
    update: { config: next as object },
  });
  return next;
}
