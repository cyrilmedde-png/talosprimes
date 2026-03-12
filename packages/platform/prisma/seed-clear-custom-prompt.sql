-- Vider le system_prompt hardcodé dans twilio_configs
-- pour que le prompt dynamique du workflow n8n prenne le relais
-- Le prompt dynamique utilise la KB complète + règles strictes (zéro fallback)

UPDATE twilio_configs
SET system_prompt = NULL,
    system_prompt_addon = NULL,
    knowledge_base = NULL,
    max_tokens = 200
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- Vérification
SELECT tenant_id, agent_name, company_name,
       CASE WHEN system_prompt IS NULL THEN 'NULL (OK)' ELSE 'SET (⚠️)' END AS system_prompt_status,
       CASE WHEN knowledge_base IS NULL THEN 'NULL (OK)' ELSE 'SET (⚠️)' END AS kb_status,
       max_tokens
FROM twilio_configs
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
