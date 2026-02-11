#!/bin/bash

# Script pour tester les webhooks n8n directement
# Usage: ./scripts/test-n8n-webhook.sh [WEBHOOK_PATH]

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 Test des Webhooks n8n${NC}"
echo "=========================="
echo ""

# Aller dans le répertoire du projet
cd "$(dirname "$0")/.."

# Charger les variables d'environnement
if [ -f "packages/platform/.env" ]; then
    source packages/platform/.env 2>/dev/null || true
fi

# URL n8n
N8N_URL="${N8N_API_URL:-https://n8n.talosprimes.com}"
WEBHOOK_PATH="${1:-lead_create}"

echo -e "${BLUE}Configuration :${NC}"
echo "  URL n8n: $N8N_URL"
echo "  Webhook: $WEBHOOK_PATH"
echo ""

# Test 1 : Vérifier que n8n est accessible
echo -e "${BLUE}Test 1 : Vérification de l'accessibilité n8n${NC}"
if curl -s --max-time 5 "$N8N_URL/healthz" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ n8n est accessible${NC}"
else
    echo -e "${RED}✗ n8n n'est pas accessible à $N8N_URL${NC}"
    echo "   Vérifiez que n8n est démarré et accessible"
    exit 1
fi

echo ""

# Test 2 : Tester le webhook SANS authentification
echo -e "${BLUE}Test 2 : Test du webhook SANS authentification${NC}"
echo "  URL: $N8N_URL/webhook/$WEBHOOK_PATH"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$N8N_URL/webhook/$WEBHOOK_PATH" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "test",
    "tenantId": "00000000-0000-0000-0000-000000000001",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "data": {
      "nom": "Test",
      "prenom": "User",
      "email": "test@example.com",
      "telephone": "+33612345678"
    }
  }' 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "  Code HTTP: $HTTP_CODE"
echo "  Réponse: $BODY"
echo ""

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✅ Webhook fonctionne correctement !${NC}"
    echo ""
    echo "Le problème ne vient PAS du webhook n8n."
    echo "Vérifiez :"
    echo "  - Les WorkflowLinks en base de données"
    echo "  - La configuration USE_N8N_VIEWS/USE_N8N_COMMANDS"
    exit 0
elif [ "$HTTP_CODE" = "403" ]; then
    echo -e "${RED}❌ Erreur 403 : Authorization data is wrong!${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Solutions :${NC}"
    echo ""
    echo "1. Vérifiez dans n8n :"
    echo "   - Settings → Security"
    echo "   - Désactivez l'authentification pour les webhooks"
    echo "   - OU créez une exception pour /webhook/*"
    echo ""
    echo "2. Vérifiez la configuration n8n :"
    echo "   - Variables d'environnement n8n"
    echo "   - N8N_BASIC_AUTH_ACTIVE (doit être false pour les webhooks)"
    echo ""
    echo "3. Vérifiez que le webhook path est correct :"
    echo "   - Dans n8n, ouvrez le workflow"
    echo "   - Cliquez sur le nœud Webhook"
    echo "   - Vérifiez le Path (doit être: $WEBHOOK_PATH)"
    exit 1
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}❌ Erreur 404 : Webhook non trouvé${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Solutions :${NC}"
    echo ""
    echo "1. Vérifiez que le workflow existe dans n8n"
    echo "2. Vérifiez que le workflow est ACTIF (toggle vert)"
    echo "3. Vérifiez que le Path du webhook est: $WEBHOOK_PATH"
    echo "4. Vérifiez que le workflow_n8n_id en base correspond"
    exit 1
else
    echo -e "${YELLOW}⚠ Réponse inattendue : HTTP $HTTP_CODE${NC}"
    echo ""
    echo "Réponse complète :"
    echo "$RESPONSE"
    exit 1
fi
