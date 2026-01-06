#!/bin/bash

# Script de diagnostic pour n8n
# Usage: ./diagnostic-n8n.sh

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Diagnostic configuration n8n        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# 1. Vérifier si n8n est en cours d'exécution
echo -e "${BLUE}📋 1. Processus n8n${NC}"
echo "================================"
N8N_PROCESS=$(ps aux | grep -E '[n]8n|node.*n8n' | head -1 || echo "")
if [ -z "$N8N_PROCESS" ]; then
  echo -e "${RED}❌ n8n n'est pas en cours d'exécution${NC}"
else
  echo -e "${GREEN}✅ n8n est en cours d'exécution${NC}"
  echo "$N8N_PROCESS"
fi
echo ""

# 2. Vérifier PM2
echo -e "${BLUE}📋 2. Configuration PM2${NC}"
echo "================================"
if command -v pm2 &> /dev/null; then
  N8N_PM2=$(pm2 list | grep -i n8n || echo "")
  if [ -n "$N8N_PM2" ]; then
    echo -e "${GREEN}✅ n8n est géré par PM2${NC}"
    echo "$N8N_PM2"
    echo ""
    echo -e "${YELLOW}Variables d'environnement PM2 :${NC}"
    pm2 show n8n 2>/dev/null | grep -E "N8N_|WEBHOOK" || echo "Aucune variable N8N trouvée"
  else
    echo -e "${YELLOW}⚠️  PM2 installé mais n8n n'est pas dans PM2${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  PM2 n'est pas installé${NC}"
fi
echo ""

# 3. Chercher les fichiers .env
echo -e "${BLUE}📋 3. Fichiers .env de n8n${NC}"
echo "================================"
ENV_FILES=$(find /root /home /var/www -name ".env" -path "*n8n*" 2>/dev/null | head -5 || echo "")
if [ -n "$ENV_FILES" ]; then
  echo -e "${GREEN}✅ Fichiers .env trouvés :${NC}"
  for file in $ENV_FILES; do
    echo "  - $file"
    echo -e "${YELLOW}  Variables N8N dans ce fichier :${NC}"
    grep -E "^N8N_|^WEBHOOK" "$file" 2>/dev/null || echo "    Aucune variable N8N"
    echo ""
  done
else
  echo -e "${YELLOW}⚠️  Aucun fichier .env n8n trouvé${NC}"
fi

# Chercher aussi dans .n8n
N8N_DIRS=$(find /root /home /var/www -name ".n8n" -type d 2>/dev/null | head -5 || echo "")
if [ -n "$N8N_DIRS" ]; then
  echo -e "${GREEN}✅ Dossiers .n8n trouvés :${NC}"
  for dir in $N8N_DIRS; do
    echo "  - $dir"
    if [ -f "$dir/.env" ]; then
      echo -e "${YELLOW}  Variables N8N dans $dir/.env :${NC}"
      grep -E "^N8N_|^WEBHOOK" "$dir/.env" 2>/dev/null || echo "    Aucune variable N8N"
    fi
    echo ""
  done
fi
echo ""

# 4. Vérifier Docker
echo -e "${BLUE}📋 4. Configuration Docker${NC}"
echo "================================"
if command -v docker &> /dev/null; then
  N8N_CONTAINER=$(docker ps | grep -i n8n || echo "")
  if [ -n "$N8N_CONTAINER" ]; then
    echo -e "${GREEN}✅ n8n est dans un conteneur Docker${NC}"
    echo "$N8N_CONTAINER"
    echo ""
    echo -e "${YELLOW}Variables d'environnement du conteneur :${NC}"
    docker inspect $(echo "$N8N_CONTAINER" | awk '{print $1}') 2>/dev/null | grep -A 20 "Env" | grep -E "N8N_|WEBHOOK" || echo "Aucune variable N8N trouvée"
  else
    echo -e "${YELLOW}⚠️  Docker installé mais aucun conteneur n8n trouvé${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Docker n'est pas installé${NC}"
fi
echo ""

# 5. Vérifier systemd
echo -e "${BLUE}📋 5. Services systemd${NC}"
echo "================================"
if systemctl list-units --type=service 2>/dev/null | grep -qi n8n; then
  echo -e "${GREEN}✅ Service systemd n8n trouvé${NC}"
  systemctl status n8n --no-pager -l | head -20 || true
  echo ""
  echo -e "${YELLOW}Fichier de service :${NC}"
  SYSTEMD_FILE=$(systemctl show n8n -p FragmentPath --value 2>/dev/null || echo "")
  if [ -n "$SYSTEMD_FILE" ]; then
    echo "  $SYSTEMD_FILE"
    grep -E "N8N_|WEBHOOK" "$SYSTEMD_FILE" 2>/dev/null || echo "  Aucune variable N8N dans le service"
  fi
else
  echo -e "${YELLOW}⚠️  Aucun service systemd n8n trouvé${NC}"
fi
echo ""

# 6. Recommandations
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Recommandations                     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

if command -v pm2 &> /dev/null && pm2 list | grep -qi n8n; then
  echo -e "${YELLOW}📝 n8n est géré par PM2${NC}"
  echo ""
  echo "Pour définir les variables d'environnement dans PM2 :"
  echo ""
  echo "1. Créer/modifier un fichier ecosystem.config.js :"
  echo ""
  cat << 'EOF'
module.exports = {
  apps: [{
    name: 'n8n',
    script: 'n8n',
    env: {
      N8N_HOST: 'n8n.talosprimes.com',
      N8N_PROTOCOL: 'https',
      N8N_PORT: '443',
      WEBHOOK_URL: 'https://n8n.talosprimes.com/',
      N8N_METRICS: 'true'
    }
  }]
};
EOF
  echo ""
  echo "2. Redémarrer avec PM2 :"
  echo "   pm2 delete n8n"
  echo "   pm2 start ecosystem.config.js"
  echo "   pm2 save"
elif command -v docker &> /dev/null && docker ps | grep -qi n8n; then
  echo -e "${YELLOW}📝 n8n est dans Docker${NC}"
  echo ""
  echo "Vérifiez votre docker-compose.yml ou la commande docker run"
  echo "et ajoutez les variables d'environnement."
else
  echo -e "${YELLOW}📝 Configuration manuelle${NC}"
  echo ""
  echo "Trouvez comment n8n est lancé et ajoutez les variables d'environnement"
  echo "dans la commande de démarrage ou dans un fichier .env."
fi

echo ""

