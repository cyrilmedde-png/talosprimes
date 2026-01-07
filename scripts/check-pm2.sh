#!/bin/bash

# Script pour vérifier l'état des processus PM2
# Usage: ./check-pm2.sh

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 État des processus PM2 TalosPrimes${NC}\n"

# Vérifier si PM2 est installé
if ! command -v pm2 &> /dev/null; then
  echo -e "${RED}❌ PM2 n'est pas installé${NC}"
  exit 1
fi

# Afficher tous les processus
echo -e "${BLUE}📋 Liste complète des processus PM2 :${NC}"
pm2 list

echo -e "\n${BLUE}🔍 Recherche des processus TalosPrimes :${NC}"

# Vérifier backend
if pm2 list | grep -q "talosprimes-api"; then
  echo -e "${GREEN}✅ Backend (talosprimes-api) : ACTIF${NC}"
  pm2 show talosprimes-api | grep -E "status|uptime|restarts|memory|cpu" | head -5
else
  echo -e "${YELLOW}⚠️  Backend (talosprimes-api) : NON TROUVÉ${NC}"
  echo -e "   Pour démarrer : cd /var/www/talosprimes/packages/platform && pm2 start dist/index.js --name talosprimes-api"
fi

# Vérifier frontend
if pm2 list | grep -q "talosprimes-client"; then
  echo -e "${GREEN}✅ Frontend (talosprimes-client) : ACTIF${NC}"
  pm2 show talosprimes-client | grep -E "status|uptime|restarts|memory|cpu" | head -5
else
  echo -e "${YELLOW}⚠️  Frontend (talosprimes-client) : NON TROUVÉ${NC}"
  echo -e "   Pour démarrer : cd /var/www/talosprimes/packages/client && pm2 start \"pnpm start\" --name talosprimes-client"
fi

echo -e "\n${BLUE}💡 Commandes utiles :${NC}"
echo -e "   - Voir tous les logs : ${YELLOW}pm2 logs${NC}"
echo -e "   - Voir les logs backend : ${YELLOW}pm2 logs talosprimes-api${NC}"
echo -e "   - Voir les logs frontend : ${YELLOW}pm2 logs talosprimes-client${NC}"
echo -e "   - Redémarrer tout : ${YELLOW}pm2 restart all${NC}"

