#!/bin/bash
# Script pour analyser le DATABASE_URL et donner les bonnes valeurs pour n8n

echo "🔍 Analyse du DATABASE_URL pour n8n"
echo "====================================="
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

echo "📋 DATABASE_URL trouvé :"
echo "$DATABASE_URL" | sed 's/postgres:[^@]*/postgres:***MOT_DE_PASSE_MASQUE***/'
echo ""

# Extraire les composants
USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*postgres:\([^@]*\)@.*/\1/p')
HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DATABASE=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Vérifier si c'est un pooler Supabase
IS_POOLER=false
if echo "$HOST" | grep -q "pooler.supabase.com"; then
    IS_POOLER=true
fi

# Vérifier les paramètres de connexion
HAS_PGBOUNCER=false
if echo "$DATABASE_URL" | grep -q "pgbouncer"; then
    HAS_PGBOUNCER=true
fi

echo "📊 Analyse du DATABASE_URL :"
echo "--------------------------------"
echo "User: $USER"
echo "Password: ***MASQUÉ*** (${#PASSWORD} caractères)"
echo "Host: $HOST"
echo "Port: $PORT"
echo "Database: $DATABASE"
echo ""

if [ "$IS_POOLER" = true ]; then
    echo "✅ Mode Pooler détecté (Supabase Connection Pooler)"
    echo ""
    echo "⚠️  IMPORTANT : Le pooler peut causer des problèmes avec n8n"
    echo "   n8n peut nécessiter une connexion directe (pas via pooler)"
    echo ""
    echo "💡 Solution : Utiliser le host direct Supabase"
    echo ""
    # Extraire le project ref du host pooler
    PROJECT_REF=$(echo "$HOST" | sed -n 's/.*aws-0-\([^.]*\)\.pooler\.supabase\.com.*/\1/p')
    if [ -z "$PROJECT_REF" ]; then
        # Format alternatif : db.xxxxx.supabase.co
        PROJECT_REF=$(echo "$HOST" | sed -n 's/db\.\([^.]*\)\.supabase\.co.*/\1/p')
    fi
    if [ -n "$PROJECT_REF" ]; then
        DIRECT_HOST="db.${PROJECT_REF}.supabase.co"
        echo "📋 Host direct détecté : $DIRECT_HOST"
    fi
fi

if [ "$HAS_PGBOUNCER" = true ]; then
    echo "⚠️  PGBouncer détecté dans l'URL"
    echo "   PGBouncer peut causer des problèmes avec certaines requêtes SQL"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Configuration pour n8n (méthode 1 : Host direct)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Host: db.prspvpaaeuxxhombqeuc.supabase.co"
echo "Port: 5432"
echo "Database: postgres"
echo "User: postgres"
echo "Password: (celui extrait du DATABASE_URL)"
echo "SSL: require"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Configuration pour n8n (méthode 2 : Pooler)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
if [ "$IS_POOLER" = true ]; then
    echo "Host: $HOST (pooler actuel)"
else
    echo "Host: aws-0-eu-central-1.pooler.supabase.com"
fi
echo "Port: 6543"
echo "Database: postgres"
echo "User: postgres"
echo "Password: (celui extrait du DATABASE_URL)"
echo "SSL: require"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Configuration pour n8n (méthode 3 : Connection String)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Si n8n supporte 'Connection String', utilise :"
echo ""

# Version avec host direct (port 5432)
DIRECT_URL="postgresql://postgres:${PASSWORD}@db.prspvpaaeuxxhombqeuc.supabase.co:5432/postgres?sslmode=require"
echo "$DIRECT_URL" | sed 's/postgres:[^@]*/postgres:***MOT_DE_PASSE_MASQUE***/'
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 Test de connexion (méthode 1 : Host direct)"
echo "--------------------------------"
echo ""
echo "Test avec psql (si installé) :"
echo "psql \"postgresql://postgres:${PASSWORD}@db.prspvpaaeuxxhombqeuc.supabase.co:5432/postgres?sslmode=require\" -c \"SELECT 1;\""
echo ""

echo "💡 Recommandation :"
echo "   1. Essayer d'abord la méthode 1 (Host direct, port 5432)"
echo "   2. Si ça ne fonctionne pas, essayer la méthode 2 (Pooler, port 6543)"
echo "   3. Si n8n supporte Connection String, utiliser la méthode 3"
echo ""

# Vérifier si c'est le même host que celui extrait
if [ "$HOST" = "db.prspvpaaeuxxhombqeuc.supabase.co" ]; then
    echo "✅ Le host dans DATABASE_URL correspond au host direct"
    echo "   → Utilise les valeurs extraites du DATABASE_URL pour n8n"
else
    echo "⚠️  Le host dans DATABASE_URL est différent : $HOST"
    echo "   → Peut-être que Prisma utilise un pooler mais n8n doit utiliser le host direct"
fi
echo ""

