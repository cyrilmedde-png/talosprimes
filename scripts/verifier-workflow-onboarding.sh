#!/bin/bash

# Script pour vérifier et corriger le WorkflowLink pour client.onboarding

echo "=========================================="
echo "  Vérification WorkflowLink client.onboarding"
echo "=========================================="
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "packages/platform/.env" ]; then
    echo "❌ Erreur : Exécutez ce script depuis la racine du projet"
    exit 1
fi

cd packages/platform

# Charger les variables d'environnement
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Vérifier que DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erreur : DATABASE_URL non défini dans .env"
    exit 1
fi

echo "📋 Vérification du WorkflowLink pour client.onboarding..."
echo ""

# Afficher le WorkflowLink actuel
echo "WorkflowLink actuel :"
psql "$DATABASE_URL" -c "
SELECT 
    type_evenement,
    workflow_n8n_id,
    workflow_n8n_nom,
    statut
FROM workflow_links 
WHERE type_evenement = 'client.onboarding';
" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ Erreur : Impossible de se connecter à la base de données"
    echo "   Vérifiez votre DATABASE_URL dans .env"
    exit 1
fi

echo ""
echo "=========================================="
echo "  Instructions"
echo "=========================================="
echo ""
echo "1. Allez dans n8n : https://n8n.talosprimes.com"
echo "2. Ouvrez le workflow 'Onboarding Client - Créer espace et abonnement'"
echo "3. Cliquez sur le node 'Webhook - Onboarding Client'"
echo "4. Copiez l'ID du webhook (la partie après /webhook/ dans l'URL)"
echo "   OU regardez l'URL du workflow dans le navigateur"
echo ""
echo "5. Mettez à jour avec cette commande SQL :"
echo ""
echo "   psql \"\$DATABASE_URL\" -c \""
echo "   UPDATE workflow_links"
echo "   SET workflow_n8n_id = 'VOTRE_ID_ICI'"
echo "   WHERE type_evenement = 'client.onboarding';"
echo "   \""
echo ""
echo "6. Vérifiez que le workflow est ACTIVÉ dans n8n (toggle en haut à droite)"
echo ""

