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

# Corriger les fautes de frappe (httpss → https)
sed -i "s/httpss/https/g" "$COMPOSE_FILE"

# IMPORTANT : N8N_PORT doit rester à 5678 (port interne dans le conteneur)
# Le port 443 est géré par Nginx (reverse proxy)
# NE PAS changer N8N_PORT de 5678 à 443
# sed -i "s/N8N_PORT=5678/N8N_PORT=443/g" "$COMPOSE_FILE"  # ❌ INCORRECT

# Corriger N8N_PROTOCOL (seulement si c'est http, pas si c'est déjà https)
sed -i "s/N8N_PROTOCOL=http$/N8N_PROTOCOL=https/g" "$COMPOSE_FILE"

# Trouver l'indentation utilisée pour les variables d'environnement
INDENT=$(grep -m 1 "N8N_PROTOCOL" "$COMPOSE_FILE" | sed 's/[^ ].*//' || echo "          ")

# Supprimer les anciennes entrées mal indentées de N8N_HOST et WEBHOOK_URL
sed -i '/^[[:space:]]*- N8N_HOST=/d' "$COMPOSE_FILE"
sed -i '/^[[:space:]]*- WEBHOOK_URL=/d' "$COMPOSE_FILE"

# Trouver la ligne N8N_PROTOCOL et insérer N8N_HOST et WEBHOOK_URL après
if ! grep -q "N8N_HOST" "$COMPOSE_FILE"; then
  # Trouver la ligne N8N_PROTOCOL et ajouter après
  sed -i "/N8N_PROTOCOL=/a\\$INDENT- N8N_HOST=$DOMAIN" "$COMPOSE_FILE"
fi

if ! grep -q "WEBHOOK_URL" "$COMPOSE_FILE"; then
  # Trouver la ligne N8N_HOST et ajouter après
  sed -i "/N8N_HOST=/a\\$INDENT- WEBHOOK_URL=https://$DOMAIN/" "$COMPOSE_FILE"
fi

# Pour HTTPS avec reverse proxy (Nginx), n8n ne doit PAS exposer de port sur le host
# Nginx fera le reverse proxy vers le conteneur via le réseau Docker interne

# Vérifier et supprimer la section ports si elle existe
if grep -q "ports:" "$COMPOSE_FILE" && grep -A 5 "ports:" "$COMPOSE_FILE" | grep -q "n8n"; then
  echo "  Suppression du mapping de ports (HTTPS avec reverse proxy)..."
  # Trouver la section n8n et supprimer les lignes ports
  # On va utiliser une approche plus sûre : commenter les ports au lieu de les supprimer
  sed -i '/^[[:space:]]*n8n:/,/^[[:space:]]*[a-z]/ {
    /^[[:space:]]*ports:/d
    /^[[:space:]]*-.*5678.*5678/d
    /^[[:space:]]*-.*443.*5678/d
  }' "$COMPOSE_FILE" || true
  
  # Alternative plus simple : supprimer toutes les lignes contenant "5678:5678" ou "443:5678"
  sed -i '/5678:5678/d' "$COMPOSE_FILE"
  sed -i '/443:5678/d' "$COMPOSE_FILE"
  
  # Supprimer la ligne "ports:" si elle est vide maintenant
  sed -i '/^[[:space:]]*ports:[[:space:]]*$/,/^[[:space:]]*[a-z]/ { /^[[:space:]]*ports:[[:space:]]*$/d; }' "$COMPOSE_FILE"
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
  
  # Arrêter et supprimer (forcer la suppression)
  $DOCKER_COMPOSE_CMD down --remove-orphans 2>/dev/null || true
  sleep 1
  
  # Forcer la suppression du conteneur s'il existe encore
  if docker ps -a | grep -q "root-n8n-1"; then
    echo "  Suppression forcée du conteneur existant..."
    docker stop root-n8n-1 2>/dev/null || true
    docker rm -f root-n8n-1 2>/dev/null || true
    sleep 1
  fi
  
  # Vérifier si le port 5678 est utilisé et arrêter le processus
  echo "  Vérification du port 5678..."
  PORT_PID=$(lsof -ti:5678 2>/dev/null || true)
  if [ -n "$PORT_PID" ]; then
    echo "  Port 5678 utilisé par le processus $PORT_PID, arrêt..."
    kill -9 "$PORT_PID" 2>/dev/null || true
    sleep 1
  fi
  
  # Vérifier s'il y a d'autres conteneurs n8n qui utilisent le port
  EXISTING_CONTAINER=$(docker ps -a --filter "publish=5678" --format "{{.Names}}" | head -1)
  if [ -n "$EXISTING_CONTAINER" ]; then
    echo "  Arrêt du conteneur $EXISTING_CONTAINER qui utilise le port 5678..."
    docker stop "$EXISTING_CONTAINER" 2>/dev/null || true
    docker rm -f "$EXISTING_CONTAINER" 2>/dev/null || true
    sleep 1
  fi
  
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

