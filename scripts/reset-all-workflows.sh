#!/bin/bash

# Script pour SUPPRIMER TOUS les workflows et WorkflowLinks et recommencer de zéro
# Usage: ./scripts/reset-all-workflows.sh

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}⚠️  RÉINITIALISATION COMPLÈTE DES WORKFLOWS${NC}"
echo "=============================================="
echo ""
echo "Ce script va :"
echo "  1. Supprimer TOUS les WorkflowLinks de la base de données"
echo "  2. Vous permettre de recréer les workflows proprement"
echo ""
echo -e "${YELLOW}⚠️  ATTENTION : Tous les liens workflows seront supprimés !${NC}"
echo ""
read -p "Continuer ? (tapez 'OUI' en majuscules): " CONFIRM

if [ "$CONFIRM" != "OUI" ]; then
    echo "Annulé."
    exit 0
fi

cd "$(dirname "$0")/.."
PLATFORM_DIR="packages/platform"

echo ""
echo -e "${BLUE}1. Suppression des WorkflowLinks${NC}"
echo "----------------------------------------"

cd "$PLATFORM_DIR"

# Utiliser Prisma pour supprimer tous les WorkflowLinks
cat > /tmp/delete-workflows.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Suppression de tous les WorkflowLinks...');
  
  const count = await prisma.workflowLink.count();
  console.log(`Nombre de WorkflowLinks à supprimer: ${count}`);
  
  if (count > 0) {
    await prisma.workflowLink.deleteMany({});
    console.log('✅ Tous les WorkflowLinks ont été supprimés');
  } else {
    console.log('ℹ️  Aucun WorkflowLink à supprimer');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
EOF

if pnpm tsx /tmp/delete-workflows.ts; then
    echo -e "${GREEN}✓ WorkflowLinks supprimés${NC}"
else
    echo -e "${RED}✗ Erreur lors de la suppression${NC}"
    exit 1
fi

rm -f /tmp/delete-workflows.ts

echo ""
echo -e "${BLUE}2. Vérification${NC}"
echo "----------------------------------------"

# Vérifier qu'il n'y a plus de WorkflowLinks
cat > /tmp/check-workflows.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.workflowLink.count();
  console.log(`WorkflowLinks restants: ${count}`);
  await prisma.$disconnect();
}

main().catch(console.error);
EOF

pnpm tsx /tmp/check-workflows.ts
rm -f /tmp/check-workflows.ts

echo ""
echo -e "${GREEN}✅ Réinitialisation terminée !${NC}"
echo ""
echo -e "${BLUE}Prochaines étapes :${NC}"
echo ""
echo "1. Corrigez l'authentification n8n :"
echo "   ./scripts/fix-n8n-systemd-auth.sh"
echo ""
echo "2. Testez que n8n fonctionne :"
echo "   ./scripts/test-n8n-webhook.sh lead_create"
echo ""
echo "3. Recréez les WorkflowLinks :"
echo "   cd packages/platform"
echo "   pnpm workflow:setup-leads"
echo "   pnpm workflow:setup-clients"
echo "   pnpm workflow:setup-subscriptions"
echo "   pnpm workflow:setup-invoices"
echo ""
echo "4. Importez les workflows dans n8n depuis :"
echo "   n8n_workflows/leads/"
echo "   n8n_workflows/clients/"
echo "   etc."
