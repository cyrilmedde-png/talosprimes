-- ============================================================
-- Migration: Chat Memory RGPD (agent téléphonique)
-- Table: n8n_chat_histories + chiffrement AES-256
-- ============================================================

-- 1. Extension pgcrypto pour le chiffrement
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Table principale (format n8n Postgres Chat Memory)
CREATE TABLE IF NOT EXISTS "n8n_chat_histories" (
  "id" SERIAL PRIMARY KEY,
  "session_id" VARCHAR(255) NOT NULL,
  "message" JSONB NOT NULL,
  "message_encrypted" BYTEA,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_n8n_chat_session" ON "n8n_chat_histories" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_n8n_chat_created" ON "n8n_chat_histories" ("created_at");

-- 3. Schéma isolé pour la clé de chiffrement
CREATE SCHEMA IF NOT EXISTS app_config;

CREATE TABLE IF NOT EXISTS app_config.encryption_keys (
  key_name TEXT PRIMARY KEY,
  key_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

REVOKE ALL ON app_config.encryption_keys FROM PUBLIC;

-- Générer une clé unique pour cette instance
INSERT INTO app_config.encryption_keys (key_name, key_value)
VALUES ('chat_memory_key', 'tp-rgpd-' || gen_random_uuid()::text)
ON CONFLICT (key_name) DO NOTHING;

-- 4. Trigger: chiffrement automatique AES-256 à chaque INSERT
CREATE OR REPLACE FUNCTION encrypt_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  enc_key TEXT;
BEGIN
  SELECT key_value INTO enc_key
  FROM app_config.encryption_keys
  WHERE key_name = 'chat_memory_key';

  IF enc_key IS NOT NULL AND NEW.message IS NOT NULL THEN
    NEW.message_encrypted = pgp_sym_encrypt(
      NEW.message::text,
      enc_key,
      'compress-algo=2, cipher-algo=aes256'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_encrypt_chat ON n8n_chat_histories;
CREATE TRIGGER trg_encrypt_chat
  BEFORE INSERT ON n8n_chat_histories
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_chat_message();

-- 5. Vue déchiffrée (consultation admin uniquement)
CREATE OR REPLACE VIEW v_chat_histories_decrypted AS
SELECT
  id,
  session_id,
  message,
  CASE
    WHEN message_encrypted IS NOT NULL THEN
      pgp_sym_decrypt(
        message_encrypted,
        (SELECT key_value FROM app_config.encryption_keys WHERE key_name = 'chat_memory_key')
      )::jsonb
    ELSE message
  END as message_decrypted,
  created_at
FROM n8n_chat_histories;

-- 6. Rétention RGPD: nettoyage des conversations > 30 jours
CREATE OR REPLACE FUNCTION cleanup_old_chat_histories()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM n8n_chat_histories
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Droit à l'oubli RGPD: supprimer un appel complet
CREATE OR REPLACE FUNCTION rgpd_forget_call(p_session_id VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM n8n_chat_histories
  WHERE session_id = p_session_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 8. RLS (Row Level Security)
ALTER TABLE n8n_chat_histories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'n8n_chat_histories' AND policyname = 'service_role_only'
  ) THEN
    CREATE POLICY "service_role_only" ON n8n_chat_histories
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
