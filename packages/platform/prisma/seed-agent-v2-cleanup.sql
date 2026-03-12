-- seed-agent-v2-cleanup.sql
-- Refonte Agent Vocal v2 : nettoyage des overrides BDD
-- Le prompt systeme est desormais UNIQUEMENT dans le workflow n8n
-- Plus aucun champ en BDD ne doit overrider le workflow

-- 1. Vider le champ system_prompt pour TOUS les tenants (pas juste admin)
UPDATE twilio_configs
SET system_prompt = NULL,
    system_prompt_addon = NULL,
    knowledge_base = NULL,
    max_tokens = 200
WHERE system_prompt IS NOT NULL
   OR system_prompt_addon IS NOT NULL
   OR knowledge_base IS NOT NULL;

-- 2. Confirmer le nettoyage
SELECT
  tenant_id,
  agent_name,
  company_name,
  voice_name,
  CASE WHEN system_prompt IS NULL THEN 'OK' ELSE 'ERREUR' END as prompt_cleared,
  CASE WHEN knowledge_base IS NULL THEN 'OK' ELSE 'ERREUR' END as kb_cleared,
  max_tokens
FROM twilio_configs;
