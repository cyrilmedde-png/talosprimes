#!/bin/bash
# Script pour nettoyer les secrets potentiellement exposés dans les scripts

echo "🧹 Nettoyage des secrets potentiellement exposés"
echo "=================================================="
echo ""

# Fichiers à vérifier
SCRIPTS_DIR="scripts"
FILES_TO_CHECK=(
    "scripts/test-postgres-connection-complete.sh"
    "scripts/analyze-database-url.sh"
    "scripts/extract-postgres-password.sh"
)

echo "📋 Vérification des fichiers..."
echo ""

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        # Vérifier si le fichier contient des mots de passe en clair
        if grep -q "postgres:[^@]*@" "$file" 2>/dev/null; then
            echo "⚠️  $file contient potentiellement un mot de passe"
            echo "   → Vérifier et masquer si nécessaire"
        else
            echo "✅ $file : OK (pas de mot de passe en clair)"
        fi
    fi
done

echo ""
echo "💡 Recommandations :"
echo "   1. Les scripts doivent lire les secrets depuis .env (pas les hardcoder)"
echo "   2. Utiliser des variables d'environnement"
echo "   3. Masquer les secrets dans les sorties (avec ***)"
echo "   4. Ne jamais commiter de .env avec de vrais secrets"
echo ""

