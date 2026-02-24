#!/bin/bash
##############################################################################
# cleanup-compta-duplicates.sh
# Supprime tous les workflows compta doublons (garde uniquement les IDs fixes)
# Appelle l'API REST n8n depuis le HOST (pas depuis le conteneur)
# Usage: bash cleanup-compta-duplicates.sh
##############################################################################

CONTAINER="n8n"
N8N_URL="http://localhost:5678"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# IDs fixes à garder
KEEP_IDS="compta-bilan compta-grand-livre compta-balance compta-compte-resultat compta-tva compta-lettrage compta-dashboard compta-ecriture-create compta-ecriture-get compta-ecritures-list compta-init compta-cloture compta-auto-facture compta-auto-avoir compta-auto-paiement compta-plan-comptable-list compta-ia-agent"

echo ""
echo "============================================================"
echo "  NETTOYAGE DES DOUBLONS COMPTA"
echo "============================================================"
echo ""

# Lister tous les workflows compta
ALL_WF=$(docker exec -u node "$CONTAINER" n8n list:workflow 2>/dev/null || true)
COMPTA_WF=$(echo "$ALL_WF" | grep -i compta || true)

if [ -z "$COMPTA_WF" ]; then
  echo -e "${GREEN}Aucun workflow compta trouvé. Rien à nettoyer.${NC}"
  exit 0
fi

DELETED=0
KEPT=0

while IFS='|' read -r wid wname rest; do
  wid=$(echo "$wid" | xargs)
  wname=$(echo "$wname" | xargs)
  [ -z "$wid" ] && continue

  # Vérifier si cet ID est dans la liste à garder
  IS_KEEP=false
  for kid in $KEEP_IDS; do
    if [ "$wid" = "$kid" ]; then
      IS_KEEP=true
      break
    fi
  done

  if [ "$IS_KEEP" = "true" ]; then
    echo -e "  ${GREEN}KEEP${NC}   $wid ($wname)"
    KEPT=$((KEPT + 1))
  else
    echo -n "  DELETE $wid ($wname) ... "
    # Supprimer via l'API REST depuis le HOST
    HTTP_CODE=$(curl -s -o /tmp/n8n_delete_resp.json -w "%{http_code}" -X DELETE "$N8N_URL/api/v1/workflows/$wid")
    if [ "$HTTP_CODE" = "200" ]; then
      echo -e "${GREEN}supprimé${NC}"
      DELETED=$((DELETED + 1))
    else
      BODY=$(cat /tmp/n8n_delete_resp.json 2>/dev/null | head -c 100)
      echo -e "${YELLOW}échec HTTP $HTTP_CODE ($BODY)${NC}"
    fi
  fi
done <<< "$COMPTA_WF"

echo ""
echo "============================================================"
echo -e "  ${GREEN}Gardés: $KEPT${NC} | ${RED}Supprimés: $DELETED${NC}"
echo "============================================================"
echo ""
