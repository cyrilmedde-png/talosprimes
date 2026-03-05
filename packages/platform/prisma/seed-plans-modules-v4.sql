-- ============================================
-- SEED: Plans et Plan_Modules
-- Idempotent : ON CONFLICT DO UPDATE
-- ============================================

-- 1. Créer ou mettre à jour les 4 plans
-- Note: les modules sont maintenant seedés via le fichier TypeScript 01-modules.ts
INSERT INTO plans (id, code, nom, description, prix_mensuel, prix_annuel, essai_jours, ordre_affichage, actif, couleur, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'prospection', 'Prospection', 'Idéal pour les revendeurs et apporteurs d''affaires. Accès gratuit aux outils de prospection.', 0, NULL, 1, 0, true, '#10b981', NOW(), NOW()),
  (gen_random_uuid(), 'starter', 'Starter', 'L''essentiel pour démarrer : facturation, devis, bons de commande et tableau de bord.', 79.99, 599.90, 14, 1, true, '#6366f1', NOW(), NOW()),
  (gen_random_uuid(), 'pro', 'Pro', 'Pour les entreprises en croissance : comptabilité, leads, CRM et toutes les fonctionnalités de facturation.', 150.00, 1296.00, 14, 2, true, '#8b5cf6', NOW(), NOW()),
  (gen_random_uuid(), 'enterprise', 'Enterprise', 'La solution complète : Agent IA, gestion de projet, RH, BTP et tous les modules premium.', 299.00, 2868.00, 30, 3, true, '#f59e0b', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;
-- Les plans existants ne sont JAMAIS écrasés pour préserver les modifs admin

-- 2. Associer les modules aux plans

-- Plan Prospection (gratuit) : outils de base pour les apporteurs d'affaires
INSERT INTO plan_modules (id, plan_id, module_id, limite_usage, config)
SELECT gen_random_uuid(), p.id, m.id, v.limite::integer, v.config::jsonb
FROM plans p
CROSS JOIN (VALUES
  ('leads', NULL::integer, NULL::text),
  ('prospects', NULL, NULL),
  ('clients', NULL, NULL),
  ('notifications', NULL, NULL),
  ('logs', NULL, NULL),
  ('partenaire', NULL, NULL),
  ('revenus', NULL, NULL)
) AS v(module_code, limite, config)
JOIN module_metiers m ON m.code = v.module_code
WHERE p.code = 'prospection'
ON CONFLICT (plan_id, module_id) DO NOTHING;

-- Plan Starter : facturation complète
INSERT INTO plan_modules (id, plan_id, module_id, limite_usage, config)
SELECT gen_random_uuid(), p.id, m.id, v.limite::integer, v.config::jsonb
FROM plans p
CROSS JOIN (VALUES
  ('facturation', NULL::integer, NULL::text),
  ('devis', NULL, NULL),
  ('bons_commande', NULL, NULL),
  ('avoirs', NULL, NULL),
  ('proformas', NULL, NULL),
  ('articles', NULL, NULL),
  ('notifications', NULL, NULL),
  ('logs', NULL, NULL)
) AS v(module_code, limite, config)
JOIN module_metiers m ON m.code = v.module_code
WHERE p.code = 'starter'
ON CONFLICT (plan_id, module_id) DO NOTHING;

-- Plan Pro : tout Starter + comptabilité + CRM
INSERT INTO plan_modules (id, plan_id, module_id, limite_usage, config)
SELECT gen_random_uuid(), p.id, m.id, v.limite::integer, v.config::jsonb
FROM plans p
CROSS JOIN (VALUES
  ('facturation', NULL::integer, NULL::text),
  ('devis', NULL, NULL),
  ('bons_commande', NULL, NULL),
  ('avoirs', NULL, NULL),
  ('proformas', NULL, NULL),
  ('articles', NULL, NULL),
  ('notifications', NULL, NULL),
  ('logs', NULL, NULL),
  ('comptabilite', NULL, NULL),
  ('clients', NULL, NULL),
  ('leads', NULL, NULL),
  ('prospects', NULL, NULL),
  ('revenus', NULL, NULL)
) AS v(module_code, limite, config)
JOIN module_metiers m ON m.code = v.module_code
WHERE p.code = 'pro'
ON CONFLICT (plan_id, module_id) DO NOTHING;

-- Plan Enterprise : tout Pro + IA + gestion + RH + BTP
INSERT INTO plan_modules (id, plan_id, module_id, limite_usage, config)
SELECT gen_random_uuid(), p.id, m.id, v.limite::integer, v.config::jsonb
FROM plans p
CROSS JOIN (VALUES
  ('facturation', NULL::integer, NULL::text),
  ('devis', NULL, NULL),
  ('bons_commande', NULL, NULL),
  ('avoirs', NULL, NULL),
  ('proformas', NULL, NULL),
  ('articles', NULL, NULL),
  ('notifications', NULL, NULL),
  ('logs', NULL, NULL),
  ('comptabilite', NULL, NULL),
  ('clients', NULL, NULL),
  ('leads', NULL, NULL),
  ('prospects', NULL, NULL),
  ('revenus', NULL, NULL),
  ('partenaire', NULL, NULL),
  ('agent_telephonique', NULL, '{"vocal": true, "chat": true}'),
  ('gestion_projet', NULL, NULL),
  ('gestion_equipe', NULL, NULL),
  ('gestion_rh', NULL, NULL),
  ('btp', NULL, NULL)
) AS v(module_code, limite, config)
JOIN module_metiers m ON m.code = v.module_code
WHERE p.code = 'enterprise'
ON CONFLICT (plan_id, module_id) DO NOTHING;

-- Vérification
SELECT '=== PLANS ===' as section;
SELECT code, nom, prix_mensuel, prix_annuel, actif FROM plans ORDER BY ordre_affichage;

SELECT '=== PLAN_MODULES ===' as section;
SELECT p.nom as plan, m.code as module, pm.limite_usage
FROM plan_modules pm
JOIN plans p ON p.id = pm.plan_id
JOIN module_metiers m ON m.id = pm.module_id
ORDER BY p.ordre_affichage, m.ordre_affichage;
