#!/bin/bash

# Script simplifié pour corriger n8n Docker
# Usage: ./fix-n8n-simple.sh

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

CONTAINER_NAME="root-n8n-1"
DOMAIN="n8n.talosprimes.com"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Fix configuration n8n Docker        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Vérifier Docker
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker n'est pas installé${NC}"
  exit 1
fi

# Vérifier que le conteneur existe
if ! docker ps -a | grep -q "$CONTAINER_NAME"; then
  echo -e "${RED}❌ Conteneur $CONTAINER_NAME non trouvé${NC}"
  exit 1
fi

echo -e "${BLUE}📋 Récupération de la configuration...${NC}"

# Récupérer les informations du conteneur
CONTAINER_INFO=$(docker inspect "$CONTAINER_NAME" 2>/dev/null)

# Récupérer le port
PORT=$(echo "$CONTAINER_INFO" | grep -o '"HostPort":"[0-9]*"' | head -1 | cut -d'"' -f4 || echo "5678")

# Récupérer le volume (chercher le nom du volume Docker)
VOLUME_NAME=$(echo "$CONTAINER_INFO" | grep -A 10 '"Mounts"' | grep '"Name"' | head -1 | cut -d'"' -f4 || echo "")
if [ -z "$VOLUME_NAME" ]; then
  # Essayer de trouver le chemin direct
  VOLUME_PATH=$(echo "$CONTAINER_INFO" | grep -A 10 '"Mounts"' | grep '"Source"' | head -1 | cut -d'"' -f4 || echo "")
  if [ -n "$VOLUME_PATH" ]; then
    # Extraire le nom du volume depuis le chemin
    VOLUME_NAME=$(basename "$VOLUME_PATH" | tr '_' '-' | sed 's/-data$//' || echo "")
  fi
fi

# Récupérer le réseau
NETWORK=$(echo "$CONTAINER_INFO" | grep -A 5 '"Networks"' | grep -o '"[^"]*":' | head -1 | tr -d '":' || echo "bridge")

echo "  Port: $PORT"
echo "  Volume: ${VOLUME_NAME:-Aucun}"
echo "  Réseau: $NETWORK"
echo ""

read -p "Continuer ? (y/n) [y]: " CONFIRM
CONFIRM=${CONFIRM:-y}

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Annulé."
  exit 0
fi

echo ""
echo -e "${BLUE}📋 Arrêt du conteneur...${NC}"
docker stop "$CONTAINER_NAME" 2>/dev/null || true
sleep 2

echo -e "${BLUE}📋 Suppression du conteneur...${NC}"
docker rm "$CONTAINER_NAME" 2>/dev/null || true
sleep 1

echo -e "${BLUE}📋 Création du nouveau conteneur...${NC}"

# Construire la commande
CMD="docker run -d --name $CONTAINER_NAME -p $PORT:5678"

# Ajouter le volume si trouvé
if [ -n "$VOLUME_NAME" ]; then
  # Vérifier si c'est un volume Docker nommé
  if docker volume ls | grep -q "$VOLUME_NAME"; then
    CMD="$CMD -v $VOLUME_NAME:/home/node/.n8n"
    echo "  Volume: $VOLUME_NAME"
  else
    echo -e "${YELLOW}  ⚠️  Volume $VOLUME_NAME non trouvé, création sans volume${NC}"
  fi
fi

# Ajouter le réseau si ce n'est pas bridge
if [ "$NETWORK" != "bridge" ] && docker network ls | grep -q "$NETWORK"; then
  CMD="$CMD --network $NETWORK"
  echo "  Réseau: $NETWORK"
fi

# Ajouter les variables d'environnement
CMD="$CMD -e N8N_HOST=$DOMAIN"
CMD="$CMD -e N8N_PROTOCOL=https"
CMD="$CMD -e N8N_PORT=443"
CMD="$CMD -e WEBHOOK_URL=https://$DOMAIN/"
CMD="$CMD -e N8N_METRICS=true"
CMD="$CMD --restart unless-stopped"
CMD="$CMD docker.n8n.io/n8nio/n8n"

echo ""
echo "Commande: $CMD"
echo ""

# Exécuter
if eval $CMD; then
  echo -e "${GREEN}✅ Conteneur créé${NC}"
else
  echo -e "${RED}❌ Erreur lors de la création${NC}"
  echo ""
  echo "Vérifiez les erreurs ci-dessus et essayez manuellement :"
  echo "$CMD"
  exit 1
fi

echo ""
echo -e "${BLUE}📋 Attente du démarrage...${NC}"
sleep 10

if docker ps | grep -q "$CONTAINER_NAME"; then
  echo -e "${GREEN}✅ Conteneur démarré${NC}"
else
  echo -e "${RED}❌ Le conteneur ne démarre pas${NC}"
  echo "Logs:"
  docker logs "$CONTAINER_NAME" --tail 20 2>&1 || true
  exit 1
fi

echo ""
echo -e "${BLUE}📋 Vérification des variables...${NC}"
docker inspect "$CONTAINER_NAME" | grep -E '"N8N_|"WEBHOOK' | head -10 || echo "Variables non trouvées"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Configuration terminée              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Configuration n8n corrigée${NC}"
echo ""
echo "Vérifiez maintenant dans n8n que l'URL de production est correcte."
echo ""

