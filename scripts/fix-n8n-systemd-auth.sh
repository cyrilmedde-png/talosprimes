#!/bin/bash

# Script pour corriger l'authentification n8n dans systemd
# Usage: ./scripts/fix-n8n-systemd-auth.sh

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Correction Authentification n8n (Systemd)${NC}"
echo "=============================================="
echo ""

SERVICE_FILE="/etc/systemd/system/n8n.service"

if [ ! -f "$SERVICE_FILE" ]; then
    echo -e "${RED}✗ Fichier $SERVICE_FILE non trouvé${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Service systemd trouvé${NC}"
echo ""

# Créer une sauvegarde
echo "Création d'une sauvegarde..."
sudo cp "$SERVICE_FILE" "${SERVICE_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✓ Sauvegarde créée${NC}"
echo ""

# Afficher la configuration actuelle
echo "Configuration actuelle :"
sudo grep -E "N8N_|Environment" "$SERVICE_FILE" | head -10 || echo "  Aucune variable N8N trouvée"
echo ""

# Modifier le fichier
echo "Modification du service..."

# Créer un fichier temporaire avec les modifications
TMP_FILE=$(mktemp)

# Lire le fichier et ajouter/modifier les variables
sudo cat "$SERVICE_FILE" | while IFS= read -r line; do
    if [[ "$line" =~ ^Environment= ]]; then
        # Si la ligne contient déjà N8N_BASIC_AUTH_ACTIVE, la remplacer
        if echo "$line" | grep -q "N8N_BASIC_AUTH_ACTIVE"; then
            echo "$line" | sed 's/N8N_BASIC_AUTH_ACTIVE=[^"]*/N8N_BASIC_AUTH_ACTIVE=false/g'
        else
            # Ajouter à la fin de la ligne Environment existante
            echo "$line N8N_BASIC_AUTH_ACTIVE=false"
        fi
    elif [[ "$line" =~ ^\[Service\] ]]; then
        echo "$line"
        # Si pas de ligne Environment après [Service], l'ajouter
        if ! grep -A 5 "^\[Service\]" "$SERVICE_FILE" | grep -q "^Environment="; then
            echo 'Environment="N8N_BASIC_AUTH_ACTIVE=false"'
        fi
    else
        echo "$line"
    fi
done > "$TMP_FILE"

# Méthode plus simple : utiliser sed pour ajouter/modifier
sudo sed -i.bak '/\[Service\]/a Environment="N8N_BASIC_AUTH_ACTIVE=false"' "$SERVICE_FILE" 2>/dev/null || true

# Si N8N_BASIC_AUTH_ACTIVE existe déjà, le remplacer
sudo sed -i 's/N8N_BASIC_AUTH_ACTIVE=.*/N8N_BASIC_AUTH_ACTIVE=false/g' "$SERVICE_FILE"

# Supprimer les doublons
sudo awk '!seen[$0]++' "$SERVICE_FILE" > "${TMP_FILE}.2" && sudo mv "${TMP_FILE}.2" "$SERVICE_FILE"

rm -f "$TMP_FILE" "${TMP_FILE}.2" 2>/dev/null || true

echo -e "${GREEN}✓ Service modifié${NC}"
echo ""

# Vérifier la modification
echo "Nouvelle configuration :"
sudo grep -E "N8N_BASIC_AUTH_ACTIVE" "$SERVICE_FILE" || echo -e "${YELLOW}⚠ Variable non trouvée (peut-être dans une autre section)${NC}"
echo ""

# Recharger et redémarrer
echo "Rechargement du daemon systemd..."
sudo systemctl daemon-reload
echo -e "${GREEN}✓ Daemon rechargé${NC}"
echo ""

echo "Redémarrage de n8n..."
sudo systemctl restart n8n
echo -e "${GREEN}✓ n8n redémarré${NC}"
echo ""

# Attendre que n8n démarre
echo "Attente du démarrage (10 secondes)..."
sleep 10

# Vérifier le statut
if sudo systemctl is-active --quiet n8n; then
    echo -e "${GREEN}✓ n8n est actif${NC}"
else
    echo -e "${RED}✗ n8n n'est pas actif${NC}"
    echo "Logs :"
    sudo journalctl -u n8n --no-pager -n 20
    exit 1
fi

echo ""
echo -e "${BLUE}Test du webhook...${NC}"
cd /var/www/talosprimes
./scripts/test-n8n-webhook.sh lead_create
