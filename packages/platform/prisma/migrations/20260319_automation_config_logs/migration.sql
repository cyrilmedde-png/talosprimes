-- Migration: Logs d'audit des configurations d'automatisation
-- Date: 2026-03-19
-- Chaque modification de config est tracée pour justification facturation

CREATE TABLE IF NOT EXISTS "automation_config_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "automation_purchase_id" UUID NOT NULL,
  "user_id" UUID,
  "user_email" VARCHAR(255),
  "user_role" VARCHAR(50),
  "action" VARCHAR(50) NOT NULL DEFAULT 'update',
  "champ_modifie" VARCHAR(255),
  "ancienne_valeur" TEXT,
  "nouvelle_valeur" TEXT,
  "config_avant" JSONB,
  "config_apres" JSONB,
  "ip_address" VARCHAR(50),
  "user_agent" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "automation_config_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "automation_config_logs_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "automation_config_logs_purchase_fkey" FOREIGN KEY ("automation_purchase_id") REFERENCES "automation_purchases"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "automation_config_logs_tenant_idx" ON "automation_config_logs"("tenant_id");
CREATE INDEX IF NOT EXISTS "automation_config_logs_purchase_idx" ON "automation_config_logs"("automation_purchase_id");
CREATE INDEX IF NOT EXISTS "automation_config_logs_created_idx" ON "automation_config_logs"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "automation_config_logs_action_idx" ON "automation_config_logs"("action");

ALTER TABLE "automation_config_logs" ENABLE ROW LEVEL SECURITY;

-- Enregistrer la migration
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES (gen_random_uuid(), 'automation_config_logs_20260319', NOW(), '20260319_automation_config_logs', NULL, NULL, NOW(), 1)
ON CONFLICT DO NOTHING;
