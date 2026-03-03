-- ============================================
-- Migration RGPD Compliance
-- Art. 7 (Consentement), Art. 15-22 (Droits), Art. 28 (Sous-traitants)
-- ============================================

-- Enums RGPD
CREATE TYPE "ConsentType" AS ENUM ('donnees_personnelles', 'communications', 'cookies_analytics', 'partage_tiers');
CREATE TYPE "ConsentAction" AS ENUM ('granted', 'withdrawn');

-- Table des consentements (immuable — append-only)
CREATE TABLE "consent_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "email" TEXT NOT NULL,
    "consent_type" "ConsentType" NOT NULL,
    "action" "ConsentAction" NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "consent_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "consent_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX "consent_logs_tenant_id_idx" ON "consent_logs"("tenant_id");
CREATE INDEX "consent_logs_email_idx" ON "consent_logs"("email");
CREATE INDEX "consent_logs_consent_type_idx" ON "consent_logs"("consent_type");
CREATE INDEX "consent_logs_created_at_idx" ON "consent_logs"("created_at");

-- Table des demandes RGPD (exercice de droits)
CREATE TABLE "rgpd_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "details" TEXT,
    "completed_at" TIMESTAMPTZ,
    "completed_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "rgpd_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rgpd_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX "rgpd_requests_tenant_id_idx" ON "rgpd_requests"("tenant_id");
CREATE INDEX "rgpd_requests_email_idx" ON "rgpd_requests"("email");
CREATE INDEX "rgpd_requests_status_idx" ON "rgpd_requests"("status");
CREATE INDEX "rgpd_requests_created_at_idx" ON "rgpd_requests"("created_at");

-- Registre des sous-traitants (Art. 28)
CREATE TABLE "data_processors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "data_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "country" TEXT NOT NULL,
    "dpa_signed_at" TIMESTAMPTZ,
    "dpa_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "data_processors_pkey" PRIMARY KEY ("id")
);

-- Seed : sous-traitants actuels de TalosPrimes
INSERT INTO "data_processors" ("name", "purpose", "data_types", "country", "dpa_signed_at") VALUES
  ('Supabase (PostgreSQL)', 'Hébergement base de données', ARRAY['users', 'leads', 'clients', 'invoices', 'event_logs'], 'EU (Allemagne)', NULL),
  ('OVH', 'Hébergement serveur VPS', ARRAY['application', 'files'], 'France', NULL),
  ('OpenAI', 'Génération IA (Agent, documents légaux)', ARRAY['leads', 'clients', 'invoices_pdf'], 'USA', NULL),
  ('Twilio', 'Téléphonie et SMS', ARRAY['phone_numbers', 'call_transcripts', 'sms'], 'USA', NULL),
  ('Stripe', 'Paiements en ligne', ARRAY['billing_info'], 'USA', NULL),
  ('Google (Calendar/Gmail)', 'Calendrier et email agent IA', ARRAY['calendar_events', 'emails'], 'USA', NULL),
  ('n8n (self-hosted)', 'Automatisation workflows', ARRAY['leads', 'clients', 'events'], 'France (même VPS)', NULL),
  ('Telegram', 'Notifications et chatbot IA', ARRAY['messages', 'user_ids'], 'Global', NULL);
