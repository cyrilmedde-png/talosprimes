#!/bin/bash

# Script pour supprimer les WorkflowLinks qui écoutent client.created
# et déclenchent automatiquement l'onboarding (ce qui n'est pas souhaité)

set -e

echo "🔍 Recherche des WorkflowLinks pour client.created..."
echo ""

cd "$(dirname "$0")/.." || exit 1

# Charger les variables d'environnement
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Vérifier que DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL n'est pas défini dans .env"
  exit 1
fi

echo "📝 Vérification dans la base de données..."
echo ""

# Utiliser psql si disponible, sinon utiliser le script TypeScript
if command -v psql &> /dev/null; then
  echo "🔍 Recherche des WorkflowLinks pour client.created:"
  echo ""
  
  psql "$DATABASE_URL" -c "
    SELECT 
      id,
      tenant_id,
      type_evenement,
      workflow_n8n_id,
      workflow_n8n_nom,
      statut
    FROM workflow_links
    WHERE type_evenement = 'client.created';
  " || true
  
  echo ""
  echo "⚠️  Suppression de ces WorkflowLinks..."
  echo ""
  
  psql "$DATABASE_URL" -c "
    DELETE FROM workflow_links
    WHERE type_evenement = 'client.created';
  " || true
  
  echo "✅ WorkflowLinks supprimés"
else
  echo "⚠️  psql n'est pas disponible, utilisation du script TypeScript..."
  echo ""
  
  cd packages/platform || exit 1
  pnpm tsx scripts/fix-client-created-workflow.ts
fi

echo ""
echo "📝 Note importante:"
echo "   - L'événement client.created continuera d'être émis"
echo "   - Mais il ne déclenchera plus automatiquement de workflow"
echo "   - L'onboarding devra être déclenché explicitement via /api/clients/:id/onboarding"
echo ""

