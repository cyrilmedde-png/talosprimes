#!/bin/bash
# ============================================
# Prisma Migrations Baseline
# À exécuter UNE SEULE FOIS sur le VPS
# ============================================
# Ce script initialise le système de migrations Prisma
# sur une base de données existante (créée via db push).
# Après ça, le deploy utilisera "prisma migrate deploy"
# au lieu de "db push", ce qui est plus sûr en production.
# ============================================

set -e

cd /var/www/talosprimes/packages/platform

echo "=== Prisma Baseline Migration ==="
echo ""

# Étape 1 : Générer le SQL du schéma actuel
echo "[1/3] Génération du SQL initial..."
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql

echo "  -> SQL généré ($(wc -l < prisma/migrations/0_init/migration.sql) lignes)"

# Étape 2 : Marquer la migration comme déjà appliquée (baseline)
echo "[2/3] Marquage de la migration comme appliquée (baseline)..."
npx prisma migrate resolve --applied 0_init

echo "  -> Migration 0_init marquée comme appliquée"

# Étape 3 : Vérifier que tout est OK
echo "[3/3] Vérification..."
npx prisma migrate status

echo ""
echo "=== Baseline terminé ! ==="
echo "Les prochains déploiements utiliseront 'prisma migrate deploy' sans erreur."
