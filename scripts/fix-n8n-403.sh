#!/bin/bash

# Script pour diagnostiquer et corriger l'erreur n8n 403
# Usage: ./scripts/fix-n8n-403.sh

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Diagnostic et Correction de l'erreur n8n 403${NC}"
echo "=================================================="
echo ""

cd "$(dirname "$0")/.."
PLATFORM_DIR="packages/platform"
ENV_FILE="$PLATFORM_DIR/.env"

# Charger les variables d'environnement
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE" 2>/dev/null || true
fi

echo -e "${BLUE}📋 Étape 1 : Vérification de la configuration${NC}"
echo "----------------------------------------"

# Vérifier N8N_API_URL
if [ -z "$N8N_API_URL" ]; then
    echo -e "${RED}✗ N8N_API_URL non défini${NC}"
    echo ""
    echo "Ajoutez dans $ENV_FILE :"
    echo "N8N_API_URL=https://n8n.talosprimes.com"
    echo ""
    exit 1
else
    echo -e "${GREEN}✓ N8N_API_URL = $N8N_API_URL${NC}"
fi

# Vérifier l'authentification
if [ -n "$N8N_API_KEY" ]; then
    echo -e "${GREEN}✓ N8N_API_KEY configuré${NC}"
    AUTH_TYPE="API_KEY"
    AUTH_VALUE="$N8N_API_KEY"
elif [ -n "$N8N_USERNAME" ] && [ -n "$N8N_PASSWORD" ]; then
    echo -e "${GREEN}✓ N8N_USERNAME/PASSWORD configuré${NC}"
    AUTH_TYPE="BASIC"
else
    echo -e "${RED}✗ Aucune authentification configurée${NC}"
    echo ""
    echo "Ajoutez UNE de ces options dans $ENV_FILE :"
    echo ""
    echo "Option A (recommandé) :"
    echo "N8N_API_KEY=votre-api-key"
    echo ""
    echo "Option B :"
    echo "N8N_USERNAME=votre-email@example.com"
    echo "N8N_PASSWORD=votre-mot-de-passe"
    echo ""
    exit 1
fi

echo ""
echo -e "${BLUE}📋 Étape 2 : Test de connexion à n8n${NC}"
echo "----------------------------------------"

# Tester la connexion
if [ "$AUTH_TYPE" = "API_KEY" ]; then
    echo "Test avec API Key..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$N8N_API_URL/api/v1/workflows" \
        -H "X-N8N-API-KEY: $N8N_API_KEY" \
        -H "Content-Type: application/json" 2>&1)
elif [ "$AUTH_TYPE" = "BASIC" ]; then
    echo "Test avec Username/Password..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$N8N_API_URL/api/v1/workflows" \
        -u "$N8N_USERNAME:$N8N_PASSWORD" \
        -H "Content-Type: application/json" 2>&1)
fi

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✓ Connexion à n8n réussie (HTTP $HTTP_CODE)${NC}"
    echo ""
    echo -e "${GREEN}✅ Les credentials sont corrects !${NC}"
    echo ""
    echo "Redémarrez le backend :"
    echo "  pm2 restart talosprimes-api"
elif [ "$HTTP_CODE" = "403" ]; then
    echo -e "${RED}✗ Erreur 403 : Authorization data is wrong!${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Solutions :${NC}"
    echo ""
    
    if [ "$AUTH_TYPE" = "API_KEY" ]; then
        echo "1. Vérifiez que l'API Key est correcte dans n8n :"
        echo "   - Allez dans n8n → Settings → API"
        echo "   - Vérifiez ou créez une nouvelle API Key"
        echo "   - Copiez-la exactement dans $ENV_FILE"
        echo ""
        echo "2. Vérifiez qu'il n'y a pas d'espaces dans la valeur :"
        echo "   N8N_API_KEY=votre-clé-sans-espaces"
    else
        echo "1. Vérifiez que le username/password sont corrects"
        echo "2. Testez la connexion manuellement dans n8n"
        echo "3. Recommandation : Utilisez une API Key à la place"
        echo ""
        echo "   Pour créer une API Key :"
        echo "   - Allez dans n8n → Settings → API"
        echo "   - Créez une nouvelle API Key"
        echo "   - Remplacez dans $ENV_FILE :"
        echo "     N8N_API_KEY=votre-nouvelle-clé"
    fi
    
    echo ""
    echo "3. Après correction, redémarrez :"
    echo "   pm2 restart talosprimes-api"
    exit 1
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${RED}✗ Erreur 401 : Non autorisé${NC}"
    echo ""
    echo "Les credentials sont incorrects ou expirés."
    echo "Créez de nouveaux credentials dans n8n."
    exit 1
else
    echo -e "${YELLOW}⚠ Réponse inattendue : HTTP $HTTP_CODE${NC}"
    echo "Réponse : $BODY"
    echo ""
    echo "Vérifiez que n8n est accessible à : $N8N_API_URL"
fi

echo ""
echo -e "${BLUE}📋 Étape 3 : Vérification du backend${NC}"
echo "----------------------------------------"

if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "talosprimes-api.*online"; then
        echo -e "${GREEN}✓ Backend démarré${NC}"
        echo ""
        echo "Pour appliquer les changements, redémarrez :"
        echo "  pm2 restart talosprimes-api"
    else
        echo -e "${YELLOW}⚠ Backend non démarré${NC}"
        echo "Démarrez avec : pm2 start ecosystem.config.js"
    fi
else
    echo -e "${YELLOW}⚠ PM2 non trouvé${NC}"
fi

echo ""
echo -e "${BLUE}✅ Diagnostic terminé${NC}"
echo ""
echo "Si l'erreur persiste, consultez :"
echo "  - FIX_N8N_403_ERROR.md"
echo "  - GUIDE_COMPLET_N8N.md"
