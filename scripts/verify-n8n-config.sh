#!/bin/bash

# Script pour vérifier la configuration n8n dans Docker
# Usage: ./verify-n8n-config.sh

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

CONTAINER_NAME="root-n8n-1"
DOMAIN="n8n.talosprimes.com"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Vérification configuration n8n      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Vérifier que le conteneur existe
if ! docker ps -a | grep -q "$CONTAINER_NAME"; then
  echo -e "${RED}❌ Conteneur $CONTAINER_NAME non trouvé${NC}"
  exit 1
fi

echo -e "${BLUE}📋 Variables d'environnement dans le conteneur :${NC}"
echo ""

ENV_VARS=$(docker inspect "$CONTAINER_NAME" 2>/dev/null | \
  grep -A 50 '"Env"' | \
  grep -E '"N8N_|"WEBHOOK' | \
  sed 's/.*"\([^"]*\)".*/  \1/' || echo "")

if [ -z "$ENV_VARS" ]; then
  echo -e "${RED}❌ Aucune variable N8N trouvée${NC}"
else
  echo "$ENV_VARS"
fi

echo ""

# Vérifier chaque variable
echo -e "${BLUE}📋 Vérification détaillée :${NC}"
echo ""

CHECK_HOST=$(docker inspect "$CONTAINER_NAME" 2>/dev/null | grep -q "N8N_HOST=$DOMAIN" && echo "OK" || echo "KO")
CHECK_PROTOCOL=$(docker inspect "$CONTAINER_NAME" 2>/dev/null | grep -q "N8N_PROTOCOL=https" && echo "OK" || echo "KO")
CHECK_WEBHOOK=$(docker inspect "$CONTAINER_NAME" 2>/dev/null | grep -q "WEBHOOK_URL=https://$DOMAIN/" && echo "OK" || echo "KO")

if [ "$CHECK_HOST" = "OK" ]; then
  echo -e "${GREEN}✅ N8N_HOST=$DOMAIN${NC}"
else
  echo -e "${RED}❌ N8N_HOST incorrect ou manquant${NC}"
fi

if [ "$CHECK_PROTOCOL" = "OK" ]; then
  echo -e "${GREEN}✅ N8N_PROTOCOL=https${NC}"
else
  echo -e "${RED}❌ N8N_PROTOCOL incorrect ou manquant${NC}"
fi

if [ "$CHECK_WEBHOOK" = "OK" ]; then
  echo -e "${GREEN}✅ WEBHOOK_URL=https://$DOMAIN/${NC}"
else
  echo -e "${RED}❌ WEBHOOK_URL incorrect ou manquant${NC}"
fi

echo ""

# Vérifier que le conteneur tourne
if docker ps | grep -q "$CONTAINER_NAME"; then
  echo -e "${GREEN}✅ Conteneur démarré${NC}"
else
  echo -e "${RED}❌ Conteneur arrêté${NC}"
  echo "Démarrez-le avec: docker start $CONTAINER_NAME"
fi

echo ""

# Recommandations
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Actions recommandées                ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

if [ "$CHECK_HOST" != "OK" ] || [ "$CHECK_PROTOCOL" != "OK" ]; then
  echo -e "${YELLOW}⚠️  Les variables ne sont pas correctes${NC}"
  echo ""
  echo "Exécutez: ./fix-n8n-simple.sh"
  echo ""
elif [ "$CHECK_WEBHOOK" != "OK" ]; then
  echo -e "${YELLOW}⚠️  WEBHOOK_URL manquant (mais N8N_HOST et N8N_PROTOCOL sont OK)${NC}"
  echo ""
  echo "Cela devrait fonctionner quand même. Essayez de :"
  echo "1. Redémarrer n8n : docker restart $CONTAINER_NAME"
  echo "2. Attendre 2-3 minutes"
  echo "3. Rafraîchir la page n8n (Ctrl+F5)"
  echo ""
else
  echo -e "${GREEN}✅ Toutes les variables sont correctes${NC}"
  echo ""
  echo "Si l'URL est toujours en localhost dans n8n :"
  echo ""
  echo "1. Redémarrer complètement n8n :"
  echo "   docker restart $CONTAINER_NAME"
  echo ""
  echo "2. Attendre 2-3 minutes que n8n redémarre"
  echo ""
  echo "3. Dans n8n :"
  echo "   - Désactivez le workflow (bouton 'Active' → 'Inactive')"
  echo "   - Attendez 10 secondes"
  echo "   - Réactivez le workflow (bouton 'Inactive' → 'Active')"
  echo "   - Rafraîchissez la page (Ctrl+F5 ou Cmd+Shift+R)"
  echo ""
  echo "4. Vérifiez que l'URL de production est maintenant :"
  echo "   https://$DOMAIN/webhook/..."
  echo ""
fi

