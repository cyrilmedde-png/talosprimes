#!/bin/bash

# Script pour corriger l'ID du webhook pour client.onboarding

echo "=========================================="
echo "  Correction Webhook ID pour client.onboarding"
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

echo "📋 Mise à jour du Webhook ID..."
echo ""

# L'ID du webhook dans le workflow est 'client-onboarding'
WEBHOOK_ID="client-onboarding"

echo "ID du webhook à utiliser : $WEBHOOK_ID"
echo ""

# Mettre à jour dans la base de données
psql "$DATABASE_URL" <<EOF
-- Afficher l'ID actuel
SELECT 'ID actuel:' as info, workflow_n8n_id, workflow_n8n_nom, statut 
FROM workflow_links 
WHERE type_evenement = 'client.onboarding';

-- Mettre à jour avec le bon ID
UPDATE workflow_links 
SET workflow_n8n_id = '$WEBHOOK_ID'
WHERE type_evenement = 'client.onboarding';

-- Vérifier la mise à jour
SELECT 'ID après mise à jour:' as info, workflow_n8n_id, workflow_n8n_nom, statut 
FROM workflow_links 
WHERE type_evenement = 'client.onboarding';
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Webhook ID mis à jour avec succès !"
    echo ""
    echo "📝 Vérifications supplémentaires :"
    echo "   1. Le workflow doit être ACTIVÉ dans n8n"
    echo "   2. Le webhook ID dans n8n doit être : $WEBHOOK_ID"
    echo "   3. L'URL complète sera : https://n8n.talosprimes.com/webhook/$WEBHOOK_ID"
    echo ""
else
    echo ""
    echo "❌ Erreur lors de la mise à jour"
    echo "   Vérifiez votre DATABASE_URL dans .env"
    exit 1
fi

