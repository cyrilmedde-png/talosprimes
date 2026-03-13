-- Migration: Lier les landing pages aux ClientSpaces (clients) au lieu des Tenants
-- Chaque client a son propre ClientSpace avec un tenantSlug (sous-domaine)

-- 1. Ajouter client_space_id aux tables landing
ALTER TABLE "landing_sections" ADD COLUMN "client_space_id" UUID;
ALTER TABLE "landing_global_config" ADD COLUMN "client_space_id" UUID;

-- 2. Foreign keys vers client_spaces
ALTER TABLE "landing_sections" ADD CONSTRAINT "landing_sections_client_space_id_fkey"
  FOREIGN KEY ("client_space_id") REFERENCES "client_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "landing_global_config" ADD CONSTRAINT "landing_global_config_client_space_id_fkey"
  FOREIGN KEY ("client_space_id") REFERENCES "client_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Index pour les requêtes par clientSpace
CREATE INDEX "landing_sections_client_space_id_idx" ON "landing_sections"("client_space_id");
CREATE INDEX "landing_global_config_client_space_id_idx" ON "landing_global_config"("client_space_id");

-- 4. Remplacer la contrainte unique sur landing_global_config
-- Ancienne : (tenant_id, section) → Nouvelle : (client_space_id, section)
DROP INDEX IF EXISTS "landing_global_config_tenant_id_section_key";
CREATE UNIQUE INDEX "landing_global_config_client_space_id_section_key" ON "landing_global_config"("client_space_id", "section");

-- 5. Annuler le slug "demo" assigné par erreur au tenant plateforme
UPDATE "tenants" SET "slug" = NULL WHERE "id" = '00000000-0000-0000-0000-000000000001' AND "slug" = 'demo';

-- 6. Nettoyer les éventuelles sections créées par le script précédent pour le tenant plateforme
DELETE FROM "landing_sections" WHERE "tenant_id" = '00000000-0000-0000-0000-000000000001';
DELETE FROM "landing_global_config" WHERE "tenant_id" = '00000000-0000-0000-0000-000000000001';
