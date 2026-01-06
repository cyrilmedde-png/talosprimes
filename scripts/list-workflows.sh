#!/bin/bash

# Script pour lister les workflows configurés
# Usage: ./list-workflows.sh [TOKEN]

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
  TOKEN=$(./get-token.sh 2>/dev/null || echo "")
  
  if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Impossible d'obtenir un token${NC}"
    echo "Usage: ./list-workflows.sh [TOKEN]"
    exit 1
  fi
else
  TOKEN=$1
fi

API_URL="${API_URL:-https://api.talosprimes.com}"

echo "📋 Liste des workflows configurés"
echo "=================================="
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/n8n/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  WORKFLOW_COUNT=$(echo "$BODY" | jq '.data.workflows | length' 2>/dev/null || echo "0")
  
  if [ "$WORKFLOW_COUNT" = "0" ]; then
    echo -e "${YELLOW}⚠️  Aucun workflow configuré${NC}"
    echo ""
    echo "Pour créer un workflow, utilisez :"
    echo "  ./create-workflow-link.sh"
  else
    echo -e "${GREEN}✅ $WORKFLOW_COUNT workflow(s) trouvé(s)${NC}"
    echo ""
    echo "$BODY" | jq '.data.workflows' 2>/dev/null || echo "$BODY"
  fi
else
  echo -e "${RED}❌ Erreur HTTP $HTTP_CODE${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

