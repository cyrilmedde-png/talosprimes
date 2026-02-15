-- ============================================================
-- TALOSPRIMES — Insertion des WorkflowLinks pour les bons de commande
-- À exécuter dans Supabase SQL Editor ou psql
-- ============================================================
--
-- Prérequis :
--   1. Les 6 workflows doivent être importés dans n8n
--   2. Le module métier "bons_commande" doit exister (créé ci-dessous)
--   3. Au moins 1 tenant doit exister
-- ============================================================

-- -------------------------------------------------------
-- ÉTAPE 1 : Créer le module métier "bons_commande" s'il manque
-- -------------------------------------------------------
INSERT INTO module_metiers (id, code, "nom_affiché", description, prix_par_mois, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'bons_commande',
  'Bons de Commande',
  'Module de gestion des bons de commande : création, validation, conversion en facture',
  0.00,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- -------------------------------------------------------
-- ÉTAPE 2 : Insérer les 6 WorkflowLinks pour CHAQUE tenant
-- -------------------------------------------------------

DO $$
DECLARE
  t_id UUID;
  mod_id UUID;
  workflows TEXT[][] := ARRAY[
    -- {type_evenement, workflow_n8n_id, workflow_n8n_nom}
    ARRAY['bdc_list',               'bdc_list',               'bdc-list'],
    ARRAY['bdc_get',                'bdc_get',                'bdc-get'],
    ARRAY['bdc_create',             'bdc_create',             'bdc-created'],
    ARRAY['bdc_validate',           'bdc_validate',           'bdc-validated'],
    ARRAY['bdc_convert_to_invoice', 'bdc_convert_to_invoice', 'bdc-convert-to-invoice'],
    ARRAY['bdc_delete',             'bdc_delete',             'bdc-deleted']
  ];
  w TEXT[];
BEGIN
  SELECT id INTO mod_id FROM module_metiers WHERE code = 'bons_commande';

  IF mod_id IS NULL THEN
    RAISE EXCEPTION 'Module métier "bons_commande" introuvable. Vérifiez l''étape 1.';
  END IF;

  RAISE NOTICE 'Module bons_commande trouvé: %', mod_id;

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
WHERE wl.type_evenement LIKE 'bdc_%'
ORDER BY t.nom_entreprise, wl.type_evenement;
