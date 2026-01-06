#!/bin/bash

# Script pour corriger N8N_PORT dans docker-compose.yaml
# N8N_PORT doit être 5678 (port interne), pas 443 (port externe géré par Nginx)
# Usage: sudo ./fix-n8n-port.sh

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

COMPOSE_FILE="/root/docker-compose.yaml"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Correction N8N_PORT                   ║${NC}"
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
echo -e "${BLUE}📋 Configuration actuelle de N8N_PORT :${NC}"
grep "N8N_PORT" "$COMPOSE_FILE" | sed 's/^/  /' || echo "  Non trouvé"
echo ""

# Créer un backup
BACKUP_FILE="${COMPOSE_FILE}.backup.$(date +%Y%m%d-%H%M%S)"
cp "$COMPOSE_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup créé : $BACKUP_FILE${NC}"
echo ""

# Corriger N8N_PORT (doit être 5678, pas 443)
echo -e "${BLUE}📋 Correction de N8N_PORT...${NC}"
sed -i "s/N8N_PORT=443/N8N_PORT=5678/g" "$COMPOSE_FILE"
sed -i "s/N8N_PORT=80/N8N_PORT=5678/g" "$COMPOSE_FILE"

echo -e "${GREEN}✅ N8N_PORT corrigé à 5678${NC}"
echo ""

# Afficher la nouvelle configuration
echo -e "${BLUE}📋 Nouvelle configuration :${NC}"
grep "N8N_PORT" "$COMPOSE_FILE" | sed 's/^/  /'
echo ""

# Proposer de redémarrer le conteneur
read -p "Voulez-vous redémarrer le conteneur n8n ? (y/n) [y]: " RESTART
RESTART=${RESTART:-y}

if [ "$RESTART" = "y" ] || [ "$RESTART" = "Y" ]; then
  echo ""
  echo -e "${BLUE}📋 Redémarrage du conteneur...${NC}"
  cd /root
  
  # Détecter la commande docker-compose
  if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
  elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
  else
    echo -e "${RED}❌ docker-compose non trouvé${NC}"
    exit 1
  fi
  
  $DOCKER_COMPOSE_CMD down
  sleep 2
  $DOCKER_COMPOSE_CMD up -d
  
  echo ""
  echo -e "${GREEN}✅ Conteneur redémarré${NC}"
  echo ""
  echo "Attendez 10-15 secondes que n8n démarre complètement..."
  sleep 15
  
  # Vérifier les logs
  echo ""
  echo -e "${BLUE}📋 Vérification des logs...${NC}"
  docker logs root-n8n-1 --tail 10 | grep -i "ready\|port\|started" || true
fi

echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Correction terminée                   ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "📋 Explication :"
echo "  - N8N_PORT=5678 : Port sur lequel n8n écoute DANS le conteneur"
echo "  - Port 443 : Port externe géré par Nginx (reverse proxy)"
echo "  - Nginx fait le lien entre 443 (externe) → 5678 (conteneur)"
echo ""
echo "📋 Testez maintenant :"
echo "  curl -I https://n8n.talosprimes.com"
echo ""

