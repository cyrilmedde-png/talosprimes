#!/bin/bash
# Script complet pour tester la connexion Postgres depuis le VPS

echo "🔍 Test complet de connexion Postgres Supabase"
echo "================================================"
echo ""

# Installer psql si nécessaire
if ! command -v psql &> /dev/null; then
    echo "📦 Installation de psql..."
    apt update
    apt install -y postgresql-client-common postgresql-client
    echo "✅ psql installé"
    echo ""
fi

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

# Extraire les composants
PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*postgres:\([^@]*\)@.*/\1/p')
HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

echo "📊 Configuration à tester :"
echo "   Host: $HOST"
echo "   Port: $PORT"
echo "   Password: ${#PASSWORD} caractères"
echo ""

# Test 1 : Connexion directe (port 5432, sslmode=require)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Test 1 : Connexion directe (port 5432, sslmode=require)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TEST_URL_1="postgresql://postgres:${PASSWORD}@${HOST}:5432/postgres?sslmode=require"
echo "URL : postgresql://postgres:***@${HOST}:5432/postgres?sslmode=require"
echo ""

if psql "$TEST_URL_1" -c "SELECT 1 as test_connection, version() as postgres_version;" 2>&1; then
    echo ""
    echo "✅ Test 1 RÉUSSI : Connexion directe fonctionne !"
    echo "   → Utilise cette configuration dans n8n"
    TEST_1_SUCCESS=true
else
    echo ""
    echo "❌ Test 1 ÉCHOUÉ : Connexion directe ne fonctionne pas"
    TEST_1_SUCCESS=false
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Test 2 : Connexion directe (port 5432, sslmode=allow)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TEST_URL_2="postgresql://postgres:${PASSWORD}@${HOST}:5432/postgres?sslmode=allow"
echo "URL : postgresql://postgres:***@${HOST}:5432/postgres?sslmode=allow"
echo ""

if psql "$TEST_URL_2" -c "SELECT 1 as test_connection;" 2>&1; then
    echo ""
    echo "✅ Test 2 RÉUSSI : Connexion avec sslmode=allow fonctionne !"
    echo "   → Utilise sslmode=allow dans n8n"
    TEST_2_SUCCESS=true
else
    echo ""
    echo "❌ Test 2 ÉCHOUÉ : Connexion avec sslmode=allow ne fonctionne pas"
    TEST_2_SUCCESS=false
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Test 3 : Pooler Supabase (port 6543, sslmode=require)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Essayer de déterminer le pooler host
POOLER_HOST="aws-0-eu-central-1.pooler.supabase.com"
TEST_URL_3="postgresql://postgres.${HOST#db.}:${PASSWORD}@${POOLER_HOST}:6543/postgres?pgbouncer=true"

echo "URL : postgresql://postgres.${HOST#db.}:***@${POOLER_HOST}:6543/postgres?pgbouncer=true"
echo ""

if psql "$TEST_URL_3" -c "SELECT 1 as test_connection;" 2>&1; then
    echo ""
    echo "✅ Test 3 RÉUSSI : Connexion via pooler fonctionne !"
    echo "   → Utilise le pooler dans n8n"
    TEST_3_SUCCESS=true
else
    echo ""
    echo "❌ Test 3 ÉCHOUÉ : Connexion via pooler ne fonctionne pas"
    echo "   (C'est normal si le pooler n'est pas configuré pour ton projet)"
    TEST_3_SUCCESS=false
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Résumé des tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$TEST_1_SUCCESS" = true ]; then
    echo "✅ Test 1 (direct, sslmode=require) : RÉUSSI"
    echo ""
    echo "📝 Configuration pour n8n :"
    echo "   Host: $HOST"
    echo "   Port: 5432"
    echo "   Database: postgres"
    echo "   User: postgres"
    echo "   Password: (celui du DATABASE_URL)"
    echo "   SSL: require"
    echo ""
elif [ "$TEST_2_SUCCESS" = true ]; then
    echo "✅ Test 2 (direct, sslmode=allow) : RÉUSSI"
    echo ""
    echo "📝 Configuration pour n8n :"
    echo "   Host: $HOST"
    echo "   Port: 5432"
    echo "   Database: postgres"
    echo "   User: postgres"
    echo "   Password: (celui du DATABASE_URL)"
    echo "   SSL: allow"
    echo ""
elif [ "$TEST_3_SUCCESS" = true ]; then
    echo "✅ Test 3 (pooler) : RÉUSSI"
    echo ""
    echo "📝 Configuration pour n8n :"
    echo "   Host: $POOLER_HOST"
    echo "   Port: 6543"
    echo "   Database: postgres"
    echo "   User: postgres.${HOST#db.}"
    echo "   Password: (celui du DATABASE_URL)"
    echo "   SSL: require"
    echo ""
else
    echo "❌ Aucun test n'a réussi"
    echo ""
    echo "💡 Problèmes possibles :"
    echo "   1. Le port 5432 est peut-être bloqué par un firewall"
    echo "   2. Le mot de passe est peut-être incorrect"
    echo "   3. Supabase peut nécessiter une IP whitelist"
    echo ""
    echo "🔍 Vérifications supplémentaires :"
    echo "   1. Vérifier dans Supabase Dashboard : Settings → Database → Network Restrictions"
    echo "   2. Vérifier que l'IP du serveur est autorisée"
    echo "   3. Vérifier le mot de passe dans Supabase Dashboard"
fi

echo ""

