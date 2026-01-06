#!/bin/bash

# Script automatique pour corriger tous les problèmes n8n
# Usage: ./fix-n8n-complete.sh

set -euo pipefail  # Mode strict : arrêt sur erreur, variables non définies, erreurs dans les pipes

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

CONTAINER_NAME="root-n8n-1"
DOMAIN="n8n.talosprimes.com"

# Fonction pour afficher les erreurs
error_exit() {
  echo -e "${RED}❌ Erreur: $1${NC}" >&2
  exit 1
}

# Fonction pour vérifier les prérequis
check_prerequisites() {
  if ! command -v docker &> /dev/null; then
    error_exit "Docker n'est pas installé"
  fi

  if ! docker info &> /dev/null; then
    error_exit "Docker n'est pas accessible (vérifiez les permissions)"
  fi
}

# Fonction pour vérifier que le conteneur existe
check_container() {
  if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    error_exit "Conteneur $CONTAINER_NAME non trouvé"
  fi
}

# Fonction pour récupérer la configuration actuelle
get_current_config() {
  local config_json
  config_json=$(docker inspect "$CONTAINER_NAME" 2>/dev/null) || error_exit "Impossible d'inspecter le conteneur"
  
  # Récupérer les ports
  local port_mapping
  port_mapping=$(echo "$config_json" | jq -r '.[0].HostConfig.PortBindings."5678/tcp"[0].HostPort // "5678"' 2>/dev/null || echo "5678")
  
  # Récupérer les volumes
  local volumes
  volumes=$(echo "$config_json" | jq -r '.[0].Mounts[]? | select(.Destination == "/home/node/.n8n") | .Source' 2>/dev/null | head -1 || echo "")
  
  # Récupérer le réseau
  local network
  network=$(echo "$config_json" | jq -r '.[0].NetworkSettings.Networks | keys[0] // "bridge"' 2>/dev/null || echo "bridge")
  
  # Récupérer les variables d'environnement actuelles
  local current_env
  current_env=$(echo "$config_json" | jq -r '.[0].Config.Env[]?' 2>/dev/null | grep -E "^N8N_|^WEBHOOK" || echo "")
  
  echo "$port_mapping|$volumes|$network|$current_env"
}

# Fonction pour créer un backup
create_backup() {
  local backup_dir="/tmp/n8n-backup-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$backup_dir" || error_exit "Impossible de créer le dossier de backup"
  
  # Exporter la configuration
  docker inspect "$CONTAINER_NAME" > "$backup_dir/container-config.json" 2>/dev/null || true
  
  # Si des volumes existent, les sauvegarder
  local volumes
  volumes=$(docker inspect "$CONTAINER_NAME" 2>/dev/null | \
    jq -r '.[0].Mounts[]? | select(.Destination == "/home/node/.n8n") | .Source' 2>/dev/null | head -1 || echo "")
  
  if [ -n "$volumes" ] && [ -d "$volumes" ]; then
    echo "  Sauvegarde des volumes dans: $backup_dir/volumes"
    cp -r "$volumes" "$backup_dir/volumes" 2>/dev/null || echo "  ⚠️  Impossible de sauvegarder les volumes (peut être normal)"
  fi
  
  echo "$backup_dir"
}

