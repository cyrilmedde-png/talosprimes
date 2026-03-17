-- Migration: Ajouter tenant_id aux pages CMS pour l'isolation multi-tenant
-- Chaque client a ses propres pages CMS, filtrees par tenant_id

-- 1. Ajouter la colonne tenant_id (nullable au debut pour migrer les donnees)
ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 2. Associer les pages existantes au tenant principal (talosprimes)
-- On prend le premier tenant super_admin comme proprietaire des pages existantes
UPDATE cms_pages
SET tenant_id = (
  SELECT t.id FROM tenants t
  JOIN users u ON u.tenant_id = t.id
  WHERE u.role = 'super_admin'
  LIMIT 1
)
WHERE tenant_id IS NULL;

-- 3. Supprimer l'ancien index unique sur slug seul
ALTER TABLE cms_pages DROP CONSTRAINT IF EXISTS cms_pages_slug_key;
DROP INDEX IF EXISTS cms_pages_slug_key;

-- 4. Creer la contrainte unique sur (tenant_id, slug)
-- Permet le meme slug pour differents tenants
ALTER TABLE cms_pages ADD CONSTRAINT cms_pages_tenant_slug_unique UNIQUE (tenant_id, slug);

-- 5. Ajouter un index sur tenant_id pour les performances
CREATE INDEX IF NOT EXISTS idx_cms_pages_tenant_id ON cms_pages(tenant_id);

-- 6. Index compose pour les requetes frequentes
CREATE INDEX IF NOT EXISTS idx_cms_pages_tenant_publie ON cms_pages(tenant_id, publie);

-- 7. Activer RLS sur cms_pages
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;

-- Policy: un tenant ne voit que ses propres pages
DROP POLICY IF EXISTS cms_pages_tenant_isolation ON cms_pages;
CREATE POLICY cms_pages_tenant_isolation ON cms_pages
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
