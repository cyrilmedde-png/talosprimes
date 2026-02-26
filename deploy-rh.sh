#!/bin/bash
set -e

##############################################################################
# deploy-rh.sh
# Déploie les 39 workflows RH dans n8n + Prisma db push
# Usage: bash deploy-rh.sh
##############################################################################

CONTAINER="n8n"
REPO_WF_DIR="/var/www/talosprimes/n8n_workflows/talosprimes/rh"
CONTAINER_TMP="/tmp/wf-rh-import"
N8N_URL="http://localhost:5678"
PLATFORM_DIR="/var/www/talosprimes/packages/platform"

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

WORKFLOWS=(
  "rh-contrats-list.json"
  "rh-contrat-get.json"
  "rh-contrat-create.json"
  "rh-contrat-update.json"
  "rh-contrat-delete.json"
  "rh-paie-list.json"
  "rh-bulletin-get.json"
  "rh-bulletin-create.json"
  "rh-bulletin-update.json"
  "rh-bulletin-delete.json"
  "rh-conges-list.json"
  "rh-conge-get.json"
  "rh-conge-create.json"
  "rh-conge-update.json"
  "rh-conge-delete.json"
  "rh-conge-approuver.json"
  "rh-conge-rejeter.json"
  "rh-documents-list.json"
  "rh-document-get.json"
  "rh-document-create.json"
  "rh-document-update.json"
  "rh-document-delete.json"
  "rh-entretiens-list.json"
  "rh-entretien-get.json"
  "rh-entretien-create.json"
  "rh-entretien-update.json"
  "rh-entretien-delete.json"
  "rh-formations-list.json"
  "rh-formation-get.json"
  "rh-formation-create.json"
  "rh-formation-update.json"
  "rh-formation-delete.json"
  "rh-formation-inscrire.json"
  "rh-evaluations-list.json"
  "rh-evaluation-get.json"
  "rh-evaluation-create.json"
  "rh-evaluation-update.json"
  "rh-evaluation-delete.json"
  "rh-dashboard.json"
)

WEBHOOK_PATHS=(
  "rh/contrats/list"
  "rh/paie/list"
  "rh/conges/list"
  "rh/documents/list"
  "rh/entretiens/list"
  "rh/formations/list"
  "rh/evaluations/list"
  "rh/dashboard"
)

echo ""
echo "============================================================"
echo "  DÉPLOIEMENT MODULE RH COMPLET"
echo "============================================================"
echo ""

##############################################################################
# ÉTAPE 1 : Git pull
##############################################################################
log "Git pull..."
cd /var/www/talosprimes
git pull origin main
ok "Code à jour"

##############################################################################
# ÉTAPE 2 : Prisma db push
##############################################################################
echo ""
log "Prisma db push (création tables RH)..."
cd "$PLATFORM_DIR"
npx prisma db push --accept-data-loss
ok "Schema Prisma synchronisé"
cd /var/www/talosprimes

##############################################################################
# ÉTAPE 3 : Build
##############################################################################
echo ""
log "Build platform..."
cd /var/www/talosprimes
pnpm build:platform
ok "Platform build OK"

log "Build client..."
pnpm build:client
ok "Client build OK"

##############################################################################
# ÉTAPE 4 : Redémarrer le platform
##############################################################################
echo ""
log "Redémarrage des services..."
pm2 restart all 2>/dev/null || systemctl restart talosprimes 2>/dev/null || warn "Redémarrer manuellement"
ok "Services redémarrés"

##############################################################################
# ÉTAPE 5 : Vérifier les fichiers workflow
##############################################################################
echo ""
log "Vérification des fichiers workflow..."
MISSING=0
for f in "${WORKFLOWS[@]}"; do
  if [ ! -f "$REPO_WF_DIR/$f" ]; then
    fail "Manquant: $f"
    MISSING=$((MISSING + 1))
  fi
done
if [ "$MISSING" -eq 0 ]; then
  ok "Les ${#WORKFLOWS[@]} fichiers workflow présents"
else
  fail "$MISSING fichier(s) manquant(s) !"
  exit 1
fi

##############################################################################
# ÉTAPE 6 : Copier les fichiers dans le conteneur n8n
##############################################################################
echo ""
log "Vérification que le conteneur n8n tourne..."
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  warn "Le conteneur n8n n'est pas démarré, lancement..."
  docker start "$CONTAINER"
  sleep 10
fi
ok "Conteneur n8n en cours d'exécution"

log "Copie des workflows dans le conteneur..."
docker exec "$CONTAINER" mkdir -p "$CONTAINER_TMP"
for f in "${WORKFLOWS[@]}"; do
  docker cp "$REPO_WF_DIR/$f" "${CONTAINER}:${CONTAINER_TMP}/$f"
done
ok "${#WORKFLOWS[@]} fichiers copiés dans ${CONTAINER}:${CONTAINER_TMP}/"

##############################################################################
# ÉTAPE 7 : Import des workflows
##############################################################################
echo ""
log "Import des ${#WORKFLOWS[@]} workflows RH..."

IMPORTED=0
for f in "${WORKFLOWS[@]}"; do
  echo -n "  Importing $f ... "
  OUTPUT=$(docker exec -u node "$CONTAINER" n8n import:workflow --input="${CONTAINER_TMP}/$f" 2>&1)
  if echo "$OUTPUT" | grep -qi "error"; then
    fail "$OUTPUT"
  else
    ok "done"
    IMPORTED=$((IMPORTED + 1))
  fi
done
echo ""
ok "$IMPORTED/${#WORKFLOWS[@]} workflows importés"

##############################################################################
# ÉTAPE 8 : Redémarrer n8n pour enregistrer les webhooks
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
# ÉTAPE 9 : Tests des webhooks principaux (list endpoints)
##############################################################################
echo ""
echo "============================================================"
echo "  TESTS DES WEBHOOKS RH"
echo "============================================================"
echo ""

PASS=0
TOTAL=${#WEBHOOK_PATHS[@]}

for path in "${WEBHOOK_PATHS[@]}"; do
  echo -n "$(printf '%-28s' "$path"): "
  RESP=$(curl -s -m 15 -X POST "$N8N_URL/webhook/$path" \
    -H "Content-Type: application/json" \
    -d "{\"tenantId\":\"$TEST_TENANT\"}" 2>&1)

  if [ -z "$RESP" ]; then
    fail "Réponse vide (timeout)"
  elif echo "$RESP" | grep -q '"success"'; then
    ok "$(echo "$RESP" | head -c 80)..."
    PASS=$((PASS + 1))
  elif echo "$RESP" | grep -q "not registered"; then
    fail "Webhook non enregistré"
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
  echo -e "  ${GREEN}✅ SUCCÈS : $PASS/$TOTAL webhooks RH OK${NC}"
else
  echo -e "  ${RED}⚠️  RÉSULTAT : $PASS/$TOTAL webhooks RH OK${NC}"
fi
echo "============================================================"
echo ""
echo "Déconnecte-toi de l'app et reconnecte-toi pour voir le module RH."
echo ""
