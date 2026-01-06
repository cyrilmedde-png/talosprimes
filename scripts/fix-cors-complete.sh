#!/bin/bash

# Script de correction complète CORS et configuration
# Usage: sudo ./fix-cors-complete.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="talosprimes.com"
API_SUBDOMAIN="api.talosprimes.com"
FRONTEND_DIR="/var/www/talosprimes/packages/client"
BACKEND_DIR="/var/www/talosprimes/packages/platform"

echo -e "${BLUE}🔧 Script de correction complète CORS et configuration${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Veuillez exécuter ce script avec sudo${NC}"
    exit 1
fi

# Demander confirmation
read -p "Domaine principal [$DOMAIN]: " input_domain
DOMAIN=${input_domain:-$DOMAIN}

read -p "Sous-domaine API [$API_SUBDOMAIN]: " input_api
API_SUBDOMAIN=${input_api:-$API_SUBDOMAIN}

echo ""
echo -e "${YELLOW}Configuration qui sera appliquée :${NC}"
echo "  - Frontend API URL: https://$API_SUBDOMAIN"
echo "  - Backend CORS Origin: https://$DOMAIN"
echo ""

read -p "Continuer ? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "Annulé."
    exit 0
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}1️⃣  Configuration Frontend${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""

cd "$FRONTEND_DIR"

# Créer ou mettre à jour .env.local
echo -e "${BLUE}📝 Configuration .env.local...${NC}"
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL="https://$API_SUBDOMAIN"
EOF

echo -e "${GREEN}✅ .env.local créé avec : NEXT_PUBLIC_API_URL=\"https://$API_SUBDOMAIN\"${NC}"

# Vérifier le contenu
echo -e "${BLUE}📋 Contenu de .env.local :${NC}"
cat .env.local
echo ""

# Rebuild le frontend
echo -e "${BLUE}🔨 Build du frontend...${NC}"
if pnpm build; then
    echo -e "${GREEN}✅ Build réussi${NC}"
else
    echo -e "${RED}❌ Erreur lors du build${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}2️⃣  Configuration Backend${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""

cd "$BACKEND_DIR"

# Vérifier si .env existe
if [ ! -f .env ]; then
    echo -e "${RED}❌ Fichier .env non trouvé dans $BACKEND_DIR${NC}"
    echo -e "${YELLOW}💡 Créez d'abord le fichier .env avec toutes les variables nécessaires${NC}"
    exit 1
fi

# Sauvegarder l'ancien .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${BLUE}💾 Backup de .env créé${NC}"

# Mettre à jour CORS_ORIGIN
echo -e "${BLUE}📝 Mise à jour CORS_ORIGIN...${NC}"

# Si CORS_ORIGIN existe, le remplacer, sinon l'ajouter
if grep -q "^CORS_ORIGIN=" .env; then
    sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=\"https://$DOMAIN\"|" .env
    echo -e "${GREEN}✅ CORS_ORIGIN mis à jour${NC}"
else
    echo "" >> .env
    echo "# CORS Configuration" >> .env
    echo "CORS_ORIGIN=\"https://$DOMAIN\"" >> .env
    echo -e "${GREEN}✅ CORS_ORIGIN ajouté${NC}"
fi

# Vérifier le contenu
echo -e "${BLUE}📋 CORS_ORIGIN dans .env :${NC}"
grep CORS_ORIGIN .env
echo ""

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}3️⃣  Redémarrage des services${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""

# Redémarrer le frontend
echo -e "${BLUE}🔄 Redémarrage du frontend...${NC}"
if pm2 restart talosprimes-client; then
    echo -e "${GREEN}✅ Frontend redémarré${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend non trouvé dans PM2, démarrage...${NC}"
    cd "$FRONTEND_DIR"
    pm2 start "pnpm start" --name "talosprimes-client" --cwd "$FRONTEND_DIR" || true
fi

# Redémarrer le backend
echo -e "${BLUE}🔄 Redémarrage du backend...${NC}"
if pm2 restart talosprimes-api; then
    echo -e "${GREEN}✅ Backend redémarré${NC}"
else
    echo -e "${YELLOW}⚠️  Backend non trouvé dans PM2${NC}"
fi

# Attendre un peu que les services démarrent
sleep 2

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}4️⃣  Vérification${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""

# Vérifier les services
echo -e "${BLUE}📊 État des services PM2 :${NC}"
pm2 list | grep -E "talosprimes|name|status"

echo ""
echo -e "${BLUE}🧪 Test du backend...${NC}"
if curl -s -f "https://$API_SUBDOMAIN/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend accessible en HTTPS${NC}"
    curl -s "https://$API_SUBDOMAIN/health" | head -1
else
    echo -e "${RED}❌ Backend non accessible en HTTPS${NC}"
    echo -e "${YELLOW}💡 Vérifiez :${NC}"
    echo "   - Nginx est-il démarré ? (sudo systemctl status nginx)"
    echo "   - Le certificat SSL est-il installé ?"
    echo "   - Les DNS pointent-ils vers ce serveur ?"
fi

echo ""
echo -e "${BLUE}🧪 Test du frontend...${NC}"
if curl -s -f "https://$DOMAIN" > /dev/null; then
    echo -e "${GREEN}✅ Frontend accessible en HTTPS${NC}"
else
    echo -e "${RED}❌ Frontend non accessible en HTTPS${NC}"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Configuration terminée !${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}📋 Résumé des modifications :${NC}"
echo ""
echo "Frontend ($FRONTEND_DIR/.env.local):"
echo "  NEXT_PUBLIC_API_URL=\"https://$API_SUBDOMAIN\""
echo ""
echo "Backend ($BACKEND_DIR/.env):"
echo "  CORS_ORIGIN=\"https://$DOMAIN\""
echo ""

echo -e "${YELLOW}📝 Prochaines étapes :${NC}"
echo ""
echo "1. Videz le cache de votre navigateur (Ctrl+Shift+R)"
echo "2. Testez la connexion sur https://$DOMAIN/login"
echo "3. Vérifiez la console du navigateur (F12) pour les erreurs"
echo ""
echo "Si l'erreur persiste :"
echo "  - Vérifiez les logs : pm2 logs talosprimes-api"
echo "  - Vérifiez les logs : pm2 logs talosprimes-client"
echo "  - Vérifiez Nginx : sudo systemctl status nginx"
echo ""

