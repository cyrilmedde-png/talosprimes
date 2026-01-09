#!/bin/bash

# Script pour appliquer les modifications du schéma Prisma et régénérer le client

echo "=========================================="
echo "  Application des modifications Prisma"
echo "=========================================="
echo ""

cd packages/platform

echo "📋 Pushing schema changes to database..."
pnpm prisma db push --accept-data-loss

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Erreur lors de l'application du schéma"
    exit 1
fi

echo ""
echo "🔨 Génération du client Prisma..."
pnpm prisma generate

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Erreur lors de la génération du client"
    exit 1
fi

echo ""
echo "✅ Migration Prisma terminée avec succès !"
echo ""
echo "📝 Modifications appliquées :"
echo "   - Ajout du champ 'mustChangePassword' au modèle User"
echo "   - Ajout du champ 'temporaryPassword' au modèle ClientSubscription"
echo ""
echo "🔄 Vous pouvez maintenant relancer le build :"
echo "   pnpm build"

