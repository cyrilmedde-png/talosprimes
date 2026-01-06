#!/bin/bash
# Script complet pour mettre à jour l'application sur le VPS

echo "🚀 Mise à jour de TalosPrimes sur le VPS"
echo ""

# 1. Récupérer les changements
echo "📥 Récupération des changements depuis GitHub..."
cd /var/www/talosprimes
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du git pull"
    exit 1
fi

echo "✅ Changements récupérés"
echo ""

# 2. Installer les dépendances
echo "📦 Installation des dépendances..."
pnpm install

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

echo "✅ Dépendances installées"
echo ""

# 3. Mettre à jour Prisma
echo "🗄️ Mise à jour de Prisma..."
cd packages/platform
pnpm db:generate

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la génération Prisma"
    exit 1
fi

pnpm db:push

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du push Prisma"
    exit 1
fi

echo "✅ Prisma mis à jour"
echo ""

# 4. Créer l'utilisateur admin (si pas déjà fait)
echo "🌱 Création de l'utilisateur admin..."
pnpm db:seed

if [ $? -ne 0 ]; then
    echo "⚠️ Erreur lors du seed (peut-être déjà créé)"
else
    echo "✅ Utilisateur admin créé"
fi
echo ""

# 5. Build
echo "🔨 Build de l'application..."
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build"
    exit 1
fi

echo "✅ Build terminé"
echo ""

# 6. Redémarrer PM2
echo "🔄 Redémarrage de l'application..."
pm2 restart talosprimes-api

if [ $? -ne 0 ]; then
    echo "⚠️ PM2 n'est pas configuré, démarrez manuellement avec: pnpm start"
else
    echo "✅ Application redémarrée"
fi

echo ""
echo "🎉 Mise à jour terminée !"
echo ""
echo "📋 Vérification :"
echo "   curl http://localhost:3001/health"

