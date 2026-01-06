#!/bin/bash

# Script pour diagnostiquer et corriger l'erreur 500 Nginx avec n8n
# Usage: sudo ./fix-n8n-nginx-500.sh

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

CONTAINER_NAME="root-n8n-1"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Diagnostic erreur 500 Nginx + n8n    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Vérifier que le script est exécuté en root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Ce script doit être exécuté en root (utilisez sudo)${NC}"
  exit 1
fi

# 1. Vérifier le statut du conteneur
echo -e "${BLUE}📋 1. Vérification du conteneur n8n...${NC}"
if docker ps -a --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
  CONTAINER_STATUS=$(docker ps --format "{{.Names}} {{.Status}}" | grep "$CONTAINER_NAME" || echo "STOPPED")
  if echo "$CONTAINER_STATUS" | grep -q "STOPPED\|^$"; then
    echo -e "${YELLOW}⚠️  Conteneur arrêté${NC}"
    echo "  Tentative de démarrage..."
    cd /root
    if [ -f "docker-compose.yaml" ]; then
      docker compose up -d n8n || docker-compose up -d n8n || docker compose up -d
    else
      docker start "$CONTAINER_NAME" 2>/dev/null || echo -e "${RED}❌ Impossible de démarrer le conteneur${NC}"
    fi
    sleep 3
  else
    echo -e "${GREEN}✅ Conteneur démarré${NC}"
    echo "  Statut: $CONTAINER_STATUS"
  fi
else
  echo -e "${RED}❌ Conteneur non trouvé${NC}"
  echo ""
  echo "Le conteneur n'existe pas. Créez-le avec :"
  echo "  cd /root"
  echo "  docker compose up -d"
  exit 1
fi

# 2. Vérifier l'IP du conteneur
echo ""
echo -e "${BLUE}📋 2. Vérification de l'IP du conteneur...${NC}"
CONTAINER_IP=$(docker inspect "$CONTAINER_NAME" --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" 2>/dev/null | head -1)
if [ -n "$CONTAINER_IP" ] && [ "$CONTAINER_IP" != "null" ]; then
  echo -e "${GREEN}✅ IP du conteneur : $CONTAINER_IP${NC}"
else
  echo -e "${RED}❌ IP du conteneur non trouvée${NC}"
fi

# 3. Vérifier que le conteneur écoute sur le port 5678
echo ""
echo -e "${BLUE}📋 3. Vérification du port 5678...${NC}"
if docker exec "$CONTAINER_NAME" netstat -tlnp 2>/dev/null | grep -q ":5678" || docker port "$CONTAINER_NAME" 2>/dev/null | grep -q "5678"; then
  echo -e "${GREEN}✅ Le conteneur écoute sur le port 5678${NC}"
else
  echo -e "${YELLOW}⚠️  Port 5678 non détecté (normal si pas de netstat dans le conteneur)${NC}"
fi

# 4. Tester la connectivité depuis l'hôte
echo ""
echo -e "${BLUE}📋 4. Test de connectivité...${NC}"
if [ -n "$CONTAINER_IP" ] && [ "$CONTAINER_IP" != "null" ]; then
  if curl -s --connect-timeout 5 "http://$CONTAINER_IP:5678" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connexion réussie à http://$CONTAINER_IP:5678${NC}"
  else
    echo -e "${YELLOW}⚠️  Connexion échouée (le conteneur démarre peut-être encore)${NC}"
  fi
fi

# 5. Vérifier les logs Nginx
echo ""
echo -e "${BLUE}📋 5. Dernières erreurs Nginx...${NC}"
if [ -f "/var/log/nginx/n8n-error.log" ]; then
  echo "Dernières erreurs :"
  tail -10 /var/log/nginx/n8n-error.log | sed 's/^/  /'
else
  echo "  Aucun log d'erreur trouvé"
fi

# 6. Vérifier les configurations Nginx en conflit
echo ""
echo -e "${BLUE}📋 6. Vérification des configurations en conflit...${NC}"
CONFLICTING_CONFIGS=$(grep -r "server_name.*n8n.talosprimes.com" /etc/nginx/sites-enabled/ 2>/dev/null | grep -v "^/etc/nginx/sites-enabled/n8n:" | wc -l)
if [ "$CONFLICTING_CONFIGS" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Configurations en conflit détectées${NC}"
  echo "  Fichiers contenant n8n.talosprimes.com :"
  grep -r "server_name.*n8n.talosprimes.com" /etc/nginx/sites-enabled/ 2>/dev/null | grep -v "^/etc/nginx/sites-enabled/n8n:" | sed 's/^/    /'
  echo ""
  read -p "Voulez-vous désactiver les autres configurations ? (y/n) [n]: " DISABLE_OTHERS
  DISABLE_OTHERS=${DISABLE_OTHERS:-n}
  if [ "$DISABLE_OTHERS" = "y" ] || [ "$DISABLE_OTHERS" = "Y" ]; then
    for file in $(grep -r "server_name.*n8n.talosprimes.com" /etc/nginx/sites-enabled/ 2>/dev/null | grep -v "^/etc/nginx/sites-enabled/n8n:" | cut -d: -f1); do
      echo "  Désactivation de $file..."
      rm -f "/etc/nginx/sites-enabled/$(basename $file)"
    done
    nginx -t && systemctl reload nginx
    echo -e "${GREEN}✅ Configurations en conflit désactivées${NC}"
  fi
else
  echo -e "${GREEN}✅ Aucun conflit détecté${NC}"
fi

# 7. Proposer de recréer la configuration Nginx
echo ""
echo -e "${BLUE}📋 7. Recommandations...${NC}"
echo ""
if [ -z "$CONTAINER_IP" ] || [ "$CONTAINER_IP" = "null" ]; then
  echo -e "${YELLOW}⚠️  L'IP du conteneur n'est pas disponible${NC}"
  echo "  Recréez la configuration Nginx avec :"
  echo "    cd /var/www/talosprimes/scripts"
  echo "    sudo ./configure-nginx-n8n.sh"
fi

echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Diagnostic terminé                   ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "📋 Actions à effectuer :"
echo "  1. Vérifiez que le conteneur est démarré :"
echo "     docker ps | grep $CONTAINER_NAME"
echo ""
echo "  2. Vérifiez les logs du conteneur :"
echo "     docker logs $CONTAINER_NAME --tail 50"
echo ""
echo "  3. Testez à nouveau :"
echo "     curl -I https://n8n.talosprimes.com"
echo ""
echo "  4. Si l'erreur persiste, vérifiez les logs Nginx :"
echo "     tail -f /var/log/nginx/n8n-error.log"
echo ""

