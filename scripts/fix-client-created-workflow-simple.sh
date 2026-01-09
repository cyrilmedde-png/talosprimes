#!/bin/bash

# Script simplifié pour supprimer les WorkflowLinks qui écoutent client.created
# Usage sur VPS: ./scripts/fix-client-created-workflow-simple.sh

set -e

# Trouver le répertoire du script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT" || exit 1

echo "🔍 Recherche des WorkflowLinks pour client.created..."
echo ""

# Charger DATABASE_URL depuis .env si disponible
if [ -f "$PROJECT_ROOT/.env" ]; then
  echo "📝 Chargement du fichier .env..."
  set -a  # Export automatique des variables
  source "$PROJECT_ROOT/.env"
  set +a
elif [ -f "$PROJECT_ROOT/packages/platform/.env" ]; then
  echo "📝 Chargement du fichier .env depuis packages/platform..."
  set -a
  source "$PROJECT_ROOT/packages/platform/.env"
  set +a
fi

# Vérifier si DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL n'est pas défini"
  echo "   Vérifiez que le fichier .env existe et contient DATABASE_URL"
  echo "   Ou utilisez: export DATABASE_URL='votre_url_de_connexion'"
  exit 1
fi

echo "✅ DATABASE_URL chargé"
echo ""

# Afficher les WorkflowLinks problématiques
echo "📋 WorkflowLinks trouvés pour client.created:"
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
" || echo "⚠️  Erreur lors de la requête (peut-être qu'aucun n'existe)"

echo ""
echo "⚠️  Suppression de ces WorkflowLinks..."
echo ""

# Supprimer les WorkflowLinks problématiques
psql "$DATABASE_URL" -c "
  DELETE FROM workflow_links
  WHERE type_evenement = 'client.created';
" || {
  echo "❌ Erreur lors de la suppression"
  exit 1
}

# Vérifier qu'ils ont été supprimés
DELETED_COUNT=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) 
  FROM workflow_links 
  WHERE type_evenement = 'client.created';
" | xargs)

if [ "$DELETED_COUNT" = "0" ]; then
  echo "✅ Tous les WorkflowLinks pour client.created ont été supprimés"
else
  echo "⚠️  Il reste $DELETED_COUNT WorkflowLink(s) pour client.created"
fi

echo ""
echo "✅ WorkflowLinks pour client.onboarding (doivent rester):"
psql "$DATABASE_URL" -c "
  SELECT 
    type_evenement,
    workflow_n8n_id,
    workflow_n8n_nom,
    statut
  FROM workflow_links
  WHERE type_evenement = 'client.onboarding';
" || echo "⚠️  Aucun WorkflowLink trouvé pour client.onboarding"

echo ""
echo "📝 Note importante:"
echo "   - L'événement client.created continuera d'être émis"
echo "   - Mais il ne déclenchera plus automatiquement de workflow"
echo "   - L'onboarding devra être déclenché explicitement via /api/clients/:id/onboarding"
echo ""

