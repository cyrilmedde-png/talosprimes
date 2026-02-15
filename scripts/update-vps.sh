#!/bin/bash

# =============================================================================
# Script de mise a jour automatique du VPS TalosPrimes
# =============================================================================
# Usage: ./scripts/update-vps.sh [options]
#
# Options:
#   --skip-build      Ignorer l'etape de build
#   --skip-restart    Ignorer le redemarrage des services
#   --skip-deps       Ignorer l'installation des dependances
#   --skip-prisma     Ignorer les migrations Prisma
#   --skip-n8n        Ignorer la sync des workflows n8n
#   --only-api        Deployer uniquement le backend (platform)
#   --only-client     Deployer uniquement le frontend (client)
#   --only-n8n        Synchroniser uniquement les workflows n8n
#   --n8n-dir PATH    Chemin vers les workflows n8n (defaut: n8n_workflows)
#   --quick           Equivalent a --skip-deps (pull + build + restart)
#   --help            Afficher cette aide
# =============================================================================

set -e  # Arreter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/talosprimes"
PLATFORM_DIR="$PROJECT_DIR/packages/platform"
CLIENT_DIR="$PROJECT_DIR/packages/client"
SHARED_DIR="$PROJECT_DIR/packages/shared"
LOG_DIR="$PROJECT_DIR/logs"

# Noms PM2 (doivent correspondre a ecosystem.config.js)
PM2_BACKEND="platform"
PM2_FRONTEND="client"

# Options
SKIP_BUILD=false
SKIP_RESTART=false
SKIP_DEPS=false
SKIP_PRISMA=false
SKIP_N8N=false
N8N_WORKFLOW_DIR=""
ONLY_API=false
ONLY_CLIENT=false
ONLY_N8N=false

# Temps de debut
START_TIME=$(date +%s)

# =============================================================================
# Fonctions utilitaires
# =============================================================================

log_step() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${BLUE}  $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_ok() {
  echo -e "  ${GREEN}[OK]${NC} $1"
}

log_warn() {
  echo -e "  ${YELLOW}[WARN]${NC} $1"
}

log_err() {
  echo -e "  ${RED}[ERREUR]${NC} $1"
}

log_info() {
  echo -e "  ${BLUE}[INFO]${NC} $1"
}

# Duree formatee
format_duration() {
  local duration=$1
  local minutes=$((duration / 60))
  local seconds=$((duration % 60))
  if [ $minutes -gt 0 ]; then
    echo "${minutes}m ${seconds}s"
  else
    echo "${seconds}s"
  fi
}

# Afficher l'aide
show_help() {
  head -18 "$0" | tail -16
  exit 0
}

# Verifier qu'une URL repond
check_health() {
  local url=$1
  local name=$2
  local max_attempts=10
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    if curl -sf --max-time 5 "$url" > /dev/null 2>&1; then
      log_ok "$name repond ($url)"
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done

  log_warn "$name ne repond pas apres ${max_attempts} tentatives ($url)"
  return 1
}

# =============================================================================
# Parser les arguments
# =============================================================================

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build)    SKIP_BUILD=true; shift ;;
    --skip-restart)  SKIP_RESTART=true; shift ;;
    --skip-deps)     SKIP_DEPS=true; shift ;;
    --skip-prisma)   SKIP_PRISMA=true; shift ;;
    --skip-n8n)      SKIP_N8N=true; shift ;;
    --n8n-dir)       N8N_WORKFLOW_DIR="$2"; shift 2 ;;
    --only-api)      ONLY_API=true; shift ;;
    --only-client)   ONLY_CLIENT=true; shift ;;
    --only-n8n)      ONLY_N8N=true; shift ;;
    --quick)         SKIP_DEPS=true; shift ;;
    --help|-h)       show_help ;;
    *)
      log_err "Option inconnue: $1"
      echo "  Utilisez --help pour voir les options disponibles"
      exit 1
      ;;
  esac
