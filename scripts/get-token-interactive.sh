#!/bin/bash

# Script interactif pour obtenir un token JWT
# Usage: ./get-token-interactive.sh

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      Création de token JWT             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Demander les identifiants
read -p "Email [groupemclem@gmail.com]: " EMAIL
EMAIL=${EMAIL:-groupemclem@gmail.com}

read -sp "Mot de passe: " PASSWORD
echo ""

# Demander l'URL de l'API
read -p "URL de l'API [https://api.talosprimes.com]: " API_URL
API_URL=${API_URL:-https://api.talosprimes.com}

echo ""
echo -e "${BLUE}🔐 Connexion à l'API...${NC}"
echo "  - Email: $EMAIL"
echo "  - API: $API_URL"
echo ""

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
  ACCESS_TOKEN=$(echo "$BODY" | jq -r '.data.tokens.accessToken // .data.accessToken' 2>/dev/null)
  REFRESH_TOKEN=$(echo "$BODY" | jq -r '.data.tokens.refreshToken // .data.refreshToken' 2>/dev/null)
  USER_EMAIL=$(echo "$BODY" | jq -r '.data.user.email' 2>/dev/null)
  USER_ROLE=$(echo "$BODY" | jq -r '.data.user.role' 2>/dev/null)
  
  if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
    echo -e "${RED}❌ Erreur: Token non trouvé dans la réponse${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 1
  fi
  
  echo -e "${GREEN}✅ Connexion réussie${NC}"
  echo ""
  echo -e "${CYAN}📋 Informations utilisateur :${NC}"
  echo "  - Email: $USER_EMAIL"
  echo "  - Rôle: $USER_ROLE"
  echo ""
  echo -e "${CYAN}🔑 Tokens générés :${NC}"
  echo ""
  echo -e "${YELLOW}Access Token (valide 15 minutes) :${NC}"
  echo "$ACCESS_TOKEN"
  echo ""
  echo -e "${YELLOW}Refresh Token (valide 7 jours) :${NC}"
  echo "$REFRESH_TOKEN"
  echo ""
  
  # Proposer de sauvegarder
  read -p "Voulez-vous sauvegarder le token dans un fichier ? (y/n) [n]: " SAVE
  SAVE=${SAVE:-n}
  
  if [ "$SAVE" = "y" ] || [ "$SAVE" = "Y" ]; then
    TOKEN_FILE="token_$(date +%Y%m%d_%H%M%S).txt"
    cat > "$TOKEN_FILE" <<EOF
# Token généré le $(date)
# Email: $USER_EMAIL
# Rôle: $USER_ROLE

ACCESS_TOKEN="$ACCESS_TOKEN"
REFRESH_TOKEN="$REFRESH_TOKEN"

# Utilisation:
# export ACCESS_TOKEN="$ACCESS_TOKEN"
# curl -X GET https://api.talosprimes.com/api/clients \\
#   -H "Authorization: Bearer \$ACCESS_TOKEN"
EOF
    echo -e "${GREEN}✅ Token sauvegardé dans: $TOKEN_FILE${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Attention: Ce fichier contient des informations sensibles${NC}"
    echo "   Ne le partagez pas et supprimez-le après utilisation"
  fi
  
  # Proposer de l'exporter
  read -p "Voulez-vous exporter le token dans la variable ACCESS_TOKEN ? (y/n) [n]: " EXPORT
  EXPORT=${EXPORT:-n}
  
  if [ "$EXPORT" = "y" ] || [ "$EXPORT" = "Y" ]; then
    export ACCESS_TOKEN="$ACCESS_TOKEN"
    export REFRESH_TOKEN="$REFRESH_TOKEN"
    echo -e "${GREEN}✅ Tokens exportés dans ACCESS_TOKEN et REFRESH_TOKEN${NC}"
    echo ""
    echo "Vous pouvez maintenant utiliser:"
    echo "  curl -X GET https://api.talosprimes.com/api/clients \\"
    echo "    -H \"Authorization: Bearer \$ACCESS_TOKEN\""
  fi
  
  exit 0
else
  echo -e "${RED}❌ Erreur HTTP $HTTP_CODE${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

