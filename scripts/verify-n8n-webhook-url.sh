#!/bin/bash

# Script pour vérifier l'URL de production des webhooks n8n
# Usage: ./verify-n8n-webhook-url.sh [WORKFLOW_ID]

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

API_URL="${API_URL:-https://api.talosprimes.com}"
N8N_URL="${N8N_URL:-https://n8n.talosprimes.com}"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Vérification webhooks n8n             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Obtenir un token
echo -e "${BLUE}📋 1. Obtaining authentication token...${NC}"
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"groupemclem@gmail.com","password":"21052024_Aa!"}' \
  | jq -r '.data.tokens.accessToken // .data.accessToken' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Impossible d'obtenir un token${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Token obtenu${NC}"

# Lister les workflows
echo ""
echo -e "${BLUE}📋 2. Liste des workflows configurés...${NC}"
WORKFLOWS=$(curl -s -X GET "$API_URL/api/n8n/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.data.workflows[]? // []' 2>/dev/null)

if [ -z "$WORKFLOWS" ]; then
  echo -e "${YELLOW}⚠️  Aucun workflow trouvé${NC}"
  echo ""
  echo "Créez un workflow dans n8n et un WorkflowLink dans la base de données :"
  echo "  cd /var/www/talosprimes/scripts"
  echo "  ./create-workflow-link-prisma.sh"
  exit 0
fi

echo "$WORKFLOWS" | jq -r '.id + " - " + .nom' | sed 's/^/  /'

# Afficher les URLs des webhooks
echo ""
echo -e "${BLUE}📋 3. URLs de production des webhooks...${NC}"
echo ""
echo "Pour chaque workflow, vérifiez dans n8n :"
echo "  1. Ouvrez le workflow : $N8N_URL"
echo "  2. Cliquez sur le nœud Webhook"
echo "  3. Vérifiez 'Production URL'"
echo ""
echo -e "${GREEN}✅ URL correcte :${NC}"
echo "  https://n8n.talosprimes.com/webhook/..."
echo ""
echo -e "${RED}❌ URL incorrecte :${NC}"
echo "  http://localhost:5678/webhook/..."
echo ""

# Instructions
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Actions recommandées                  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "Si l'URL est encore en localhost :"
echo ""
echo "  1. Désactiver puis réactiver le workflow dans n8n"
echo "  2. Supprimer et recréer le nœud Webhook"
echo "  3. Redémarrer n8n si nécessaire :"
echo "     cd /root && docker compose restart"
echo ""
echo "  4. Vérifier les variables d'environnement du conteneur :"
echo "     docker inspect root-n8n-1 | grep -E 'WEBHOOK_URL|N8N_HOST'"
echo ""

