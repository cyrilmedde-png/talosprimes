/**
 * Service RGPD / GDPR Compliance
 *
 * Gère :
 * - Consentement (Art. 7) : enregistrement et vérification
 * - Portabilité (Art. 20) : export des données personnelles en JSON
 * - Droit à l'oubli (Art. 17) : anonymisation des données personnelles
 * - Rétention : purge automatique des données expirées
 * - Chiffrement : encrypt/decrypt des credentials sensibles
 */

import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// ─── Types ──────────────────────────────────────────────────────────────

type ConsentType = 'donnees_personnelles' | 'communications' | 'cookies_analytics' | 'partage_tiers';

interface ConsentInput {
  tenantId: string;
  email: string;
  userId?: string;
  consentType: ConsentType;
  action: 'granted' | 'withdrawn';
  version?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ExportData {
  user: Record<string, unknown> | null;
  leads: Record<string, unknown>[];
  clients: Record<string, unknown>[];
  consents: Record<string, unknown>[];
  eventLogs: Record<string, unknown>[];
  callLogs: Record<string, unknown>[];
  smsLogs: Record<string, unknown>[];
  exportedAt: string;
  format: string;
}

// ─── Chiffrement AES-256-GCM ───────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer | null {
  const keyHex = env.RGPD_ENCRYPTION_KEY;
  if (!keyHex) return null;
  return Buffer.from(keyHex, 'hex');
}

