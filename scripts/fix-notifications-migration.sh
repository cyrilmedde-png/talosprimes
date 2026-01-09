#!/bin/bash

# Script pour générer la migration Prisma et régénérer le client pour les notifications
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

echo "📋 Vérification de la connexion à la base de données..."
if ! pnpm prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "⚠️  Impossible de vérifier la connexion, mais on continue..."
fi

echo ""
echo "🔄 Génération du client Prisma (sans migration)..."
pnpm prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Client Prisma régénéré avec succès"
else
    echo "❌ Erreur lors de la régénération du client Prisma"
    echo ""
    echo "📝 Tentative de génération de la migration..."
    
    echo ""
    echo "🔄 Génération de la migration..."
    pnpm prisma migrate dev --name add_notifications_table --create-only || {
        echo "⚠️  La migration existe peut-être déjà, on continue..."
    }
    
    echo ""
    echo "🔄 Application de la migration..."
    pnpm prisma migrate deploy || {
        echo "⚠️  Erreur lors de l'application de la migration"
        echo "💡 Essayez: pnpm prisma db push (pour forcer la création de la table)"
    }
    
    echo ""
    echo "🔄 Régénération finale du client Prisma..."
    pnpm prisma generate
fi

echo ""
echo "✅ Opérations terminées !"
echo ""
echo "📋 Pour vérifier, exécutez :"
echo "   pnpm prisma studio"
echo ""

