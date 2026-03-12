-- ============================================================
-- SEED : Module conformité + 31 workflow_links
-- Exécuté automatiquement par update-vps.sh (étape 3 seeds SQL)
-- ============================================================

-- 1. Créer le module métier "conformite"
INSERT INTO module_metiers (id, code, "nom_affiché", description, prix_par_mois, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'conformite',
  'Conformité Fiscale',
  'Module conformité complète : FEC, Factur-X, E-Reporting, EDI-TVA, DAS2, Sirene, PAF, Archives, Périodes',
  0,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO UPDATE SET
  "nom_affiché" = EXCLUDED."nom_affiché",
  description = EXCLUDED.description,
  updated_at = NOW();

-- 2. Insérer les 31 workflow_links pour chaque tenant
DO $$
DECLARE
  t_id UUID;
  mod_id UUID;
  workflows TEXT[][] := ARRAY[
    -- {type_evenement, workflow_n8n_id, workflow_n8n_nom}
    -- Dashboard
    ARRAY['compta_conformite_dashboard',    'compta_conformite_dashboard',    'compta-conformite-dashboard'],
    -- FEC (4)
    ARRAY['compta_fec_generer',             'compta_fec_generer',             'compta-fec-generer'],
    ARRAY['compta_fec_liste',               'compta_fec_liste',              'compta-fec-liste'],
    ARRAY['compta_fec_valider',             'compta_fec_valider',            'compta-fec-valider'],
    ARRAY['compta_fec_exporter',            'compta_fec_exporter',           'compta-fec-exporter'],
    -- Factur-X (4)
    ARRAY['compta_facturx_generer',         'compta_facturx_generer',        'compta-facturx-generer'],
    ARRAY['compta_facturx_liste',           'compta_facturx_liste',          'compta-facturx-liste'],
    ARRAY['compta_facturx_statut',          'compta_facturx_statut',         'compta-facturx-statut'],
    ARRAY['compta_facturx_transmettre',     'compta_facturx_transmettre',    'compta-facturx-transmettre'],
    -- E-Reporting (3)
    ARRAY['compta_ereporting_generer',      'compta_ereporting_generer',     'compta-ereporting-generer'],
    ARRAY['compta_ereporting_liste',        'compta_ereporting_liste',       'compta-ereporting-liste'],
    ARRAY['compta_ereporting_transmettre',  'compta_ereporting_transmettre', 'compta-ereporting-transmettre'],
    -- EDI-TVA (3)
    ARRAY['compta_edi_tva_generer',         'compta_edi_tva_generer',        'compta-edi-tva-generer'],
    ARRAY['compta_edi_tva_liste',           'compta_edi_tva_liste',          'compta-edi-tva-liste'],
    ARRAY['compta_edi_tva_transmettre',     'compta_edi_tva_transmettre',    'compta-edi-tva-transmettre'],
    -- DAS2 (4)
    ARRAY['compta_das2_generer',            'compta_das2_generer',           'compta-das2-generer'],
    ARRAY['compta_das2_liste',              'compta_das2_liste',             'compta-das2-liste'],
    ARRAY['compta_das2_get',                'compta_das2_get',               'compta-das2-get'],
    ARRAY['compta_das2_transmettre',        'compta_das2_transmettre',       'compta-das2-transmettre'],
    -- Sirene (3)
    ARRAY['compta_sirene_verifier',         'compta_sirene_verifier',        'compta-sirene-verifier'],
    ARRAY['compta_sirene_verifier_lot',     'compta_sirene_verifier_lot',    'compta-sirene-verifier-lot'],
    ARRAY['compta_sirene_historique',        'compta_sirene_historique',      'compta-sirene-historique'],
    -- Piste Audit (3)
    ARRAY['compta_piste_audit_create',      'compta_piste_audit_create',     'compta-piste-audit-create'],
    ARRAY['compta_piste_audit_liste',       'compta_piste_audit_liste',      'compta-piste-audit-liste'],
    ARRAY['compta_piste_audit_chaine',      'compta_piste_audit_chaine',     'compta-piste-audit-chaine'],
    -- Archives (3)
    ARRAY['compta_archive_creer',           'compta_archive_creer',          'compta-archive-creer'],
    ARRAY['compta_archives_liste',          'compta_archives_liste',         'compta-archives-liste'],
    ARRAY['compta_archive_verifier',        'compta_archive_verifier',       'compta-archive-verifier'],
    -- Périodes (3)
    ARRAY['compta_periodes_generer',        'compta_periodes_generer',       'compta-periodes-generer'],
    ARRAY['compta_periodes_liste',          'compta_periodes_liste',         'compta-periodes-liste'],
    ARRAY['compta_periode_cloturer',        'compta_periode_cloturer',       'compta-periode-cloturer']
  ];
  w TEXT[];
BEGIN
  SELECT id INTO mod_id FROM module_metiers WHERE code = 'conformite';

  IF mod_id IS NULL THEN
    RAISE EXCEPTION 'Module métier "conformite" introuvable';
  END IF;

  FOR t_id IN SELECT id FROM tenants
  LOOP
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
    END LOOP;
  END LOOP;
END $$;
