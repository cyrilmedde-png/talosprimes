-- CreateTable: landing_sections (sections configurables de la landing page)
CREATE TABLE "landing_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "titre" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable: landing_global_config (config globale: navbar, footer, seo, theme)
CREATE TABLE "landing_global_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "section" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_global_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "landing_sections_ordre_idx" ON "landing_sections"("ordre");
CREATE INDEX "landing_sections_actif_idx" ON "landing_sections"("actif");
CREATE UNIQUE INDEX "landing_global_config_section_key" ON "landing_global_config"("section");
CREATE INDEX "landing_global_config_section_idx" ON "landing_global_config"("section");

-- Enable RLS
ALTER TABLE "landing_sections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "landing_global_config" ENABLE ROW LEVEL SECURITY;

-- Policies (lecture publique, écriture admin via API)
CREATE POLICY "landing_sections_select" ON "landing_sections" FOR SELECT USING (true);
CREATE POLICY "landing_global_config_select" ON "landing_global_config" FOR SELECT USING (true);
