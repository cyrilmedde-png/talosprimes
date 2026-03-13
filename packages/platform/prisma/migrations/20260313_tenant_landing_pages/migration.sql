-- AlterTable: Add slug to tenants
ALTER TABLE "tenants" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");

-- AlterTable: Add tenant_id to landing_sections
ALTER TABLE "landing_sections" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "landing_sections" ADD CONSTRAINT "landing_sections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "landing_sections_tenant_id_idx" ON "landing_sections"("tenant_id");

-- AlterTable: Add tenant_id to landing_global_config
-- First drop the unique constraint on section (it was @unique before, now it's @@unique([tenantId, section]))
ALTER TABLE "landing_global_config" DROP CONSTRAINT IF EXISTS "landing_global_config_section_key";
ALTER TABLE "landing_global_config" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "landing_global_config" ADD CONSTRAINT "landing_global_config_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "landing_global_config_tenant_id_section_key" ON "landing_global_config"("tenant_id", "section");
CREATE INDEX "landing_global_config_tenant_id_idx" ON "landing_global_config"("tenant_id");

-- AlterTable: Add tenant_id to testimonials
ALTER TABLE "testimonials" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "testimonials_tenant_id_idx" ON "testimonials"("tenant_id");
