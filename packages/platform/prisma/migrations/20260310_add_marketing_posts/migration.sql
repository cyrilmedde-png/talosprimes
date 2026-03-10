-- CreateEnum
CREATE TYPE "MarketingPlateforme" AS ENUM ('tiktok', 'instagram', 'facebook');

-- CreateEnum
CREATE TYPE "MarketingContentType" AS ENUM ('module_presentation', 'astuce', 'temoignage', 'promo');

-- CreateEnum
CREATE TYPE "MarketingPostStatus" AS ENUM ('planifie', 'publie', 'erreur');

-- CreateTable
CREATE TABLE "marketing_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "plateforme" "MarketingPlateforme" NOT NULL,
    "type" "MarketingContentType" NOT NULL,
    "sujet" VARCHAR(255) NOT NULL,
    "contenu_texte" TEXT,
    "contenu_visuel_url" TEXT,
    "hashtags" TEXT,
    "date_publication" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MarketingPostStatus" NOT NULL DEFAULT 'planifie',
    "post_external_id" VARCHAR(255),
    "engagement_data" JSONB,
    "semaine_cycle" INTEGER,
    "erreur_detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_posts_tenant_id_idx" ON "marketing_posts"("tenant_id");

-- CreateIndex
CREATE INDEX "marketing_posts_plateforme_idx" ON "marketing_posts"("plateforme");

-- CreateIndex
CREATE INDEX "marketing_posts_status_idx" ON "marketing_posts"("status");

-- CreateIndex
CREATE INDEX "marketing_posts_date_publication_idx" ON "marketing_posts"("date_publication");

-- CreateIndex
CREATE INDEX "marketing_posts_tenant_id_plateforme_date_publication_idx" ON "marketing_posts"("tenant_id", "plateforme", "date_publication");

-- AddForeignKey
ALTER TABLE "marketing_posts" ADD CONSTRAINT "marketing_posts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS
DO $$
BEGIN
  ALTER TABLE "marketing_posts" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "allow_postgres" ON "marketing_posts" FOR ALL TO postgres USING (true) WITH CHECK (true);
END
$$;
