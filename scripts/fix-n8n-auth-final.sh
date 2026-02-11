#!/bin/bash

# Script final pour corriger l'authentification n8n (toutes méthodes)
# Usage: ./scripts/fix-n8n-auth-final.sh

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Correction Authentification n8n (Toutes Méthodes)${NC}"
echo "=================================================="
echo ""

# Vérifier Docker
if command -v docker &> /dev/null && docker ps | grep -q n8n; then
    echo -e "${GREEN}✓ n8n est en Docker${NC}"
    CONTAINER=$(docker ps | grep n8n | awk '{print $1}' | head -1)
    CONTAINER_NAME=$(docker ps | grep n8n | awk '{print $NF}' | head -1)
    echo "  Conteneur ID: $CONTAINER"
    echo "  Nom: $CONTAINER_NAME"
    echo ""
    
    # Vérifier les variables actuelles
    echo "Variables d'environnement actuelles :"
    docker exec "$CONTAINER" env 2>/dev/null | grep -E "N8N_BASIC_AUTH|N8N_JWT_AUTH" | sort || echo "  Aucune variable d'authentification trouvée"
    echo ""
    
    # Trouver docker-compose.yml
    echo "Recherche du docker-compose.yml..."
    COMPOSE_FILE=$(find /root /opt /home -name "docker-compose.yml" -o -name "docker-compose.yaml" 2>/dev/null | head -1)
    
    if [ -n "$COMPOSE_FILE" ]; then
        echo -e "${GREEN}✓ docker-compose.yml trouvé: $COMPOSE_FILE${NC}"
        echo ""
        echo "Modification du docker-compose.yml..."
        
        # Créer une sauvegarde
        cp "$COMPOSE_FILE" "${COMPOSE_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Ajouter/modifier N8N_BASIC_AUTH_ACTIVE=false
        if grep -q "N8N_BASIC_AUTH_ACTIVE" "$COMPOSE_FILE"; then
            sed -i 's/N8N_BASIC_AUTH_ACTIVE=.*/N8N_BASIC_AUTH_ACTIVE=false/g' "$COMPOSE_FILE"
        else
            # Ajouter dans la section environment
            if grep -q "environment:" "$COMPOSE_FILE"; then
                sed -i '/environment:/a\      - N8N_BASIC_AUTH_ACTIVE=false' "$COMPOSE_FILE"
            elif grep -q "env:" "$COMPOSE_FILE"; then
                sed -i '/env:/a\      - N8N_BASIC_AUTH_ACTIVE=false' "$COMPOSE_FILE"
            else
                # Ajouter une section environment
                sed -i '/n8n:/a\    environment:\n      - N8N_BASIC_AUTH_ACTIVE=false' "$COMPOSE_FILE"
            fi
        fi
        
        echo -e "${GREEN}✓ docker-compose.yml modifié${NC}"
        echo ""
        echo "Redémarrage du conteneur..."
        cd "$(dirname "$COMPOSE_FILE")"
        docker-compose restart n8n 2>/dev/null || docker compose restart n8n 2>/dev/null || docker restart "$CONTAINER_NAME"
        echo -e "${GREEN}✓ Conteneur redémarré${NC}"
        
    else
        echo -e "${YELLOW}⚠ docker-compose.yml non trouvé${NC}"
        echo ""
        echo "Le conteneur a été créé avec 'docker run'. Il faut le recréer."
        echo ""
        echo "Informations du conteneur :"
        docker inspect "$CONTAINER" | grep -A 20 "Env" | head -30
        echo ""
        echo -e "${YELLOW}Solution : Recréer le conteneur avec N8N_BASIC_AUTH_ACTIVE=false${NC}"
        echo ""
        echo "1. Notez les volumes et réseaux actuels :"
        docker inspect "$CONTAINER" | grep -E "Mounts|Networks" | head -10
        echo ""
        echo "2. Arrêtez et supprimez le conteneur :"
        echo "   docker stop $CONTAINER_NAME"
        echo "   docker rm $CONTAINER_NAME"
        echo ""
        echo "3. Recréez avec :"
        echo "   docker run -d --name $CONTAINER_NAME \\"
        echo "     -e N8N_BASIC_AUTH_ACTIVE=false \\"
        echo "     [vos autres options] \\"
        echo "     docker.n8n.io/n8nio/n8n"
        echo ""
        echo "OU utilisez le script : ./scripts/fix-n8n-docker.sh"
        exit 1
    fi
    
# Vérifier PM2
elif command -v pm2 &> /dev/null && pm2 list | grep -q n8n; then
    echo -e "${GREEN}✓ n8n est en PM2${NC}"
    echo ""
    echo "Vérification de la configuration PM2..."
    pm2 show n8n | grep -E "N8N_|env" | head -10 || echo "  Aucune variable N8N trouvée"
    echo ""
    echo -e "${YELLOW}Pour modifier avec PM2 :${NC}"
    echo "1. Éditez ecosystem.config.js ou .env de n8n"
    echo "2. Ajoutez : N8N_BASIC_AUTH_ACTIVE=false"
    echo "3. Redémarrez : pm2 restart n8n"
    exit 1
    
# Vérifier systemd
elif systemctl list-units --type=service 2>/dev/null | grep -q n8n; then
    echo -e "${GREEN}✓ n8n est un service systemd${NC}"
    SERVICE_FILE=$(systemctl show n8n -p FragmentPath --value 2>/dev/null || echo "/etc/systemd/system/n8n.service")
    
    if [ -f "$SERVICE_FILE" ]; then
        echo "  Fichier: $SERVICE_FILE"
        echo ""
        echo "Modification du service..."
        
        # Sauvegarde
        sudo cp "$SERVICE_FILE" "${SERVICE_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Ajouter la variable
        if ! grep -q "N8N_BASIC_AUTH_ACTIVE" "$SERVICE_FILE"; then
            sudo sed -i '/\[Service\]/a Environment="N8N_BASIC_AUTH_ACTIVE=false"' "$SERVICE_FILE"
        else
            sudo sed -i 's/N8N_BASIC_AUTH_ACTIVE=.*/N8N_BASIC_AUTH_ACTIVE=false/g' "$SERVICE_FILE"
        fi
        
        echo -e "${GREEN}✓ Service modifié${NC}"
        echo ""
        echo "Rechargement et redémarrage..."
        sudo systemctl daemon-reload
        sudo systemctl restart n8n
        echo -e "${GREEN}✓ n8n redémarré${NC}"
    else
        echo -e "${RED}✗ Fichier service non trouvé${NC}"
        exit 1
    fi
    
else
    echo -e "${RED}✗ Méthode d'installation n8n non identifiée${NC}"
    echo ""
    echo "Vérifications manuelles :"
    echo "  - docker ps | grep n8n"
    echo "  - pm2 list | grep n8n"
    echo "  - systemctl status n8n"
    exit 1
fi

echo ""
echo "Attente de 10 secondes pour le démarrage..."
sleep 10

echo ""
echo -e "${BLUE}Test du webhook...${NC}"
cd /var/www/talosprimes
./scripts/test-n8n-webhook.sh lead_create
