#!/bin/bash
set -e

##############################################################################
# deploy-compta-workflows.sh
# Déploie les 5 workflows compta dans n8n (grand-livre, balance, compte-resultat, tva, lettrage)
# Usage: bash deploy-compta-workflows.sh
##############################################################################

CONTAINER="n8n"
REPO_WF_DIR="/var/www/talosprimes/n8n_workflows/talosprimes/comptabilite"
CONTAINER_TMP="/tmp/wf-import"

WORKFLOWS=(
  "compta-grand-livre.json"
  "compta-balance.json"
  "compta-compte-resultat.json"
  "compta-tva.json"
  "compta-lettrage.json"
)

WEBHOOK_PATHS=(
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
ok "Les 5 fichiers workflow existent"

log "Vérification que le conteneur n8n tourne..."
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  warn "Le conteneur n8n n'est pas démarré, lancement..."
  docker start "$CONTAINER"
  sleep 10
fi
ok "Conteneur n8n en cours d'exécution"

##############################################################################
# ÉTAPE 2 : Copier les fichiers dans le conteneur
##############################################################################
echo ""
log "Copie des workflows dans le conteneur..."
docker exec "$CONTAINER" mkdir -p "$CONTAINER_TMP"

for f in "${WORKFLOWS[@]}"; do
  docker cp "$REPO_WF_DIR/$f" "${CONTAINER}:${CONTAINER_TMP}/$f"
done
ok "5 fichiers copiés dans ${CONTAINER}:${CONTAINER_TMP}/"

##############################################################################
# ÉTAPE 3 : Importer les workflows (n8n est RUNNING → pas de problème WAL)
##############################################################################
echo ""
log "Import des workflows dans n8n (conteneur en cours d'exécution)..."

IMPORT_IDS=()
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
# ÉTAPE 4 : Lister les workflows et identifier les IDs importés
##############################################################################
echo ""
log "Listing des workflows compta..."
echo ""

# Get full workflow list
ALL_WF=$(docker exec -u node "$CONTAINER" n8n list:workflow 2>/dev/null)
echo "$ALL_WF" | grep -i compta
echo ""

# Extraire les IDs pour nos 5 webhooks
# On cherche les plus récents (dernière occurrence de chaque nom)
declare -A WF_IDS

while IFS='|' read -r id name rest; do
  id=$(echo "$id" | xargs)
  name=$(echo "$name" | xargs)
  case "$name" in
    *"Grand Livre"*|*"grand-livre"*|*"grand_livre"*)  WF_IDS["grand-livre"]="$id" ;;
    *"Balance"*|*"balance"*)                            WF_IDS["balance"]="$id" ;;
    *"Compte"*"R"*"sultat"*|*"compte-resultat"*)       WF_IDS["compte-resultat"]="$id" ;;
    *"TVA"*|*"tva"*)                                    WF_IDS["tva"]="$id" ;;
    *"Lettrage"*|*"lettrage"*)                          WF_IDS["lettrage"]="$id" ;;
  esac
done <<< "$ALL_WF"

echo ""
log "IDs détectés:"
for key in grand-livre balance compte-resultat tva lettrage; do
  if [ -n "${WF_IDS[$key]}" ]; then
    ok "  $key → ${WF_IDS[$key]}"
  else
    fail "  $key → NON TROUVÉ"
  fi
done

##############################################################################
# ÉTAPE 5 : Activer tous les workflows trouvés
##############################################################################
echo ""
log "Activation des workflows..."

for key in grand-livre balance compte-resultat tva lettrage; do
  wid="${WF_IDS[$key]}"
  if [ -n "$wid" ]; then
    echo -n "  Activating $key ($wid) ... "
    docker exec -u node "$CONTAINER" n8n update:workflow --id="$wid" --active=true 2>/dev/null
    ok "activé"
  fi
done

##############################################################################
# ÉTAPE 6 : Redémarrer pour enregistrer les webhooks
##############################################################################
echo ""
log "Redémarrage de n8n pour enregistrer les webhooks..."
docker restart "$CONTAINER"

log "Attente du démarrage (20s)..."
sleep 20

# Vérifier que n8n est bien démarré
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

# Test bilan en premier (référence qui doit marcher)
echo -n "Bilan (référence)  : "
RESP=$(curl -s -m 10 -X POST http://localhost:5678/webhook/compta-bilan \
  -H "Content-Type: application/json" \
  -d "{\"tenantId\":\"$TEST_TENANT\"}" 2>&1)
if echo "$RESP" | grep -q '"success"'; then
  ok "$(echo "$RESP" | head -c 80)..."
else
  fail "$(echo "$RESP" | head -c 120)"
fi

# Test des 5 workflows déployés
for i in "${!WEBHOOK_PATHS[@]}"; do
  path="${WEBHOOK_PATHS[$i]}"
  echo -n "$(printf '%-20s' "$path") : "

  if [ "$path" = "compta-lettrage" ]; then
    BODY="{\"tenantId\":\"$TEST_TENANT\",\"ligneIds\":[\"00000000-0000-0000-0000-000000000001\",\"00000000-0000-0000-0000-000000000002\"]}"
  else
    BODY="{\"tenantId\":\"$TEST_TENANT\"}"
  fi

  RESP=$(curl -s -m 15 -X POST "http://localhost:5678/webhook/$path" \
    -H "Content-Type: application/json" \
    -d "$BODY" 2>&1)

  if [ -z "$RESP" ]; then
    fail "Réponse vide (timeout ou webhook non enregistré)"
  elif echo "$RESP" | grep -q '"success"'; then
    ok "$(echo "$RESP" | head -c 80)..."
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
echo "  DÉPLOIEMENT TERMINÉ"
echo "============================================================"
echo ""
echo "Si certains webhooks échouent, vérifier les logs :"
echo "  docker logs $CONTAINER --tail 50"
echo ""
echo "Pour supprimer les anciens doublons (optionnel) :"
echo "  docker exec -u node $CONTAINER n8n list:workflow | grep -i compta"
echo "  → Identifier les IDs inactifs en doublon"
echo ""
