-- ============================================================
-- FIX: Insertion des WorkflowLinks MANQUANTS pour TOUS les tenants
-- Exécuter sur le VPS: psql "$DATABASE_URL" < scripts/fix-missing-workflow-links.sql
-- ============================================================

DO $$
DECLARE
  t_id UUID;
  mod_id UUID;
  workflows TEXT[][];
  w TEXT[];
BEGIN
  -- ============================
  -- 1. DEVIS: devis_convert_to_bdc MANQUANT
  -- ============================
  SELECT id INTO mod_id FROM module_metiers WHERE code = 'devis';
  IF mod_id IS NOT NULL THEN
    workflows := ARRAY[
      ARRAY['devis_convert_to_bdc', 'devis_convert_to_bdc', 'devis-convert-to-bdc']
    ];
    FOR t_id IN SELECT id FROM tenants LOOP
      FOREACH w SLICE 1 IN ARRAY workflows LOOP
        INSERT INTO workflow_links (id, tenant_id, module_metier_id, type_evenement, workflow_n8n_id, workflow_n8n_nom, statut, created_at, updated_at)
        VALUES (gen_random_uuid(), t_id, mod_id, w[1], w[2], w[3], 'actif', NOW(), NOW())
        ON CONFLICT (tenant_id, type_evenement) DO UPDATE SET workflow_n8n_id = EXCLUDED.workflow_n8n_id, workflow_n8n_nom = EXCLUDED.workflow_n8n_nom, statut = 'actif', updated_at = NOW();
      END LOOP;
    END LOOP;
    RAISE NOTICE '✅ devis_convert_to_bdc ajouté';
  END IF;

  -- ============================
  -- 2. FACTURATION: invoice_send, invoice_delete, invoice_convert_to_avoir MANQUANTS
  -- ============================
  SELECT id INTO mod_id FROM module_metiers WHERE code = 'facturation';
  IF mod_id IS NOT NULL THEN
    workflows := ARRAY[
      ARRAY['invoice_send', 'invoice_send', 'invoice-sent'],
      ARRAY['invoice_delete', 'invoice_delete', 'invoice-deleted'],
      ARRAY['invoice_convert_to_avoir', 'invoice_convert_to_avoir', 'invoice-convert-to-avoir']
    ];
    FOR t_id IN SELECT id FROM tenants LOOP
      FOREACH w SLICE 1 IN ARRAY workflows LOOP
        INSERT INTO workflow_links (id, tenant_id, module_metier_id, type_evenement, workflow_n8n_id, workflow_n8n_nom, statut, created_at, updated_at)
        VALUES (gen_random_uuid(), t_id, mod_id, w[1], w[2], w[3], 'actif', NOW(), NOW())
        ON CONFLICT (tenant_id, type_evenement) DO UPDATE SET workflow_n8n_id = EXCLUDED.workflow_n8n_id, workflow_n8n_nom = EXCLUDED.workflow_n8n_nom, statut = 'actif', updated_at = NOW();
      END LOOP;
    END LOOP;
    RAISE NOTICE '✅ invoice_send, invoice_delete, invoice_convert_to_avoir ajoutés';
  END IF;

  -- ============================
  -- 3. CLIENTS: client_onboarding, stripe_checkout_completed, client_space_* MANQUANTS
  -- ============================
  SELECT id INTO mod_id FROM module_metiers WHERE code = 'clients';
  IF mod_id IS NOT NULL THEN
    workflows := ARRAY[
      ARRAY['client_onboarding', 'client_onboarding', 'client-onboarding'],
      ARRAY['stripe_checkout_completed', 'stripe_checkout_completed', 'stripe-checkout-completed'],
      ARRAY['client_space_create', 'client_space_create', 'client-space-create'],
      ARRAY['client_space_validate', 'client_space_validate', 'client-space-validate'],
      ARRAY['client_space_list', 'client_space_list', 'client-space-list'],
      ARRAY['client_space_get', 'client_space_get', 'client-space-get'],
      ARRAY['client_space_resend_email', 'client_space_resend_email', 'client-space-resend-email']
    ];
    FOR t_id IN SELECT id FROM tenants LOOP
      FOREACH w SLICE 1 IN ARRAY workflows LOOP
        INSERT INTO workflow_links (id, tenant_id, module_metier_id, type_evenement, workflow_n8n_id, workflow_n8n_nom, statut, created_at, updated_at)
        VALUES (gen_random_uuid(), t_id, mod_id, w[1], w[2], w[3], 'actif', NOW(), NOW())
        ON CONFLICT (tenant_id, type_evenement) DO UPDATE SET workflow_n8n_id = EXCLUDED.workflow_n8n_id, workflow_n8n_nom = EXCLUDED.workflow_n8n_nom, statut = 'actif', updated_at = NOW();
      END LOOP;
    END LOOP;
    RAISE NOTICE '✅ client_onboarding, stripe, client_space_* ajoutés';
  END IF;

  -- ============================
  -- 4. COMPTABILITÉ: compta_auto_facture (s assurer qu il existe)
  -- ============================
  SELECT id INTO mod_id FROM module_metiers WHERE code = 'comptabilite';
  IF mod_id IS NOT NULL THEN
    workflows := ARRAY[
      ARRAY['compta_auto_facture', 'compta_auto_facture', 'compta-auto-facture'],
      ARRAY['compta_auto_avoir', 'compta_auto_avoir', 'compta-auto-avoir'],
      ARRAY['compta_auto_paiement', 'compta_auto_paiement', 'compta-auto-paiement']
    ];
    FOR t_id IN SELECT id FROM tenants LOOP
      FOREACH w SLICE 1 IN ARRAY workflows LOOP
        INSERT INTO workflow_links (id, tenant_id, module_metier_id, type_evenement, workflow_n8n_id, workflow_n8n_nom, statut, created_at, updated_at)
        VALUES (gen_random_uuid(), t_id, mod_id, w[1], w[2], w[3], 'actif', NOW(), NOW())
        ON CONFLICT (tenant_id, type_evenement) DO UPDATE SET workflow_n8n_id = EXCLUDED.workflow_n8n_id, workflow_n8n_nom = EXCLUDED.workflow_n8n_nom, statut = 'actif', updated_at = NOW();
      END LOOP;
    END LOOP;
    RAISE NOTICE '✅ compta_auto_* confirmés';
  END IF;

  RAISE NOTICE '✅ Tous les workflow_links manquants ont été ajoutés.';
END $$;

-- ============================================================
-- VÉRIFICATION: Compter les workflow_links par type
-- ============================================================
SELECT type_evenement, workflow_n8n_nom, statut, COUNT(*) as tenants
FROM workflow_links
WHERE type_evenement IN (
  'devis_convert_to_bdc',
  'invoice_send', 'invoice_delete', 'invoice_convert_to_avoir',
  'client_onboarding', 'stripe_checkout_completed',
  'client_space_create', 'client_space_validate', 'client_space_list', 'client_space_get', 'client_space_resend_email',
  'compta_auto_facture', 'compta_auto_avoir', 'compta_auto_paiement'
)
GROUP BY type_evenement, workflow_n8n_nom, statut
ORDER BY type_evenement;
