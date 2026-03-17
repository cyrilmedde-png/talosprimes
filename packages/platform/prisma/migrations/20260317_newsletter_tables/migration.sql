-- Migration: Système Newsletter / Email Marketing / SMS
-- Date: 2026-03-17

-- ===========================================
-- ENUMS
-- ===========================================

DO $$ BEGIN
  CREATE TYPE "SubscriberSource" AS ENUM ('manual', 'lead', 'client', 'contact_form', 'import_csv', 'api');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriberStatus" AS ENUM ('active', 'unsubscribed', 'bounced', 'complained');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ListType" AS ENUM ('manual', 'dynamic', 'all');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmailTemplateCategory" AS ENUM ('newsletter', 'promotion', 'transactionnel', 'relance', 'bienvenue', 'evenement');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CampaignStatus" AS ENUM ('brouillon', 'planifiee', 'en_cours', 'envoyee', 'annulee');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmailSendStatus" AS ENUM ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- TABLE: subscribers
-- ===========================================

CREATE TABLE IF NOT EXISTS "subscribers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "telephone" TEXT,
  "nom" TEXT,
  "prenom" TEXT,
  "entreprise" TEXT,
  "source" "SubscriberSource" NOT NULL DEFAULT 'manual',
  "status" "SubscriberStatus" NOT NULL DEFAULT 'active',
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB,
  "unsubscribed_at" TIMESTAMP(3),
  "bounced_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscribers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_tenant_id_email_key" ON "subscribers"("tenant_id", "email");
CREATE INDEX IF NOT EXISTS "subscribers_tenant_id_idx" ON "subscribers"("tenant_id");
CREATE INDEX IF NOT EXISTS "subscribers_status_idx" ON "subscribers"("status");
CREATE INDEX IF NOT EXISTS "subscribers_source_idx" ON "subscribers"("source");

-- ===========================================
-- TABLE: subscriber_lists
-- ===========================================

CREATE TABLE IF NOT EXISTS "subscriber_lists" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "nom" TEXT NOT NULL,
  "description" TEXT,
  "type" "ListType" NOT NULL DEFAULT 'manual',
  "filtres" JSONB,
  "couleur" TEXT DEFAULT '#3b82f6',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscriber_lists_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscriber_lists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "subscriber_lists_tenant_id_idx" ON "subscriber_lists"("tenant_id");

-- ===========================================
-- TABLE: subscriber_list_members
-- ===========================================

CREATE TABLE IF NOT EXISTS "subscriber_list_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "subscriber_id" UUID NOT NULL,
  "list_id" UUID NOT NULL,
  "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscriber_list_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscriber_list_members_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "subscriber_list_members_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "subscriber_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscriber_list_members_subscriber_id_list_id_key" ON "subscriber_list_members"("subscriber_id", "list_id");

-- ===========================================
-- TABLE: email_templates
-- ===========================================

CREATE TABLE IF NOT EXISTS "email_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "nom" TEXT NOT NULL,
  "sujet" TEXT NOT NULL,
  "contenu_html" TEXT NOT NULL,
  "contenu_text" TEXT,
  "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "categorie" "EmailTemplateCategory" NOT NULL DEFAULT 'newsletter',
  "thumbnail" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "email_templates_tenant_id_idx" ON "email_templates"("tenant_id");
CREATE INDEX IF NOT EXISTS "email_templates_categorie_idx" ON "email_templates"("categorie");

-- ===========================================
-- TABLE: email_campaigns
-- ===========================================

CREATE TABLE IF NOT EXISTS "email_campaigns" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "nom" TEXT NOT NULL,
  "sujet" TEXT NOT NULL,
  "template_id" UUID,
  "list_id" UUID,
  "contenu_html" TEXT NOT NULL,
  "contenu_text" TEXT,
  "expediteur_nom" TEXT NOT NULL,
  "expediteur_email" TEXT NOT NULL,
  "status" "CampaignStatus" NOT NULL DEFAULT 'brouillon',
  "scheduled_at" TIMESTAMP(3),
  "sent_at" TIMESTAMP(3),
  "total_envoyes" INTEGER NOT NULL DEFAULT 0,
  "total_ouverts" INTEGER NOT NULL DEFAULT 0,
  "total_cliques" INTEGER NOT NULL DEFAULT 0,
  "total_bounces" INTEGER NOT NULL DEFAULT 0,
  "total_desabonnes" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "email_campaigns_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "email_campaigns_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "subscriber_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "email_campaigns_tenant_id_idx" ON "email_campaigns"("tenant_id");
CREATE INDEX IF NOT EXISTS "email_campaigns_status_idx" ON "email_campaigns"("status");
CREATE INDEX IF NOT EXISTS "email_campaigns_scheduled_at_idx" ON "email_campaigns"("scheduled_at");

-- ===========================================
-- TABLE: email_send_logs
-- ===========================================

CREATE TABLE IF NOT EXISTS "email_send_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "campaign_id" UUID NOT NULL,
  "subscriber_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "status" "EmailSendStatus" NOT NULL DEFAULT 'pending',
  "ouvert_at" TIMESTAMP(3),
  "clique_at" TIMESTAMP(3),
  "bounce_type" TEXT,
  "erreur" TEXT,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_send_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_send_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "email_send_logs_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "email_send_logs_campaign_id_idx" ON "email_send_logs"("campaign_id");
CREATE INDEX IF NOT EXISTS "email_send_logs_subscriber_id_idx" ON "email_send_logs"("subscriber_id");
CREATE INDEX IF NOT EXISTS "email_send_logs_status_idx" ON "email_send_logs"("status");

-- ===========================================
-- TABLE: sms_campaigns
-- ===========================================

CREATE TABLE IF NOT EXISTS "sms_campaigns" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "nom" TEXT NOT NULL,
  "contenu" TEXT NOT NULL,
  "list_id" UUID,
  "status" "CampaignStatus" NOT NULL DEFAULT 'brouillon',
  "scheduled_at" TIMESTAMP(3),
  "sent_at" TIMESTAMP(3),
  "total_envoyes" INTEGER NOT NULL DEFAULT 0,
  "total_delivered" INTEGER NOT NULL DEFAULT 0,
  "total_failed" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sms_campaigns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sms_campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sms_campaigns_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "subscriber_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "sms_campaigns_tenant_id_idx" ON "sms_campaigns"("tenant_id");
CREATE INDEX IF NOT EXISTS "sms_campaigns_status_idx" ON "sms_campaigns"("status");

-- ===========================================
-- RLS (Row Level Security)
-- ===========================================

ALTER TABLE "subscribers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriber_lists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriber_list_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_send_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sms_campaigns" ENABLE ROW LEVEL SECURITY;

-- Enregistrer la migration dans _prisma_migrations
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES (gen_random_uuid(), 'newsletter_tables_20260317', NOW(), '20260317_newsletter_tables', NULL, NULL, NOW(), 1)
ON CONFLICT DO NOTHING;
