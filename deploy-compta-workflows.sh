#!/bin/bash
set -e

##############################################################################
# deploy-compta-workflows.sh
# Déploie les 6 workflows compta dans n8n et nettoie les doublons
# Les JSON ont des "id" fixes → import:workflow met à jour au lieu de créer
# Usage: bash deploy-compta-workflows.sh
##############################################################################

CONTAINER="n8n"
REPO_WF_DIR="/var/www/talosprimes/n8n_workflows/talosprimes/comptabilite"
CONTAINER_TMP="/tmp/wf-import"
N8N_URL="http://localhost:5678"

WORKFLOWS=(
  "compta-bilan.json"
  "compta-grand-livre.json"
  "compta-balance.json"
  "compta-compte-resultat.json"
  "compta-tva.json"
  "compta-lettrage.json"
)

WEBHOOK_PATHS=(
  "compta-bilan"
  "compta-grand-livre"
  "compta-balance"
  "compta-compte-resultat"
  "compta-tva"
  "compta-lettrage"
)

# IDs fixes (doivent correspondre au champ "id" dans chaque JSON)
FIXED_IDS=(
  "compta-bilan"
  "compta-grand-livre"
  "compta-balance"
  "compta-compte-resultat"
  "compta-tva"
  "compta-lettrage"
)

TEST_TENANT="e849ef46-14a1-4b8b-ba3e-4f23b4a7e1c0"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC}   $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }

##############################################################################
# ÉTAPE 1 : Vérifications préalables
##############################################################################
echo ""
echo "============================================================"
echo "  DÉPLOIEMENT WORKFLOWS COMPTA - n8n"
echo "============================================================"
echo ""

log "Vérification des fichiers source..."
for f in "${WORKFLOWS[@]}"; do
  if [ ! -f "$REPO_WF_DIR/$f" ]; then
    fail "Fichier manquant: $REPO_WF_DIR/$f"
    exit 1
  fi
done
ok "Les ${#WORKFLOWS[@]} fichiers workflow existent"

log "Vérification que le conteneur n8n tourne..."
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  warn "Le conteneur n8n n'est pas démarré, lancement..."
  docker start "$CONTAINER"
  sleep 10
fi
ok "Conteneur n8n en cours d'exécution"

##############################################################################
# ÉTAPE 2 : Nettoyer les doublons AVANT l'import
##############################################################################
echo ""
log "Nettoyage des anciens doublons..."

# Lister tous les workflows compta
ALL_WF=$(docker exec -u node "$CONTAINER" n8n list:workflow 2>/dev/null || true)
COMPTA_WF=$(echo "$ALL_WF" | grep -i compta || true)

if [ -n "$COMPTA_WF" ]; then
  # Extraire tous les IDs et noms
  CLEANED=0
  while IFS='|' read -r wid wname rest; do
    wid=$(echo "$wid" | xargs)
    wname=$(echo "$wname" | xargs)
    [ -z "$wid" ] && continue

    # Vérifier si cet ID est l'un des IDs fixes
    IS_FIXED=false
    for fid in "${FIXED_IDS[@]}"; do
      if [ "$wid" = "$fid" ]; then
        IS_FIXED=true
        break
      fi
    done

    # Si ce n'est PAS un ID fixe, c'est un doublon → désactiver
    if [ "$IS_FIXED" = "false" ]; then
      # Identifier le type de workflow
      IS_COMPTA_TYPE=false
      case "$wname" in
        *"Grand Livre"*|*"grand-livre"*|*"grand_livre"*) IS_COMPTA_TYPE=true ;;
        *"Balance"*|*"balance"*)                          IS_COMPTA_TYPE=true ;;
        *"Compte"*"R"*"sultat"*|*"compte-resultat"*)     IS_COMPTA_TYPE=true ;;
        *"TVA"*|*"tva"*)                                  IS_COMPTA_TYPE=true ;;
        *"Lettrage"*|*"lettrage"*)                        IS_COMPTA_TYPE=true ;;
        *"bilan"*|*"Bilan"*)                              IS_COMPTA_TYPE=true ;;
      esac

      if [ "$IS_COMPTA_TYPE" = "true" ]; then
        echo -n "  Désactivation doublon: $wid ($wname) ... "
        docker exec -u node "$CONTAINER" n8n update:workflow --id="$wid" --active=false 2>/dev/null && ok "ok" || warn "skip"
        CLEANED=$((CLEANED + 1))
      fi
    fi
  done <<< "$COMPTA_WF"

  if [ "$CLEANED" -gt 0 ]; then
    ok "$CLEANED ancien(s) doublon(s) désactivé(s)"
  else
    ok "Aucun doublon à nettoyer"
  fi
