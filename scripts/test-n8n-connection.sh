#!/bin/bash

# Script pour tester la connexion à n8n
# Usage: ./test-n8n-connection.sh [TOKEN]

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
  # Rediriger stderr pour voir les messages, mais capturer seulement stdout (le token)
  TOKEN=$(./get-token.sh 2>&1 | tail -n1 || echo "")
  
  if [ -z "$TOKEN" ] || [ "${TOKEN:0:5}" != "eyJh" ]; then
    echo -e "${RED}❌ Impossible d'obtenir un token valide${NC}"
    echo "Usage: ./test-n8n-connection.sh [TOKEN]"
    exit 1
  fi
else
  TOKEN=$1
fi

API_URL="${API_URL:-https://api.talosprimes.com}"

echo "🔍 Test de connexion à n8n"
echo "=========================="
echo "  - API URL: $API_URL"
echo "  - Token: ${TOKEN:0:20}..."
echo ""

# Test de connexion
echo -e "${BLUE}📡 Test de connexion à n8n...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/n8n/test" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  SUCCESS=$(echo "$BODY" | jq -r '.success' 2>/dev/null)
  MESSAGE=$(echo "$BODY" | jq -r '.message' 2>/dev/null)
  
  if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Connexion n8n réussie${NC}"
    echo "  Message: $MESSAGE"
    exit 0
  else
    echo -e "${RED}❌ Connexion n8n échouée${NC}"
    echo "  Message: $MESSAGE"
    echo ""
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 1
  fi
else
  echo -e "${RED}❌ Erreur HTTP $HTTP_CODE${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

