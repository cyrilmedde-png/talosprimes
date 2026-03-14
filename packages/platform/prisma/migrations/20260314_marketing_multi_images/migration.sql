-- AlterTable
ALTER TABLE "marketing_posts" ADD COLUMN IF NOT EXISTS "contenu_visuel_urls" JSONB;

-- Migrer les données existantes
UPDATE "marketing_posts"
SET "contenu_visuel_urls" = jsonb_build_array("contenu_visuel_url")
WHERE "contenu_visuel_url" IS NOT NULL
  AND "contenu_visuel_urls" IS NULL;
