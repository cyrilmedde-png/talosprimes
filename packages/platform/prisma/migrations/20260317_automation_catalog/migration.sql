-- Migration: Catalogue d'automatisations + achats clients
-- Date: 2026-03-17

-- ===========================================
-- ENUMS
-- ===========================================

DO $$ BEGIN
  CREATE TYPE "AutomationComplexity" AS ENUM ('simple', 'intermediaire', 'avance');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AutomationPurchaseStatus" AS ENUM ('en_attente', 'active', 'suspendue', 'annulee');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- TABLE: automation_catalog
-- Le catalogue de toutes les automatisations disponibles
-- ===========================================

CREATE TABLE IF NOT EXISTS "automation_catalog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(100) NOT NULL UNIQUE,
  "nom" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "categorie" VARCHAR(50) NOT NULL,
  "icon" VARCHAR(50) NOT NULL DEFAULT 'general',
  "setup_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "monthly_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "complexity" "AutomationComplexity" NOT NULL DEFAULT 'simple',
  "workflow_count" INTEGER NOT NULL DEFAULT 0,
  "workflow_templates" JSONB DEFAULT '[]',
  "features" JSONB DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "ordre" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "automation_catalog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "automation_catalog_categorie_idx" ON "automation_catalog"("categorie");
CREATE INDEX IF NOT EXISTS "automation_catalog_is_active_idx" ON "automation_catalog"("is_active");

-- ===========================================
-- TABLE: automation_purchases
-- Quelles automatisations chaque client a achetees
-- ===========================================

CREATE TABLE IF NOT EXISTS "automation_purchases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "automation_id" UUID NOT NULL,
  "status" "AutomationPurchaseStatus" NOT NULL DEFAULT 'en_attente',
  "n8n_folder_id" VARCHAR(100),
  "n8n_folder_name" VARCHAR(255),
  "n8n_workflow_ids" JSONB DEFAULT '[]',
  "setup_price_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "monthly_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "activated_at" TIMESTAMP(3),
  "suspended_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "config" JSONB DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "automation_purchases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "automation_purchases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "automation_purchases_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automation_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "automation_purchases_tenant_automation_key" ON "automation_purchases"("tenant_id", "automation_id");
CREATE INDEX IF NOT EXISTS "automation_purchases_tenant_id_idx" ON "automation_purchases"("tenant_id");
CREATE INDEX IF NOT EXISTS "automation_purchases_status_idx" ON "automation_purchases"("status");

-- ===========================================
-- RLS
-- ===========================================

ALTER TABLE "automation_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_purchases" ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- SEED: Catalogue initial
-- ===========================================

INSERT INTO "automation_catalog" ("code", "nom", "description", "categorie", "icon", "setup_price", "monthly_price", "complexity", "workflow_count", "features", "ordre") VALUES
  ('auto-email', 'Gestion Email Automatisee', 'Campagnes email, newsletters, sequences de bienvenue, relances automatiques et segmentation avancee des contacts.', 'email', 'email', 799, 59, 'simple', 6, '["Campagnes email", "Newsletters", "Sequences bienvenue", "Relances auto", "Segmentation contacts", "Templates personnalises"]', 1),
  ('auto-social', 'Connexion Reseaux Sociaux', 'Publication automatique sur Facebook, Instagram et TikTok. Planification, generation de contenu IA et analytics.', 'marketing', 'marketing', 1290, 99, 'intermediaire', 8, '["Facebook auto-post", "Instagram auto-post", "TikTok auto-post", "Generation contenu IA", "Planification", "Analytics multi-plateformes", "Hashtags automatiques", "Calendrier editorial"]', 2),
  ('auto-telephonie', 'Agent Telephonique IA', 'Standard telephonique intelligent, prise de RDV automatique, qualification des appels et transcription vocale.', 'telephonie', 'telephonie', 1990, 149, 'avance', 12, '["Standard IA", "Prise de RDV auto", "Qualification appels", "Transcription vocale", "Routage intelligent", "Messages vocaux", "Rappels automatiques", "Rapports appels", "Multi-langues", "Heures ouvrables", "File attente", "Transfert appels"]', 3),
  ('auto-facturation', 'Facturation Automatique', 'Generation de factures, relances impayees, envoi automatique par email, suivi des paiements et export comptable.', 'facturation', 'facturation', 899, 69, 'simple', 7, '["Generation factures", "Relances impayees", "Envoi auto email", "Suivi paiements", "Export comptable", "PDF auto", "Numerotation auto"]', 4),
  ('auto-crm', 'CRM & Suivi Clients', 'Automatisation du suivi client, notifications de relance, scoring des leads, onboarding automatise et rapports.', 'crm', 'crm', 990, 79, 'intermediaire', 9, '["Suivi client auto", "Notifications relance", "Scoring leads", "Onboarding auto", "Rapports", "Pipeline auto", "Emails personnalises", "Tags automatiques", "Historique interactions"]', 5),
  ('auto-sms', 'Campagnes SMS', 'Envoi de SMS en masse, notifications automatiques, confirmations RDV et campagnes promotionnelles.', 'sms', 'sms', 599, 49, 'simple', 4, '["SMS masse", "Notifications auto", "Confirmations RDV", "Campagnes promo"]', 6),
  ('auto-compta', 'Comptabilite Automatisee', 'Ecritures automatiques, rapprochement bancaire, declarations TVA, export FEC et conformite legale.', 'comptabilite', 'comptabilite', 1490, 119, 'avance', 10, '["Ecritures auto", "Rapprochement bancaire", "Declarations TVA", "Export FEC", "Conformite legale", "Bilan auto", "Compte resultat", "Grand livre", "Balance", "Cloture exercice"]', 7),
  ('auto-stock', 'Gestion de Stock Intelligente', 'Alertes de stock bas, reapprovisionnement automatique, suivi multi-sites et inventaires planifies.', 'stock', 'stock', 890, 69, 'intermediaire', 6, '["Alertes stock bas", "Reappro auto", "Multi-sites", "Inventaires planifies", "Mouvements auto", "Rapports stock"]', 8)
ON CONFLICT ("code") DO NOTHING;

-- Enregistrer la migration
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES (gen_random_uuid(), 'automation_catalog_20260317', NOW(), '20260317_automation_catalog', NULL, NULL, NOW(), 1)
ON CONFLICT DO NOTHING;
