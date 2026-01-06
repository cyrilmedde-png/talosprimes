#!/bin/bash

# Script pour corriger le fichier docker-compose.yaml de n8n
# Usage: ./fix-n8n-docker-compose.sh

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

COMPOSE_FILE="/root/docker-compose.yaml"
DOMAIN="n8n.talosprimes.com"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Fix docker-compose.yaml n8n          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Vérifier que le fichier existe
if [ ! -f "$COMPOSE_FILE" ]; then
  echo -e "${RED}❌ Fichier $COMPOSE_FILE non trouvé${NC}"
  exit 1
fi

echo -e "${BLUE}📋 Fichier trouvé : $COMPOSE_FILE${NC}"
echo ""

# Afficher la configuration actuelle
echo -e "${BLUE}📋 Configuration actuelle (n8n) :${NC}"
grep -A 15 "n8n" "$COMPOSE_FILE" | grep -E "N8N_|WEBHOOK|environment" | sed 's/^/  /' || echo "  Section n8n non trouvée"
echo ""

# Demander confirmation
read -p "Voulez-vous corriger le fichier docker-compose.yaml ? (y/n) [y]: " CONFIRM
CONFIRM=${CONFIRM:-y}

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Annulé."
  exit 0
fi

# Créer un backup
BACKUP_FILE="${COMPOSE_FILE}.backup.$(date +%Y%m%d-%H%M%S)"
cp "$COMPOSE_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup créé : $BACKUP_FILE${NC}"
echo ""

# Modifier le fichier
echo -e "${BLUE}📋 Modification du fichier...${NC}"

# Utiliser sed pour modifier les variables
sed -i "s/N8N_PORT=5678/N8N_PORT=443/g" "$COMPOSE_FILE"
sed -i "s/N8N_PROTOCOL=http/N8N_PROTOCOL=https/g" "$COMPOSE_FILE"

# Vérifier si N8N_HOST existe, sinon l'ajouter après N8N_PROTOCOL
if ! grep -q "N8N_HOST" "$COMPOSE_FILE"; then
  # Trouver la ligne N8N_PROTOCOL et ajouter N8N_HOST juste après (même indentation)
  sed -i "/N8N_PROTOCOL=/a\          - N8N_HOST=$DOMAIN" "$COMPOSE_FILE"
fi

# Vérifier si WEBHOOK_URL existe, sinon l'ajouter après N8N_HOST
if ! grep -q "WEBHOOK_URL" "$COMPOSE_FILE"; then
  # Trouver la ligne N8N_HOST et ajouter WEBHOOK_URL juste après
  sed -i "/N8N_HOST=/a\          - WEBHOOK_URL=https://$DOMAIN/" "$COMPOSE_FILE"
fi

echo -e "${GREEN}✅ Fichier modifié${NC}"
echo ""

# Afficher la nouvelle configuration
echo -e "${BLUE}📋 Nouvelle configuration (n8n) :${NC}"
grep -A 20 "n8n" "$COMPOSE_FILE" | grep -E "N8N_|WEBHOOK|environment" | sed 's/^/  /' || echo "  Section n8n non trouvée"
echo ""

# Proposer de recréer le conteneur avec docker-compose
read -p "Voulez-vous recréer le conteneur avec docker-compose ? (y/n) [y]: " RECREATE
RECREATE=${RECREATE:-y}

if [ "$RECREATE" = "y" ] || [ "$RECREATE" = "Y" ]; then
  echo ""
  echo -e "${BLUE}📋 Détection de la commande docker-compose...${NC}"
  
  # Détecter quelle commande utiliser
  if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
    echo "  Utilisation de: docker-compose"
  elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
    echo "  Utilisation de: docker compose"
  else
    echo -e "${RED}❌ docker-compose non trouvé${NC}"
    echo ""
    echo "Recréez manuellement le conteneur :"
    echo "  cd /root"
    echo "  docker compose down"
    echo "  docker compose up -d"
    echo ""
    echo "Ou utilisez docker directement :"
    echo "  docker stop root-n8n-1"
    echo "  docker rm root-n8n-1"
    echo "  docker run -d --name root-n8n-1 ..."
    exit 1
  fi
  
  echo ""
  echo -e "${BLUE}📋 Arrêt et suppression du conteneur...${NC}"
  
  # Se placer dans le dossier du docker-compose
  cd "$(dirname "$COMPOSE_FILE")"
  
  # Arrêter et supprimer
  $DOCKER_COMPOSE_CMD down 2>/dev/null || true
  sleep 2
  
  echo -e "${BLUE}📋 Recréation avec docker-compose...${NC}"
  $DOCKER_COMPOSE_CMD up -d
  
  echo ""
  echo -e "${GREEN}✅ Conteneur recréé${NC}"
  echo ""
  echo "Attendez 2-3 minutes que n8n démarre, puis vérifiez l'URL dans n8n."
fi

echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Configuration terminée              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Fichier docker-compose.yaml corrigé${NC}"
echo ""
echo "Vérifiez maintenant dans n8n que l'URL de production est correcte."
echo ""

