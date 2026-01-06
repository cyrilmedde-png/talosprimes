#!/bin/bash

# Script pour trouver tous les fichiers de configuration n8n
# Usage: ./find-n8n-config.sh

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
echo -e "${CYAN}║   Recherche configuration n8n         ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# 1. Vérifier les variables d'environnement du conteneur
echo -e "${BLUE}📋 1. Variables d'environnement du conteneur${NC}"
echo "=========================================="
docker inspect "$CONTAINER_NAME" 2>/dev/null | grep -E '"N8N_|"WEBHOOK' | sed 's/^/  /' || echo "  Aucune variable trouvée"
echo ""

# 2. Vérifier les variables dans le conteneur en cours d'exécution
echo -e "${BLUE}📋 2. Variables dans le conteneur (runtime)${NC}"
echo "=========================================="
if docker ps | grep -q "$CONTAINER_NAME"; then
  docker exec "$CONTAINER_NAME" printenv | grep -E "^N8N_|^WEBHOOK" | sed 's/^/  /' || echo "  Aucune variable trouvée"
else
  echo -e "${YELLOW}  ⚠️  Conteneur arrêté${NC}"
fi
echo ""

# 3. Chercher les fichiers .env dans le volume Docker
echo -e "${BLUE}📋 3. Fichiers .env dans le volume Docker${NC}"
echo "=========================================="
VOLUME_NAME=$(docker inspect "$CONTAINER_NAME" 2>/dev/null | \
  grep -A 10 '"Mounts"' | \
  grep '"Name"' | \
  head -1 | \
  cut -d'"' -f4 || echo "")

if [ -n "$VOLUME_NAME" ]; then
  echo "  Volume: $VOLUME_NAME"
  echo ""
  echo "  Recherche de fichiers .env..."
  docker run --rm -v "${VOLUME_NAME}:/data" alpine find /data -name ".env" -o -name "*.env" 2>/dev/null | sed 's/^/  /' || echo "  Aucun fichier .env trouvé"
  echo ""
  echo "  Contenu des fichiers .env trouvés :"
  docker run --rm -v "${VOLUME_NAME}:/data" alpine sh -c 'find /data -name ".env" -o -name "*.env" | head -5 | while read f; do echo "  === $f ==="; cat "$f" 2>/dev/null | grep -E "N8N_|WEBHOOK" || echo "  (vide ou pas de variables N8N)"; echo ""; done' 2>/dev/null || echo "  Impossible de lire les fichiers"
else
  echo -e "${YELLOW}  ⚠️  Aucun volume Docker trouvé${NC}"
fi
echo ""

# 4. Chercher les fichiers de configuration n8n
echo -e "${BLUE}📋 4. Fichiers de configuration n8n${NC}"
echo "=========================================="
if [ -n "$VOLUME_NAME" ]; then
  echo "  Recherche de fichiers de config..."
  docker run --rm -v "${VOLUME_NAME}:/data" alpine find /data -type f \( -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "config*" \) 2>/dev/null | head -10 | sed 's/^/  /' || echo "  Aucun fichier de config trouvé"
  echo ""
  echo "  Recherche de 'localhost' dans les fichiers :"
  docker run --rm -v "${VOLUME_NAME}:/data" alpine sh -c 'grep -r "localhost" /data 2>/dev/null | head -10' | sed 's/^/  /' || echo "  Aucune occurrence de 'localhost' trouvée"
fi
echo ""

# 5. Vérifier la base de données n8n (si SQLite)
echo -e "${BLUE}📋 5. Base de données n8n (SQLite)${NC}"
echo "=========================================="
if [ -n "$VOLUME_NAME" ]; then
  DB_FILE=$(docker run --rm -v "${VOLUME_NAME}:/data" alpine find /data -name "*.db" -o -name "database.sqlite" 2>/dev/null | head -1 || echo "")
  if [ -n "$DB_FILE" ]; then
    echo "  Base de données trouvée: $DB_FILE"
    echo ""
    echo "  Recherche de 'localhost' dans la base de données :"
    docker run --rm -v "${VOLUME_NAME}:/data" alpine sh -c "sqlite3 '$DB_FILE' 'SELECT * FROM settings WHERE value LIKE \"%localhost%\" LIMIT 5;' 2>/dev/null" | sed 's/^/  /' || echo "  (sqlite3 non disponible ou pas de résultats)"
  else
    echo "  Aucune base de données SQLite trouvée"
  fi
else
  echo -e "${YELLOW}  ⚠️  Impossible de vérifier sans volume${NC}"
fi
echo ""

# 6. Vérifier les fichiers de configuration système
echo -e "${BLUE}📋 6. Fichiers de configuration système${NC}"
echo "=========================================="
echo "  Recherche dans /root/.n8n :"
find /root/.n8n -name "*.env" -o -name "config*" 2>/dev/null | head -5 | while read f; do
  echo "  - $f"
  grep -E "N8N_|WEBHOOK" "$f" 2>/dev/null | sed 's/^/    /' || echo "    (pas de variables N8N)"
done || echo "  Aucun fichier trouvé"
echo ""

# 7. Vérifier docker-compose.yml si existe
echo -e "${BLUE}📋 7. Fichiers docker-compose${NC}"
echo "=========================================="
find /root /home /var/www -name "docker-compose.yml" -o -name "docker-compose.yaml" 2>/dev/null | head -3 | while read f; do
  echo "  - $f"
  grep -A 10 -B 2 "n8n" "$f" 2>/dev/null | grep -E "N8N_|WEBHOOK|environment" | sed 's/^/    /' || echo "    (pas de config n8n)"
  echo ""
done || echo "  Aucun docker-compose trouvé"
echo ""

# 8. Recommandations
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Recommandations                     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

if docker exec "$CONTAINER_NAME" printenv 2>/dev/null | grep -q "N8N_HOST=$DOMAIN"; then
  echo -e "${GREEN}✅ Les variables d'environnement sont correctes${NC}"
  echo ""
  echo "Le problème vient probablement du cache n8n ou de la base de données."
  echo ""
  echo "Solutions :"
  echo "1. Redémarrer complètement n8n : docker restart $CONTAINER_NAME"
  echo "2. Attendre 3-5 minutes"
  echo "3. Dans n8n, désactiver puis réactiver le workflow"
  echo "4. Supprimer et recréer le nœud Webhook"
  echo ""
  echo "Si ça ne fonctionne toujours pas, n8n stocke peut-être l'URL dans sa base de données."
  echo "Il faudra alors modifier directement dans la base de données ou recréer le workflow."
else
  echo -e "${RED}❌ Les variables d'environnement ne sont pas correctes${NC}"
  echo ""
  echo "Exécutez : ./fix-n8n-simple.sh"
fi

echo ""

