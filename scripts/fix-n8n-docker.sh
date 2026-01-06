#!/bin/bash

# Script pour corriger la configuration n8n dans Docker
# Usage: ./fix-n8n-docker.sh

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Fix configuration n8n Docker        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker n'est pas installé${NC}"
  exit 1
fi

# Vérifier que le conteneur existe
CONTAINER_NAME="root-n8n-1"
if ! docker ps -a | grep -q "$CONTAINER_NAME"; then
  echo -e "${RED}❌ Conteneur $CONTAINER_NAME non trouvé${NC}"
  exit 1
fi

echo -e "${BLUE}📋 Configuration actuelle :${NC}"
docker inspect "$CONTAINER_NAME" | grep -E '"N8N_|"WEBHOOK' | head -10 || echo "Aucune variable N8N trouvée"
echo ""

# Demander confirmation
read -p "Voulez-vous recréer le conteneur avec les bonnes variables ? (y/n) [n]: " CONFIRM
CONFIRM=${CONFIRM:-n}

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Annulé."
  exit 0
fi

echo ""
echo -e "${BLUE}📋 Récupération de la configuration actuelle...${NC}"

# Récupérer les volumes et ports actuels
PORTS=$(docker port "$CONTAINER_NAME" 2>/dev/null | head -1 | awk '{print $3}' | cut -d: -f1 || echo "5678")
VOLUMES=$(docker inspect "$CONTAINER_NAME" | grep -A 10 "Mounts" | grep "Source" | head -1 | cut -d'"' -f4 || echo "")

echo "  Ports: $PORTS"
echo "  Volumes: $VOLUMES"
echo ""

echo -e "${BLUE}🛑 Arrêt du conteneur...${NC}"
docker stop "$CONTAINER_NAME"

echo -e "${BLUE}🗑️  Suppression du conteneur...${NC}"
docker rm "$CONTAINER_NAME"

echo -e "${BLUE}🚀 Création du nouveau conteneur...${NC}"

# Construire la commande docker run
DOCKER_CMD="docker run -d --name $CONTAINER_NAME"

# Ajouter les ports
DOCKER_CMD="$DOCKER_CMD -p $PORTS:5678"

# Ajouter les volumes si existants
if [ -n "$VOLUMES" ]; then
  DOCKER_CMD="$DOCKER_CMD -v $VOLUMES:/home/node/.n8n"
fi

# Ajouter les variables d'environnement
DOCKER_CMD="$DOCKER_CMD -e N8N_HOST=n8n.talosprimes.com"
DOCKER_CMD="$DOCKER_CMD -e N8N_PROTOCOL=https"
DOCKER_CMD="$DOCKER_CMD -e N8N_PORT=443"
DOCKER_CMD="$DOCKER_CMD -e WEBHOOK_URL=https://n8n.talosprimes.com/"
DOCKER_CMD="$DOCKER_CMD -e N8N_METRICS=true"

# Image
DOCKER_CMD="$DOCKER_CMD docker.n8n.io/n8nio/n8n"

echo "Commande : $DOCKER_CMD"
echo ""

# Exécuter
eval $DOCKER_CMD

echo ""
echo -e "${GREEN}✅ Conteneur recréé avec succès${NC}"
echo ""

# Vérifier les variables
echo -e "${BLUE}📋 Vérification des variables...${NC}"
docker inspect "$CONTAINER_NAME" | grep -E '"N8N_|"WEBHOOK' | head -10

echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Prochaines étapes                  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "1. Attendez quelques secondes que n8n démarre"
echo "2. Allez sur https://n8n.talosprimes.com"
echo "3. Ouvrez votre workflow"
echo "4. Cliquez sur le nœud Webhook"
echo "5. Cliquez sur 'Production URL'"
echo "6. Vous devriez voir : https://n8n.talosprimes.com/webhook/123"
echo ""

