#!/bin/bash

# Script COMPLET pour corriger le 403 n8n :
# 1. Vérifier si Nginx a auth_basic (cause fréquente du 403 "Authorization data is wrong!")
# 2. Recréer le conteneur n8n pour que N8N_BASIC_AUTH_ACTIVE=false soit bien pris en compte
# Usage: ./scripts/fix-n8n-403-complete.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Correction COMPLÈTE du 403 n8n${NC}"
echo "======================================"
echo ""

# ---------- 1. Vérifier Nginx (auth_basic = cause fréquente du 403) ----------
echo -e "${BLUE}1. Vérification de Nginx${NC}"
echo "----------------------------------------"

NGINX_N8N=""
for f in /etc/nginx/sites-enabled/n8n /etc/nginx/sites-available/n8n /etc/nginx/conf.d/n8n.conf; do
    [ -f "$f" ] && NGINX_N8N="$f" && break
done

if [ -n "$NGINX_N8N" ]; then
    if grep -q "auth_basic" "$NGINX_N8N"; then
        echo -e "${RED}✗ Nginx a auth_basic activé pour n8n !${NC}"
        echo "  C'est très probablement la cause du 403 'Authorization data is wrong!'"
        echo ""
        grep -n "auth_basic" "$NGINX_N8N" | sed 's/^/  /'
        echo ""
        echo -e "${YELLOW}Désactiver auth_basic pour n8n :${NC}"
        echo "  sudo nano $NGINX_N8N"
        echo "  Commentez (ou supprimez) les lignes auth_basic et auth_basic_user_file"
        echo "  Puis : sudo nginx -t && sudo systemctl reload nginx"
        echo ""
        read -p "Voulez-vous que je commente auth_basic maintenant ? (y/n): " DO_NGINX
        if [ "$DO_NGINX" = "y" ] || [ "$DO_NGINX" = "Y" ]; then
            sudo sed -i 's/^[[:space:]]*auth_basic/# auth_basic/' "$NGINX_N8N"
            sudo sed -i 's/^[[:space:]]*auth_basic_user_file/# auth_basic_user_file/' "$NGINX_N8N"
            if sudo nginx -t 2>/dev/null; then
                sudo systemctl reload nginx
                echo -e "${GREEN}✓ auth_basic désactivé, Nginx rechargé${NC}"
            else
                echo -e "${RED}Erreur nginx - annulation${NC}"
                sudo sed -i 's/^# auth_basic/auth_basic/' "$NGINX_N8N"
                sudo sed -i 's/^# auth_basic_user_file/auth_basic_user_file/' "$NGINX_N8N"
            fi
        fi
    else
        echo -e "${GREEN}✓ Pas d'auth_basic dans la config n8n${NC}"
    fi
else
    echo "  Config Nginx n8n non trouvée (pas dans sites-enabled/sites-available)"
fi
echo ""

# ---------- 2. S'assurer que docker-compose a N8N_BASIC_AUTH_ACTIVE=false ----------
COMPOSE_FILE="/root/docker-compose.yaml"
echo -e "${BLUE}2. Docker-compose et recréation du conteneur n8n${NC}"
echo "----------------------------------------"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}✗ $COMPOSE_FILE non trouvé${NC}"
    exit 1
fi

if ! grep -q "N8N_BASIC_AUTH_ACTIVE" "$COMPOSE_FILE"; then
    echo "Ajout de N8N_BASIC_AUTH_ACTIVE=false..."
    cp "$COMPOSE_FILE" "${COMPOSE_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    # Ajouter après la première ligne "environment:" sous n8n
    sed -i '/^  n8n:/,/^  [a-z]/{
      /environment:/a\      - N8N_BASIC_AUTH_ACTIVE=false
    }' "$COMPOSE_FILE"
    echo -e "${GREEN}✓ Variable ajoutée${NC}"
else
    echo -e "${GREEN}✓ N8N_BASIC_AUTH_ACTIVE déjà dans docker-compose${NC}"
fi

# Recréer le conteneur pour que les variables soient bien prises
echo ""
echo "Arrêt et suppression du conteneur n8n..."
cd /root
docker-compose stop n8n 2>/dev/null || docker compose stop n8n 2>/dev/null || true
docker-compose rm -f n8n 2>/dev/null || docker compose rm -f n8n 2>/dev/null || docker rm -f n8n 2>/dev/null || true
sleep 2

echo "Recréation du conteneur..."
docker-compose up -d n8n 2>/dev/null || docker compose up -d n8n 2>/dev/null || true
echo -e "${GREEN}✓ Conteneur recréé${NC}"
echo ""

echo "Attente du démarrage (15 s)..."
sleep 15

CONTAINER=$(docker ps | grep n8n | awk '{print $1}' | head -1)
if [ -n "$CONTAINER" ]; then
    if docker exec "$CONTAINER" env 2>/dev/null | grep -q "N8N_BASIC_AUTH_ACTIVE=false"; then
        echo -e "${GREEN}✓ N8N_BASIC_AUTH_ACTIVE=false est maintenant dans le conteneur${NC}"
    else
        echo -e "${YELLOW}⚠ La variable n'est toujours pas dans le conteneur (vérifiez le compose)${NC}"
    fi
fi
echo ""

# ---------- 3. Test ----------
echo -e "${BLUE}3. Test du webhook${NC}"
echo "----------------------------------------"
cd /var/www/talosprimes
./scripts/test-n8n-webhook.sh lead_create