/**
 * Chiffre une chaîne avec AES-256-GCM.
 * Retourne : iv:tag:ciphertext (base64)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) return plaintext; // Pas de clé → pas de chiffrement (mode dégradé)

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Déchiffre une chaîne chiffrée avec AES-256-GCM.
 * Si la chaîne n'est pas au format attendu, retourne tel quel (données pré-existantes non chiffrées).
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  if (!key) return ciphertext;

  const parts = ciphertext.split(':');
  if (parts.length !== 3) return ciphertext; // Pas chiffré (données legacy)

  try {
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const encrypted = Buffer.from(parts[2], 'base64');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  } catch {
    // Échec de déchiffrement → probablement des données legacy non chiffrées
    return ciphertext;
  }
}

// ─── Service RGPD ───────────────────────────────────────────────────────

export class RgpdService {

  // ── Consentement (Art. 7) ────────────────────────────────────────────

  /**
   * Enregistre un consentement (donné ou retiré).
   * Les consentements sont immuables : on ajoute toujours, on ne modifie jamais.
   */
  async recordConsent(input: ConsentInput): Promise<void> {
    await prisma.consentLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId || null,
        email: input.email,
        consentType: input.consentType,
        action: input.action,
        version: input.version || '1.0',
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
    });
  }

  /**
   * Vérifie si un email a un consentement actif pour un type donné.
   * Le dernier enregistrement fait foi.
   */
  async hasActiveConsent(email: string, consentType: ConsentType): Promise<boolean> {
    const latest = await prisma.consentLog.findFirst({
      where: { email, consentType },
      orderBy: { createdAt: 'desc' },
    });
    return latest?.action === 'granted';
  }

  /**
   * Récupère l'historique des consentements pour un email.
   */
  async getConsentHistory(email: string) {
    return prisma.consentLog.findMany({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Export des données (Art. 20 - Portabilité) ───────────────────────

  /**
   * Exporte toutes les données personnelles liées à un email.
   * Format JSON structuré et lisible.
   */
  async exportUserData(tenantId: string, email: string): Promise<ExportData> {
    const [user, leads, clients, consents, eventLogs, callLogs, smsLogs] = await Promise.all([
      // Données utilisateur
      prisma.user.findFirst({
        where: { tenantId, email },
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
          telephone: true,
          fonction: true,
          role: true,
          statut: true,
          createdAt: true,
          lastLoginAt: true,
        },
      }),

      // Leads associés à cet email
      prisma.lead.findMany({
        where: { tenantId, email },
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          statut: true,
          source: true,
          notes: true,
          dateContact: true,
          createdAt: true,
        },
      }),

      // Clients associés à cet email
      prisma.clientFinal.findMany({
        where: { tenantId, email },
        select: {
          id: true,
          type: true,
          raisonSociale: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          adresse: true,
          tags: true,
          statut: true,
          createdAt: true,
        },
      }),

      // Historique des consentements
      prisma.consentLog.findMany({
        where: { email },
        orderBy: { createdAt: 'desc' },
      }),

      // Logs d'événements liés
      prisma.eventLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),

      // Logs d'appels liés
      prisma.callLog.findMany({
        where: { tenantId, callerEmail: email },
        select: {
          id: true,
          callerPhone: true,
          callerName: true,
          callerEmail: true,
          duration: true,
          sentiment: true,
          createdAt: true,
        },
      }),

      // SMS liés
      prisma.smsLog.findMany({
        where: { tenantId },
        select: {
          id: true,
          fromNumber: true,
          toNumber: true,
          direction: true,
          createdAt: true,
        },
        take: 50,
      }),
    ]);

    return {
      user: user as Record<string, unknown> | null,
      leads: leads as unknown as Record<string, unknown>[],
      clients: clients as unknown as Record<string, unknown>[],
      consents: consents as unknown as Record<string, unknown>[],
      eventLogs: eventLogs as unknown as Record<string, unknown>[],
      callLogs: callLogs as unknown as Record<string, unknown>[],
      smsLogs: smsLogs as unknown as Record<string, unknown>[],
      exportedAt: new Date().toISOString(),
      format: 'RGPD Art. 20 — Export de portabilité',
    };
  }

  // ── Anonymisation (Art. 17 - Droit à l'oubli) ───────────────────────

  /**
   * Anonymise toutes les données personnelles d'un email.
   * Remplace les PII par des données anonymisées tout en gardant les relations intactes.
   */
  async anonymizeUserData(tenantId: string, email: string, adminUserId: string): Promise<{
    anonymizedUser: boolean;
    anonymizedLeads: number;
    anonymizedClients: number;
    anonymizedCallLogs: number;
  }> {
    const anonymizedEmail = `anonyme-${Date.now()}@supprime.rgpd`;
    const anonymizedPhone = '0000000000';
    const anonymizedName = '[ANONYMISÉ]';

    let anonymizedUser = false;
    let anonymizedLeads = 0;
    let anonymizedClients = 0;
    let anonymizedCallLogs = 0;

    // 1. Anonymiser l'utilisateur
    const user = await prisma.user.findFirst({ where: { tenantId, email } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          email: anonymizedEmail,
          nom: anonymizedName,
          prenom: anonymizedName,
          telephone: anonymizedPhone,
          fonction: null,
          salaire: null,
          statut: 'inactif',
        },
      });
      anonymizedUser = true;
    }

    // 2. Anonymiser les leads
    const leads = await prisma.lead.findMany({ where: { tenantId, email } });
    for (const lead of leads) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          nom: anonymizedName,
          prenom: anonymizedName,
          email: `anonyme-lead-${lead.id.slice(0, 8)}@supprime.rgpd`,
          telephone: anonymizedPhone,
          notes: null,
        },
      });
      anonymizedLeads++;
    }

    // 3. Anonymiser les clients
    const clients = await prisma.clientFinal.findMany({ where: { tenantId, email } });
    for (const client of clients) {
      await prisma.clientFinal.update({
        where: { id: client.id },
        data: {
          nom: anonymizedName,
          prenom: anonymizedName,
          email: `anonyme-client-${client.id.slice(0, 8)}@supprime.rgpd`,
          telephone: anonymizedPhone,
          adresse: null,
          raisonSociale: null,
        },
      });
      anonymizedClients++;
    }

    // 4. Anonymiser les call logs
    const callLogs = await prisma.callLog.findMany({ where: { tenantId, callerEmail: email } });
    for (const log of callLogs) {
      await prisma.callLog.update({
        where: { id: log.id },
        data: {
          callerName: anonymizedName,
          callerEmail: anonymizedEmail,
          callerPhone: anonymizedPhone,
          callerAddress: null,
          transcript: null,
          conversationLog: {},
          notes: null,
        },
      });
      anonymizedCallLogs++;
    }

    // 5. Enregistrer la demande RGPD
    await prisma.rgpdRequest.create({
      data: {
        tenantId,
        email,
        type: 'anonymize',
        status: 'completed',
        details: `Anonymisation complète : user=${anonymizedUser}, leads=${anonymizedLeads}, clients=${anonymizedClients}, callLogs=${anonymizedCallLogs}`,
        completedAt: new Date(),
        completedBy: adminUserId,
      },
    });

    logger.info({ tenantId, email: '***', anonymizedUser, anonymizedLeads, anonymizedClients, anonymizedCallLogs },
      'RGPD: Anonymisation terminée');

    return { anonymizedUser, anonymizedLeads, anonymizedClients, anonymizedCallLogs };
  }

  // ── Rétention automatique ────────────────────────────────────────────

  /**
   * Purge les données expirées selon la politique de rétention.
   * À appeler périodiquement (cron ou n8n scheduled).
   */
  async purgeExpiredData(): Promise<{
    eventLogsPurged: number;
    softDeletesPurged: number;
  }> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Purger les EventLogs > 1 an
    const eventLogResult = await prisma.eventLog.deleteMany({
      where: { createdAt: { lt: oneYearAgo } },
    });

    // 2. Purger les soft-deletes > 30 jours (factures, devis, BC, avoirs, proformas)
    const [invoices, devis, bonsCommande, avoirs, proformas] = await Promise.all([
      prisma.invoice.deleteMany({ where: { deletedAt: { lt: thirtyDaysAgo, not: null } } }),
      prisma.devis.deleteMany({ where: { deletedAt: { lt: thirtyDaysAgo, not: null } } }),
      prisma.bonCommande.deleteMany({ where: { deletedAt: { lt: thirtyDaysAgo, not: null } } }),
      prisma.avoir.deleteMany({ where: { deletedAt: { lt: thirtyDaysAgo, not: null } } }),
      prisma.proforma.deleteMany({ where: { deletedAt: { lt: thirtyDaysAgo, not: null } } }),
    ]);

    const softDeletesPurged =
      invoices.count + devis.count + bonsCommande.count + avoirs.count + proformas.count;

    logger.info({ eventLogsPurged: eventLogResult.count, softDeletesPurged },
      'RGPD: Purge rétention terminée');

    return {
      eventLogsPurged: eventLogResult.count,
      softDeletesPurged,
    };
  }

  // ── Registre des sous-traitants ──────────────────────────────────────

  async getDataProcessors() {
    return prisma.dataProcessor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}

export const rgpdService = new RgpdService();
