-- seed-cms-pages.sql : Pages CMS par défaut (idempotent)
INSERT INTO cms_pages (id, slug, titre, contenu, meta_title, meta_description, publie, ordre, created_at, updated_at)
VALUES
  (
    gen_random_uuid(),
    'tarifs',
    'Nos Tarifs',
    '# Nos Tarifs

Découvrez nos formules adaptées à vos besoins.

Les tarifs affichés ci-dessous sont automatiquement synchronisés avec vos plans configurés.',
    'Tarifs - TalosPrimes',
    'Découvrez nos formules et tarifs adaptés à votre entreprise.',
    true,
    1,
    NOW(),
    NOW()
  )
ON CONFLICT (slug) DO NOTHING;