done

# =============================================================================
# Demarrage
# =============================================================================

echo ""
echo -e "${BOLD}${GREEN}========================================${NC}"
echo -e "${BOLD}${GREEN}  TalosPrimes - Deploiement VPS${NC}"
echo -e "${BOLD}${GREEN}========================================${NC}"
echo -e "  ${BLUE}Date:${NC} $(date '+%d/%m/%Y %H:%M:%S')"
echo -e "  ${BLUE}Serveur:${NC} $(hostname)"

# Afficher les options actives
if [ "$SKIP_BUILD" = true ] || [ "$SKIP_RESTART" = true ] || [ "$SKIP_DEPS" = true ] || [ "$SKIP_PRISMA" = true ] || [ "$SKIP_N8N" = true ] || [ "$ONLY_API" = true ] || [ "$ONLY_CLIENT" = true ] || [ "$ONLY_N8N" = true ]; then
  echo -e "  ${YELLOW}Options:${NC}"
  [ "$SKIP_BUILD" = true ]   && echo -e "    - Build ignore"
  [ "$SKIP_RESTART" = true ] && echo -e "    - Restart ignore"
  [ "$SKIP_DEPS" = true ]    && echo -e "    - Deps ignorees"
  [ "$SKIP_PRISMA" = true ]  && echo -e "    - Prisma ignore"
  [ "$SKIP_N8N" = true ]     && echo -e "    - n8n ignore"
  [ "$ONLY_API" = true ]     && echo -e "    - Backend uniquement"
  [ "$ONLY_CLIENT" = true ]  && echo -e "    - Frontend uniquement"
  [ "$ONLY_N8N" = true ]     && echo -e "    - n8n uniquement"
  [ -n "$N8N_WORKFLOW_DIR" ] && [ "$N8N_WORKFLOW_DIR" != "$PROJECT_DIR/n8n_workflows" ] && echo -e "    - n8n dir: $N8N_WORKFLOW_DIR"
fi

# Verifier le repertoire
if [ ! -d "$PROJECT_DIR" ]; then
  log_err "Le repertoire $PROJECT_DIR n'existe pas"
  exit 1
fi

cd "$PROJECT_DIR"

# Creer le dossier de logs si necessaire
mkdir -p "$LOG_DIR"

# Resoudre le chemin des workflows n8n
if [ -z "$N8N_WORKFLOW_DIR" ]; then
  N8N_WORKFLOW_DIR="$PROJECT_DIR/n8n_workflows"
