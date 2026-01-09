#!/bin/bash

# Script pour vérifier DATABASE_URL

cd /var/www/talosprimes || exit 1

echo "🔍 Vérification de DATABASE_URL..."
echo ""

# Charger le .env
if [ -f .env ]; then
  echo "✅ Fichier .env trouvé à la racine"
  source .env
elif [ -f packages/platform/.env ]; then
  echo "✅ Fichier .env trouvé dans packages/platform"
  source packages/platform/.env
else
  echo "❌ Aucun fichier .env trouvé"
  exit 1
fi

echo ""
echo "DATABASE_URL: ${DATABASE_URL:0:50}..."
echo ""

# Afficher le type de connexion
if [[ "$DATABASE_URL" == postgresql://* ]] || [[ "$DATABASE_URL" == postgres://* ]]; then
  echo "✅ Format d'URL PostgreSQL détecté"
else
  echo "⚠️  Format d'URL non standard détecté"
fi

echo ""
echo "Test de connexion..."
psql "$DATABASE_URL" -c "SELECT 1;" 2>&1

