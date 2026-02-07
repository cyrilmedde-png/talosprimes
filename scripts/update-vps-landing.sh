#!/bin/bash

# Script de mise à jour VPS pour la landing page TalosPrimes
# À exécuter sur le VPS après push GitHub

set -e  # Arrêter si une commande échoue

echo "🚀 Mise à jour TalosPrimes VPS - Landing Page"
echo "=============================================="

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Répertoire du projet (à adapter)
PROJECT_DIR="/var/www/talosprimes"

echo -e "${BLUE}📍 Navigation vers le projet...${NC}"
cd $PROJECT_DIR

echo -e "${BLUE}🔄 Récupération des derniers changements...${NC}"
git pull origin main

echo -e "${BLUE}📦 Installation des dépendances...${NC}"
pnpm install

echo -e "${BLUE}🗄️  Génération du client Prisma...${NC}"
cd packages/platform
pnpm prisma generate

echo -e "${BLUE}🔧 Application des migrations DB...${NC}"
pnpm prisma db push

echo -e "${BLUE}🌱 Seed des données landing page...${NC}"
# Vérifier si le seed a déjà été fait pour éviter les doublons
if ! npx prisma db execute --sql "SELECT COUNT(*) FROM landing_content;" 2>/dev/null | grep -q "0"; then
    echo "⚠️  Landing content déjà existant, skip du seed"
else
    npx tsx prisma/seed-landing.ts
fi

echo -e "${BLUE}🏗️  Build des applications...${NC}"
cd ../..
pnpm build

echo -e "${BLUE}🔄 Redémarrage PM2...${NC}"
pm2 restart all

echo -e "${BLUE}📊 Statut des services...${NC}"
pm2 status

echo -e "${GREEN}✅ Mise à jour terminée avec succès !${NC}"
echo ""
echo "🌐 Accéder à la landing page : https://votre-domaine.com"
echo "⚙️  Accéder au CMS admin : https://votre-domaine.com/dashboard/cms"
echo ""
echo "📝 Vérifier les logs si besoin : pm2 logs"
