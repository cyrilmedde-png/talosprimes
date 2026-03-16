/**
 * Configuration Marketing Digital par tenant (Facebook, Instagram, TikTok, LinkedIn).
 * Stockée en base (TenantMarketingConfig), avec repli sur les variables d'environnement.
 */

import { env } from '../config/env.js';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

// ============================================================
// INTERFACES
// ============================================================

export interface FacebookConfig {
  pageAccessToken?: string;
  pageId?: string;
  instagramUserId?: string;
}

export interface TikTokConfig {
  clientKey?: string;
  clientSecret?: string;
  refreshToken?: string;
}

export interface LinkedInConfig {
  accessToken?: string;
  orgId?: string;
}

export interface OpenAIConfig {
  apiKey?: string;
}

export interface MarketingConfig {
  facebook?: FacebookConfig;
  tiktok?: TikTokConfig;
  linkedin?: LinkedInConfig;
  openai?: OpenAIConfig;
}

// ============================================================
// GET CONFIG (pour exécution n8n / backend)
// ============================================================

/** Retourne la config fusionnée (DB puis env) pour un tenant. */
export async function getMarketingConfigForTenant(tenantId: string): Promise<MarketingConfig> {
  const row = await prisma.tenantMarketingConfig.findUnique({
    where: { tenantId },
    select: { config: true },
  });
  const db = (row?.config as MarketingConfig) ?? {};
  return {
    facebook: {
      pageAccessToken: db.facebook?.pageAccessToken ?? (env as Record<string, unknown>).FACEBOOK_PAGE_ACCESS_TOKEN as string ?? undefined,
      pageId: db.facebook?.pageId ?? undefined,
      instagramUserId: db.facebook?.instagramUserId ?? undefined,
    },
    tiktok: {
      clientKey: db.tiktok?.clientKey ?? undefined,
      clientSecret: db.tiktok?.clientSecret ?? undefined,
      refreshToken: db.tiktok?.refreshToken ?? undefined,
    },
    linkedin: {
      accessToken: db.linkedin?.accessToken ?? undefined,
      orgId: db.linkedin?.orgId ?? undefined,
    },
    openai: {
      apiKey: db.openai?.apiKey ?? (env as Record<string, unknown>).OPENAI_API_KEY as string ?? undefined,
    },
  };
}

// ============================================================
// MASQUAGE SECRETS
// ============================================================

function maskSecret(s: string | undefined): string {
  if (!s || s.length === 0) return '';
  if (s.length <= 4) return '••••';
  return '••••' + s.slice(-4);
}

// ============================================================
// GET CONFIG POUR L'UI (secrets masqués)
// ============================================================

export interface MarketingConfigDisplay {
  facebook: FacebookConfig & { configured: boolean };
  tiktok: TikTokConfig & { configured: boolean };
  linkedin: LinkedInConfig & { configured: boolean };
  openai: OpenAIConfig & { configured: boolean };
}

/** GET config pour l'UI : config avec secrets masqués + indicateurs configured. */
export async function getMarketingConfigForDisplay(tenantId: string): Promise<MarketingConfigDisplay> {
  const full = await getMarketingConfigForTenant(tenantId);
  const fb = full.facebook ?? {};
  const tt = full.tiktok ?? {};
  const li = full.linkedin ?? {};
  const ai = full.openai ?? {};

  return {
    facebook: {
      pageAccessToken: maskSecret(fb.pageAccessToken),
      pageId: fb.pageId ?? '',
      instagramUserId: fb.instagramUserId ?? '',
      configured: !!(fb.pageAccessToken && fb.pageId),
    },
    tiktok: {
      clientKey: maskSecret(tt.clientKey),
      clientSecret: maskSecret(tt.clientSecret),
      refreshToken: maskSecret(tt.refreshToken),
      configured: !!(tt.clientKey && tt.clientSecret && tt.refreshToken),
    },
    linkedin: {
      accessToken: maskSecret(li.accessToken),
      orgId: li.orgId ?? '',
      configured: !!(li.accessToken && li.orgId),
    },
    openai: {
      apiKey: maskSecret(ai.apiKey),
      configured: !!ai.apiKey,
    },
  };
}

// ============================================================
// SAVE CONFIG (PATCH)
// ============================================================

/** Met à jour partiellement la config marketing (ne remplace que les champs fournis non masqués). */
export async function saveMarketingConfig(tenantId: string, patch: Partial<MarketingConfig>): Promise<void> {
  const existing = await getMarketingConfigForTenant(tenantId);

  // Fusionner en ne gardant que les nouvelles valeurs non masquées
  function mergeField(existingVal: string | undefined, newVal: string | undefined): string | undefined {
    if (newVal === undefined || newVal === null) return existingVal;
    if (newVal === '' || newVal.startsWith('••••')) return existingVal;
    return newVal;
  }

  const merged: MarketingConfig = {
    facebook: {
      pageAccessToken: mergeField(existing.facebook?.pageAccessToken, patch.facebook?.pageAccessToken),
      pageId: patch.facebook?.pageId !== undefined ? patch.facebook.pageId : existing.facebook?.pageId,
      instagramUserId: patch.facebook?.instagramUserId !== undefined ? patch.facebook.instagramUserId : existing.facebook?.instagramUserId,
    },
    tiktok: {
      clientKey: mergeField(existing.tiktok?.clientKey, patch.tiktok?.clientKey),
      clientSecret: mergeField(existing.tiktok?.clientSecret, patch.tiktok?.clientSecret),
      refreshToken: mergeField(existing.tiktok?.refreshToken, patch.tiktok?.refreshToken),
    },
    linkedin: {
      accessToken: mergeField(existing.linkedin?.accessToken, patch.linkedin?.accessToken),
      orgId: patch.linkedin?.orgId !== undefined ? patch.linkedin.orgId : existing.linkedin?.orgId,
    },
    openai: {
      apiKey: mergeField(existing.openai?.apiKey, patch.openai?.apiKey),
    },
  };

  await prisma.tenantMarketingConfig.upsert({
    where: { tenantId },
    create: { tenantId, config: merged as unknown as Prisma.InputJsonValue },
    update: { config: merged as unknown as Prisma.InputJsonValue },
  });
}
