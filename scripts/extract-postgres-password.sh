#!/bin/bash
# Script pour extraire le mot de passe Postgres depuis DATABASE_URL

echo "🔍 Extraction du mot de passe Postgres"
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

# Extraire le mot de passe (entre postgres: et @)
# Format: postgresql://postgres:PASSWORD@host:port/database

# Méthode 1 : Extraction simple
PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*postgres:\([^@]*\)@.*/\1/p')

if [ -z "$PASSWORD" ]; then
    echo "❌ Impossible d'extraire le mot de passe"
    echo "   Format attendu : postgresql://postgres:PASSWORD@host:port/database"
    echo ""
    echo "🔍 DATABASE_URL actuel (masqué) :"
    echo "$DATABASE_URL" | sed 's/postgres:[^@]*/postgres:***MOT_DE_PASSE_MASQUE***/'
    exit 1
fi

# Afficher le mot de passe (⚠️ SENSIBLE)
echo "✅ Mot de passe extrait :"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$PASSWORD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT : Copie ce mot de passe et colle-le dans n8n"
echo ""

# Vérifier si le mot de passe contient des caractères spéciaux
if [[ "$PASSWORD" =~ [@#\$%&\+=\?\/ ] ]]; then
    echo "⚠️  ATTENTION : Le mot de passe contient des caractères spéciaux"
    echo ""
    echo "💡 Si ça ne fonctionne pas dans n8n, encode les caractères spéciaux :"
    echo "   @ → %40"
    echo "   # → %23"
    echo "   \$ → %24"
    echo "   % → %25"
    echo "   & → %26"
    echo "   + → %2B"
    echo "   = → %3D"
    echo "   ? → %3F"
    echo "   / → %2F"
    echo "   (espace) → %20"
    echo ""
    echo "🔧 Mot de passe encodé (si nécessaire) :"
    ENCODED_PASSWORD=$(echo "$PASSWORD" | sed 's/@/%40/g' | sed 's/#/%23/g' | sed 's/\$/%24/g' | sed 's/%/%25/g' | sed 's/&/%26/g' | sed 's/+/%2B/g' | sed 's/=/%3D/g' | sed 's/?/%3F/g' | sed 's/\//%2F/g' | sed 's/ /%20/g')
    echo "$ENCODED_PASSWORD"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Pour n8n, utilise ces valeurs complètes :"
echo ""
echo "   Host: db.prspvpaaeuxxhombqeuc.supabase.co"
echo "   Port: 5432"
echo "   Database: postgres"
echo "   User: postgres"
echo "   Password: (le mot de passe ci-dessus)"
echo "   SSL: require"
echo ""

