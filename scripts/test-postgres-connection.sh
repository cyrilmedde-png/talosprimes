#!/bin/bash
# Script pour tester la connexion Postgres Supabase

echo "🔍 Test de connexion Postgres Supabase"
echo "========================================"
echo ""

# Lire le DATABASE_URL depuis le .env backend
ENV_FILE="/var/www/talosprimes/packages/platform/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Fichier .env non trouvé : $ENV_FILE"
  exit 1
fi

DATABASE_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL non trouvé dans $ENV_FILE"
  exit 1
fi

echo "📋 DATABASE_URL trouvé"
echo ""

# Extraire les informations
echo "📊 Informations de connexion :"
echo "--------------------------------"

# Extraire le host
HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
echo "Host: $HOST"

# Extraire le port
PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
echo "Port: $PORT"

# Extraire le database
DATABASE=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
echo "Database: $DATABASE"

# Extraire le user
USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
echo "User: $USER"

echo ""
echo "🔌 Test de connexion..."
echo "--------------------------------"

# Tester avec psql si disponible
if command -v psql &> /dev/null; then
  echo "Test avec psql..."
  if psql "$DATABASE_URL" -c "SELECT 1 as test;" 2>&1; then
    echo ""
    echo "✅ Connexion réussie avec psql !"
    echo ""
    echo "📝 Pour n8n, utilise ces valeurs :"
    echo "   Host: $HOST"
    echo "   Port: $PORT"
    echo "   Database: $DATABASE"
    echo "   User: $USER"
    echo "   Password: (celui de ton DATABASE_URL)"
  else
    echo ""
    echo "❌ Connexion échouée avec psql"
    echo ""
    echo "💡 Solutions :"
    echo "   1. Vérifier que le mot de passe est correct"
    echo "   2. Vérifier que le port $PORT est accessible"
    echo "   3. Essayer avec le pooler (port 6543) au lieu de $PORT"
  fi
else
  echo "⚠️ psql n'est pas installé"
  echo ""
  echo "📝 Pour n8n, utilise ces valeurs extraites :"
  echo "   Host: $HOST"
  echo "   Port: $PORT"
  echo "   Database: $DATABASE"
  echo "   User: $USER"
  echo "   Password: (celui de ton DATABASE_URL, entre 'postgres:' et '@')"
fi

echo ""
echo "========================================"

