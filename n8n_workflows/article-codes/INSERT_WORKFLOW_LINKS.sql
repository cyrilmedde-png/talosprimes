-- ============================================================
-- TALOSPRIMES — Insertion des WorkflowLinks pour les codes articles
-- À exécuter dans Supabase SQL Editor ou psql
-- ============================================================
--
-- Prérequis :
--   1. Les 4 workflows doivent être importés dans n8n
--   2. Le module métier "articles" doit exister (créé ci-dessous)
--   3. Au moins 1 tenant doit exister
-- ============================================================

-- -------------------------------------------------------
-- ÉTAPE 1 : Créer le module métier "articles" s'il manque
-- -------------------------------------------------------
INSERT INTO module_metiers (id, code, "nom_affiché", description, prix_par_mois, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'articles',
  'Codes Articles',
  'Module de gestion du catalogue articles : création, modification, suppression',
  0.00,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- -------------------------------------------------------
-- ÉTAPE 2 : Insérer les 4 WorkflowLinks pour CHAQUE tenant
-- -------------------------------------------------------

DO $$
DECLARE
  t_id UUID;
  mod_id UUID;
  workflows TEXT[][] := ARRAY[
    -- {type_evenement, workflow_n8n_id, workflow_n8n_nom}
    ARRAY['article_codes_list',  'article_codes_list',  'article-codes-list'],
    ARRAY['article_code_create', 'article_code_create', 'article-code-created'],
    ARRAY['article_code_update', 'article_code_update', 'article-code-updated'],
    ARRAY['article_code_delete', 'article_code_delete', 'article-code-deleted']
  ];
  w TEXT[];
BEGIN
  SELECT id INTO mod_id FROM module_metiers WHERE code = 'articles';

  IF mod_id IS NULL THEN
    RAISE EXCEPTION 'Module métier "articles" introuvable. Vérifiez l''étape 1.';
  END IF;

  RAISE NOTICE 'Module articles trouvé: %', mod_id;

  FOR t_id IN SELECT id FROM tenants
  LOOP
    RAISE NOTICE 'Tenant: %', t_id;

    FOREACH w SLICE 1 IN ARRAY workflows
    LOOP
      INSERT INTO workflow_links (
        id, tenant_id, module_metier_id, type_evenement,
        workflow_n8n_id, workflow_n8n_nom, statut, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(),
        t_id,
        mod_id,
        w[1],
        w[2],
        w[3],
        'actif',
        NOW(),
        NOW()
      )
      ON CONFLICT (tenant_id, type_evenement)
      DO UPDATE SET
        workflow_n8n_id  = EXCLUDED.workflow_n8n_id,
        workflow_n8n_nom = EXCLUDED.workflow_n8n_nom,
        module_metier_id = EXCLUDED.module_metier_id,
        statut           = 'actif',
        updated_at       = NOW();

      RAISE NOTICE '  → % : OK', w[1];
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Terminé.';
END $$;

-- -------------------------------------------------------
-- ÉTAPE 3 : Vérification finale
-- -------------------------------------------------------

SELECT
  t.nom_entreprise,
  wl.type_evenement,
  wl.workflow_n8n_id,
  wl.workflow_n8n_nom,
  wl.statut
FROM workflow_links wl
JOIN tenants t ON t.id = wl.tenant_id
WHERE wl.type_evenement LIKE 'article_%'
ORDER BY t.nom_entreprise, wl.type_evenement;
