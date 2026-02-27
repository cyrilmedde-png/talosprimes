/**
 * Types Prisma de compatibilité.
 *
 * Le client Prisma généré (`prisma generate`) exporte normalement ces types
 * dans le namespace `Prisma`. Quand la génération n'a pas encore été exécutée
 * (CI, premier clone, etc.), les types manquent dans le stub par défaut.
 *
 * Ce fichier réexporte les types depuis le runtime Prisma afin que le
 * reste du code compile correctement même sans génération préalable.
 *
 * ⚠️  Exécutez `npx prisma generate` pour obtenir les types complets
 *     (modèles, inputs, enums, etc.).
 */

import { type PrismaClient } from '@prisma/client';
import * as runtime from '@prisma/client/runtime/library';

// ── JSON types ──────────────────────────────────────────────────────
export type InputJsonValue = runtime.InputJsonValue;
export type InputJsonObject = runtime.InputJsonObject;
export type InputJsonArray = runtime.InputJsonArray;

// Sentinel values for Prisma JSON columns
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const JsonNull = (runtime as any).JsonNull;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DbNull = (runtime as any).DbNull;

// ── Transaction client ──────────────────────────────────────────────
/**
 * Type du client transactionnel reçu dans `prisma.$transaction(async (tx) => ...)`.
 */
export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
