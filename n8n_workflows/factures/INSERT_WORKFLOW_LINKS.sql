-- ============================================================
-- TALOSPRIMES — Insertion des WorkflowLinks pour la facturation
-- À exécuter dans Supabase SQL Editor ou psql
-- ============================================================
--
-- Prérequis :
--   1. Les 7 workflows doivent être importés dans n8n
--   2. Le module métier "facturation" doit exister
--   3. Au moins 1 tenant doit exister
--
-- Ce script :
--   - Crée le module métier "facturation" s'il n'existe pas
--   - Insère les 6 workflow_links pour TOUS les tenants actifs
--   - Gère les conflits (si un lien existe déjà, il le met à jour)
-- ============================================================

-- -------------------------------------------------------
-- ÉTAPE 1 : Créer le module métier "facturation" s'il manque
-- -------------------------------------------------------
INSERT INTO module_metiers (id, code, "nom_affiché", description, prix_par_mois, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'facturation',
  'Facturation',
  'Module de gestion des factures : création, suivi, paiement, relance',
  0.00,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- -------------------------------------------------------
-- ÉTAPE 2 : Vérifier ce qui existe
-- -------------------------------------------------------
-- Lancer cette requête d'abord pour voir vos tenants et le module :
--
--   SELECT t.id, t.nom_entreprise
--   FROM tenants t
--   ORDER BY t.created_at;
--
--   SELECT id, code, "nom_affiché"
--   FROM module_metiers
--   WHERE code = 'facturation';

-- -------------------------------------------------------
-- ÉTAPE 3 : Insérer les 6 WorkflowLinks pour CHAQUE tenant
-- -------------------------------------------------------
-- Ce bloc insère automatiquement pour TOUS les tenants existants.
-- Si un lien (tenant_id + type_evenement) existe déjà, il est mis à jour.

DO $$
DECLARE
  t_id UUID;
  mod_id UUID;
  workflows TEXT[][] := ARRAY[
    -- {type_evenement, workflow_n8n_id, workflow_n8n_nom}
    ARRAY['invoice_create',  'invoice_create',  'invoice-created'],
    ARRAY['invoices_list',   'invoices_list',   'invoices-list'],
    ARRAY['invoice_get',     'invoice_get',     'invoice-get'],
    ARRAY['invoice_update',  'invoice_update',  'invoice-update'],
    ARRAY['invoice_paid',    'invoice_paid',    'invoice-paid'],
    ARRAY['invoice_overdue', 'invoice_overdue', 'invoice-overdue']
  ];
  w TEXT[];
BEGIN
  -- Récupérer l'ID du module facturation
  SELECT id INTO mod_id FROM module_metiers WHERE code = 'facturation';

  IF mod_id IS NULL THEN
    RAISE EXCEPTION 'Module métier "facturation" introuvable. Vérifiez l''étape 1.';
  END IF;

  RAISE NOTICE 'Module facturation trouvé: %', mod_id;

  -- Boucler sur chaque tenant
  FOR t_id IN SELECT id FROM tenants
  LOOP
    RAISE NOTICE 'Tenant: %', t_id;

    -- Boucler sur chaque workflow
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
        w[1],  -- type_evenement
        w[2],  -- workflow_n8n_id (= clé pour WEBHOOK_PATH_ALIASES)
        w[3],  -- workflow_n8n_nom (nom lisible)
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
-- ÉTAPE 4 : Vérification finale
-- -------------------------------------------------------
-- Lancer après l'insertion pour vérifier :

SELECT
  t.nom_entreprise,
  wl.type_evenement,
  wl.workflow_n8n_id,
  wl.workflow_n8n_nom,
  wl.statut,
  wl.created_at
FROM workflow_links wl
JOIN tenants t ON t.id = wl.tenant_id
WHERE wl.type_evenement LIKE 'invoice%'
ORDER BY t.nom_entreprise, wl.type_evenement;


-- ============================================================
-- BONUS : Si tu veux ajouter les liens pour UN SEUL tenant
-- (remplacer les UUID par les vrais)
-- ============================================================
--
-- INSERT INTO workflow_links (id, tenant_id, module_metier_id, type_evenement, workflow_n8n_id, workflow_n8n_nom, statut, created_at, updated_at)
-- VALUES
--   (gen_random_uuid(), 'VOTRE-TENANT-UUID', 'VOTRE-MODULE-UUID', 'invoice_create',  'invoice_create',  'invoice-created',  'actif', NOW(), NOW()),
--   (gen_random_uuid(), 'VOTRE-TENANT-UUID', 'VOTRE-MODULE-UUID', 'invoices_list',   'invoices_list',   'invoices-list',    'actif', NOW(), NOW()),
--   (gen_random_uuid(), 'VOTRE-TENANT-UUID', 'VOTRE-MODULE-UUID', 'invoice_get',     'invoice_get',     'invoice-get',      'actif', NOW(), NOW()),
--   (gen_random_uuid(), 'VOTRE-TENANT-UUID', 'VOTRE-MODULE-UUID', 'invoice_update',  'invoice_update',  'invoice-update',   'actif', NOW(), NOW()),
--   (gen_random_uuid(), 'VOTRE-TENANT-UUID', 'VOTRE-MODULE-UUID', 'invoice_paid',    'invoice_paid',    'invoice-paid',     'actif', NOW(), NOW()),
--   (gen_random_uuid(), 'VOTRE-TENANT-UUID', 'VOTRE-MODULE-UUID', 'invoice_overdue', 'invoice_overdue', 'invoice-overdue',  'actif', NOW(), NOW())
-- ON CONFLICT (tenant_id, type_evenement) DO UPDATE SET
--   workflow_n8n_id = EXCLUDED.workflow_n8n_id,
--   workflow_n8n_nom = EXCLUDED.workflow_n8n_nom,
--   statut = 'actif',
--   updated_at = NOW();
