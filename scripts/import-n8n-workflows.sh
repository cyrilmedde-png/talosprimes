#!/bin/bash

# =============================================================================
# Import automatique des workflows n8n - TalosPrimes
# =============================================================================
# Ce script importe tous les workflows JSON dans n8n via l'API REST.
# A executer APRES le reset et la creation du compte owner.
#
# Usage: ./scripts/import-n8n-workflows.sh [API_KEY]
#
# L'API key se trouve dans: n8n > Settings > API > Create API Key
# =============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
N8N_URL="http://localhost:5678"
WORKFLOWS_DIR="/var/www/talosprimes/n8n_workflows"
API_KEY="${1:-}"

# =============================================================================
# Verification
# =============================================================================

echo ""
echo -e "${BOLD}${BLUE}========================================${NC}"
echo -e "${BOLD}${BLUE}  Import des workflows n8n${NC}"
echo -e "${BOLD}${BLUE}========================================${NC}"
echo ""

# Verifier l'API key
if [ -z "$API_KEY" ]; then
  echo -e "${YELLOW}Pour obtenir l'API key:${NC}"
  echo -e "  1. Ouvrir https://n8n.talosprimes.com"
  echo -e "  2. Settings > API > Create API Key"
  echo -e "  3. Copier la cle"
  echo ""
  read -p "Collez votre API key: " API_KEY
  if [ -z "$API_KEY" ]; then
    echo -e "${RED}API key requise. Annule.${NC}"
    exit 1
  fi
fi

# Verifier que n8n repond
if ! curl -sf --max-time 5 "$N8N_URL/healthz" > /dev/null 2>&1; then
  if ! curl -sf --max-time 5 "$N8N_URL" > /dev/null 2>&1; then
    echo -e "${RED}n8n ne repond pas sur $N8N_URL${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}[OK]${NC} n8n accessible"

# Verifier l'API key
HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" \
  -H "X-N8N-API-KEY: $API_KEY" \
  "$N8N_URL/api/v1/workflows?limit=1" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" != "200" ]; then
  echo -e "${RED}API key invalide (HTTP $HTTP_CODE)${NC}"
  echo -e "${YELLOW}Verifiez que l'API est activee dans n8n (Settings > API)${NC}"
  exit 1
fi
echo -e "${GREEN}[OK]${NC} API key valide"

# Verifier le dossier de workflows
if [ ! -d "$WORKFLOWS_DIR" ]; then
  echo -e "${RED}Dossier $WORKFLOWS_DIR introuvable${NC}"
  exit 1
fi

# =============================================================================
# Import des workflows
# =============================================================================

echo ""
echo -e "${CYAN}━━━ Import des workflows ━━━${NC}"
echo ""

TOTAL=0
SUCCESS=0
FAILED=0
SKIPPED=0

# Fonction d'import
import_workflow() {
  local file="$1"
  local name=$(basename "$file" .json)
  local category=$(basename "$(dirname "$file")")

  if [ "$category" = "n8n_workflows" ]; then
    category="root"
  fi

  TOTAL=$((TOTAL + 1))

  # Lire le JSON et l'envoyer a l'API
  local response
  response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "X-N8N-API-KEY: $API_KEY" \
    -H "Content-Type: application/json" \
    -d @"$file" \
    "$N8N_URL/api/v1/workflows" 2>/dev/null)

  local http_code=$(echo "$response" | tail -1)
  local body=$(echo "$response" | head -n -1)

  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    local wf_id=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','?'))" 2>/dev/null || echo "?")
    echo -e "  ${GREEN}[OK]${NC} [$category] $name (id: $wf_id)"
    SUCCESS=$((SUCCESS + 1))
  elif [ "$http_code" = "409" ]; then
    echo -e "  ${YELLOW}[SKIP]${NC} [$category] $name (deja existant)"
    SKIPPED=$((SKIPPED + 1))
  else
    echo -e "  ${RED}[FAIL]${NC} [$category] $name (HTTP $http_code)"
    local error_msg=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null || echo "")
    if [ -n "$error_msg" ]; then
      echo -e "         ${RED}$error_msg${NC}"
    fi
    FAILED=$((FAILED + 1))
  fi
}

# Importer d'abord les workflows par categorie (ordre logique)
# 1. Clients (base)
echo -e "${BLUE}Categorie: clients${NC}"
for f in "$WORKFLOWS_DIR"/clients/*.json; do
  [ -f "$f" ] && import_workflow "$f"
done

# 2. Leads
echo ""
echo -e "${BLUE}Categorie: leads${NC}"
for f in "$WORKFLOWS_DIR"/leads/*.json; do
  [ -f "$f" ] && import_workflow "$f"
done

# 3. Factures
echo ""
echo -e "${BLUE}Categorie: factures${NC}"
for f in "$WORKFLOWS_DIR"/factures/*.json; do
  [ -f "$f" ] && import_workflow "$f"
done

# 4. Abonnements
echo ""
echo -e "${BLUE}Categorie: abonnements${NC}"
for f in "$WORKFLOWS_DIR"/abonnements/*.json; do
  [ -f "$f" ] && import_workflow "$f"
done

# 5. Notifications
echo ""
echo -e "${BLUE}Categorie: notifications${NC}"
for f in "$WORKFLOWS_DIR"/notifications/*.json; do
  [ -f "$f" ] && import_workflow "$f"
done

# 6. Agents et workflows racine (Agent Telegram IA v4 uniquement)
echo ""
echo -e "${BLUE}Categorie: agents${NC}"
# Importer seulement la version la plus recente (v4-pro)
if [ -f "$WORKFLOWS_DIR/agent-telegram-ia-v4-pro.json" ]; then
  import_workflow "$WORKFLOWS_DIR/agent-telegram-ia-v4-pro.json"
else
  # Fallback sur les autres versions
  for f in "$WORKFLOWS_DIR"/agent-telegram-ia*.json; do
    [ -f "$f" ] && import_workflow "$f"
  done
fi

# =============================================================================
# Resume
# =============================================================================

echo ""
echo -e "${BOLD}${GREEN}========================================${NC}"
echo -e "${BOLD}${GREEN}  Import termine${NC}"
echo -e "${BOLD}${GREEN}========================================${NC}"
echo ""
echo -e "  ${GREEN}Importes:${NC}  $SUCCESS"
echo -e "  ${YELLOW}Ignores:${NC}   $SKIPPED"
echo -e "  ${RED}Echoues:${NC}   $FAILED"
echo -e "  ${BLUE}Total:${NC}     $TOTAL"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${YELLOW}Certains workflows ont echoue a l'import.${NC}"
  echo -e "${YELLOW}Cela peut etre normal si les credentials ne sont pas encore configurees.${NC}"
  echo -e "${YELLOW}Vous pouvez les importer manuellement depuis l'interface n8n.${NC}"
fi

echo ""
echo -e "${BOLD}Prochaines etapes:${NC}"
echo -e "  1. Ouvrir chaque workflow dans n8n"
echo -e "  2. Remapper les credentials (cliquer sur chaque node rouge)"
echo -e "  3. Sauvegarder et activer les workflows"
echo ""
