#!/bin/bash

# Script pour obtenir un token JWT automatiquement
# Usage: ./get-token.sh [EMAIL] [PASSWORD]

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration par défaut
EMAIL="${1:-groupemclem@gmail.com}"
PASSWORD="${2:-21052024_Aa!}"
API_URL="${API_URL:-https://api.talosprimes.com}"

# Si le script est appelé depuis un autre script (pas de terminal), on n'affiche que le token
# Sinon, on affiche les messages d'information
if [ -t 1 ]; then
  # Terminal interactif - afficher les messages
  echo "🔐 Connexion à l'API..." >&2
  echo "  - Email: $EMAIL" >&2
  echo "  - API: $API_URL" >&2
  echo "" >&2
fi

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  # La réponse contient tokens.accessToken ou data.accessToken selon la version
  TOKEN=$(echo "$BODY" | jq -r '.data.tokens.accessToken // .data.accessToken' 2>/dev/null)
  
  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}❌ Erreur: Token non trouvé dans la réponse${NC}" >&2
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY" >&2
    exit 1
  fi
  
  if [ -t 1 ]; then
    # Terminal interactif - afficher le message de succès
    echo -e "${GREEN}✅ Connexion réussie${NC}" >&2
    echo "" >&2
  fi
  
  # Toujours afficher le token sur stdout (pour capture dans variables)
  echo "$TOKEN"
  exit 0
else
  echo -e "${RED}❌ Erreur HTTP $HTTP_CODE${NC}" >&2
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY" >&2
  exit 1
fi

