-- Migration: Ajout du champ contenu_visuel_urls pour supporter les images multiples
-- Date: 2026-03-14
-- Description: Ajoute un champ JSONB pour stocker un tableau d'URLs d'images
--              Le champ contenu_visuel_url existant est conservé pour rétro-compatibilité

ALTER TABLE marketing_posts
  ADD COLUMN IF NOT EXISTS contenu_visuel_urls JSONB DEFAULT NULL;

-- Migrer les données existantes : si contenu_visuel_url existe, créer le tableau correspondant
UPDATE marketing_posts
SET contenu_visuel_urls = jsonb_build_array(contenu_visuel_url)
WHERE contenu_visuel_url IS NOT NULL
  AND contenu_visuel_urls IS NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN marketing_posts.contenu_visuel_urls IS 'Tableau JSON des URLs des images (multi-images). contenu_visuel_url contient toujours la première image pour rétro-compat.';
