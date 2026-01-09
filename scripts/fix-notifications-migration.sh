#!/bin/bash

# Script pour créer la table notifications et régénérer le client Prisma
# Usage: ./scripts/fix-notifications-migration.sh

set -e

echo "========================================"
echo "  Fix Migration Prisma - Notifications"
echo "========================================"
echo ""

cd "$(dirname "$0")/.." || exit 1

PLATFORM_DIR="packages/platform"

if [ ! -d "$PLATFORM_DIR" ]; then
    echo "❌ Répertoire $PLATFORM_DIR introuvable"
    exit 1
fi

cd "$PLATFORM_DIR" || exit 1

echo "🔄 Poussage du schéma Prisma vers la base de données (db push)..."
echo "   Cela va créer/modifier la table 'notifications' si nécessaire"
pnpm prisma db push --accept-data-loss

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du push du schéma"
    echo ""
    echo "💡 Tentative alternative avec migrate..."
    pnpm prisma migrate dev --name add_notifications_table || {
        echo "⚠️  Erreur lors de la migration"
        exit 1
    }
fi

echo ""
echo "🔄 Régénération du client Prisma TypeScript..."
pnpm prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Client Prisma régénéré avec succès"
else
    echo "❌ Erreur lors de la régénération du client Prisma"
    exit 1
fi

echo ""
echo "✅ Opérations terminées avec succès !"
echo ""
echo "📋 La table 'notifications' a été créée/modifiée dans la base de données"
echo "📋 Le client Prisma TypeScript a été régénéré"
echo ""
echo "💡 Pour vérifier, exécutez : pnpm prisma studio"
echo ""

