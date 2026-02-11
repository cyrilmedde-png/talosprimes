#!/bin/bash

# Script pour vérifier TOUTES les variables d'authentification n8n
# Usage: ./scripts/check-n8n-auth-vars.sh

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Vérification Complète des Variables d'Authentification n8n${NC}"
echo "========================================================="
echo ""

CONTAINER=$(docker ps | grep n8n | awk '{print $1}' | head -1)
COMPOSE_FILE="/root/docker-compose.yaml"

if [ -z "$CONTAINER" ]; then
    echo -e "${RED}✗ Conteneur n8n non trouvé${NC}"
    exit 1
fi

echo "1. Variables dans docker-compose.yaml..."
echo "----------------------------------------"
if [ -f "$COMPOSE_FILE" ]; then
    echo "Variables d'authentification :"
    grep -E "N8N.*AUTH|BASIC_AUTH|JWT_AUTH" "$COMPOSE_FILE" | sed 's/^/  /' || echo "  Aucune variable d'authentification trouvée"
else
    echo -e "${YELLOW}⚠ docker-compose.yaml non trouvé${NC}"
fi
echo ""

echo "2. Variables dans le conteneur Docker..."
echo "----------------------------------------"
echo "Toutes les variables N8N :"
docker exec "$CONTAINER" env 2>/dev/null | grep -i "N8N" | sort | sed 's/^/  /' || echo "  Impossible de lire les variables"
echo ""

echo "Variables d'authentification spécifiques :"
AUTH_VARS=$(docker exec "$CONTAINER" env 2>/dev/null | grep -E "AUTH|SECURITY" | sort || echo "")
if [ -n "$AUTH_VARS" ]; then
    echo "$AUTH_VARS" | while IFS= read -r line; do
        if echo "$line" | grep -q "ACTIVE=true\|USER=.*\|PASSWORD=.*"; then
            echo -e "  ${RED}✗ $line${NC} (AUTHENTIFICATION ACTIVÉE)"
        else
            echo -e "  ${GREEN}✓ $line${NC}"
        fi
    done
else
    echo "  Aucune variable d'authentification trouvée"
fi
echo ""

echo "3. Vérification de N8N_BASIC_AUTH_ACTIVE..."
echo "----------------------------------------"
if docker exec "$CONTAINER" env 2>/dev/null | grep -q "N8N_BASIC_AUTH_ACTIVE=false"; then
    echo -e "${GREEN}✓ N8N_BASIC_AUTH_ACTIVE=false est défini${NC}"
elif docker exec "$CONTAINER" env 2>/dev/null | grep -q "N8N_BASIC_AUTH_ACTIVE=true"; then
    echo -e "${RED}✗ N8N_BASIC_AUTH_ACTIVE=true est défini (AUTHENTIFICATION ACTIVÉE)${NC}"
elif docker exec "$CONTAINER" env 2>/dev/null | grep -q "N8N_BASIC_AUTH_ACTIVE"; then
    VALUE=$(docker exec "$CONTAINER" env 2>/dev/null | grep "N8N_BASIC_AUTH_ACTIVE" | cut -d= -f2)
    echo -e "${YELLOW}⚠ N8N_BASIC_AUTH_ACTIVE=$VALUE${NC}"
else
    echo -e "${YELLOW}⚠ N8N_BASIC_AUTH_ACTIVE n'est pas défini${NC}"
fi
echo ""

echo "4. Vérification de N8N_BASIC_AUTH_USER et PASSWORD..."
echo "----------------------------------------"
if docker exec "$CONTAINER" env 2>/dev/null | grep -q "N8N_BASIC_AUTH_USER"; then
    echo -e "${RED}✗ N8N_BASIC_AUTH_USER est défini (peut causer l'authentification)${NC}"
    echo "  Supprimez cette variable du docker-compose.yaml"
else
    echo -e "${GREEN}✓ N8N_BASIC_AUTH_USER n'est pas défini${NC}"
fi

if docker exec "$CONTAINER" env 2>/dev/null | grep -q "N8N_BASIC_AUTH_PASSWORD"; then
    echo -e "${RED}✗ N8N_BASIC_AUTH_PASSWORD est défini (peut causer l'authentification)${NC}"
    echo "  Supprimez cette variable du docker-compose.yaml"
else
    echo -e "${GREEN}✓ N8N_BASIC_AUTH_PASSWORD n'est pas défini${NC}"
fi
echo ""

echo "5. Test du webhook..."
echo "----------------------------------------"
cd /var/www/talosprimes
./scripts/test-n8n-webhook.sh lead_create
