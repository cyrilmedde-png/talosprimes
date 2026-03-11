-- ============================================
-- SEED: Module Marketing Digital
-- Publication automatique Facebook, Instagram, TikTok
-- ============================================

-- Insérer le module marketing_digital
INSERT INTO module_metiers (id, code, "nom_affiché", description, categorie, icone, prix_par_mois, ordre_affichage, actif, created_at, updated_at)
SELECT gen_random_uuid(), v.code, v.nom, v.description, v.categorie, v.icone, v.prix, v.ordre, true, NOW(), NOW()
FROM (VALUES
  ('marketing_digital', 'Marketing Digital', 'Publication automatique sur Facebook, Instagram et TikTok : calendrier éditorial, statistiques, IA générative', 'IA & Communication', 'MegaphoneIcon', 20, 42)
) AS v(code, nom, description, categorie, icone, prix, ordre)
WHERE NOT EXISTS (SELECT 1 FROM module_metiers WHERE module_metiers.code = v.code);

-- Ajouter le module au plan Enterprise
INSERT INTO plan_modules (id, plan_id, module_id, limite_usage, config)
SELECT gen_random_uuid(), p.id, m.id, NULL::integer, NULL::jsonb
FROM plans p
CROSS JOIN (VALUES ('marketing_digital')) AS v(module_code)
JOIN module_metiers m ON m.code = v.module_code
WHERE p.code = 'enterprise'
ON CONFLICT (plan_id, module_id) DO NOTHING;

-- Activer le module pour le tenant admin
INSERT INTO tenant_modules (id, tenant_id, module_id, actif, config, created_at, updated_at)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, m.id, true, NULL::jsonb, NOW(), NOW()
FROM module_metiers m
WHERE m.code = 'marketing_digital'
ON CONFLICT (tenant_id, module_id) DO NOTHING;

-- Vérification
SELECT '=== MODULE MARKETING DIGITAL ===' as section;
SELECT code, "nom_affiché", categorie, ordre_affichage FROM module_metiers WHERE code = 'marketing_digital';
