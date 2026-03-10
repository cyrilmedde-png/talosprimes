-- Fix: le ClientSpace "demo" avait client_tenant_id = tenant admin (00000000-...)
-- au lieu du vrai tenant du sous-domaine demo (ebeee7b6-...).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_spaces') THEN
    UPDATE client_spaces
    SET client_tenant_id = 'ebeee7b6-6ddd-4993-96b4-20386e8565d6'
    WHERE tenant_slug = 'demo'
      AND client_tenant_id = '00000000-0000-0000-0000-000000000001';
  END IF;
END
$$;