else
  ok "Aucun workflow compta existant"
fi

##############################################################################
# ÉTAPE 3 : Copier les fichiers dans le conteneur
##############################################################################
echo ""
log "Copie des workflows dans le conteneur..."
docker exec "$CONTAINER" mkdir -p "$CONTAINER_TMP"

for f in "${WORKFLOWS[@]}"; do
  docker cp "$REPO_WF_DIR/$f" "${CONTAINER}:${CONTAINER_TMP}/$f"
done
ok "${#WORKFLOWS[@]} fichiers copiés dans ${CONTAINER}:${CONTAINER_TMP}/"

##############################################################################
# ÉTAPE 4 : Importer les workflows (les IDs fixes évitent les doublons)
##############################################################################
echo ""
log "Import des workflows (avec IDs fixes → mise à jour si existant)..."

for f in "${WORKFLOWS[@]}"; do
  echo -n "  Importing $f ... "
  OUTPUT=$(docker exec -u node "$CONTAINER" n8n import:workflow --input="${CONTAINER_TMP}/$f" 2>&1)
  if echo "$OUTPUT" | grep -qi "error"; then
    fail "$f → $OUTPUT"
  else
    ok "$f"
  fi
done

##############################################################################
# ÉTAPE 5 : Activer les workflows avec les IDs fixes
##############################################################################
echo ""
log "Activation des workflows..."

for i in "${!FIXED_IDS[@]}"; do
  fid="${FIXED_IDS[$i]}"
  fname="${WORKFLOWS[$i]}"
  echo -n "  Activate $fid ... "
  docker exec -u node "$CONTAINER" n8n update:workflow --id="$fid" --active=true 2>/dev/null && ok "$fname" || warn "ID $fid non trouvé"
done

##############################################################################
# ÉTAPE 6 : Redémarrer pour enregistrer les webhooks
##############################################################################
echo ""
log "Redémarrage de n8n pour enregistrer les webhooks..."
docker restart "$CONTAINER"

log "Attente du démarrage (20s)..."
sleep 20

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  ok "n8n redémarré"
else
  fail "n8n n'a pas redémarré !"
  exit 1
fi

##############################################################################
# ÉTAPE 7 : Tests des webhooks
##############################################################################
echo ""
echo "============================================================"
echo "  TESTS DES WEBHOOKS"
echo "============================================================"
echo ""

PASS=0
TOTAL=${#WEBHOOK_PATHS[@]}

for i in "${!WEBHOOK_PATHS[@]}"; do
  path="${WEBHOOK_PATHS[$i]}"
  echo -n "$(printf '%-24s' "$path"): "

  if [ "$path" = "compta-lettrage" ]; then
    BODY="{\"tenantId\":\"$TEST_TENANT\",\"ligneIds\":[\"00000000-0000-0000-0000-000000000001\",\"00000000-0000-0000-0000-000000000002\"]}"
  else
    BODY="{\"tenantId\":\"$TEST_TENANT\"}"
  fi

  RESP=$(curl -s -m 15 -X POST "$N8N_URL/webhook/$path" \
    -H "Content-Type: application/json" \
    -d "$BODY" 2>&1)

  if [ -z "$RESP" ]; then
    fail "Réponse vide (timeout ou webhook non enregistré)"
  elif echo "$RESP" | grep -q '"success"'; then
    ok "$(echo "$RESP" | head -c 80)..."
    PASS=$((PASS + 1))
  elif echo "$RESP" | grep -q "not registered"; then
    fail "Webhook non enregistré (404)"
  elif echo "$RESP" | grep -q "problem executing"; then
    fail "Erreur d'exécution du workflow"
  else
    warn "$(echo "$RESP" | head -c 120)"
  fi
done

##############################################################################
# RÉSUMÉ
##############################################################################
echo ""
echo "============================================================"
if [ "$PASS" -eq "$TOTAL" ]; then
  echo -e "  ${GREEN}✅ SUCCÈS : $PASS/$TOTAL webhooks OK${NC}"
else
  echo -e "  ${RED}⚠️  RÉSULTAT : $PASS/$TOTAL webhooks OK${NC}"
fi
echo "============================================================"
echo ""

if [ "$PASS" -lt "$TOTAL" ]; then
  echo "Pour debug : docker logs $CONTAINER --tail 50"
  echo ""
fi
