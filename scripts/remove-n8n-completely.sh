#!/bin/bash

# Script pour désactiver complètement n8n dans l'application
# Usage: ./scripts/remove-n8n-completely.sh

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}⚠️  DÉSACTIVATION COMPLÈTE DE N8N${NC}"
echo "======================================"
echo ""
echo "Ce script va :"
echo "  1. Désactiver USE_N8N_VIEWS et USE_N8N_COMMANDS"
echo "  2. Commenter les appels n8n dans le code (optionnel)"
echo ""
read -p "Continuer ? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Annulé."
    exit 0
fi

cd "$(dirname "$0")/.."
PLATFORM_DIR="packages/platform"
ENV_FILE="$PLATFORM_DIR/.env"

echo ""
echo -e "${BLUE}1. Désactivation dans .env${NC}"
echo "----------------------------------------"

if [ -f "$ENV_FILE" ]; then
    # Désactiver USE_N8N_VIEWS et USE_N8N_COMMANDS
    if grep -q "USE_N8N_VIEWS" "$ENV_FILE"; then
        sed -i 's/^USE_N8N_VIEWS=.*/USE_N8N_VIEWS=false/' "$ENV_FILE"
    else
        echo "USE_N8N_VIEWS=false" >> "$ENV_FILE"
    fi
    
    if grep -q "USE_N8N_COMMANDS" "$ENV_FILE"; then
        sed -i 's/^USE_N8N_COMMANDS=.*/USE_N8N_COMMANDS=false/' "$ENV_FILE"
    else
        echo "USE_N8N_COMMANDS=false" >> "$ENV_FILE"
    fi
    
    echo -e "${GREEN}✓ Variables désactivées dans .env${NC}"
else
    echo -e "${YELLOW}⚠ Fichier .env non trouvé${NC}"
    echo "Créez-le avec :"
    echo "  USE_N8N_VIEWS=false"
    echo "  USE_N8N_COMMANDS=false"
fi

echo ""
echo -e "${BLUE}2. Redémarrage du backend${NC}"
echo "----------------------------------------"

if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "talosprimes-api"; then
        pm2 restart talosprimes-api
        echo -e "${GREEN}✓ Backend redémarré${NC}"
    else
        echo -e "${YELLOW}⚠ Backend non trouvé dans PM2${NC}"
    fi
else
    echo -e "${YELLOW}⚠ PM2 non trouvé${NC}"
fi

echo ""
echo -e "${GREEN}✅ n8n est maintenant désactivé dans l'application${NC}"
echo ""
echo "L'application utilisera directement la base de données"
echo "au lieu de passer par n8n."
echo ""
echo "Pour réactiver n8n plus tard :"
echo "  1. Corrigez la configuration n8n (authentification)"
echo "  2. Remettez USE_N8N_VIEWS=true et USE_N8N_COMMANDS=true"
echo "  3. Redémarrez le backend"
