#!/bin/bash

# Script rapide pour désactiver l'authentification n8n
# Usage: ./scripts/fix-n8n-auth-quick.sh

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Correction Rapide : Désactiver l'Authentification n8n${NC}"
echo "=================================================="
echo ""

# Vérifier si systemd service existe
if [ -f "/etc/systemd/system/n8n.service" ]; then
    echo -e "${GREEN}✓ Service systemd n8n trouvé${NC}"
    echo ""
    echo "Modification du service systemd..."
    
    # Créer une sauvegarde
    sudo cp /etc/systemd/system/n8n.service /etc/systemd/system/n8n.service.backup
    
    # Ajouter la variable si elle n'existe pas
    if ! grep -q "N8N_BASIC_AUTH_ACTIVE" /etc/systemd/system/n8n.service; then
        # Ajouter dans la section [Service] après Environment
        sudo sed -i '/\[Service\]/,/^\[/ {
            /Environment=/a Environment="N8N_BASIC_AUTH_ACTIVE=false"
        }' /etc/systemd/system/n8n.service
        
        # Si pas de section Environment, l'ajouter
        if ! grep -q "Environment=" /etc/systemd/system/n8n.service; then
            sudo sed -i '/\[Service\]/a Environment="N8N_BASIC_AUTH_ACTIVE=false"' /etc/systemd/system/n8n.service
        fi
    else
        # Remplacer si existe déjà
        sudo sed -i 's/N8N_BASIC_AUTH_ACTIVE=.*/N8N_BASIC_AUTH_ACTIVE=false/g' /etc/systemd/system/n8n.service
    fi
    
    echo -e "${GREEN}✓ Service modifié${NC}"
    echo ""
    echo "Rechargement et redémarrage..."
    sudo systemctl daemon-reload
    sudo systemctl restart n8n
    
    echo -e "${GREEN}✓ n8n redémarré${NC}"
    echo ""
    echo "Attente de 5 secondes..."
    sleep 5
    
    # Tester
    echo ""
    echo -e "${BLUE}Test du webhook...${NC}"
    cd /var/www/talosprimes
    ./scripts/test-n8n-webhook.sh lead_create
    
elif docker ps | grep -q n8n; then
    echo -e "${GREEN}✓ n8n est en Docker${NC}"
    CONTAINER=$(docker ps | grep n8n | awk '{print $1}' | head -1)
    echo "  Conteneur: $CONTAINER"
    echo ""
    echo "Pour Docker, vous devez modifier le docker-compose.yml ou recréer le conteneur."
    echo "Voir: FIX_N8N_WEBHOOK_AUTH.md"
    exit 1
else
    echo -e "${RED}✗ Configuration n8n non trouvée${NC}"
    exit 1
fi
