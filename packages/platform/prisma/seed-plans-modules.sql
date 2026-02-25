-- ============================================
-- SEED: Modules, Plans et Plan_Modules
-- À exécuter après prisma db push
-- ============================================

-- 1. Mettre à jour les modules existants avec ordre_affichage et actif
-- (les colonnes sont ajoutées par Prisma, on met à jour les valeurs)

UPDATE module_metiers SET ordre_affichage = 1, actif = true WHERE code = 'facturation';
UPDATE module_metiers SET ordre_affichage = 2, actif = true WHERE code = 'devis';
UPDATE module_metiers SET ordre_affichage = 3, actif = true WHERE code = 'bons_commande';
UPDATE module_metiers SET ordre_affichage = 4, actif = true WHERE code = 'avoirs';
UPDATE module_metiers SET ordre_affichage = 5, actif = true WHERE code = 'proformas';
UPDATE module_metiers SET ordre_affichage = 6, actif = true WHERE code = 'articles';
UPDATE module_metiers SET ordre_affichage = 7, actif = true WHERE code = 'dashboard';
UPDATE module_metiers SET ordre_affichage = 8, actif = true WHERE code = 'notifications';
UPDATE module_metiers SET ordre_affichage = 9, actif = true WHERE code = 'comptabilite';
UPDATE module_metiers SET ordre_affichage = 10, actif = true WHERE code = 'clients';
UPDATE module_metiers SET ordre_affichage = 11, actif = true WHERE code = 'leads';
UPDATE module_metiers SET ordre_affichage = 12, actif = true WHERE code = 'sms';
UPDATE module_metiers SET ordre_affichage = 13, actif = true WHERE code = 'agent_telephonique';

-- Insérer les modules manquants s'ils n'existent pas
INSERT INTO module_metiers (id, code, "nom_affiché", description, categorie, icone, prix_par_mois, ordre_affichage, actif, created_at, updated_at)
SELECT gen_random_uuid(), v.code, v.nom, v.description, v.categorie, v.icone, v.prix, v.ordre, true, NOW(), NOW()
FROM (VALUES
  ('facturation', 'Facturation', 'Création et gestion de factures de vente et achat', 'Facturation', 'BanknotesIcon', 0, 1),
  ('devis', 'Devis', 'Création, envoi et conversion de devis', 'Facturation', 'DocumentTextIcon', 0, 2),
  ('bons_commande', 'Bons de commande', 'Gestion des bons de commande', 'Facturation', 'DocumentDuplicateIcon', 0, 3),
  ('avoirs', 'Avoirs', 'Gestion des avoirs et remboursements', 'Facturation', 'ReceiptRefundIcon', 0, 4),
  ('proformas', 'Proformas', 'Factures proforma', 'Facturation', 'DocumentCheckIcon', 0, 5),
  ('articles', 'Gestion des articles', 'Catalogue et codes articles', 'Facturation', 'ClipboardDocumentListIcon', 0, 6),
  ('dashboard', 'Tableau de bord', 'Dashboard principal avec KPIs', 'Administration', 'HomeIcon', 0, 7),
  ('notifications', 'Notifications', 'Système de notifications', 'Administration', 'BellIcon', 0, 8),
  ('comptabilite', 'Comptabilité', 'Module comptable complet (écritures, grand livre, bilan, TVA)', 'Comptabilité', 'CalculatorIcon', 15, 9),
  ('clients', 'Gestion des clients', 'CRM et gestion clientèle', 'Clientèle', 'UsersIcon', 0, 10),
  ('leads', 'Gestion des leads', 'Pipeline de prospection et conversion', 'Clientèle', 'UserPlusIcon', 10, 11),
  ('sms', 'SMS & Appels', 'Envoi de SMS et gestion des appels via Twilio', 'Communication', 'ChatBubbleLeftIcon', 10, 12),
  ('agent_telephonique', 'Agent IA', 'Agent téléphonique IA avec vocal et chat', 'Intelligence Artificielle', 'SparklesIcon', 25, 13)
) AS v(code, nom, description, categorie, icone, prix, ordre)
WHERE NOT EXISTS (SELECT 1 FROM module_metiers WHERE module_metiers.code = v.code);

