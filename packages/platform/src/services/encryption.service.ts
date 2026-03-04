/**
 * Service de chiffrement post-conversation
 *
 * Chiffre les données sensibles des conversations Agent IA
 * une fois qu'elles sont terminées (timeout 15 min ou fin explicite).
 *
 * Double AES-256-GCM :
 *   Clé A : process.env.ENCRYPTION_KEY_A (.env app Next.js/Node)
 *   Clé B : process.env.ENCRYPTION_KEY_B (env Docker n8n)
 *
 * Les deux clés sont sur le même VPS IONOS mais dans des configs séparées :
 *   - Clé A → .env de l'app (packages/platform)
 *   - Clé B → docker-compose.yml de n8n (environment)
 * Compromettre l'un ne donne pas accès à l'autre.
 */

import { PrismaClient } from "@prisma/client";
import { encryptField, decryptField, decryptJsonField } from "../utils/crypto.js";

const prisma = new PrismaClient();

// ─── Récupération des clés ──────────────────────────────────

function getKeyA(): string {
  const key = process.env.ENCRYPTION_KEY_A;
  if (!key) throw new Error("ENCRYPTION_KEY_A manquante dans les variables d'environnement");
  return key;
}

function getKeyB(): string {
  const key = process.env.ENCRYPTION_KEY_B;
  if (!key) throw new Error("ENCRYPTION_KEY_B manquante dans les variables d'environnement");
  return key;
}

// ─── Chiffrement des CallLogs ───────────────────────────────

/**
 * Chiffre une conversation terminée (CallLog)
 * @returns true si chiffré avec succès, false si déjà chiffré ou erreur
 */
export async function encryptCallLog(callLogId: string): Promise<boolean> {
  const keyA = getKeyA();
  const keyB = getKeyB();

  const callLog = await prisma.callLog.findUnique({ where: { id: callLogId } });
  if (!callLog) throw new Error(`CallLog ${callLogId} introuvable`);
  if (callLog.isEncrypted) return false; // déjà chiffré

  const updateData: Record<string, unknown> = {
    isEncrypted: true,
    encryptedAt: new Date(),
  };

  // Chiffrer conversation_log (JSON → string → chiffré)
  if (callLog.conversationLog !== null) {
    updateData.conversationLog = encryptField(callLog.conversationLog, keyA, keyB);
  }

  // Chiffrer transcript
  if (callLog.transcript !== null) {
    updateData.transcript = encryptField(callLog.transcript, keyA, keyB);
  }

  // Chiffrer notes
  if (callLog.notes !== null) {
    updateData.notes = encryptField(callLog.notes, keyA, keyB);
  }

  // Chiffrer caller_name
  if (callLog.callerName !== null) {
    updateData.callerName = encryptField(callLog.callerName, keyA, keyB);
  }

  // Chiffrer caller_email
  if (callLog.callerEmail !== null) {
    updateData.callerEmail = encryptField(callLog.callerEmail, keyA, keyB);
  }

  // Chiffrer caller_address
  if (callLog.callerAddress !== null) {
    updateData.callerAddress = encryptField(callLog.callerAddress, keyA, keyB);
  }

  await prisma.callLog.update({
    where: { id: callLogId },
    data: updateData,
  });

  return true;
}

/**
 * Chiffre un SMS (SmsLog)
 */
export async function encryptSmsLog(smsLogId: string): Promise<boolean> {
  const keyA = getKeyA();
  const keyB = getKeyB();

  const smsLog = await prisma.smsLog.findUnique({ where: { id: smsLogId } });
  if (!smsLog) throw new Error(`SmsLog ${smsLogId} introuvable`);
  if (smsLog.isEncrypted) return false;

  await prisma.smsLog.update({
    where: { id: smsLogId },
    data: {
      body: encryptField(smsLog.body, keyA, keyB) ?? smsLog.body,
      isEncrypted: true,
      encryptedAt: new Date(),
    },
  });

  return true;
}

// ─── Chiffrement en masse (post-conversation) ──────────────

/**
 * Chiffre toutes les conversations terminées depuis plus de X minutes
 * Appelé par le workflow n8n (cron toutes les 15 min)
 * @param minutesAgo - Minutes d'inactivité avant chiffrement (défaut: 15)
 * @returns Nombre de conversations chiffrées
 */
export async function encryptCompletedConversations(minutesAgo = 15): Promise<{
  callLogsEncrypted: number;
  smsLogsEncrypted: number;
}> {
  const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000);

  // CallLogs terminés (status completed/failed/no-answer) et non chiffrés
  const callLogs = await prisma.callLog.findMany({
    where: {
      isEncrypted: false,
      status: { in: ["completed", "failed", "no-answer"] },
      updatedAt: { lt: cutoff },
    },
    select: { id: true },
  });

  let callLogsEncrypted = 0;
  for (const log of callLogs) {
    try {
      const success = await encryptCallLog(log.id);
      if (success) callLogsEncrypted++;
    } catch (err) {
      console.error(`Erreur chiffrement CallLog ${log.id}:`, err);
    }
  }

  // SmsLogs associés aux appels terminés et non chiffrés
  const smsLogs = await prisma.smsLog.findMany({
    where: {
      isEncrypted: false,
      createdAt: { lt: cutoff },
    },
    select: { id: true },
  });

  let smsLogsEncrypted = 0;
  for (const log of smsLogs) {
    try {
      const success = await encryptSmsLog(log.id);
      if (success) smsLogsEncrypted++;
    } catch (err) {
      console.error(`Erreur chiffrement SmsLog ${log.id}:`, err);
    }
  }

  return { callLogsEncrypted, smsLogsEncrypted };
}

// ─── Déchiffrement (lecture admin) ──────────────────────────

/**
 * Déchiffre un CallLog pour lecture (dashboard admin)
 * Retourne les données en clair sans modifier la base
 */
export async function decryptCallLog(callLogId: string): Promise<{
  conversationLog: unknown;
  transcript: string | null;
  notes: string | null;
  callerName: string | null;
  callerEmail: string | null;
  callerAddress: string | null;
} | null> {
  const callLog = await prisma.callLog.findUnique({ where: { id: callLogId } });
  if (!callLog) return null;
  if (!callLog.isEncrypted) {
    // Pas chiffré — retourner tel quel
    return {
      conversationLog: callLog.conversationLog,
      transcript: callLog.transcript,
      notes: callLog.notes,
      callerName: callLog.callerName,
      callerEmail: callLog.callerEmail,
      callerAddress: callLog.callerAddress,
    };
  }

  const keyA = getKeyA();
  const keyB = getKeyB();

  return {
    conversationLog: decryptJsonField(
      callLog.conversationLog as string | null,
      keyA,
      keyB
    ),
    transcript: decryptField(callLog.transcript, keyA, keyB),
    notes: decryptField(callLog.notes, keyA, keyB),
    callerName: decryptField(callLog.callerName, keyA, keyB),
    callerEmail: decryptField(callLog.callerEmail, keyA, keyB),
    callerAddress: decryptField(callLog.callerAddress, keyA, keyB),
  };
}

/**
 * Déchiffre un SmsLog pour lecture
 */
export async function decryptSmsLog(smsLogId: string): Promise<{
  body: string;
} | null> {
  const smsLog = await prisma.smsLog.findUnique({ where: { id: smsLogId } });
  if (!smsLog) return null;
  if (!smsLog.isEncrypted) return { body: smsLog.body };

  const keyA = getKeyA();
  const keyB = getKeyB();

  return {
    body: decryptField(smsLog.body, keyA, keyB) ?? smsLog.body,
  };
}
