-- Migration: Agent IA Email - Tables pour classification, reponses automatiques et regles
-- Date: 2026-03-20
-- Tables: email_incoming_logs, email_ai_rules

-- ═══════════════════════════════════════════════════════════
-- 1. Table des emails entrants traites par l'agent IA
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "email_incoming_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,

  -- Identifiants email
  "email_id" VARCHAR(255),
  "thread_id" VARCHAR(255),

  -- Contenu de l'email recu
  "from_address" VARCHAR(500) NOT NULL,
  "to_address" VARCHAR(500),
  "subject" VARCHAR(1000),
  "body_preview" TEXT,
  "has_attachments" BOOLEAN NOT NULL DEFAULT false,
  "provider" VARCHAR(20) NOT NULL DEFAULT 'imap',

  -- Classification IA
  "classification" JSONB,
  -- Structure attendue:
  -- {
  --   "categorie": "support|commercial|facturation|spam|newsletter|personnel|autre",
  --   "priorite": "urgent|haute|normale|basse",
  --   "sentiment": "positif|neutre|negatif|en_colere",
  --   "intention": "question|demande_info|reclamation|commande|devis|remerciement|relance|autre",
  --   "auto_repondable": true/false,
  --   "resume": "...",
  --   "tags": ["tag1", "tag2"]
  -- }

  -- Source de la decision
  "action" VARCHAR(50),
  "source" VARCHAR(20) DEFAULT 'ai',
  "matched_rule_id" UUID,

  -- Reponse generee par l'IA
  "reply_subject" VARCHAR(1000),
  "reply_body" TEXT,
  "reply_html" TEXT,
  "reply_confidence" DECIMAL(3,2),
  "reply_action" VARCHAR(50),
  -- Valeurs: auto_reply, queue_human, sent_auto, sent_approved, rejected, ignored

  -- Timestamps reponse
  "reply_generated_at" TIMESTAMP(3),
  "reply_sent_at" TIMESTAMP(3),

  -- Metriques
  "tokens_used" INTEGER DEFAULT 0,

  -- Timestamps standards
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_incoming_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_incoming_logs_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- Index pour les requetes frequentes
CREATE INDEX IF NOT EXISTS "email_incoming_logs_tenant_idx" ON "email_incoming_logs"("tenant_id");
CREATE INDEX IF NOT EXISTS "email_incoming_logs_tenant_action_idx" ON "email_incoming_logs"("tenant_id", "reply_action");
CREATE INDEX IF NOT EXISTS "email_incoming_logs_from_idx" ON "email_incoming_logs"("tenant_id", "from_address");
CREATE INDEX IF NOT EXISTS "email_incoming_logs_created_idx" ON "email_incoming_logs"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "email_incoming_logs_queue_idx" ON "email_incoming_logs"("tenant_id", "reply_action", "reply_sent_at")
  WHERE reply_action = 'queue_human' AND reply_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS "email_incoming_logs_categorie_idx" ON "email_incoming_logs"((classification->>'categorie'));
CREATE INDEX IF NOT EXISTS "email_incoming_logs_priorite_idx" ON "email_incoming_logs"((classification->>'priorite'));

-- RLS
ALTER TABLE "email_incoming_logs" ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- 2. Table des regles de reponse automatique par tenant
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "email_ai_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,

  -- Identification de la regle
  "nom" VARCHAR(255) NOT NULL,
  "description" TEXT,

  -- Type de regle
  "type_rule" VARCHAR(50) NOT NULL DEFAULT 'static',
  -- static: conditions simples (from_contains, subject_contains, etc.)
  -- ai_override: force une action specifique quand l'IA classe dans une categorie

  -- Conditions de declenchement (JSONB flexible)
  "conditions" JSONB NOT NULL DEFAULT '{}',
  -- Exemples de conditions:
  -- { "from_contains": "support@", "subject_contains": "urgent" }
  -- { "from_domain": "gmail.com" }
  -- { "body_contains": "devis" }
  -- { "categorie": "support", "priorite": "urgent" }  <- pour ai_override

  -- Action a executer
  "action_type" VARCHAR(50) NOT NULL DEFAULT 'auto_reply',
  -- auto_reply: generer et envoyer une reponse IA
  -- queue_human: mettre en file d'attente pour validation
  -- ignore: ne rien faire
  -- forward: transferer a une adresse email
  -- template_reply: repondre avec un template fixe

  -- Configuration de l'action (JSONB flexible)
  "action_config" JSONB NOT NULL DEFAULT '{}',
  -- Exemples:
  -- { "template_id": "uuid", "categorie": "support" }  <- pour template_reply
  -- { "forward_to": "admin@company.com" }  <- pour forward
  -- { "categorie": "support", "priorite": "haute", "tags": ["vip"] }  <- metadata

  -- Priorite (plus bas = plus prioritaire)
  "priorite" INTEGER NOT NULL DEFAULT 100,

  -- Actif / Inactif
  "actif" BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_ai_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_ai_rules_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "email_ai_rules_tenant_idx" ON "email_ai_rules"("tenant_id");
CREATE INDEX IF NOT EXISTS "email_ai_rules_tenant_actif_idx" ON "email_ai_rules"("tenant_id", "actif") WHERE actif = true;
CREATE INDEX IF NOT EXISTS "email_ai_rules_priorite_idx" ON "email_ai_rules"("tenant_id", "priorite" ASC);

-- RLS
ALTER TABLE "email_ai_rules" ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- 3. Ajouter l'automatisation "Agent IA Email" au catalogue
-- ═══════════════════════════════════════════════════════════
INSERT INTO "automation_catalog" (
  "id", "code", "nom", "description", "categorie", "icon",
  "setup_price", "monthly_price", "complexity", "workflow_count",
  "workflow_templates", "features", "is_active", "ordre",
  "created_at", "updated_at"
)
VALUES (
  gen_random_uuid(),
  'email-ai-agent',
  'Agent IA Email',
  'Agent intelligent qui lit, classifie et repond automatiquement aux emails. Reponses autonomes pour les cas simples (FAQ, accuse de reception), file d''attente pour validation humaine sur les cas complexes. Modele IA configurable par client.',
  'email',
  'brain',
  0,
  29.00,
  'advanced',
  5,
  '[
    "email-ai-classify",
    "email-ai-reply",
    "email-ai-orchestrator",
    "email-ai-queue",
    "email-ai-rules-crud"
  ]'::jsonb,
  '[
    "Classification IA des emails entrants (categorie, priorite, sentiment)",
    "Reponse automatique intelligente pour les cas simples (FAQ, accuse reception)",
    "File d''attente de validation humaine pour les cas complexes",
    "Regles de reponse automatique configurables par client",
    "Historique complet des emails traites avec metriques",
    "Modele IA configurable par tenant (GPT-4o-mini, GPT-4o, GPT-4-turbo)",
    "Compatible Gmail OAuth2 et IMAP/SMTP generique"
  ]'::jsonb,
  true,
  50,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- Enregistrer la migration
-- ═══════════════════════════════════════════════════════════
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES (gen_random_uuid(), 'email_ai_agent_20260320', NOW(), '20260320_email_ai_agent', NULL, NULL, NOW(), 1)
ON CONFLICT DO NOTHING;
