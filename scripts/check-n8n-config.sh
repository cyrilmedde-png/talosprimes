#!/bin/bash

# Script pour vérifier la configuration n8n et identifier comment désactiver l'authentification
# Usage: ./scripts/check-n8n-config.sh

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Vérification de la Configuration n8n${NC}"
echo "======================================"
echo ""

# Vérifier si n8n est en Docker
echo -e "${BLUE}1. Vérification de l'installation n8n${NC}"
echo "----------------------------------------"

if command -v docker &> /dev/null; then
    if docker ps | grep -q n8n; then
        echo -e "${GREEN}✓ n8n est en Docker${NC}"
        N8N_TYPE="docker"
        N8N_CONTAINER=$(docker ps | grep n8n | awk '{print $1}' | head -1)
        echo "  Conteneur: $N8N_CONTAINER"
    else
        echo -e "${YELLOW}⚠ Docker installé mais n8n non trouvé${NC}"
        N8N_TYPE="unknown"
    fi
else
    echo -e "${YELLOW}⚠ Docker non installé${NC}"
    N8N_TYPE="unknown"
fi

# Vérifier si n8n est en PM2
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q n8n; then
        echo -e "${GREEN}✓ n8n est en PM2${NC}"
        N8N_TYPE="pm2"
    fi
fi

# Vérifier si n8n est un service systemd
if systemctl list-units --type=service | grep -q n8n; then
    echo -e "${GREEN}✓ n8n est un service systemd${NC}"
    N8N_TYPE="systemd"
fi

if [ "$N8N_TYPE" = "unknown" ]; then
    echo -e "${YELLOW}⚠ Type d'installation n8n non identifié${NC}"
    echo "   n8n pourrait être installé différemment"
fi

echo ""

# Vérifier les variables d'environnement n8n
echo -e "${BLUE}2. Variables d'environnement n8n${NC}"
echo "----------------------------------------"

if [ "$N8N_TYPE" = "docker" ] && [ -n "$N8N_CONTAINER" ]; then
    echo "Variables d'environnement du conteneur n8n :"
    echo ""
    
    # Variables d'authentification
    AUTH_VARS=$(docker exec "$N8N_CONTAINER" env 2>/dev/null | grep -E "AUTH|SECURITY" | sort || echo "")
    
    if [ -z "$AUTH_VARS" ]; then
        echo -e "${YELLOW}⚠ Aucune variable d'authentification trouvée${NC}"
    else
        echo "$AUTH_VARS" | while IFS= read -r line; do
            if echo "$line" | grep -q "ACTIVE=true\|USER=.*\|PASSWORD=.*"; then
                echo -e "${RED}✗ $line${NC} (AUTHENTIFICATION ACTIVÉE)"
            else
                echo -e "${GREEN}✓ $line${NC}"
            fi
        done
    fi
    
    echo ""
    echo "Toutes les variables d'environnement :"
    docker exec "$N8N_CONTAINER" env 2>/dev/null | grep -i n8n | sort | head -20
elif [ "$N8N_TYPE" = "pm2" ]; then
    echo "n8n est en PM2. Vérifiez la configuration dans :"
    echo "  - ecosystem.config.js"
    echo "  - .env dans le dossier n8n"
elif [ "$N8N_TYPE" = "systemd" ]; then
    echo "n8n est un service systemd. Vérifiez :"
    echo "  - /etc/systemd/system/n8n.service"
    echo "  - /etc/default/n8n (si existe)"
fi

echo ""

# Instructions pour corriger
echo -e "${BLUE}3. Instructions pour Désactiver l'Authentification${NC}"
echo "----------------------------------------"

if [ "$N8N_TYPE" = "docker" ] && [ -n "$N8N_CONTAINER" ]; then
    echo "Pour désactiver l'authentification dans Docker :"
    echo ""
    echo "1. Trouvez le docker-compose.yml ou la commande docker run :"
    echo "   docker inspect $N8N_CONTAINER | grep -A 20 Env"
    echo ""
    echo "2. Ajoutez/modifiez ces variables :"
    echo "   N8N_BASIC_AUTH_ACTIVE=false"
    echo "   N8N_JWT_AUTH_ACTIVE=false"
    echo ""
    echo "3. Redémarrez le conteneur :"
    echo "   docker restart $N8N_CONTAINER"
elif [ "$N8N_TYPE" = "pm2" ]; then
    echo "Pour désactiver l'authentification avec PM2 :"
    echo ""
    echo "1. Éditez le fichier ecosystem.config.js ou .env de n8n"
    echo "2. Ajoutez : N8N_BASIC_AUTH_ACTIVE=false"
    echo "3. Redémarrez : pm2 restart n8n"
elif [ "$N8N_TYPE" = "systemd" ]; then
    echo "Pour désactiver l'authentification avec systemd :"
    echo ""
    echo "1. Éditez : sudo nano /etc/systemd/system/n8n.service"
    echo "2. Ajoutez dans Environment : N8N_BASIC_AUTH_ACTIVE=false"
    echo "3. Rechargez : sudo systemctl daemon-reload"
    echo "4. Redémarrez : sudo systemctl restart n8n"
else
    echo "Type d'installation non identifié."
    echo "Vérifiez manuellement la configuration n8n."
fi

echo ""
echo -e "${BLUE}4. Test Après Correction${NC}"
echo "----------------------------------------"
echo "Après avoir modifié la configuration, testez :"
echo "  ./scripts/test-n8n-webhook.sh lead_create"
echo ""
