#!/bin/bash

# Script pour forcer la correction de l'authentification n8n
# Usage: ./scripts/fix-n8n-auth-force.sh

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Correction FORCÉE Authentification n8n${NC}"
echo "=========================================="
echo ""

COMPOSE_FILE="/root/docker-compose.yaml"
CONTAINER_NAME="n8n"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}✗ Fichier $COMPOSE_FILE non trouvé${NC}"
    exit 1
fi

echo "1. Vérification du docker-compose.yaml actuel..."
echo "----------------------------------------"
grep -A 20 "n8n:" "$COMPOSE_FILE" | head -30 || echo "Section n8n non trouvée"
echo ""

echo "2. Modification FORCÉE du docker-compose.yaml..."
echo "----------------------------------------"

# Créer une sauvegarde
cp "$COMPOSE_FILE" "${COMPOSE_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✓ Sauvegarde créée${NC}"

# Supprimer toutes les lignes d'authentification existantes
sed -i '/N8N_BASIC_AUTH_ACTIVE/d' "$COMPOSE_FILE"
sed -i '/N8N_BASIC_AUTH_USER/d' "$COMPOSE_FILE"
sed -i '/N8N_BASIC_AUTH_PASSWORD/d' "$COMPOSE_FILE"
sed -i '/N8N_JWT_AUTH_ACTIVE/d' "$COMPOSE_FILE"

# Ajouter N8N_BASIC_AUTH_ACTIVE=false après la ligne "environment:"
# Utiliser Python pour une modification plus robuste
python3 << EOF
import re

with open("$COMPOSE_FILE", "r") as f:
    content = f.read()

# Trouver la section n8n et ajouter la variable après environment:
pattern = r'(n8n:.*?environment:\s*\n)'
replacement = r'\1      - N8N_BASIC_AUTH_ACTIVE=false\n'

if re.search(pattern, content, re.DOTALL):
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
else:
    # Si pas de section environment, l'ajouter après n8n:
    pattern = r'(n8n:\s*\n)'
    replacement = r'\1    environment:\n      - N8N_BASIC_AUTH_ACTIVE=false\n'
    content = re.sub(pattern, replacement, content)

with open("$COMPOSE_FILE", "w") as f:
    f.write(content)
EOF

echo -e "${GREEN}✓ docker-compose.yaml modifié${NC}"
echo ""

echo "3. Vérification de la modification..."
echo "----------------------------------------"
grep -A 30 "n8n:" "$COMPOSE_FILE" | grep -E "N8N_BASIC_AUTH|environment" | head -10
echo ""

echo "4. Arrêt COMPLET du conteneur..."
echo "----------------------------------------"
cd /root
docker-compose stop n8n 2>/dev/null || docker compose stop n8n 2>/dev/null || docker stop "$CONTAINER_NAME" 2>/dev/null || true
sleep 3
echo -e "${GREEN}✓ Conteneur arrêté${NC}"
echo ""

echo "5. Suppression du conteneur..."
echo "----------------------------------------"
docker-compose rm -f n8n 2>/dev/null || docker compose rm -f n8n 2>/dev/null || docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
sleep 2
echo -e "${GREEN}✓ Conteneur supprimé${NC}"
echo ""

echo "6. Recréation du conteneur avec la nouvelle configuration..."
echo "----------------------------------------"
docker-compose up -d n8n 2>/dev/null || docker compose up -d n8n 2>/dev/null || {
    echo -e "${RED}✗ Erreur lors de la recréation${NC}"
    echo "Vérifiez le docker-compose.yaml manuellement"
    exit 1
}
echo -e "${GREEN}✓ Conteneur recréé${NC}"
echo ""

echo "7. Attente du démarrage complet (15 secondes)..."
echo "----------------------------------------"
sleep 15

echo "8. Vérification des variables d'environnement du conteneur..."
echo "----------------------------------------"
NEW_CONTAINER=$(docker ps | grep n8n | awk '{print $1}' | head -1)
if [ -n "$NEW_CONTAINER" ]; then
    echo "Variables d'environnement :"
    docker exec "$NEW_CONTAINER" env 2>/dev/null | grep -E "N8N_BASIC_AUTH|N8N_JWT_AUTH" | sort || echo "  Aucune variable d'authentification trouvée"
    echo ""
    
    # Vérifier spécifiquement N8N_BASIC_AUTH_ACTIVE
    if docker exec "$NEW_CONTAINER" env 2>/dev/null | grep -q "N8N_BASIC_AUTH_ACTIVE=false"; then
        echo -e "${GREEN}✓ N8N_BASIC_AUTH_ACTIVE=false est bien défini${NC}"
    else
        echo -e "${RED}✗ N8N_BASIC_AUTH_ACTIVE=false n'est PAS défini${NC}"
        echo "Le conteneur n'a pas pris la variable. Vérifiez le docker-compose.yaml"
    fi
else
    echo -e "${RED}✗ Conteneur n8n non trouvé${NC}"
    exit 1
fi

echo ""
echo "9. Vérification que n8n est actif..."
echo "----------------------------------------"
if docker ps | grep -q n8n; then
    echo -e "${GREEN}✓ n8n est actif${NC}"
else
    echo -e "${RED}✗ n8n n'est pas actif${NC}"
    echo "Logs :"
    docker logs "$NEW_CONTAINER" --tail 30
    exit 1
fi

echo ""
echo "10. Test du webhook..."
echo "----------------------------------------"
cd /var/www/talosprimes
./scripts/test-n8n-webhook.sh lead_create
