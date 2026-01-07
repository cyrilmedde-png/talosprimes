#!/bin/bash

# Script pour redémarrer le backend TalosPrimes
# Usage: ./restart-backend.sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Redémarrage du backend TalosPrimes${NC}"

# Aller dans le répertoire du backend
cd /var/www/talosprimes/packages/platform || {
  echo -e "${RED}❌ Erreur: Répertoire /var/www/talosprimes/packages/platform introuvable${NC}"
  exit 1
}

# Vérifier si le processus existe
if pm2 list | grep -q "talosprimes-api"; then
  echo -e "${GREEN}✅ Processus talosprimes-api trouvé${NC}"
  echo -e "${BLUE}🔄 Redémarrage...${NC}"
  pm2 restart talosprimes-api
else
  echo -e "${YELLOW}⚠️  Processus talosprimes-api non trouvé, création...${NC}"
  
  # Vérifier que le build existe
  if [ ! -f "dist/index.js" ]; then
    echo -e "${YELLOW}⚠️  Build introuvable, compilation...${NC}"
    pnpm build
  fi
  
  # Démarrer le processus
  pm2 start dist/index.js --name "talosprimes-api" --env production
  
  echo -e "${GREEN}✅ Processus talosprimes-api démarré${NC}"
fi

# Afficher le statut
echo -e "\n${BLUE}📊 Statut PM2 :${NC}"
pm2 list | grep -E "talosprimes-api|name|status"

echo -e "\n${BLUE}📋 Logs récents (20 dernières lignes) :${NC}"
pm2 logs talosprimes-api --lines 20 --nostream

echo -e "\n${GREEN}✅ Terminé !${NC}"
echo -e "${YELLOW}💡 Pour voir les logs en temps réel : pm2 logs talosprimes-api${NC}"

