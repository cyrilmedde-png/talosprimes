/**
 * Double AES-256-GCM Encryption Utility
 *
 * Chiffrement double couche pour les conversations Agent IA :
 *   Couche 1 : AES-256-GCM avec Clé A (VPS IONOS - process.env)
 *   Couche 2 : AES-256-GCM avec Clé B (Supabase Vault)
 *
 * Format de stockage (Base64) :
 *   [IV_1 (16 bytes)][AuthTag_1 (16 bytes)][IV_2 (16 bytes)][AuthTag_2 (16 bytes)][Ciphertext]
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

// ─── Helpers ────────────────────────────────────────────────

function hexToBuffer(hex: string): Buffer {
  if (hex.length !== 64) {
    throw new Error(`Clé invalide : attendu 64 chars hex (256 bits), reçu ${hex.length}`);
  }
  return Buffer.from(hex, "hex");
}

function encryptSingleLayer(data: Buffer, keyHex: string): { iv: Buffer; authTag: Buffer; ciphertext: Buffer } {
  const key = hexToBuffer(keyHex);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { iv, authTag, ciphertext: encrypted };
}

function decryptSingleLayer(ciphertext: Buffer, keyHex: string, iv: Buffer, authTag: Buffer): Buffer {
  const key = hexToBuffer(keyHex);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Double chiffrement AES-256-GCM
 * @param plaintext - Texte ou JSON à chiffrer
 * @param keyA - Clé A (64 chars hex) depuis process.env.ENCRYPTION_KEY_A
 * @param keyB - Clé B (64 chars hex) depuis Supabase Vault
 * @returns String Base64 contenant IV1 + AuthTag1 + IV2 + AuthTag2 + Ciphertext
 */
export function doubleEncrypt(plaintext: string, keyA: string, keyB: string): string {
  const data = Buffer.from(plaintext, "utf-8");

  // Couche 1 : chiffrement avec Clé A
  const layer1 = encryptSingleLayer(data, keyA);

  // Couche 2 : chiffrement du résultat avec Clé B
  const layer2 = encryptSingleLayer(layer1.ciphertext, keyB);

  // Concaténer : IV1 + AuthTag1 + IV2 + AuthTag2 + Ciphertext
  const result = Buffer.concat([
    layer1.iv,        // 16 bytes
    layer1.authTag,   // 16 bytes
    layer2.iv,        // 16 bytes
    layer2.authTag,   // 16 bytes
    layer2.ciphertext // variable
  ]);

  return result.toString("base64");
}

/**
 * Double déchiffrement AES-256-GCM
 * @param encrypted - String Base64 du doubleEncrypt()
 * @param keyA - Clé A (64 chars hex) depuis process.env.ENCRYPTION_KEY_A
 * @param keyB - Clé B (64 chars hex) depuis Supabase Vault
 * @returns Le texte original en clair
 */
export function doubleDecrypt(encrypted: string, keyA: string, keyB: string): string {
  const buf = Buffer.from(encrypted, "base64");

  // Extraire les composants
  let offset = 0;
  const iv1 = buf.subarray(offset, offset + IV_LENGTH); offset += IV_LENGTH;
  const authTag1 = buf.subarray(offset, offset + AUTH_TAG_LENGTH); offset += AUTH_TAG_LENGTH;
  const iv2 = buf.subarray(offset, offset + IV_LENGTH); offset += IV_LENGTH;
  const authTag2 = buf.subarray(offset, offset + AUTH_TAG_LENGTH); offset += AUTH_TAG_LENGTH;
  const ciphertext2 = buf.subarray(offset);

  // Couche 2 : déchiffrement avec Clé B
  const ciphertext1 = decryptSingleLayer(ciphertext2, keyB, iv2, authTag2);

  // Couche 1 : déchiffrement avec Clé A
  const plaintext = decryptSingleLayer(ciphertext1, keyA, iv1, authTag1);

  return plaintext.toString("utf-8");
}

/**
 * Chiffre un champ individuel (string ou JSON)
 * Retourne null si la valeur est null/undefined
 */
export function encryptField(value: string | object | null | undefined, keyA: string, keyB: string): string | null {
  if (value === null || value === undefined) return null;
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return doubleEncrypt(str, keyA, keyB);
}

/**
 * Déchiffre un champ individuel
 * Retourne null si la valeur est null/undefined
 */
export function decryptField(encrypted: string | null | undefined, keyA: string, keyB: string): string | null {
  if (encrypted === null || encrypted === undefined) return null;
  return doubleDecrypt(encrypted, keyA, keyB);
}

/**
 * Déchiffre un champ JSON (conversation_log, etc.)
 */
export function decryptJsonField<T = unknown>(encrypted: string | null | undefined, keyA: string, keyB: string): T | null {
  const decrypted = decryptField(encrypted, keyA, keyB);
  if (decrypted === null) return null;
  try {
    return JSON.parse(decrypted) as T;
  } catch {
    return decrypted as unknown as T;
  }
}

/**
 * Génère une clé AES-256 aléatoire (64 chars hex)
 * Utilitaire pour la configuration initiale
 */
export function generateKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString("hex");
}
