-- ============================================================
-- TALOSPRIMES — Insertion des WorkflowLinks pour la COMPTABILITÉ
-- À exécuter dans Supabase SQL Editor
-- ============================================================
-- Prérequis :
--   1. Les workflows n8n compta doivent être importés
--   2. Au moins 1 tenant doit exister
-- ============================================================

-- -------------------------------------------------------
-- ÉTAPE 1 : Créer le module métier "comptabilite"
-- -------------------------------------------------------
INSERT INTO module_metiers (id, code, "nom_affiché", description, prix_par_mois, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'comptabilite',
  'Comptabilité PCG',
  'Module comptabilité complète : écritures, grand livre, balance, bilan, TVA, agent IA',
  0,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO UPDATE SET
  "nom_affiché" = EXCLUDED."nom_affiché",
  description = EXCLUDED.description,
  updated_at = NOW();

-- -------------------------------------------------------
-- ÉTAPE 2 : Insérer les workflow_links pour chaque tenant
-- -------------------------------------------------------
DO $$
DECLARE
  t_id UUID;
  mod_id UUID;
  workflows TEXT[][] := ARRAY[
    -- {type_evenement, workflow_n8n_id, workflow_n8n_nom}
    ARRAY['compta_init',                'compta_init',                'compta-init'],
    ARRAY['compta_plan_comptable_list', 'compta_plan_comptable_list', 'compta-plan-comptable-list'],
    ARRAY['compta_ecriture_create',     'compta_ecriture_create',     'compta-ecriture-create'],
    ARRAY['compta_ecritures_list',      'compta_ecritures_list',      'compta-ecritures-list'],
    ARRAY['compta_ecriture_get',        'compta_ecriture_get',        'compta-ecriture-get'],
    ARRAY['compta_auto_facture',        'compta_auto_facture',        'compta-auto-facture'],
    ARRAY['compta_auto_avoir',          'compta_auto_avoir',          'compta-auto-avoir'],
    ARRAY['compta_auto_paiement',       'compta_auto_paiement',       'compta-auto-paiement'],
    ARRAY['compta_grand_livre',         'compta_grand_livre',         'compta-grand-livre'],
    ARRAY['compta_balance',             'compta_balance',             'compta-balance'],
    ARRAY['compta_bilan',               'compta_bilan',               'compta-bilan'],
    ARRAY['compta_compte_resultat',     'compta_compte_resultat',     'compta-compte-resultat'],
    ARRAY['compta_tva',                 'compta_tva',                 'compta-tva'],
    ARRAY['compta_lettrage',            'compta_lettrage',            'compta-lettrage'],
    ARRAY['compta_cloture',             'compta_cloture',             'compta-cloture'],
    ARRAY['compta_dashboard',           'compta_dashboard',           'compta-dashboard'],
    ARRAY['compta_ia_agent',            'compta_ia_agent',            'compta-ia-agent']
  ];
  w TEXT[];
BEGIN
  SELECT id INTO mod_id FROM module_metiers WHERE code = 'comptabilite';

  IF mod_id IS NULL THEN
    RAISE EXCEPTION 'Module métier "comptabilite" introuvable. Vérifiez l''étape 1.';
  END IF;

  RAISE NOTICE 'Module comptabilite trouvé: %', mod_id;

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

  RAISE NOTICE '✅ 17 workflow_links comptabilité insérés pour tous les tenants.';
END $$;

-- -------------------------------------------------------
-- ÉTAPE 3 : Vérification
-- -------------------------------------------------------
SELECT type_evenement, workflow_n8n_nom, statut
FROM workflow_links
WHERE type_evenement LIKE 'compta_%'
ORDER BY type_evenement;
