#!/bin/bash
set -e
##############################################################################
# reimport-all-compta.sh
# Réimporte TOUS les workflows compta (les 17) avec IDs fixes
# Usage: bash reimport-all-compta.sh
##############################################################################

CONTAINER="n8n"
REPO_WF_DIR="/var/www/talosprimes/n8n_workflows/talosprimes/comptabilite"
CONTAINER_TMP="/tmp/wf-import"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "============================================================"
echo "  RÉIMPORT DE TOUS LES WORKFLOWS COMPTA"
echo "============================================================"
echo ""

# Lister tous les fichiers JSON
FILES=$(ls "$REPO_WF_DIR"/*.json 2>/dev/null)
if [ -z "$FILES" ]; then
  echo -e "${RED}Aucun fichier JSON trouvé dans $REPO_WF_DIR${NC}"
  exit 1
fi

docker exec "$CONTAINER" mkdir -p "$CONTAINER_TMP"

IMPORTED=0
for filepath in $FILES; do
  fname=$(basename "$filepath")
  echo -n "  Import $fname ... "
  docker cp "$filepath" "${CONTAINER}:${CONTAINER_TMP}/$fname"
  OUTPUT=$(docker exec -u node "$CONTAINER" n8n import:workflow --input="${CONTAINER_TMP}/$fname" 2>&1)
  if echo "$OUTPUT" | grep -qi "error"; then
    echo -e "${RED}ERREUR: $OUTPUT${NC}"
  else
    echo -e "${GREEN}ok${NC}"
    IMPORTED=$((IMPORTED + 1))
  fi
done

echo ""
echo "  $IMPORTED workflows importés. Activation..."
echo ""

# Activer tous les workflows par leur ID fixe (= nom du fichier sans .json)
for filepath in $FILES; do
  fname=$(basename "$filepath" .json)
  echo -n "  Activate $fname ... "
  docker exec -u node "$CONTAINER" n8n update:workflow --id="$fname" --active=true 2>/dev/null && echo -e "${GREEN}ok${NC}" || echo -e "${YELLOW}skip${NC}"
done

echo ""
echo "  Redémarrage de n8n..."
docker restart "$CONTAINER"
sleep 20

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo -e "${GREEN}n8n redémarré${NC}"
else
  echo -e "${RED}n8n n'a pas redémarré !${NC}"
  exit 1
fi

echo ""
echo "============================================================"
echo -e "  ${GREEN}✅ Tous les workflows compta réimportés et activés${NC}"
echo "============================================================"
echo ""
