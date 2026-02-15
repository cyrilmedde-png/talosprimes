#!/bin/bash

# =============================================================================
# Import des workflows n8n - TalosPrimes
# =============================================================================
# DEPRECIE: Ce script est maintenant un wrapper autour de update-vps.sh
#
# Usage: ./scripts/import-n8n-workflows.sh [API_KEY]
#        ./scripts/import-n8n-workflows.sh              (utilise .env)
#
# Pour un import complet avec gestion des projets n8n, utilisez:
#   ./scripts/update-vps.sh --only-n8n
#   ./scripts/update-vps.sh --only-n8n --n8n-dir /chemin/custom
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Si une API key est passee en argument, l'exporter
if [ -n "$1" ]; then
  export N8N_API_KEY="$1"
fi

echo ""
echo "Ce script delegue maintenant a update-vps.sh --only-n8n"
echo "Structure supportee:"
echo "  n8n_workflows/"
echo "    talosprimes/     -> projet n8n 'TalosPrimes'"
echo "      leads/"
echo "      devis/"
echo "      ..."
echo "    clients/         -> un projet n8n par client"
echo "      mon-client/"
echo "        workflows/"
echo ""

exec "$SCRIPT_DIR/update-vps.sh" --only-n8n