-- 2. Créer les 3 plans
INSERT INTO plans (id, code, nom, description, prix_mensuel, prix_annuel, essai_jours, ordre_affichage, actif, couleur, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'starter', 'Starter', 'L''essentiel pour démarrer : facturation, devis, bons de commande et tableau de bord.', 29.00, 290.00, 14, 1, true, '#3b82f6', NOW(), NOW()),
  (gen_random_uuid(), 'pro', 'Pro', 'Pour les entreprises en croissance : comptabilité, leads, SMS et toutes les fonctionnalités de facturation.', 59.00, 590.00, 14, 2, true, '#a855f7', NOW(), NOW()),
  (gen_random_uuid(), 'enterprise', 'Enterprise', 'La solution complète : toutes les fonctionnalités + Agent IA téléphonique et chat.', 129.00, 1290.00, 30, 3, true, '#f97316', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  nom = EXCLUDED.nom,
  description = EXCLUDED.description,
  prix_mensuel = EXCLUDED.prix_mensuel,
  prix_annuel = EXCLUDED.prix_annuel,
  essai_jours = EXCLUDED.essai_jours,
  ordre_affichage = EXCLUDED.ordre_affichage,
  couleur = EXCLUDED.couleur,
  updated_at = NOW();

-- 3. Associer les modules aux plans

-- Plan Starter : facturation de base + dashboard + notifications
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
  ('dashboard', NULL, '{"niveau": "basique"}'),
  ('notifications', NULL, NULL)
) AS v(module_code, limite, config)
JOIN module_metiers m ON m.code = v.module_code
WHERE p.code = 'starter'
ON CONFLICT (plan_id, module_id) DO UPDATE SET
  limite_usage = EXCLUDED.limite_usage,
  config = EXCLUDED.config;

-- Plan Pro : tout starter + comptabilité + clients + leads + SMS (limité)
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
  ('dashboard', NULL, '{"niveau": "avance"}'),
  ('notifications', NULL, NULL),
  ('comptabilite', NULL, NULL),
  ('clients', NULL, NULL),
  ('leads', NULL, NULL),
  ('sms', 100, '{"sms_par_mois": 100, "appels_inclus": false}')
) AS v(module_code, limite, config)
JOIN module_metiers m ON m.code = v.module_code
WHERE p.code = 'pro'
ON CONFLICT (plan_id, module_id) DO UPDATE SET
  limite_usage = EXCLUDED.limite_usage,
  config = EXCLUDED.config;

-- Plan Enterprise : tout illimité + Agent IA
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
  ('dashboard', NULL, '{"niveau": "premium"}'),
  ('notifications', NULL, NULL),
  ('comptabilite', NULL, NULL),
  ('clients', NULL, NULL),
  ('leads', NULL, NULL),
  ('sms', NULL, '{"sms_par_mois": null, "appels_inclus": true}'),
  ('agent_telephonique', NULL, '{"vocal": true, "chat": true}')
) AS v(module_code, limite, config)
JOIN module_metiers m ON m.code = v.module_code
WHERE p.code = 'enterprise'
ON CONFLICT (plan_id, module_id) DO UPDATE SET
  limite_usage = EXCLUDED.limite_usage,
  config = EXCLUDED.config;

-- Vérification
SELECT '=== PLANS ===' as section;
SELECT code, nom, prix_mensuel, actif FROM plans ORDER BY ordre_affichage;

SELECT '=== MODULES ===' as section;
SELECT code, "nom_affiché", categorie, ordre_affichage FROM module_metiers WHERE actif = true ORDER BY ordre_affichage;

SELECT '=== PLAN_MODULES ===' as section;
SELECT p.nom as plan, m.code as module, pm.limite_usage
FROM plan_modules pm
JOIN plans p ON p.id = pm.plan_id
JOIN module_metiers m ON m.id = pm.module_id
ORDER BY p.ordre_affichage, m.ordre_affichage;
