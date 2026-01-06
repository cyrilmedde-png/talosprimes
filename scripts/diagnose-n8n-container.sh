#!/bin/bash

# Script pour diagnostiquer le conteneur n8n
# Usage: ./diagnose-n8n-container.sh

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

CONTAINER_NAME="root-n8n-1"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Diagnostic conteneur n8n              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# 1. Statut du conteneur
echo -e "${BLUE}📋 1. Statut du conteneur...${NC}"
if docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
  STATUS=$(docker ps --format "{{.Names}} {{.Status}}" | grep "$CONTAINER_NAME")
  echo -e "${GREEN}✅ Conteneur démarré : $STATUS${NC}"
else
  echo -e "${RED}❌ Conteneur non démarré${NC}"
  exit 1
fi

# 2. IP du conteneur
echo ""
echo -e "${BLUE}📋 2. Configuration réseau...${NC}"
CONTAINER_IP=$(docker inspect "$CONTAINER_NAME" --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" 2>/dev/null | head -1)
NETWORK_NAME=$(docker inspect "$CONTAINER_NAME" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' | head -1)
echo "  IP : $CONTAINER_IP"
echo "  Réseau : $NETWORK_NAME"

# 3. Ports du conteneur
echo ""
echo -e "${BLUE}📋 3. Ports exposés...${NC}"
PORTS=$(docker port "$CONTAINER_NAME" 2>/dev/null || echo "Aucun port exposé")
echo "$PORTS" | sed 's/^/  /'

# 4. Logs du conteneur (dernières lignes)
echo ""
echo -e "${BLUE}📋 4. Derniers logs du conteneur (20 lignes)...${NC}"
docker logs "$CONTAINER_NAME" --tail 20 2>&1 | sed 's/^/  /' || echo "  Impossible de récupérer les logs"

# 5. Test de connexion depuis l'hôte
echo ""
echo -e "${BLUE}📋 5. Test de connexion TCP...${NC}"
if command -v nc &> /dev/null; then
  if timeout 2 nc -z "$CONTAINER_IP" 5678 2>/dev/null; then
    echo -e "${GREEN}✅ Port 5678 accessible${NC}"
  else
    echo -e "${RED}❌ Port 5678 non accessible${NC}"
  fi
else
  echo "  nc (netcat) non disponible, test avec curl..."
  if curl -s --connect-timeout 2 "http://$CONTAINER_IP:5678" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connexion HTTP réussie${NC}"
  else
    echo -e "${RED}❌ Connexion HTTP échouée${NC}"
  fi
fi

# 6. Processus dans le conteneur
echo ""
echo -e "${BLUE}📋 6. Processus dans le conteneur...${NC}"
docker exec "$CONTAINER_NAME" ps aux 2>/dev/null | head -10 | sed 's/^/  /' || echo "  Impossible d'exécuter ps"

# 7. Variables d'environnement importantes
echo ""
echo -e "${BLUE}📋 7. Variables d'environnement importantes...${NC}"
docker inspect "$CONTAINER_NAME" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E "N8N_|WEBHOOK" | sed 's/^/  /'

# 8. Test depuis l'intérieur du conteneur
echo ""
echo -e "${BLUE}📋 8. Test d'écoute dans le conteneur...${NC}"
if docker exec "$CONTAINER_NAME" netstat -tlnp 2>/dev/null | grep ":5678"; then
  echo -e "${GREEN}✅ Le conteneur écoute sur le port 5678${NC}"
elif docker exec "$CONTAINER_NAME" ss -tlnp 2>/dev/null | grep ":5678"; then
  echo -e "${GREEN}✅ Le conteneur écoute sur le port 5678 (ss)${NC}"
else
  echo -e "${YELLOW}⚠️  Impossible de vérifier (netstat/ss non disponible)${NC}"
  echo "  Test avec curl depuis l'intérieur du conteneur..."
  if docker exec "$CONTAINER_NAME" curl -s http://localhost:5678 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Le service répond sur localhost:5678${NC}"
  else
    echo -e "${RED}❌ Le service ne répond pas sur localhost:5678${NC}"
  fi
fi

# 9. Résumé et recommandations
echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Diagnostic terminé                    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "📋 Recommandations :"
echo ""
echo "1. Si le conteneur ne démarre pas complètement :"
echo "   docker logs $CONTAINER_NAME --tail 50"
echo ""
echo "2. Si le port n'est pas accessible :"
echo "   - Vérifiez que n8n est configuré pour écouter sur 0.0.0.0:5678 (pas seulement localhost)"
echo "   - Vérifiez la variable N8N_PORT dans docker-compose.yaml"
echo ""
echo "3. Test depuis l'hôte :"
echo "   curl http://$CONTAINER_IP:5678"
echo ""
echo "4. Vérifiez les variables d'environnement :"
echo "   docker inspect $CONTAINER_NAME | grep -A 20 Env"
echo ""

