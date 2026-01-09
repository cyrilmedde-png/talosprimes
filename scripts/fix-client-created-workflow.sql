-- Script SQL pour supprimer les WorkflowLinks qui écoutent client.created
-- et déclenchent automatiquement l'onboarding (ce qui n'est pas souhaité)
-- 
-- Usage: psql $DATABASE_URL -f scripts/fix-client-created-workflow.sql

-- Afficher les WorkflowLinks problématiques avant suppression
\echo '🔍 Recherche des WorkflowLinks pour client.created...'
\echo ''

SELECT 
    id,
    tenant_id,
    type_evenement,
    workflow_n8n_id,
    workflow_n8n_nom,
    statut,
    created_at
FROM workflow_links
WHERE type_evenement = 'client.created';

\echo ''
\echo '⚠️  Suppression de ces WorkflowLinks...'
\echo ''

-- Supprimer tous les WorkflowLinks qui écoutent client.created
DELETE FROM workflow_links
WHERE type_evenement = 'client.created';

-- Vérifier qu'ils ont bien été supprimés
\echo '✅ Vérification après suppression...'
\echo ''

SELECT 
    COUNT(*) as count_restants
FROM workflow_links
WHERE type_evenement = 'client.created';

-- Afficher les WorkflowLinks pour client.onboarding (ceux-ci doivent rester)
\echo ''
\echo '✅ WorkflowLinks pour client.onboarding (doivent rester actifs):'
\echo ''

SELECT 
    id,
    tenant_id,
    type_evenement,
    workflow_n8n_id,
    workflow_n8n_nom,
    statut
FROM workflow_links
WHERE type_evenement = 'client.onboarding';

\echo ''
\echo '📝 Note importante:'
\echo '   - L''événement client.created continuera d''être émis'
\echo '   - Mais il ne déclenchera plus automatiquement de workflow'
\echo '   - L''onboarding devra être déclenché explicitement via /api/clients/:id/onboarding'
\echo ''

