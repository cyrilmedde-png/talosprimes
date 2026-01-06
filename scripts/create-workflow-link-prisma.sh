#!/bin/bash

# Script wrapper pour créer un WorkflowLink en utilisant Prisma
# Usage: ./create-workflow-link-prisma.sh [WORKFLOW_ID] [WORKFLOW_NAME] [EVENT_TYPE]

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ ! -f "$PROJECT_ROOT/packages/platform/scripts/create-workflow-link.ts" ]; then
  echo -e "${RED}❌ Erreur: Script create-workflow-link.ts non trouvé${NC}"
  exit 1
fi

cd "$PROJECT_ROOT/packages/platform"

# Vérifier que les dépendances sont installées
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}⚠️  Installation des dépendances...${NC}"
  pnpm install
fi

# Exécuter le script TypeScript
if [ $# -ge 3 ]; then
  # Mode avec arguments
  pnpm workflow:create "$1" "$2" "$3"
else
  # Mode interactif
  pnpm workflow:create
fi

