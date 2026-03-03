-- Fix: le ClientSpace "demo" avait client_tenant_id = tenant admin (00000000-...)
-- au lieu du vrai tenant du sous-domaine demo (ebeee7b6-...).
-- Ce tenant ID provient de l'erreur au login sur demo.talosprimes.com.
UPDATE client_spaces
SET client_tenant_id = 'ebeee7b6-6ddd-4993-96b4-20386e8565d6'
WHERE tenant_slug = 'demo'
  AND client_tenant_id = '00000000-0000-0000-0000-000000000001';
