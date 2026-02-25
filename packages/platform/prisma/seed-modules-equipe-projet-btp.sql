-- ============================================
-- SEED: Modules Gestion d'Équipe, Projets, BTP
-- À exécuter après prisma db push
-- ============================================

-- Insérer les 3 nouveaux modules
INSERT INTO module_metiers (id, code, "nom_affiché", description, categorie, icone, prix_par_mois, ordre_affichage, actif, created_at, updated_at)
SELECT gen_random_uuid(), v.code, v.nom, v.description, v.categorie, v.icone, v.prix, v.ordre, true, NOW(), NOW()
FROM (VALUES
  ('gestion_equipe', 'Gestion d''Équipe', 'Gestion complète des membres, absences et pointage', 'Ressources Humaines', 'UsersIcon', 15, 14),
  ('gestion_projet', 'Gestion de Projets', 'Suivi de projets, tâches, budgets et progression', 'Gestion', 'ClipboardDocumentListIcon', 15, 15),
  ('btp', 'BTP', 'Gestion de chantiers, situations de travaux et avancement', 'Métier', 'WrenchScrewdriverIcon', 20, 16)
) AS v(code, nom, description, categorie, icone, prix, ordre)
WHERE NOT EXISTS (SELECT 1 FROM module_metiers WHERE module_metiers.code = v.code);

-- Ajouter les modules au plan Enterprise
INSERT INTO plan_modules (id, plan_id, module_id, limite_usage, config)
SELECT gen_random_uuid(), p.id, m.id, NULL::integer, NULL::jsonb
FROM plans p
CROSS JOIN (VALUES
  ('gestion_equipe'),
  ('gestion_projet'),
  ('btp')
) AS v(module_code)
JOIN module_metiers m ON m.code = v.module_code
WHERE p.code = 'enterprise'
ON CONFLICT (plan_id, module_id) DO NOTHING;

-- Vérification
SELECT '=== NOUVEAUX MODULES ===' as section;
SELECT code, "nom_affiché", categorie, ordre_affichage FROM module_metiers WHERE code IN ('gestion_equipe', 'gestion_projet', 'btp') ORDER BY ordre_affichage;