fi
# Convertir en chemin absolu si relatif
if [[ "$N8N_WORKFLOW_DIR" != /* ]]; then
  N8N_WORKFLOW_DIR="$PROJECT_DIR/$N8N_WORKFLOW_DIR"
fi

# Mode --only-n8n : sauter directement a l'etape n8n
TOTAL_STEPS=7
if [ "$ONLY_N8N" = true ]; then
  SKIP_BUILD=true
  SKIP_RESTART=true
  SKIP_DEPS=true
  SKIP_PRISMA=true
  SKIP_N8N=false
fi

# =============================================================================
# Etape 1: Git Pull
# =============================================================================

log_step "1/$TOTAL_STEPS - Recuperation du code depuis GitHub"

# Sauvegarder le commit actuel pour pouvoir rollback
PREVIOUS_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
log_info "Commit actuel: ${PREVIOUS_COMMIT:0:8}"

if ! git pull origin main 2>&1; then
  # Modifications locales (ex. package.json) bloquent le merge : on reinitialise pour aligner sur GitHub
  if [ -n "$(git status --porcelain)" ]; then
    log_warn "Modifications locales detectees (seraient ecrasees par le merge)"
    log_info "Reinitialisation des fichiers suivants pour synchroniser avec origin/main..."
    git status --short
    git reset --hard HEAD
    log_ok "Reinitialisation effectuee"
    if ! git pull origin main 2>&1; then
      log_err "Impossible de recuperer le code apres reset"
      exit 1
    fi
  else
    log_err "Impossible de recuperer le code"
    log_info "Verifiez votre connexion et vos droits GitHub"
    exit 1
  fi
fi

NEW_COMMIT=$(git rev-parse HEAD)
if [ "$PREVIOUS_COMMIT" = "$NEW_COMMIT" ]; then
  log_info "Deja a jour (aucun changement)"
else
  CHANGED_FILES=$(git diff --name-only "$PREVIOUS_COMMIT" "$NEW_COMMIT" 2>/dev/null | wc -l)
  log_ok "Code mis a jour: ${PREVIOUS_COMMIT:0:8} -> ${NEW_COMMIT:0:8} ($CHANGED_FILES fichiers)"
fi

# =============================================================================
# Etape 2: Dependances
# =============================================================================

log_step "2/$TOTAL_STEPS - Installation des dependances"

if [ "$SKIP_DEPS" = true ]; then
  log_info "Ignore (--skip-deps)"
else
  # Determiner la commande pnpm
  if command -v pnpm &> /dev/null; then
    PNPM_CMD="pnpm"
  elif [ -f "$HOME/.local/share/pnpm/pnpm" ]; then
    PNPM_CMD="$HOME/.local/share/pnpm/pnpm"
    export PNPM_HOME="$HOME/.local/share/pnpm"
    export PATH="$PNPM_HOME:$PATH"
  else
    log_err "pnpm n'est pas installe"
    log_info "Installez pnpm: npm install -g pnpm"
    exit 1
  fi

  log_info "pnpm version: $($PNPM_CMD --version)"

  if $PNPM_CMD install --frozen-lockfile 2>/dev/null || $PNPM_CMD install; then
    log_ok "Dependances installees"
  else
    log_err "Echec de l'installation des dependances"
    exit 1
  fi
fi

# =============================================================================
# Etape 3: Prisma (migrations + generation)
# =============================================================================

log_step "3/$TOTAL_STEPS - Base de donnees (Prisma)"

if [ "$SKIP_PRISMA" = true ] || [ "$ONLY_CLIENT" = true ]; then
  log_info "Ignore (--skip-prisma ou --only-client)"
else
  cd "$PLATFORM_DIR"

  # Generer le client Prisma
  log_info "Generation du client Prisma..."
  if npx prisma generate 2>&1; then
    log_ok "Client Prisma genere"
  else
    log_warn "Erreur generation Prisma (non bloquant)"
  fi

  # Appliquer les migrations en production
  log_info "Application des migrations..."
  if npx prisma migrate deploy 2>&1; then
    log_ok "Migrations appliquees"
  else
    # Fallback sur db push si pas de migrations
    log_warn "prisma migrate deploy a echoue, tentative avec db push..."
    if npx prisma db push --accept-data-loss=false 2>&1; then
      log_ok "Schema synchronise via db push"
    else
      log_warn "Prisma db push a echoue (non bloquant si pas de changements)"
    fi
  fi

  cd "$PROJECT_DIR"
fi

# =============================================================================
# Etape 4: Build
# =============================================================================

log_step "4/$TOTAL_STEPS - Build des packages"

# S'assurer que PNPM_CMD est defini
if [ -z "$PNPM_CMD" ]; then
  if command -v pnpm &> /dev/null; then
    PNPM_CMD="pnpm"
  else
    PNPM_CMD="$HOME/.local/share/pnpm/pnpm"
  fi
fi

if [ "$SKIP_BUILD" = true ]; then
  log_info "Ignore (--skip-build)"
else
  # Toujours build shared en premier (dependance des autres)
  if [ "$ONLY_CLIENT" != true ]; then
    log_info "Build @talosprimes/shared..."
    if cd "$SHARED_DIR" && $PNPM_CMD build 2>&1; then
      log_ok "shared build"
    else
      log_err "Echec du build shared"
      exit 1
    fi
    cd "$PROJECT_DIR"
  fi

  # Build platform (backend)
  if [ "$ONLY_CLIENT" != true ]; then
    log_info "Build @talosprimes/platform..."
    if cd "$PLATFORM_DIR" && $PNPM_CMD build 2>&1; then
      log_ok "platform build"
    else
      log_err "Echec du build platform"
      exit 1
    fi
    cd "$PROJECT_DIR"
  fi

  # Build client (frontend)
  if [ "$ONLY_API" != true ]; then
    log_info "Build @talosprimes/client..."
    if cd "$CLIENT_DIR" && $PNPM_CMD build 2>&1; then
      log_ok "client build"
    else
      log_err "Echec du build client"
      exit 1
    fi
    cd "$PROJECT_DIR"
  fi

  log_ok "Tous les packages ont ete buildes"
fi

# =============================================================================
# Etape 5: Synchronisation des workflows n8n
# =============================================================================

# Desactiver set -e pour la section n8n (les erreurs API ne doivent pas tuer le script)
set +e

log_step "5/$TOTAL_STEPS - Synchronisation des workflows n8n"

if [ "$SKIP_N8N" = true ] || [ "$ONLY_CLIENT" = true ]; then
  log_info "Ignore (--skip-n8n ou --only-client)"
elif [ ! -d "$N8N_WORKFLOW_DIR" ]; then
  log_warn "Dossier workflows n8n introuvable: $N8N_WORKFLOW_DIR"
  log_info "Utilisez --n8n-dir pour specifier un chemin"
else
  cd "$PROJECT_DIR"
  log_info "Dossier workflows: $N8N_WORKFLOW_DIR"

  # Charger la cle API depuis le .env du platform si pas deja definie
  if [ -z "$N8N_API_KEY" ] && [ -f "$PLATFORM_DIR/.env" ]; then
    N8N_API_KEY=$(grep -E '^N8N_API_KEY=' "$PLATFORM_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  fi
  if [ -z "$N8N_API_URL" ] && [ -f "$PLATFORM_DIR/.env" ]; then
    N8N_API_URL=$(grep -E '^N8N_API_URL=' "$PLATFORM_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  fi

  if [ -z "$N8N_API_KEY" ]; then
    log_warn "N8N_API_KEY non defini — workflows non synchronises"
    log_info "Ajoutez N8N_API_KEY dans $PLATFORM_DIR/.env ou exportez-le"
  elif [ -z "$N8N_API_URL" ]; then
    log_warn "N8N_API_URL non defini — workflows non synchronises"
  else
    export N8N_API_KEY N8N_API_URL

    log_info "n8n URL: $N8N_API_URL"

    # ---------------------------------------------------------------
    # Fonction: trouver ou creer un projet n8n par nom
    # Retourne l'ID du projet
    # ---------------------------------------------------------------
    n8n_find_or_create_project() {
      local project_name="$1"
      local projects_json="$2"

      # Chercher le projet existant
      local project_id
      project_id=$(echo "$projects_json" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    projects = data.get('data', data) if isinstance(data, dict) else data
    if isinstance(projects, dict):
        projects = projects.get('data', [])
    for p in projects:
        if p.get('name') == '$project_name':
            print(p['id'])
            break
except:
    pass
" 2>/dev/null || true)

      if [ -n "$project_id" ]; then
        echo "$project_id"
        return 0
      fi

      # Creer le projet
      local create_resp
      create_resp=$(curl -s -X POST \
        -H "X-N8N-API-KEY: $N8N_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"$project_name\"}" \
        "$N8N_API_URL/api/v1/projects" 2>/dev/null || true)

      project_id=$(echo "$create_resp" | python3 -c "
import sys, json
try:
    print(json.load(sys.stdin).get('id',''))
except:
    pass
" 2>/dev/null || true)

      if [ -n "$project_id" ]; then
        log_info "  Projet n8n cree: $project_name (ID: $project_id)"
        echo "$project_id"
      fi
      # Toujours return 0 pour ne pas tuer le script avec set -e
      return 0
    }

    # ---------------------------------------------------------------
    # Fonction: synchroniser un workflow (create/update + activate)
    # Args: $1=fichier, $2=project_id (optionnel)
    # ---------------------------------------------------------------
    n8n_sync_workflow() {
      local file="$1"
      local project_id="$2"
      local name
      name=$(basename "$file" .json)

      # Chercher si le workflow existe deja (par nom)
      local existing_id
      existing_id=$(echo "$EXISTING_WORKFLOWS" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    workflows = data.get('data', [])
    for w in workflows:
        if w.get('name') == '$name':
            print(w['id'])
            break
except:
    pass
" 2>/dev/null || true)

      local payload http_code response body

      if [ -n "$existing_id" ]; then
        # --- UPDATE ---
        payload=$(python3 -c "
import sys, json
with open('$file') as f:
    wf = json.load(f)
wf.setdefault('settings', {})
for k in ['active','id','createdAt','updatedAt','versionId','triggerCount','sharedWithProjects','homeProject','tags','meta','pinData','staticData']:
    wf.pop(k, None)
print(json.dumps(wf))
" 2>/dev/null || true)

        if [ -z "$payload" ]; then
          return 1
        fi

        response=$(curl -s -w "\n%{http_code}" -X PUT \
          -H "X-N8N-API-KEY: $N8N_API_KEY" \
          -H "Content-Type: application/json" \
          -d "$payload" \
          "$N8N_API_URL/api/v1/workflows/$existing_id" 2>/dev/null || true)
        http_code=$(echo "$response" | tail -1)

        if [ "$http_code" = "200" ]; then
          # Activer
          curl -s -X POST \
            -H "X-N8N-API-KEY: $N8N_API_KEY" \
            "$N8N_API_URL/api/v1/workflows/$existing_id/activate" > /dev/null 2>&1 || true
          # Transferer dans le bon projet si necessaire
          if [ -n "$project_id" ]; then
            curl -s -X PUT \
              -H "X-N8N-API-KEY: $N8N_API_KEY" \
              -H "Content-Type: application/json" \
              -d "{\"destinationProjectId\": \"$project_id\"}" \
              "$N8N_API_URL/api/v1/workflows/$existing_id/transfer" > /dev/null 2>&1 || true
          fi
          return 0
        fi
        return 1

      else
        # --- CREATE ---
        payload=$(python3 -c "
import sys, json
with open('$file') as f:
    wf = json.load(f)
wf.setdefault('settings', {})
allowed = {'name','nodes','connections','settings','staticData'}
wf = {k: v for k, v in wf.items() if k in allowed}
wf.setdefault('settings', {})
print(json.dumps(wf))
" 2>/dev/null || true)

        if [ -z "$payload" ]; then
          return 1
        fi

        response=$(curl -s -w "\n%{http_code}" -X POST \
          -H "X-N8N-API-KEY: $N8N_API_KEY" \
          -H "Content-Type: application/json" \
          -d "$payload" \
          "$N8N_API_URL/api/v1/workflows" 2>/dev/null || true)
        http_code=$(echo "$response" | tail -1)
        body=$(echo "$response" | sed '$d')

        if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
          local new_id
          new_id=$(echo "$body" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || true)
          if [ -n "$new_id" ]; then
            # Activer
            curl -s -X POST \
              -H "X-N8N-API-KEY: $N8N_API_KEY" \
              "$N8N_API_URL/api/v1/workflows/$new_id/activate" > /dev/null 2>&1 || true
            # Transferer dans le bon projet
            if [ -n "$project_id" ]; then
              curl -s -X PUT \
                -H "X-N8N-API-KEY: $N8N_API_KEY" \
                -H "Content-Type: application/json" \
                -d "{\"destinationProjectId\": \"$project_id\"}" \
                "$N8N_API_URL/api/v1/workflows/$new_id/transfer" > /dev/null 2>&1 || true
            fi
          fi
          return 0
        fi
        return 1
      fi
    }

    # ---------------------------------------------------------------
    # Recuperer les donnees n8n existantes
    # ---------------------------------------------------------------
    log_info "Recuperation des workflows et projets existants..."

    # Recuperer TOUS les workflows (avec pagination) pour eviter les doublons
    EXISTING_WORKFLOWS=$(python3 -c "
import json, urllib.request, os

api_url = os.environ.get('N8N_API_URL', '')
api_key = os.environ.get('N8N_API_KEY', '')
all_workflows = []
cursor = ''

# Paginer pour tout recuperer
for _ in range(20):  # max 20 pages = 5000 workflows
    url = f'{api_url}/api/v1/workflows?limit=250'
    if cursor:
        url += f'&cursor={cursor}'
    req = urllib.request.Request(url, headers={'X-N8N-API-KEY': api_key})
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read())
    except:
        break
    wfs = data.get('data', [])
    all_workflows.extend(wfs)
    cursor = data.get('nextCursor', '')
    if not cursor or not wfs:
        break

print(json.dumps({'data': all_workflows}))
" 2>/dev/null || echo "")

    EXISTING_PROJECTS=$(curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_API_URL/api/v1/projects" 2>/dev/null || echo "{}")

    # Verifier que les reponses sont du JSON valide
    if [ -z "$EXISTING_WORKFLOWS" ] || ! echo "$EXISTING_WORKFLOWS" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
      log_warn "n8n API inaccessible — workflows non synchronises"
      EXISTING_WORKFLOWS=""
    else
      WF_COUNT=$(echo "$EXISTING_WORKFLOWS" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo "?")
      log_info "$WF_COUNT workflows existants trouves dans n8n"
    fi
    if ! echo "$EXISTING_PROJECTS" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
      log_warn "API projets n8n non disponible — les workflows iront dans Personal"
      EXISTING_PROJECTS="{}"
    fi

    if [ -n "$EXISTING_WORKFLOWS" ]; then
      N8N_TOTAL=0
      N8N_SUCCESS=0
      N8N_ERRORS=0

      # ---------------------------------------------------------------
      # Structure attendue:
      #   n8n_workflows/
      #     talosprimes/         -> projet "TalosPrimes"
      #       leads/
      #       devis/
      #       ...
      #     clients/             -> un projet par client
      #       client-dupont/
      #         facturation/
      #         ...
      # ---------------------------------------------------------------

      # --- TALOSPRIMES ---
      TALOSPRIMES_DIR="$N8N_WORKFLOW_DIR/talosprimes"
      if [ -d "$TALOSPRIMES_DIR" ]; then
        log_info "Sync TalosPrimes..."

        # Trouver ou creer le projet n8n "TalosPrimes"
        TP_PROJECT_ID=$(n8n_find_or_create_project "TalosPrimes" "$EXISTING_PROJECTS" || echo "")

        if [ -z "$TP_PROJECT_ID" ]; then
          log_warn "Projets n8n non supportes ou erreur API — les workflows iront dans Personal"
        fi

        # Fichiers JSON a la racine de talosprimes/ (ex: Super-Agent)
        for file in "$TALOSPRIMES_DIR"/*.json; do
          [ -f "$file" ] || continue
          N8N_TOTAL=$((N8N_TOTAL + 1))
          if n8n_sync_workflow "$file" "$TP_PROJECT_ID"; then
            N8N_SUCCESS=$((N8N_SUCCESS + 1))
          else
            N8N_ERRORS=$((N8N_ERRORS + 1))
            log_warn "  Erreur: $(basename "$file")"
          fi
        done

        # Sous-dossiers (leads/, devis/, etc.)
        for subdir in "$TALOSPRIMES_DIR"/*/; do
          [ -d "$subdir" ] || continue
          local_group=$(basename "$subdir")

          for file in "$subdir"*.json; do
            [ -f "$file" ] || continue
            N8N_TOTAL=$((N8N_TOTAL + 1))
            if n8n_sync_workflow "$file" "$TP_PROJECT_ID"; then
              N8N_SUCCESS=$((N8N_SUCCESS + 1))
            else
              N8N_ERRORS=$((N8N_ERRORS + 1))
              log_warn "  Erreur: $local_group/$(basename "$file")"
            fi
          done
        done

        log_info "  TalosPrimes: $N8N_SUCCESS/$N8N_TOTAL synchronises"
      fi

      # --- CLIENTS ---
      CLIENTS_DIR="$N8N_WORKFLOW_DIR/clients"
      if [ -d "$CLIENTS_DIR" ]; then
        # Chaque sous-dossier de clients/ = un client
        for client_dir in "$CLIENTS_DIR"/*/; do
          [ -d "$client_dir" ] || continue
          client_name=$(basename "$client_dir")
          [ "$client_name" = ".gitkeep" ] && continue

          log_info "Sync client: $client_name..."

          # Trouver ou creer le projet n8n pour ce client
          CLIENT_PROJECT_ID=$(n8n_find_or_create_project "Client - $client_name" "$EXISTING_PROJECTS" || echo "")

          if [ -z "$CLIENT_PROJECT_ID" ]; then
            log_warn "  Impossible de creer le projet pour $client_name — workflows dans Personal"
          fi

          CLIENT_COUNT=0
          CLIENT_OK=0

          # Fichiers JSON a la racine du client
          for file in "$client_dir"*.json; do
            [ -f "$file" ] || continue
            N8N_TOTAL=$((N8N_TOTAL + 1))
            CLIENT_COUNT=$((CLIENT_COUNT + 1))
            if n8n_sync_workflow "$file" "$CLIENT_PROJECT_ID"; then
              N8N_SUCCESS=$((N8N_SUCCESS + 1))
              CLIENT_OK=$((CLIENT_OK + 1))
            else
              N8N_ERRORS=$((N8N_ERRORS + 1))
              log_warn "    Erreur: $(basename "$file")"
            fi
          done

          # Sous-dossiers du client (facturation/, test/, etc.)
          for client_subdir in "$client_dir"*/; do
            [ -d "$client_subdir" ] || continue

            for file in "$client_subdir"*.json; do
              [ -f "$file" ] || continue
              N8N_TOTAL=$((N8N_TOTAL + 1))
              CLIENT_COUNT=$((CLIENT_COUNT + 1))
              if n8n_sync_workflow "$file" "$CLIENT_PROJECT_ID"; then
                N8N_SUCCESS=$((N8N_SUCCESS + 1))
                CLIENT_OK=$((CLIENT_OK + 1))
              else
                N8N_ERRORS=$((N8N_ERRORS + 1))
                log_warn "    Erreur: $(basename "$client_subdir")/$(basename "$file")"
              fi
            done
          done

          log_info "  $client_name: $CLIENT_OK/$CLIENT_COUNT synchronises"
        done
      fi

      # --- RESUME ---
      echo ""
      if [ "$N8N_ERRORS" -eq 0 ]; then
        log_ok "Workflows n8n: $N8N_SUCCESS/$N8N_TOTAL synchronises"
      else
        log_warn "Workflows n8n: $N8N_SUCCESS/$N8N_TOTAL OK, $N8N_ERRORS erreurs"
      fi
    fi
  fi
fi

# Reactiver set -e pour le reste du script
set -e

# =============================================================================
# Etape 6: Redemarrage des services
# =============================================================================

log_step "6/$TOTAL_STEPS - Redemarrage des services PM2"

if [ "$SKIP_RESTART" = true ]; then
  log_info "Ignore (--skip-restart)"
else
  # Redemarrer via ecosystem.config.js si disponible
  if [ -f "$PROJECT_DIR/ecosystem.config.js" ]; then
    # Backend
    if [ "$ONLY_CLIENT" != true ]; then
      if pm2 describe "$PM2_BACKEND" > /dev/null 2>&1; then
        pm2 restart "$PM2_BACKEND" --update-env 2>&1
        log_ok "Backend ($PM2_BACKEND) redemarre"
      else
        log_warn "Processus $PM2_BACKEND non trouve, demarrage via ecosystem..."
        pm2 start "$PROJECT_DIR/ecosystem.config.js" --only "$PM2_BACKEND"
        log_ok "Backend ($PM2_BACKEND) demarre"
      fi
    fi

    # Frontend
    if [ "$ONLY_API" != true ]; then
      if pm2 describe "$PM2_FRONTEND" > /dev/null 2>&1; then
        pm2 restart "$PM2_FRONTEND" --update-env 2>&1
        log_ok "Frontend ($PM2_FRONTEND) redemarre"
      else
        log_warn "Processus $PM2_FRONTEND non trouve, demarrage via ecosystem..."
        pm2 start "$PROJECT_DIR/ecosystem.config.js" --only "$PM2_FRONTEND"
        log_ok "Frontend ($PM2_FRONTEND) demarre"
      fi
    fi
  else
    # Fallback sans ecosystem
    if [ "$ONLY_CLIENT" != true ]; then
      pm2 restart "$PM2_BACKEND" --update-env 2>/dev/null || \
        (cd "$PLATFORM_DIR" && pm2 start "pnpm start" --name "$PM2_BACKEND" && cd "$PROJECT_DIR")
      log_ok "Backend redemarre"
    fi
    if [ "$ONLY_API" != true ]; then
      pm2 restart "$PM2_FRONTEND" --update-env 2>/dev/null || \
        (cd "$CLIENT_DIR" && pm2 start "pnpm start" --name "$PM2_FRONTEND" && cd "$PROJECT_DIR")
      log_ok "Frontend redemarre"
    fi
  fi

  # Sauvegarder la config PM2
  pm2 save --force 2>/dev/null
  log_ok "Configuration PM2 sauvegardee"
fi

# =============================================================================
# Etape 7: Verification (health check)
# =============================================================================

log_step "7/$TOTAL_STEPS - Verification des services"

# Attendre un peu que les services demarrent
sleep 3

# Statut PM2
echo ""
pm2 list
echo ""

# Health checks
if [ "$ONLY_CLIENT" != true ]; then
  check_health "http://localhost:3000/health" "API (platform)" || \
    check_health "http://localhost:3000" "API (platform)" || true
fi

if [ "$ONLY_API" != true ]; then
  check_health "http://localhost:3001" "Client (frontend)" || true
fi

# Verifier n8n (Docker)
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^n8n$"; then
  log_ok "n8n est actif (Docker)"
else
  log_warn "n8n ne tourne pas. Demarrez-le avec: docker start n8n"
fi

# =============================================================================
# Resume
# =============================================================================

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BOLD}${GREEN}========================================${NC}"
echo -e "${BOLD}${GREEN}  Deploiement termine !${NC}"
echo -e "${BOLD}${GREEN}========================================${NC}"
echo -e "  ${BLUE}Duree:${NC}  $(format_duration $DURATION)"
echo -e "  ${BLUE}Commit:${NC} $(git rev-parse --short HEAD)"
echo -e "  ${BLUE}Date:${NC}   $(date '+%d/%m/%Y %H:%M:%S')"
echo ""

# Log du deploiement
echo "$(date '+%Y-%m-%d %H:%M:%S') | commit=$(git rev-parse --short HEAD) | duree=$(format_duration $DURATION) | options=$*" >> "$LOG_DIR/deploy.log"
