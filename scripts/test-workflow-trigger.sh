#!/bin/bash

# Script pour tester le déclenchement d'un workflow en créant un client
# Usage: ./test-workflow-trigger.sh [TOKEN]

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Obtenir le token si non fourni
if [ -z "$1" ]; then
  echo -e "${YELLOW}⚠️  Aucun token fourni, tentative de connexion automatique...${NC}"
  TOKEN=$(./get-token.sh 2>&1 | tail -n1 || echo "")
  
  if [ -z "$TOKEN" ] || [ "${TOKEN:0:5}" != "eyJh" ]; then
    echo -e "${RED}❌ Impossible d'obtenir un token valide${NC}"
    echo "Usage: ./test-workflow-trigger.sh [TOKEN]"
    exit 1
  fi
else
  TOKEN=$1
fi

API_URL="${API_URL:-https://api.talosprimes.com}"

echo "🚀 Test de déclenchement d'un workflow"
echo "======================================="
echo "  - API URL: $API_URL"
echo ""

# Générer un email unique
TEST_EMAIL="test-n8n-$(date +%s)@example.com"

echo -e "${BLUE}📝 Création d'un client de test...${NC}"
echo "  Email: $TEST_EMAIL"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"b2b\",
    \"raisonSociale\": \"Entreprise Test n8n\",
    \"email\": \"$TEST_EMAIL\",
    \"telephone\": \"+33123456789\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
  CLIENT_ID=$(echo "$BODY" | jq -r '.data.client.id' 2>/dev/null)
  
  echo -e "${GREEN}✅ Client créé avec succès${NC}"
  echo "  Client ID: $CLIENT_ID"
  echo ""
  echo -e "${YELLOW}💡 Vérifications à faire :${NC}"
  echo "  1. Vérifiez les logs du backend :"
  echo "     pm2 logs talosprimes-platform | grep n8n"
  echo ""
  echo "  2. Vérifiez les exécutions dans n8n :"
  echo "     https://n8n.talosprimes.com/executions"
  echo ""
  echo "  3. Vérifiez les événements dans la base de données :"
  echo "     SELECT * FROM event_logs WHERE type_evenement = 'client.created' ORDER BY created_at DESC LIMIT 1;"
else
  echo -e "${RED}❌ Erreur HTTP $HTTP_CODE${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

