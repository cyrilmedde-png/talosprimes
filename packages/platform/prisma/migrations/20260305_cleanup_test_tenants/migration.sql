-- Nettoyage complet des tenants de test (medde, eddem, roellinger, demo, etc.)
-- Garde UNIQUEMENT le tenant admin 00000000-0000-0000-0000-000000000001
-- Utilise IF EXISTS pour compatibilité shadow database

DO $$
BEGIN
  -- 1. Supprimer les users des tenants de test
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    DELETE FROM users WHERE tenant_id != '00000000-0000-0000-0000-000000000001';
  END IF;

  -- 2. Supprimer les client_spaces
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_spaces') THEN
    DELETE FROM client_spaces;
  END IF;

  -- 3. Supprimer les client_modules (table supprimée du schéma)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_modules') THEN
    DELETE FROM client_modules;
  END IF;

  -- 4. Supprimer les client_subscriptions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_subscriptions') THEN
    DELETE FROM client_subscriptions;
  END IF;

  -- 5. Supprimer les client_finals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_finals') THEN
    DELETE FROM client_finals;
  END IF;

  -- 6. Supprimer tous les tenants sauf admin
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tenants') THEN
    DELETE FROM tenants WHERE id != '00000000-0000-0000-0000-000000000001';
  END IF;

  -- 7. Nettoyer les workflow_links
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='workflow_links') THEN
    DELETE FROM workflow_links WHERE tenant_id != '00000000-0000-0000-0000-000000000001';
  END IF;

  -- 8. Nettoyer les leads orphelins
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='leads') THEN
    DELETE FROM leads WHERE tenant_id != '00000000-0000-0000-0000-000000000001';
  END IF;

  -- 9. Nettoyer les notifications orphelines
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications') THEN
    DELETE FROM notifications WHERE tenant_id != '00000000-0000-0000-0000-000000000001';
  END IF;
END
$$;
