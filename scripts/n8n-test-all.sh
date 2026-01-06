#!/bin/bash

# Script principal pour tester toute la configuration n8n
# Usage: ./n8n-test-all.sh

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Test complet de la config n8n      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Étape 1: Obtenir un token
echo -e "${BLUE}📋 Étape 1: Connexion à l'API...${NC}"
TOKEN=$(./get-token.sh 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Impossible d'obtenir un token${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Token obtenu${NC}"
echo ""

# Étape 2: Tester la connexion n8n
echo -e "${BLUE}📋 Étape 2: Test de connexion à n8n...${NC}"
if ./test-n8n-connection.sh "$TOKEN" 2>/dev/null; then
  echo ""
else
  echo -e "${RED}❌ La connexion à n8n a échoué${NC}"
  echo ""
  echo "Vérifiez :"
  echo "  1. Que n8n est accessible sur https://n8n.talosprimes.com"
  echo "  2. Les variables d'environnement dans packages/platform/.env :"
  echo "     - N8N_API_URL=https://n8n.talosprimes.com"
  echo "     - N8N_API_KEY ou N8N_USERNAME/N8N_PASSWORD"
  exit 1
fi

# Étape 3: Lister les workflows
echo -e "${BLUE}📋 Étape 3: Liste des workflows configurés...${NC}"
./list-workflows.sh "$TOKEN"
echo ""

# Étape 4: Demander si on veut créer un workflow de test
echo -e "${YELLOW}❓ Voulez-vous créer un workflow de test ?${NC}"
read -p "Entrez le Workflow ID n8n (ou appuyez sur Entrée pour passer) : " WORKFLOW_ID

if [ -n "$WORKFLOW_ID" ]; then
  echo ""
  read -p "Nom du workflow [Test Client Created] : " WORKFLOW_NAME
  WORKFLOW_NAME=${WORKFLOW_NAME:-Test Client Created}
  
  echo ""
  echo -e "${BLUE}📋 Étape 4: Création du WorkflowLink...${NC}"
  if ./create-workflow-link.sh "$WORKFLOW_ID" "$WORKFLOW_NAME" "client.created" 2>/dev/null; then
    echo ""
  else
    echo -e "${RED}❌ Erreur lors de la création du WorkflowLink${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠️  Étape 4 ignorée${NC}"
  echo ""
fi

# Étape 5: Tester le déclenchement
echo -e "${YELLOW}❓ Voulez-vous tester le déclenchement d'un workflow ?${NC}"
read -p "Créer un client de test ? (y/n) [y] : " TEST_TRIGGER
TEST_TRIGGER=${TEST_TRIGGER:-y}

if [ "$TEST_TRIGGER" = "y" ] || [ "$TEST_TRIGGER" = "Y" ]; then
  echo ""
  echo -e "${BLUE}📋 Étape 5: Test de déclenchement...${NC}"
  ./test-workflow-trigger.sh "$TOKEN"
  echo ""
fi

# Résumé
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         Tests terminés                 ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Configuration n8n validée${NC}"
echo ""
echo "📚 Prochaines étapes :"
echo "  1. Créez vos workflows dans n8n (https://n8n.talosprimes.com)"
echo "  2. Enregistrez-les avec ./create-workflow-link.sh"
echo "  3. Testez-les avec ./test-workflow-trigger.sh"
echo ""

