#!/bin/bash

# Script pour corriger la connexion Nginx vers n8n en utilisant l'IP directe
# Usage: sudo ./fix-n8n-nginx-connection.sh

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

CONTAINER_NAME="root-n8n-1"
NGINX_CONFIG="/etc/nginx/sites-available/n8n"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Correction connexion Nginx → n8n      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Vérifier que le script est exécuté en root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Ce script doit être exécuté en root (utilisez sudo)${NC}"
  exit 1
fi

# 1. Vérifier que le conteneur est démarré
echo -e "${BLUE}📋 1. Vérification du conteneur...${NC}"
if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
  echo -e "${RED}❌ Conteneur $CONTAINER_NAME non démarré${NC}"
  echo "Démarrez-le avec : cd /root && docker compose up -d"
  exit 1
fi
echo -e "${GREEN}✅ Conteneur démarré${NC}"

# 2. Obtenir l'IP du conteneur
echo ""
echo -e "${BLUE}📋 2. Récupération de l'IP du conteneur...${NC}"
CONTAINER_IP=$(docker inspect "$CONTAINER_NAME" --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" 2>/dev/null | head -1)

if [ -z "$CONTAINER_IP" ] || [ "$CONTAINER_IP" = "null" ] || [ "$CONTAINER_IP" = "" ]; then
  echo -e "${RED}❌ IP du conteneur non trouvée${NC}"
  exit 1
fi

echo -e "${GREEN}✅ IP du conteneur : $CONTAINER_IP${NC}"

# 3. Tester la connectivité
echo ""
echo -e "${BLUE}📋 3. Test de connectivité...${NC}"
if curl -s --connect-timeout 5 "http://$CONTAINER_IP:5678" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Connexion réussie à http://$CONTAINER_IP:5678${NC}"
else
  echo -e "${YELLOW}⚠️  Connexion directe échouée (test basique)${NC}"
  echo "  Le conteneur répond peut-être mais avec un code d'erreur"
fi

# 4. Vérifier les logs Nginx
echo ""
echo -e "${BLUE}📋 4. Dernières erreurs Nginx...${NC}"
if [ -f "/var/log/nginx/n8n-error.log" ]; then
  echo "Dernières erreurs :"
  tail -5 /var/log/nginx/n8n-error.log | sed 's/^/  /'
else
  echo "  Aucun log d'erreur trouvé"
fi

# 5. Mettre à jour la configuration Nginx avec l'IP directe
echo ""
echo -e "${BLUE}📋 5. Mise à jour de la configuration Nginx...${NC}"

# Créer un backup
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d-%H%M%S)"
cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup créé : $BACKUP_FILE${NC}"

# Remplacer toutes les occurrences du nom du conteneur par l'IP
sed -i "s|${CONTAINER_NAME}|${CONTAINER_IP}|g" "$NGINX_CONFIG"

# Mettre à jour la variable $backend si elle existe
sed -i "s|set \$backend \".*\"|set \$backend \"http://${CONTAINER_IP}:5678\"|g" "$NGINX_CONFIG"

# Simplifier en remplaçant directement les proxy_pass avec la variable par l'IP directe
# Remplacer "set $backend ... proxy_pass $backend" par "proxy_pass http://IP:5678"
sed -i "s|proxy_pass \$backend|proxy_pass http://${CONTAINER_IP}:5678|g" "$NGINX_CONFIG"
sed -i "s|proxy_pass \$backend/|proxy_pass http://${CONTAINER_IP}:5678/|g" "$NGINX_CONFIG"

# Afficher les lignes modifiées pour vérification
echo "Configuration mise à jour :"
grep -n "proxy_pass\|set \$backend" "$NGINX_CONFIG" | head -5 | sed 's/^/  /'

echo -e "${GREEN}✅ Configuration mise à jour avec l'IP : $CONTAINER_IP${NC}"

# 6. Tester la configuration Nginx
echo ""
echo -e "${BLUE}📋 6. Test de la configuration Nginx...${NC}"
if nginx -t; then
  echo -e "${GREEN}✅ Configuration Nginx valide${NC}"
else
  echo -e "${RED}❌ Erreur dans la configuration Nginx${NC}"
  exit 1
fi

# 7. Recharger Nginx
echo ""
echo -e "${BLUE}📋 7. Rechargement de Nginx...${NC}"
systemctl reload nginx
echo -e "${GREEN}✅ Nginx rechargé${NC}"

# 8. Tester la connexion
echo ""
echo -e "${BLUE}📋 8. Test de la connexion finale...${NC}"
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://n8n.talosprimes.com" || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
  echo -e "${GREEN}✅ Connexion réussie ! Code HTTP : $HTTP_CODE${NC}"
else
  echo -e "${YELLOW}⚠️  Code HTTP : $HTTP_CODE${NC}"
  echo "  Vérifiez les logs : tail -f /var/log/nginx/n8n-error.log"
fi

echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Correction terminée                   ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "📋 Résumé :"
echo "  - IP du conteneur : $CONTAINER_IP"
echo "  - Configuration Nginx : $NGINX_CONFIG"
echo ""
echo "⚠️  Note : Si l'IP change (après redémarrage du conteneur),"
echo "   réexécutez ce script ou utilisez le DNS Docker (resolver)."
echo ""

