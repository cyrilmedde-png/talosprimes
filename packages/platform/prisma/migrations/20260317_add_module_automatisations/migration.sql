-- Ajouter le module "automatisations" dans la table modules_metier
INSERT INTO modules_metier (id, code, "nom_affiché", description, categorie, "prix_par_mois", ordre_affichage, actif, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'automatisations',
  'Automatisations',
  'Catalogue d''automatisations n8n : gestion email, réseaux sociaux, agent téléphonique IA, comptabilité automatisée, etc.',
  'automation',
  0.00,
  50,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;
