#!/bin/bash

# Script de configuration SSL avec Let's Encrypt pour TalosPrimes
# Usage: sudo ./configure-ssl.sh

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DOMAIN="talosprimes.com"
API_SUBDOMAIN="api.talosprimes.com"

echo -e "${GREEN}🔒 Configuration SSL avec Let's Encrypt${NC}"
echo ""

# Vérifier que le script est exécuté en root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Veuillez exécuter ce script avec sudo${NC}"
    exit 1
fi

# Vérifier si certbot est installé
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}📦 Installation de Certbot...${NC}"
    apt update
    apt install -y certbot python3-certbot-nginx
else
    echo -e "${GREEN}✅ Certbot est déjà installé${NC}"
fi

# Demander le domaine
read -p "Domaine principal [$DOMAIN]: " input_domain
DOMAIN=${input_domain:-$DOMAIN}

read -p "Sous-domaine API [$API_SUBDOMAIN] (laissez vide si vous utilisez /api): " input_api
API_SUBDOMAIN=${input_api:-$API_SUBDOMAIN}

echo ""
echo -e "${YELLOW}Configuration SSL pour :${NC}"
echo "  - $DOMAIN"
echo "  - www.$DOMAIN"
if [ ! -z "$API_SUBDOMAIN" ]; then
    echo "  - $API_SUBDOMAIN"
fi
echo ""

read -p "Continuer ? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "Annulé."
    exit 0
fi

# Générer les certificats SSL
echo -e "${GREEN}🔐 Génération des certificats SSL...${NC}"

if [ ! -z "$API_SUBDOMAIN" ]; then
    certbot --nginx -d $DOMAIN -d www.$DOMAIN -d $API_SUBDOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect
else
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect
fi

# Vérifier le renouvellement automatique
echo -e "${GREEN}🔄 Test du renouvellement automatique...${NC}"
certbot renew --dry-run

echo ""
echo -e "${GREEN}✅ Configuration SSL terminée !${NC}"
echo ""
echo -e "${YELLOW}📋 Informations importantes :${NC}"
echo ""
echo "1. Les certificats sont valides pour 90 jours"
echo "2. Le renouvellement automatique est configuré"
echo "3. Vérifiez le renouvellement avec : sudo certbot renew --dry-run"
echo ""
echo "4. Mettez à jour vos variables d'environnement :"
echo "   - Backend: CORS_ORIGIN=https://$DOMAIN"
echo "   - Frontend: NEXT_PUBLIC_API_URL=https://$API_SUBDOMAIN"
echo "   (ou https://$DOMAIN/api si pas de sous-domaine)"
echo ""

