#!/bin/bash

# Script pour tester la synchronisation entre l'application et n8n
# Usage: ./test-n8n-sync.sh

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
echo -e "${CYAN}║   Test synchronisation n8n            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Étape 1: Obtenir un token
echo -e "${BLUE}📋 Étape 1: Connexion à l'API...${NC}"

# Obtenir le token directement depuis l'API
API_URL="${API_URL:-https://api.talosprimes.com}"
RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"groupemclem@gmail.com","password":"21052024_Aa!"}')

# Vérifier d'abord si la réponse est valide
if ! echo "$RESPONSE" | jq -e '.success == true' >/dev/null 2>&1; then
  echo -e "${RED}❌ Erreur: La réponse de l'API n'indique pas un succès${NC}"
  echo ""
  echo -e "${YELLOW}Réponse de l'API :${NC}"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

# Extraire le token (essayer plusieurs chemins possibles)
TOKEN=$(echo "$RESPONSE" | jq -r '.data.tokens.accessToken // .data.accessToken // empty' 2>/dev/null)

# Si jq a échoué, essayer avec grep/sed comme fallback
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ] || [ "$TOKEN" = "empty" ]; then
  # Fallback: extraire avec grep et sed
  TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"accessToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' | head -1)
fi

# Nettoyer le token (supprimer les espaces, retours à la ligne, et guillemets)
TOKEN=$(echo "$TOKEN" | tr -d '\n\r ' | sed "s/^['\"]//; s/['\"]$//")

# Vérifier que le token est valide
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ] || [ "${TOKEN:0:5}" != "eyJh" ]; then
  echo -e "${RED}❌ Impossible d'obtenir un token valide${NC}"
  echo ""
  echo -e "${YELLOW}Debug - Token extrait : '${TOKEN}'${NC}"
  echo -e "${YELLOW}Réponse de l'API :${NC}"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Token obtenu${NC}"
echo ""

# Étape 2: Tester la connexion n8n
echo -e "${BLUE}📋 Étape 2: Test de connexion à n8n...${NC}"
API_URL="${API_URL:-https://api.talosprimes.com}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/n8n/test" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  SUCCESS=$(echo "$BODY" | jq -r '.success' 2>/dev/null)
  if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Connexion n8n réussie${NC}"
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

# Étape 3: Vérifier les workflows configurés
echo -e "${BLUE}📋 Étape 3: Vérification des workflows configurés...${NC}"
RESPONSE=$(curl -s -X GET "$API_URL/api/n8n/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

WORKFLOW_COUNT=$(echo "$RESPONSE" | jq '.data.workflows | length' 2>/dev/null || echo "0")

if [ "$WORKFLOW_COUNT" = "0" ]; then
  echo -e "${YELLOW}⚠️  Aucun workflow configuré${NC}"
  echo ""
  echo "Pour créer un workflow :"
  echo "  1. Allez sur https://n8n.talosprimes.com"
  echo "  2. Créez un workflow avec un nœud Webhook"
  echo "  3. Utilisez : ./create-workflow-link.sh"
  echo ""
  read -p "Voulez-vous continuer quand même pour tester l'émission d'événements ? (y/n) [y]: " CONTINUE
  CONTINUE=${CONTINUE:-y}
  if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
    exit 0
  fi
else
  echo -e "${GREEN}✅ $WORKFLOW_COUNT workflow(s) configuré(s)${NC}"
  echo "$RESPONSE" | jq '.data.workflows' 2>/dev/null || echo "$RESPONSE"
fi

echo ""

# Étape 4: Créer un client de test pour déclencher un événement
echo -e "${BLUE}📋 Étape 4: Création d'un client de test...${NC}"
TEST_EMAIL="test-sync-$(date +%s)@example.com"

echo "  Email: $TEST_EMAIL"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"b2b\",
    \"raisonSociale\": \"Entreprise Test Synchronisation\",
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
else
  echo -e "${RED}❌ Erreur lors de la création du client${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

# Étape 5: Attendre un peu pour que l'événement soit traité
echo -e "${BLUE}📋 Étape 5: Vérification de la synchronisation...${NC}"
echo "  Attente de 3 secondes pour le traitement de l'événement..."
sleep 3

# Étape 6: Vérifier les logs du backend
echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Vérifications à faire manuellement   ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}1. Vérifiez les logs du backend :${NC}"
echo "   pm2 logs talosprimes-platform --lines 50 | grep -i n8n"
echo ""
echo -e "${YELLOW}2. Vérifiez les exécutions dans n8n :${NC}"
echo "   https://n8n.talosprimes.com/executions"
echo ""
echo -e "${YELLOW}3. Vérifiez les événements dans la base de données :${NC}"
echo "   SELECT * FROM event_logs WHERE type_evenement = 'client.created' ORDER BY created_at DESC LIMIT 5;"
echo ""

# Étape 7: Proposer de vérifier les logs maintenant
read -p "Voulez-vous voir les logs du backend maintenant ? (y/n) [n]: " SHOW_LOGS
SHOW_LOGS=${SHOW_LOGS:-n}

if [ "$SHOW_LOGS" = "y" ] || [ "$SHOW_LOGS" = "Y" ]; then
  echo ""
  echo -e "${BLUE}📋 Derniers logs n8n du backend :${NC}"
  echo ""
  pm2 logs talosprimes-platform --lines 20 --nostream 2>/dev/null | grep -i n8n || echo "Aucun log n8n trouvé dans les 20 dernières lignes"
  echo ""
fi

# Résumé
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         Test terminé                   ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

if [ "$WORKFLOW_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ Synchronisation testée${NC}"
  echo ""
  echo "Si vous voyez dans les logs :"
  echo "  - ${GREEN}[n8n] Workflow déclenché avec succès${NC} → ✅ Synchronisation OK"
  echo "  - ${RED}[n8n] Erreur${NC} → ❌ Vérifiez la configuration n8n"
else
  echo -e "${YELLOW}⚠️  Aucun workflow configuré${NC}"
  echo "L'événement a été émis mais aucun workflow n'a été déclenché."
  echo "Créez un workflow avec ./create-workflow-link.sh"
fi

echo ""