# Fonction pour recréer le conteneur
recreate_container() {
  local port_mapping=$1
  local volumes=$2
  local network=$3
  
  echo -e "${BLUE}📋 Arrêt du conteneur...${NC}"
  docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
  sleep 2
  
  echo -e "${BLUE}📋 Suppression du conteneur...${NC}"
  docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
  sleep 1
  
  echo -e "${BLUE}📋 Création du nouveau conteneur...${NC}"
  
  # Construire la commande docker run
  local docker_cmd=(
    "docker" "run" "-d"
    "--name" "$CONTAINER_NAME"
    "-p" "${port_mapping}:5678"
  )
  
  # Ajouter les volumes si existants
  if [ -n "$volumes" ]; then
    # Vérifier si c'est un volume Docker ou un chemin direct
    if docker volume ls --format '{{.Name}}' | grep -q "^$(basename "$volumes" | tr '_' '-')$" 2>/dev/null; then
      # C'est un volume Docker, utiliser le nom du volume
      local volume_name=$(basename "$volumes" | tr '_' '-')
      docker_cmd+=("-v" "${volume_name}:/home/node/.n8n")
      echo "  Volume Docker monté: $volume_name -> /home/node/.n8n"
    elif [ -d "$volumes" ]; then
      # C'est un chemin direct
      docker_cmd+=("-v" "${volumes}:/home/node/.n8n")
      echo "  Volume monté: $volumes -> /home/node/.n8n"
    else
      echo -e "${YELLOW}  ⚠️  Volume $volumes non trouvé, création sans volume${NC}"
    fi
  fi
  
  # Ajouter le réseau si ce n'est pas bridge par défaut
  if [ "$network" != "bridge" ] && [ "$network" != "" ]; then
    # Vérifier que le réseau existe
    if docker network ls --format '{{.Name}}' | grep -q "^${network}$"; then
      docker_cmd+=("--network" "$network")
      echo "  Réseau: $network"
    else
      echo -e "${YELLOW}  ⚠️  Réseau $network non trouvé, utilisation de bridge${NC}"
    fi
  fi
  
  # Ajouter les variables d'environnement
  docker_cmd+=(
    "-e" "N8N_HOST=$DOMAIN"
    "-e" "N8N_PROTOCOL=https"
    "-e" "N8N_PORT=443"
    "-e" "WEBHOOK_URL=https://$DOMAIN/"
    "-e" "N8N_METRICS=true"
    "--restart" "unless-stopped"
    "docker.n8n.io/n8nio/n8n"
  )
  
  # Exécuter la commande et capturer la sortie
  echo "  Exécution de la commande Docker..."
  local output
  local exit_code
  
  output=$("${docker_cmd[@]}" 2>&1)
  exit_code=$?
  
  if [ $exit_code -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de la création du conteneur${NC}"
    echo ""
    echo "Sortie Docker:"
    echo "$output" | sed 's/^/  /'
    echo ""
    echo "Commande exécutée:"
    echo "  ${docker_cmd[*]}"
    echo ""
    error_exit "Impossible de créer le conteneur. Vérifiez les erreurs ci-dessus."
  fi
  
  echo -e "${GREEN}✅ Conteneur créé${NC}"
}

# Fonction pour vérifier les variables
verify_config() {
  local max_attempts=12
  local attempt=0
  
  echo -e "${BLUE}📋 Attente du démarrage de n8n...${NC}"
  
  while [ $attempt -lt $max_attempts ]; do
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
      break
    fi
    attempt=$((attempt + 1))
    echo "  Tentative $attempt/$max_attempts..."
    sleep 5
  done
  
  if [ $attempt -eq $max_attempts ]; then
    error_exit "Le conteneur ne démarre pas. Logs: $(docker logs "$CONTAINER_NAME" --tail 20 2>&1)"
  fi
  
  sleep 5  # Attendre un peu plus que n8n soit prêt
  
  echo ""
  echo -e "${BLUE}📋 Vérification des variables...${NC}"
  
  local new_env
  new_env=$(docker inspect "$CONTAINER_NAME" 2>/dev/null | \
    jq -r '.[0].Config.Env[]?' 2>/dev/null | \
    grep -E "^N8N_|^WEBHOOK" || echo "")
  
  local errors=0
  
  if echo "$new_env" | grep -q "N8N_HOST=$DOMAIN"; then
    echo -e "${GREEN}✅ N8N_HOST=$DOMAIN${NC}"
  else
    echo -e "${RED}❌ N8N_HOST incorrect${NC}"
    errors=$((errors + 1))
  fi
  
  if echo "$new_env" | grep -q "N8N_PROTOCOL=https"; then
    echo -e "${GREEN}✅ N8N_PROTOCOL=https${NC}"
  else
    echo -e "${RED}❌ N8N_PROTOCOL incorrect${NC}"
    errors=$((errors + 1))
  fi
  
  if echo "$new_env" | grep -q "WEBHOOK_URL=https://$DOMAIN/"; then
    echo -e "${GREEN}✅ WEBHOOK_URL=https://$DOMAIN/${NC}"
  else
    echo -e "${RED}❌ WEBHOOK_URL incorrect${NC}"
    errors=$((errors + 1))
  fi
  
  if [ $errors -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Certaines variables sont incorrectes${NC}"
    echo "Variables actuelles:"
    echo "$new_env" | sed 's/^/  /'
  fi
}

# Fonction pour tester la connexion
test_connection() {
  echo ""
  echo -e "${BLUE}📋 Test de connexion...${NC}"
  
  local max_attempts=6
  local attempt=0
  
  while [ $attempt -lt $max_attempts ]; do
    if curl -s -f -k "https://$DOMAIN/healthz" >/dev/null 2>&1; then
      echo -e "${GREEN}✅ n8n est accessible sur https://$DOMAIN${NC}"
      return 0
    fi
    attempt=$((attempt + 1))
    echo "  Tentative $attempt/$max_attempts..."
    sleep 10
  done
  
  echo -e "${YELLOW}⚠️  n8n n'est pas encore accessible (peut prendre quelques minutes)${NC}"
  echo "   Vérifiez manuellement: curl https://$DOMAIN/healthz"
}

# Main
main() {
  echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║   Fix complet configuration n8n        ║${NC}"
  echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
  echo ""
  
  # Vérifications préalables
  check_prerequisites
  check_container
  
  # Vérifier si jq est installé (pour parser JSON)
  if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq n'est pas installé, utilisation de méthodes alternatives...${NC}"
    # On utilisera des méthodes alternatives si jq n'est pas disponible
    USE_JQ=false
  else
    USE_JQ=true
  fi
  
  echo -e "${BLUE}📋 Étape 1: Analyse de la configuration...${NC}"
  
  local config
  if [ "$USE_JQ" = true ]; then
    config=$(get_current_config)
  else
    # Méthode alternative sans jq
    local port_mapping=$(docker port "$CONTAINER_NAME" 2>/dev/null | head -1 | awk '{print $3}' | cut -d: -f1 || echo "5678")
    local volumes=$(docker inspect "$CONTAINER_NAME" 2>/dev/null | grep -A 10 '"Mounts"' | grep '"Source"' | head -1 | cut -d'"' -f4 || echo "")
    local network="bridge"
    local current_env=$(docker inspect "$CONTAINER_NAME" 2>/dev/null | grep -E '"N8N_|"WEBHOOK' || echo "")
    config="$port_mapping|$volumes|$network|$current_env"
  fi
  
  IFS='|' read -r port_mapping volumes network current_env <<< "$config"
  
  echo "  Conteneur: $CONTAINER_NAME"
  echo "  Port: $port_mapping"
  echo "  Volume: ${volumes:-Aucun}"
  echo "  Réseau: $network"
  echo ""
  
  # Vérifier si déjà correct
  if echo "$current_env" | grep -q "N8N_HOST=$DOMAIN" && \
     echo "$current_env" | grep -q "N8N_PROTOCOL=https"; then
    echo -e "${YELLOW}⚠️  Les variables semblent déjà correctes${NC}"
    echo ""
    read -p "Voulez-vous quand même recréer le conteneur ? (y/n) [n]: " FORCE
    FORCE=${FORCE:-n}
    if [ "$FORCE" != "y" ] && [ "$FORCE" != "Y" ]; then
      echo "Annulé."
      exit 0
    fi
  fi
  
  echo -e "${BLUE}📋 Étape 2: Sauvegarde...${NC}"
  local backup_dir
  backup_dir=$(create_backup)
  echo -e "${GREEN}✅ Backup créé: $backup_dir${NC}"
  echo ""
  
  echo -e "${YELLOW}⚠️  Cette opération va :${NC}"
  echo "  1. Arrêter le conteneur n8n"
  echo "  2. Le supprimer"
  echo "  3. Le recréer avec les bonnes variables"
  echo "  4. Préserver vos données (volumes)"
  echo ""
  read -p "Continuer ? (y/n) [y]: " CONFIRM
  CONFIRM=${CONFIRM:-y}
  
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Annulé."
    exit 0
  fi
  
  echo ""
  recreate_container "$port_mapping" "$volumes" "$network"
  
  verify_config
  
  test_connection
  
  echo ""
  echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║   Configuration terminée              ║${NC}"
  echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${GREEN}✅ Configuration n8n corrigée${NC}"
  echo ""
  echo -e "${YELLOW}📝 Prochaines étapes :${NC}"
  echo ""
  echo "1. Allez sur https://$DOMAIN"
  echo "2. Ouvrez votre workflow"
  echo "3. Cliquez sur le nœud Webhook"
  echo "4. Cliquez sur l'onglet 'Production URL'"
  echo "5. Vous devriez voir : https://$DOMAIN/webhook/123"
  echo ""
  echo -e "${YELLOW}💡 Si l'URL est toujours en localhost :${NC}"
  echo "   - Attendez 2-3 minutes que n8n redémarre complètement"
  echo "   - Rafraîchissez la page (Ctrl+F5 ou Cmd+Shift+R)"
  echo "   - Vérifiez les logs : docker logs $CONTAINER_NAME --tail 50"
  echo ""
  echo -e "${BLUE}📦 Backup sauvegardé dans : $backup_dir${NC}"
  echo "   (Vous pouvez le supprimer si tout fonctionne)"
  echo ""
}

# Exécuter le script
main "$@"

