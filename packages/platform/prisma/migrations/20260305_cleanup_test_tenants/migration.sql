-- Nettoyage complet des tenants de test (medde, eddem, roellinger, demo, etc.)
-- Garde UNIQUEMENT le tenant admin 00000000-0000-0000-0000-000000000001

-- 1. Supprimer les users des tenants de test
DELETE FROM users
WHERE tenant_id != '00000000-0000-0000-0000-000000000001';

-- 2. Supprimer les client_spaces (lien entre admin et espaces clients)
DELETE FROM client_spaces;

-- 3. Supprimer les client_modules
DELETE FROM client_modules;

-- 4. Supprimer les client_subscriptions
DELETE FROM client_subscriptions;

-- 5. Supprimer les client_finals (fiches clients côté admin)
DELETE FROM client_finals;

-- 6. Supprimer tous les tenants sauf admin
-- Les cascades Prisma supprimeront toutes les données liées (leads, factures, etc.)
DELETE FROM tenants
WHERE id != '00000000-0000-0000-0000-000000000001';

-- 7. Nettoyer les workflow_links des tenants supprimés (garder ceux de l'admin)
DELETE FROM workflow_links
WHERE tenant_id != '00000000-0000-0000-0000-000000000001';

-- 8. Nettoyer les leads orphelins (ceux des tenants supprimés)
-- Normalement déjà supprimés par cascade, mais par sécurité
DELETE FROM leads
WHERE tenant_id != '00000000-0000-0000-0000-000000000001';

-- 9. Nettoyer les notifications orphelines
DELETE FROM notifications
WHERE tenant_id != '00000000-0000-0000-0000-000000000001';
