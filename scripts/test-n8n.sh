#!/bin/bash

# Script de test de la configuration n8n
# Usage: ./test-n8n.sh [TOKEN_JWT]

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Test de la configuration n8n"
echo "================================"
echo ""

# Vérifier si un token est fourni
if [ -z "$1" ]; then
  echo -e "${YELLOW}⚠️  Aucun token JWT fourni${NC}"
  echo "Usage: ./test-n8n.sh YOUR_JWT_TOKEN"
  echo ""
  echo "Pour obtenir un token, connectez-vous d'abord :"
  echo "curl -X POST https://api.talosprimes.com/api/auth/login \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{\"email\":\"groupemclem@gmail.com\",\"password\":\"21052024_Aa!\"}'"
  exit 1
fi

TOKEN=$1
API_URL="${API_URL:-https://api.talosprimes.com}"

echo "📋 Configuration :"
echo "  - API URL: $API_URL"
echo "  - Token: ${TOKEN:0:20}..."
echo ""

# Test 1: Vérifier la connexion n8n
echo "🔍 Test 1: Vérification de la connexion n8n..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/n8n/test" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  SUCCESS=$(echo "$BODY" | grep -o '"success":[^,]*' | cut -d: -f2)
  if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Connexion n8n réussie${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  else
    echo -e "${RED}❌ Connexion n8n échouée${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 1
  fi
else
  echo -e "${RED}❌ Erreur HTTP $HTTP_CODE${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

echo ""

# Test 2: Lister les workflows
echo "📋 Test 2: Liste des workflows configurés..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/n8n/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Workflows récupérés${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  
  WORKFLOW_COUNT=$(echo "$BODY" | jq '.data.workflows | length' 2>/dev/null || echo "0")
  if [ "$WORKFLOW_COUNT" = "0" ]; then
    echo -e "${YELLOW}⚠️  Aucun workflow configuré. Créez un WorkflowLink dans la base de données.${NC}"
  fi
else
  echo -e "${RED}❌ Erreur HTTP $HTTP_CODE${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""

# Test 3: Créer un client de test (déclenchera un workflow si configuré)
echo "🚀 Test 3: Création d'un client de test (déclenchera un workflow si configuré)..."
TEST_EMAIL="test-n8n-$(date +%s)@example.com"
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
  echo -e "${GREEN}✅ Client créé avec succès${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo -e "${YELLOW}💡 Vérifiez les logs du backend pour voir si le workflow n8n a été déclenché :${NC}"
  echo "   pm2 logs talosprimes-platform"
else
  echo -e "${RED}❌ Erreur HTTP $HTTP_CODE${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""
echo "================================"
echo -e "${GREEN}✅ Tests terminés${NC}"
echo ""
echo "📚 Pour plus d'informations, consultez TEST_N8N.md"

