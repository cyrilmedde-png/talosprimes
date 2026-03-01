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
#   --force-n8n       Scanner TOUS les workflows n8n, sync seulement les modifies (checksum)
#   --force-n8n-nocache  Forcer la sync de TOUS les workflows n8n (ignore le cache checksum)
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

# n8n config
N8N_DATA_DIR="/home/root/n8n-agent/n8n-data"
N8N_COMPOSE_DIR="/home/root/n8n-agent"
N8N_DB="$N8N_DATA_DIR/database.sqlite"

# Noms PM2 (doivent correspondre a ecosystem.config.js)
PM2_BACKEND="platform"
PM2_FRONTEND="client"

# Options
SKIP_BUILD=false
SKIP_RESTART=false
SKIP_DEPS=false
SKIP_PRISMA=false
SKIP_N8N=false
FORCE_N8N=false
FORCE_N8N_NOCACHE=false
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
  head -22 "$0" | tail -20
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

# Attendre que n8n soit pret (healthcheck)
wait_for_n8n() {
  local max_wait=${1:-60}  # secondes max, defaut 60
  local elapsed=0
  log_info "Attente que n8n soit pret (max ${max_wait}s)..."
  while [ $elapsed -lt $max_wait ]; do
    if curl -s -o /dev/null -w "%{http_code}" "$N8N_API_URL/healthz" 2>/dev/null | grep -q "200"; then
      log_ok "n8n est pret (${elapsed}s)"
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  log_warn "n8n ne repond pas apres ${max_wait}s"
  return 1
}

# Stopper n8n proprement
stop_n8n() {
  log_info "Arret de n8n..."
  docker stop n8n > /dev/null 2>&1 || true
  # Attendre que le container soit bien arrete
  local wait=0
  while docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^n8n$"; do
    sleep 1
    wait=$((wait + 1))
    if [ $wait -ge 30 ]; then
      log_warn "n8n ne s'arrete pas, force kill..."
      docker kill n8n > /dev/null 2>&1 || true
      sleep 2
      break
    fi
  done
  log_ok "n8n arrete"
}

# Demarrer n8n
start_n8n() {
  log_info "Demarrage de n8n..."
  # S'assurer des permissions avant demarrage
  if [ -d "$N8N_DATA_DIR" ]; then
    chown -R 1000:1000 "$N8N_DATA_DIR/" 2>/dev/null || true
  fi
  # NE PAS supprimer WAL/SHM — SQLite en a besoin pour la coherence

  # Appliquer le patch webhook si present
  if [ -f "$N8N_COMPOSE_DIR/apply-webhook-patch.sh" ]; then
    "$N8N_COMPOSE_DIR/apply-webhook-patch.sh" > /dev/null 2>&1 || true
  fi

  cd "$N8N_COMPOSE_DIR"
  docker compose up -d n8n 2>/dev/null || docker start n8n 2>/dev/null || true
  cd "$PROJECT_DIR"
}

# Backup safe de la DB n8n (avec sqlite3 .backup)
backup_n8n_db() {
  local backup_path="$1"
  if [ -f "$N8N_DB" ]; then
    if command -v sqlite3 &>/dev/null; then
      # Methode safe : sqlite3 .backup (fonctionne meme si n8n tourne)
      sqlite3 "$N8N_DB" ".backup '$backup_path'" 2>/dev/null
    else
      # Fallback : copie brute (n8n DOIT etre arrete)
      cp "$N8N_DB" "$backup_path" 2>/dev/null
    fi
  fi
}

# ---------------------------------------------------------------
# Fonctions n8n (declarees au top level pour eviter local hors fonction)
# ---------------------------------------------------------------

# Trouver ou creer un projet n8n par nom. Retourne l'ID du projet
n8n_find_or_create_project() {
  local project_name="$1"
  local projects_json="$2"

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
  return 0
}

# Synchroniser un workflow via API (PAS de docker exec, PAS de CLI import)
# Tout passe par l'API REST pour eviter d'ecrire directement dans la SQLite
n8n_sync_workflow() {
  local file="$1"
  local project_id="$2"

  # Lire le vrai nom du workflow depuis le JSON
  local name
  name=$(python3 -c "
import json
with open('$file') as f:
    print(json.load(f).get('name', ''))
" 2>/dev/null || true)

  if [ -z "$name" ]; then
    name=$(basename "$file" .json)
  fi

  # Chercher si le workflow existe deja (par nom exact)
  local existing_id
  existing_id=$(echo "$EXISTING_WORKFLOWS" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    workflows = data.get('data', [])
    target = sys.argv[1] if len(sys.argv) > 1 else ''
    for w in workflows:
        if w.get('name') == target:
            print(w['id'])
            break
except:
    pass
" "$name" 2>/dev/null || true)

  local payload

  if [ -n "$existing_id" ]; then
    # --- UPDATE via API ---
    # Recuperer le workflow actuel pour merger les credentials
    local tmp_current="/tmp/n8n_current_$existing_id.json"
    curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
      "$N8N_API_URL/api/v1/workflows/$existing_id" > "$tmp_current" 2>/dev/null || echo "{}" > "$tmp_current"

    local tmp_pyerr="/tmp/n8n_pyerr_$existing_id.txt"

    # Utiliser le script de transformation si disponible
    local transform_script="$PROJECT_DIR/scripts/transform-n8n-workflow.py"
    if [ -f "$transform_script" ]; then
      payload=$(python3 "$transform_script" "$file" "$tmp_current" 2>"$tmp_pyerr")
    else
      # Fallback: transformation minimale (credentials seulement)
      payload=$(python3 -c "
import sys, json, os, traceback
try:
    global_map = json.loads(os.environ.get('CREDENTIAL_MAP', '{}'))
    local_map = {}
    try:
        with open('$tmp_current') as f:
            current_wf = json.load(f)
        for node in current_wf.get('nodes', []):
            for cred_type, cred_info in node.get('credentials', {}).items():
                if isinstance(cred_info, dict):
                    cname = cred_info.get('name', '')
                    cid = str(cred_info.get('id', ''))
                    if cname and cid and 'REPLACE' not in cid and cid not in ('', 'null', 'None'):
                        local_map[cname] = cid
    except:
        pass
    cred_map = {**global_map, **local_map}
    current_version_id = current_wf.get('versionId') if 'current_wf' in dir() else None
    with open('$file') as f:
        wf = json.load(f)
    wf.setdefault('settings', {})
    for k in ['active','id','createdAt','updatedAt','versionId','triggerCount','sharedWithProjects','homeProject','tags','meta','pinData','staticData','_comment']:
        wf.pop(k, None)
    if current_version_id:
        wf['versionId'] = current_version_id
    for node in wf.get('nodes', []):
        for cred_type, cred_info in node.get('credentials', {}).items():
            if isinstance(cred_info, dict):
                cred_name = cred_info.get('name', '')
                if cred_name and cred_name in cred_map:
                    cred_info['id'] = cred_map[cred_name]
    print(json.dumps(wf))
except Exception as e:
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
" 2>"$tmp_pyerr")
    fi
    local py_exit=$?

    if [ $py_exit -ne 0 ] || [ -z "$payload" ]; then
      if [ -f "$tmp_pyerr" ] && [ -s "$tmp_pyerr" ]; then
        log_warn "    Python erreur pour $(basename "$file"):"
        cat "$tmp_pyerr" >&2
      fi
      rm -f "$tmp_pyerr" "$tmp_current"
      return 1
    fi
    rm -f "$tmp_pyerr" "$tmp_current"

    # Ecrire le payload dans un fichier pour eviter la corruption par bash
    # ($() dans le JSON est interprete comme substitution de commande avec -d "$payload")
    local tmp_payload="/tmp/n8n_payload_$existing_id.json"
    printf '%s' "$payload" > "$tmp_payload"

    # PUT via API REST (safe — pas d'ecriture directe en SQLite)
    local put_response put_http_code
    put_response=$(curl -s -w "\n%{http_code}" -X PUT \
      -H "X-N8N-API-KEY: $N8N_API_KEY" \
      -H "Content-Type: application/json" \
      -d @"$tmp_payload" \
      "$N8N_API_URL/api/v1/workflows/$existing_id" 2>/dev/null)
    put_http_code=$(echo "$put_response" | tail -1)

    if [ "$put_http_code" = "200" ]; then
      log_info "    UPDATE OK: $name (id=$existing_id)"
    else
      log_warn "    UPDATE echoue pour $name (HTTP $put_http_code)"
      # Log du body d'erreur pour debug
      local err_body
      err_body=$(echo "$put_response" | sed '$d' | head -1)
      [ -n "$err_body" ] && log_warn "    Erreur n8n: $err_body"
      # Fallback: essayer via /rest/ avec le cookie de session
      if [ "$N8N_SESSION_OK" = true ] && [ -f "$N8N_COOKIE_FILE" ]; then
        local rest_response rest_code
        rest_response=$(curl -s -w "\n%{http_code}" -X PATCH \
          -b "$N8N_COOKIE_FILE" \
          -H "Content-Type: application/json" \
          -d @"$tmp_payload" \
          "$N8N_API_URL/rest/workflows/$existing_id" 2>/dev/null)
        rest_code=$(echo "$rest_response" | tail -1)
        if [ "$rest_code" = "200" ]; then
          log_info "    UPDATE OK via /rest/ (fallback session)"
        else
          log_warn "    Fallback /rest/ aussi echoue (HTTP $rest_code)"
          rm -f "$tmp_payload"
          return 1
        fi
      else
        rm -f "$tmp_payload"
        return 1
      fi
    fi
    rm -f "$tmp_payload"

    sleep 0.3

    # Activer le workflow via API
    curl -s -X POST \
      -H "X-N8N-API-KEY: $N8N_API_KEY" \
      "$N8N_API_URL/api/v1/workflows/$existing_id/activate" > /dev/null 2>&1 || true

    return 0

  else
    # --- CREATE via API ---
    local transform_script="$PROJECT_DIR/scripts/transform-n8n-workflow.py"
    if [ -f "$transform_script" ]; then
      payload=$(python3 "$transform_script" "$file" 2>/dev/null || true)
      if [ -n "$payload" ]; then
        payload=$(echo "$payload" | python3 -c "
import sys, json
wf = json.load(sys.stdin)
allowed = {'name','nodes','connections','settings','staticData'}
wf = {k: v for k, v in wf.items() if k in allowed}
wf.setdefault('settings', {})
print(json.dumps(wf))
" 2>/dev/null || true)
      fi
    else
      payload=$(python3 -c "
import sys, json, os
cred_map = json.loads(os.environ.get('CREDENTIAL_MAP', '{}'))
with open('$file') as f:
    wf = json.load(f)
allowed = {'name','nodes','connections','settings','staticData'}
wf = {k: v for k, v in wf.items() if k in allowed}
wf.setdefault('settings', {})
for node in wf.get('nodes', []):
    for cred_type, cred_info in node.get('credentials', {}).items():
        if isinstance(cred_info, dict):
            cred_name = cred_info.get('name', '')
            if cred_name and cred_name in cred_map:
                cred_info['id'] = cred_map[cred_name]
print(json.dumps(wf))
" 2>/dev/null || true)
    fi

    if [ -z "$payload" ]; then
      return 1
    fi

    # Ecrire dans un fichier temporaire pour eviter corruption bash
    local tmp_payload_create="/tmp/n8n_payload_create_$$.json"
    printf '%s' "$payload" > "$tmp_payload_create"

    local response http_code body
    response=$(curl -s -w "\n%{http_code}" -X POST \
      -H "X-N8N-API-KEY: $N8N_API_KEY" \
      -H "Content-Type: application/json" \
      -d @"$tmp_payload_create" \
      "$N8N_API_URL/api/v1/workflows" 2>/dev/null || true)
    rm -f "$tmp_payload_create"
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
      local new_id
      new_id=$(echo "$body" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || true)
      if [ -n "$new_id" ]; then
        # Activer le nouveau workflow
        curl -s -X POST \
          -H "X-N8N-API-KEY: $N8N_API_KEY" \
          "$N8N_API_URL/api/v1/workflows/$new_id/activate" > /dev/null 2>&1 || true
        log_info "    CREATE OK: $name (id=$new_id)"
      fi
      return 0
    fi
    log_warn "    CREATE echoue pour $name (HTTP $http_code)"
    return 1
  fi
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
    --force-n8n)     FORCE_N8N=true; shift ;;
    --force-n8n-nocache) FORCE_N8N=true; FORCE_N8N_NOCACHE=true; shift ;;
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
if [ "$SKIP_BUILD" = true ] || [ "$SKIP_RESTART" = true ] || [ "$SKIP_DEPS" = true ] || [ "$SKIP_PRISMA" = true ] || [ "$SKIP_N8N" = true ] || [ "$FORCE_N8N" = true ] || [ "$FORCE_N8N_NOCACHE" = true ] || [ "$ONLY_API" = true ] || [ "$ONLY_CLIENT" = true ] || [ "$ONLY_N8N" = true ]; then
  echo -e "  ${YELLOW}Options:${NC}"
  [ "$SKIP_BUILD" = true ]   && echo -e "    - Build ignore"
  [ "$SKIP_RESTART" = true ] && echo -e "    - Restart ignore"
  [ "$SKIP_DEPS" = true ]    && echo -e "    - Deps ignorees"
  [ "$SKIP_PRISMA" = true ]  && echo -e "    - Prisma ignore"
  [ "$SKIP_N8N" = true ]     && echo -e "    - n8n ignore"
  [ "$FORCE_N8N" = true ] && [ "$FORCE_N8N_NOCACHE" = false ] && echo -e "    - n8n SMART sync (tous les fichiers, checksum)"
  [ "$FORCE_N8N_NOCACHE" = true ] && echo -e "    - n8n FORCE sync NOCACHE (tous les workflows, pas de checksum)"
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
if [[ "$N8N_WORKFLOW_DIR" != /* ]]; then
  N8N_WORKFLOW_DIR="$PROJECT_DIR/$N8N_WORKFLOW_DIR"
fi

# Mode --only-n8n : sauter directement a l'etape n8n
TOTAL_STEPS=8
if [ "$ONLY_N8N" = true ]; then
  SKIP_BUILD=true
  SKIP_RESTART=true
  SKIP_DEPS=true
  SKIP_PRISMA=true
  SKIP_N8N=false
fi

# =============================================================================
# Etape 0: Backup n8n (avant toute modification)
# =============================================================================

log_step "0/$TOTAL_STEPS - Sauvegarde n8n pre-deploiement"

# Backup safe de la DB n8n AVANT toute modification
BACKUP_TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_DIR="/var/backups/n8n"
mkdir -p "$BACKUP_DIR" 2>/dev/null || true

if [ -f "$N8N_DB" ]; then
  BACKUP_FILE="$BACKUP_DIR/database_pre_deploy_${BACKUP_TIMESTAMP}.sqlite"
  log_info "Backup SQLite n8n vers $BACKUP_FILE..."
  if backup_n8n_db "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" 2>/dev/null | cut -f1)
    log_ok "Backup n8n: $BACKUP_FILE ($BACKUP_SIZE)"

    # Verifier l'integrite du backup
    if command -v sqlite3 &>/dev/null; then
      INTEGRITY=$(sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" 2>/dev/null || echo "FAILED")
      if [ "$INTEGRITY" = "ok" ]; then
        log_ok "Integrite du backup: OK"
        # Creer un lien symbolique vers le dernier backup valide
        ln -sf "$BACKUP_FILE" "$BACKUP_DIR/database_latest_valid.sqlite" 2>/dev/null || true
      else
        log_warn "Integrite du backup: $INTEGRITY"
      fi
    fi
  else
    log_warn "Backup n8n echoue (non bloquant)"
  fi

  # Nettoyer les vieux backups (garder les 10 derniers)
  ls -t "$BACKUP_DIR"/database_pre_deploy_*.sqlite 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
else
  log_warn "Base n8n introuvable: $N8N_DB"
fi

# Lancer aussi le backup script personnalise si present
SCRIPT_DIR_BACKUP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR_BACKUP/backup-n8n.sh" ]; then
  log_info "Lancement du backup n8n complementaire..."
  if bash "$SCRIPT_DIR_BACKUP/backup-n8n.sh" 2>&1 | while read -r line; do echo "  $line"; done; then
    log_ok "Backup n8n complementaire termine"
  else
    log_warn "Backup n8n complementaire echoue (non bloquant)"
  fi
fi

# =============================================================================
# Etape 1: Git Pull
# =============================================================================

log_step "1/$TOTAL_STEPS - Recuperation du code depuis GitHub"

# Sauvegarder le commit actuel pour pouvoir rollback
PREVIOUS_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
log_info "Commit actuel: ${PREVIOUS_COMMIT:0:8}"

if ! git pull origin main 2>&1; then
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

  log_info "Generation du client Prisma..."
  if npx prisma generate 2>&1; then
    log_ok "Client Prisma genere"
  else
    log_warn "Erreur generation Prisma (non bloquant)"
  fi

  log_info "Application des migrations..."
  if npx prisma migrate deploy 2>&1; then
    log_ok "Migrations appliquees"
  else
    log_warn "prisma migrate deploy a echoue (non bloquant)"
  fi

  log_info "Synchronisation du schema (db push)..."
  if npx prisma db push --accept-data-loss=false 2>&1; then
    log_ok "Schema synchronise via db push"
  else
    log_warn "Prisma db push: pas de changements ou erreur (non bloquant)"
  fi

  # --- Execution des seeds SQL (uniquement les nouveaux) ---
  SEED_SQL_DIR="$PLATFORM_DIR/prisma"
  SEEDS_DONE_FILE="$PLATFORM_DIR/.seeds-done"
  DATABASE_URL=""

  # Charger DATABASE_URL depuis le .env platform
  if [ -f "$PLATFORM_DIR/.env" ]; then
    DATABASE_URL=$(grep -E '^DATABASE_URL=' "$PLATFORM_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  fi

  # Creer le fichier de suivi s'il n'existe pas
  [ ! -f "$SEEDS_DONE_FILE" ] && touch "$SEEDS_DONE_FILE"

  if [ -n "$DATABASE_URL" ]; then
    SEED_FILES=$(find "$SEED_SQL_DIR" -maxdepth 1 -name 'seed-*.sql' -type f 2>/dev/null | sort)
    if [ -n "$SEED_FILES" ]; then
      NEW_SEEDS=0
      while IFS= read -r seed_file; do
        seed_name=$(basename "$seed_file")
        # Verifier si ce seed a deja ete execute
        if grep -qxF "$seed_name" "$SEEDS_DONE_FILE" 2>/dev/null; then
          continue
        fi
        # Nouveau seed → executer
        NEW_SEEDS=$((NEW_SEEDS + 1))
        log_info "  -> $seed_name (nouveau)"
        if psql "$DATABASE_URL" -f "$seed_file" 2>&1 | tail -5; then
          # Marquer comme execute
          echo "$seed_name" >> "$SEEDS_DONE_FILE"
          log_ok "  $seed_name execute"
        else
          log_warn "  $seed_name: erreur (non bloquant)"
        fi
      done <<< "$SEED_FILES"
      if [ "$NEW_SEEDS" -eq 0 ]; then
        log_info "Seeds SQL: aucun nouveau seed a executer"
      fi
    else
      log_info "Aucun fichier seed-*.sql trouve"
    fi
  else
    log_warn "DATABASE_URL non trouvee dans .env — seeds SQL ignores"
    log_info "Ajoutez DATABASE_URL dans $PLATFORM_DIR/.env pour executer les seeds"
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
# Etape 5: Synchronisation des workflows n8n (INCREMENTAL)
# =============================================================================
# STRATEGIE:
#   1. Git diff pour detecter UNIQUEMENT les fichiers n8n modifies
#   2. Pour chaque fichier modifie: GET le workflow existant (credentials + versionId)
#   3. Merger credentials dans le nouveau JSON, PUT via API
#   4. Pour les nouveaux fichiers: POST via API
#   5. PAS de manipulation SQLite, PAS de fix-credentials-sqlite.sh
#   6. Restart n8n uniquement si des workflows ont ete modifies
# =============================================================================

# Desactiver set -e pour la section n8n (les erreurs API ne doivent pas tuer le script)
set +e

log_step "5/$TOTAL_STEPS - Synchronisation des workflows n8n (incremental)"

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
    # Detecter les fichiers n8n a synchroniser
    # ---------------------------------------------------------------
    CHANGED_N8N_FILES=""

    if [ "$FORCE_N8N" = true ]; then
      # --force-n8n : sync TOUS les workflows (remplace sync-all-n8n.sh)
      log_info "Mode FORCE : sync de tous les workflows"
      CHANGED_N8N_FILES=$(find "$N8N_WORKFLOW_DIR" -name '*.json' -type f 2>/dev/null | sed "s|^$PROJECT_DIR/||" || true)
    else
      # Mode incremental : uniquement les fichiers modifies via git diff
      if [ "$PREVIOUS_COMMIT" != "unknown" ] && [ "$PREVIOUS_COMMIT" != "$NEW_COMMIT" ]; then
        CHANGED_N8N_FILES=$(git diff --name-only "$PREVIOUS_COMMIT" "$NEW_COMMIT" -- "n8n_workflows/" 2>/dev/null | grep '\.json$' || true)
      fi

      # Si --only-n8n est utilise sans changement git, sync tout
      if [ "$ONLY_N8N" = true ] && [ -z "$CHANGED_N8N_FILES" ]; then
        log_info "Mode --only-n8n : sync de tous les workflows"
        CHANGED_N8N_FILES=$(find "$N8N_WORKFLOW_DIR" -name '*.json' -type f 2>/dev/null | sed "s|^$PROJECT_DIR/||" || true)
      fi
    fi

    # ---------------------------------------------------------------
    # Systeme de checksums pour eviter de re-sync les workflows inchanges
    # ---------------------------------------------------------------
    N8N_CHECKSUM_FILE="$PROJECT_DIR/.n8n_checksums"
    touch "$N8N_CHECKSUM_FILE" 2>/dev/null || true

    if [ -z "$CHANGED_N8N_FILES" ]; then
      log_ok "Aucun workflow n8n modifie — rien a synchroniser"
    else
      CHANGED_COUNT=$(echo "$CHANGED_N8N_FILES" | wc -l | tr -d ' ')
      log_info "$CHANGED_COUNT fichier(s) n8n candidat(s) detecte(s)"

      # ---------------------------------------------------------------
      # Recuperer la liste des workflows existants dans n8n (noms + IDs)
      # On ne recupere QUE la liste, PAS le detail de chaque workflow
      # ---------------------------------------------------------------
      log_info "Recuperation de la liste des workflows n8n..."

      EXISTING_WORKFLOWS=$(python3 -c "
import json, urllib.request, os

api_url = os.environ.get('N8N_API_URL', '')
api_key = os.environ.get('N8N_API_KEY', '')
all_workflows = []
cursor = ''

for _ in range(20):
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

      if [ -z "$EXISTING_WORKFLOWS" ] || ! echo "$EXISTING_WORKFLOWS" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
        log_warn "n8n API inaccessible — workflows non synchronises"
      else
        WF_COUNT=$(echo "$EXISTING_WORKFLOWS" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo "?")
        log_info "$WF_COUNT workflows existants dans n8n"

        N8N_TOTAL=0
        N8N_SUCCESS=0
        N8N_ERRORS=0
        N8N_SKIPPED=0

        # ---------------------------------------------------------------
        # Synchroniser UNIQUEMENT les fichiers modifies (avec checksum)
        # ---------------------------------------------------------------
        while IFS= read -r rel_path; do
          [ -z "$rel_path" ] && continue
          file="$PROJECT_DIR/$rel_path"
          [ -f "$file" ] || continue

          # --- Checksum : skip si le fichier n'a pas change ---
          if [ "$FORCE_N8N_NOCACHE" != true ]; then
            file_hash=$(sha256sum "$file" 2>/dev/null | cut -d' ' -f1)
            stored_hash=$(grep -F "$rel_path" "$N8N_CHECKSUM_FILE" 2>/dev/null | cut -d' ' -f1 || true)
            if [ -n "$file_hash" ] && [ "$file_hash" = "$stored_hash" ]; then
              N8N_SKIPPED=$((N8N_SKIPPED + 1))
              continue
            fi
          fi

          N8N_TOTAL=$((N8N_TOTAL + 1))

          # Lire le nom du workflow depuis le JSON
          wf_name=$(python3 -c "
import json
with open('$file') as f:
    print(json.load(f).get('name', ''))
" 2>/dev/null || true)
          [ -z "$wf_name" ] && wf_name=$(basename "$file" .json)

          # Chercher si le workflow existe deja dans n8n (par nom)
          existing_id=$(echo "$EXISTING_WORKFLOWS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for w in data.get('data', []):
    if w.get('name') == '$wf_name':
        print(w['id'])
        break
" 2>/dev/null || true)

          if [ -n "$existing_id" ]; then
            # --- UPDATE: recuperer le workflow actuel (credentials + versionId) ---
            tmp_current="/tmp/n8n_current_$existing_id.json"
            curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
              "$N8N_API_URL/api/v1/workflows/$existing_id" > "$tmp_current" 2>/dev/null || echo "{}" > "$tmp_current"

            # Transformer: merger credentials du workflow actuel dans le nouveau
            transform_script="$PROJECT_DIR/scripts/transform-n8n-workflow.py"
            tmp_pyerr="/tmp/n8n_pyerr_$existing_id.txt"

            if [ -f "$transform_script" ]; then
              payload=$(python3 "$transform_script" "$file" "$tmp_current" 2>"$tmp_pyerr")
            else
              # Fallback: transformation minimale (credentials seulement)
              payload=$(python3 -c "
import sys, json
try:
    with open('$tmp_current') as f:
        current_wf = json.load(f)

    # Extraire credentials du workflow actuel
    cred_map = {}
    for node in current_wf.get('nodes', []):
        for cred_type, cred_info in node.get('credentials', {}).items():
            if isinstance(cred_info, dict):
                cname = cred_info.get('name', '')
                cid = str(cred_info.get('id', ''))
                if cname and cid and cid not in ('', 'null', 'None'):
                    cred_map[cname] = cid

    current_version_id = current_wf.get('versionId')

    with open('$file') as f:
        wf = json.load(f)

    # Nettoyer les champs non necessaires pour le PUT
    for k in ['active','id','createdAt','updatedAt','versionId','triggerCount','sharedWithProjects','homeProject','tags','meta','pinData','_comment']:
        wf.pop(k, None)

    wf.setdefault('settings', {})

    # Injecter le versionId du workflow actuel
    if current_version_id:
        wf['versionId'] = current_version_id

    # Appliquer les credentials
    for node in wf.get('nodes', []):
        for cred_type, cred_info in node.get('credentials', {}).items():
            if isinstance(cred_info, dict):
                cred_name = cred_info.get('name', '')
                if cred_name and cred_name in cred_map:
                    cred_info['id'] = cred_map[cred_name]

    print(json.dumps(wf))
except Exception as e:
    import traceback
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
" 2>"$tmp_pyerr")
            fi
            py_exit=$?

            if [ $py_exit -ne 0 ] || [ -z "$payload" ]; then
              if [ -f "$tmp_pyerr" ] && [ -s "$tmp_pyerr" ]; then
                log_warn "  Python erreur pour $(basename "$file"):"
                head -5 "$tmp_pyerr" >&2
              fi
              N8N_ERRORS=$((N8N_ERRORS + 1))
              log_warn "  ERREUR transform: $wf_name"
              rm -f "$tmp_pyerr" "$tmp_current"
              continue
            fi
            rm -f "$tmp_pyerr" "$tmp_current"

            # Ecrire le payload dans un fichier temp (eviter corruption bash)
            tmp_payload="/tmp/n8n_payload_$existing_id.json"
            printf '%s' "$payload" > "$tmp_payload"

            # PUT via API REST v1
            put_response=$(curl -s -w "\n%{http_code}" -X PUT \
              -H "X-N8N-API-KEY: $N8N_API_KEY" \
              -H "Content-Type: application/json" \
              -d @"$tmp_payload" \
              "$N8N_API_URL/api/v1/workflows/$existing_id" 2>/dev/null)
            put_http_code=$(echo "$put_response" | tail -1)

            if [ "$put_http_code" = "200" ]; then
              log_ok "  UPDATE: $wf_name (id=$existing_id)"
              N8N_SUCCESS=$((N8N_SUCCESS + 1))
              # Sauvegarder le checksum apres sync reussi
              file_hash=${file_hash:-$(sha256sum "$file" 2>/dev/null | cut -d' ' -f1)}
              sed -i "\|$rel_path|d" "$N8N_CHECKSUM_FILE" 2>/dev/null || true
              echo "$file_hash  $rel_path" >> "$N8N_CHECKSUM_FILE"
            else
              # Retry sans versionId (certaines versions n8n le rejettent)
              python3 -c "
import json
with open('$tmp_payload') as f:
    wf = json.load(f)
wf.pop('versionId', None)
wf.pop('staticData', None)
with open('$tmp_payload', 'w') as f:
    json.dump(wf, f)
" 2>/dev/null
              put_response2=$(curl -s -w "\n%{http_code}" -X PUT \
                -H "X-N8N-API-KEY: $N8N_API_KEY" \
                -H "Content-Type: application/json" \
                -d @"$tmp_payload" \
                "$N8N_API_URL/api/v1/workflows/$existing_id" 2>/dev/null)
              put_http_code2=$(echo "$put_response2" | tail -1)

              if [ "$put_http_code2" = "200" ]; then
                log_ok "  UPDATE: $wf_name (id=$existing_id) [sans versionId]"
                N8N_SUCCESS=$((N8N_SUCCESS + 1))
                file_hash=${file_hash:-$(sha256sum "$file" 2>/dev/null | cut -d' ' -f1)}
                sed -i "\|$rel_path|d" "$N8N_CHECKSUM_FILE" 2>/dev/null || true
                echo "$file_hash  $rel_path" >> "$N8N_CHECKSUM_FILE"
              else
                # Dernier fallback: n8n CLI import via docker
                local n8n_container
                n8n_container=$(docker ps --format '{{.Names}}' | grep -i n8n | head -1)
                if [ -n "$n8n_container" ]; then
                  # Copy payload to container and import
                  docker cp "$tmp_payload" "$n8n_container:/tmp/wf_import.json" 2>/dev/null
                  local import_out
                  import_out=$(docker exec "$n8n_container" n8n import:workflow --input=/tmp/wf_import.json 2>&1) || true
                  if echo "$import_out" | grep -qi "success\|imported"; then
                    log_ok "  UPDATE: $wf_name (id=$existing_id) [via n8n CLI import]"
                    N8N_SUCCESS=$((N8N_SUCCESS + 1))
                    file_hash=${file_hash:-$(sha256sum "$file" 2>/dev/null | cut -d' ' -f1)}
                    sed -i "\|$rel_path|d" "$N8N_CHECKSUM_FILE" 2>/dev/null || true
                    echo "$file_hash  $rel_path" >> "$N8N_CHECKSUM_FILE"
                  else
                    err_body=$(echo "$put_response2" | sed '$d' | head -1)
                    log_warn "  UPDATE echoue: $wf_name (HTTP $put_http_code, retry=$put_http_code2)"
                    [ -n "$err_body" ] && log_warn "    -> $err_body"
                    N8N_ERRORS=$((N8N_ERRORS + 1))
                  fi
                  docker exec "$n8n_container" rm -f /tmp/wf_import.json 2>/dev/null || true
                else
                  err_body=$(echo "$put_response2" | sed '$d' | head -1)
                  log_warn "  UPDATE echoue: $wf_name (HTTP $put_http_code, retry=$put_http_code2)"
                  [ -n "$err_body" ] && log_warn "    -> $err_body"
                  N8N_ERRORS=$((N8N_ERRORS + 1))
                fi
              fi
            fi
            rm -f "$tmp_payload"

            # Activer le workflow
            curl -s -X POST \
              -H "X-N8N-API-KEY: $N8N_API_KEY" \
              "$N8N_API_URL/api/v1/workflows/$existing_id/activate" > /dev/null 2>&1 || true

            sleep 0.3
          else
            # --- CREATE: nouveau workflow ---
            payload=$(python3 -c "
import json
with open('$file') as f:
    wf = json.load(f)
allowed = {'name','nodes','connections','settings','staticData'}
wf = {k: v for k, v in wf.items() if k in allowed}
wf.setdefault('settings', {})
print(json.dumps(wf))
" 2>/dev/null || true)

            if [ -z "$payload" ]; then
              N8N_ERRORS=$((N8N_ERRORS + 1))
              log_warn "  ERREUR parse: $wf_name"
              continue
            fi

            tmp_payload_create="/tmp/n8n_payload_create_$$.json"
            printf '%s' "$payload" > "$tmp_payload_create"

            response=$(curl -s -w "\n%{http_code}" -X POST \
              -H "X-N8N-API-KEY: $N8N_API_KEY" \
              -H "Content-Type: application/json" \
              -d @"$tmp_payload_create" \
              "$N8N_API_URL/api/v1/workflows" 2>/dev/null || true)
            rm -f "$tmp_payload_create"
            http_code=$(echo "$response" | tail -1)
            body=$(echo "$response" | sed '$d')

            if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
              new_id=$(echo "$body" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || true)
              if [ -n "$new_id" ]; then
                curl -s -X POST \
                  -H "X-N8N-API-KEY: $N8N_API_KEY" \
                  "$N8N_API_URL/api/v1/workflows/$new_id/activate" > /dev/null 2>&1 || true
                log_ok "  CREATE: $wf_name (id=$new_id)"
              fi
              N8N_SUCCESS=$((N8N_SUCCESS + 1))
              file_hash=${file_hash:-$(sha256sum "$file" 2>/dev/null | cut -d' ' -f1)}
              sed -i "\|$rel_path|d" "$N8N_CHECKSUM_FILE" 2>/dev/null || true
              echo "$file_hash  $rel_path" >> "$N8N_CHECKSUM_FILE"
            else
              N8N_ERRORS=$((N8N_ERRORS + 1))
              log_warn "  CREATE echoue: $wf_name (HTTP $http_code)"
            fi
          fi
        done <<< "$CHANGED_N8N_FILES"

        # --- RESUME ---
        echo ""
        if [ "$N8N_SKIPPED" -gt 0 ]; then
          log_info "$N8N_SKIPPED workflow(s) inchange(s) (checksum identique) — skip"
        fi
        if [ "$N8N_ERRORS" -eq 0 ]; then
          log_ok "Workflows n8n: $N8N_SUCCESS/$N8N_TOTAL synchronises, $N8N_SKIPPED skip (0 erreur)"
        else
          log_warn "Workflows n8n: $N8N_SUCCESS/$N8N_TOTAL OK, $N8N_SKIPPED skip, $N8N_ERRORS erreurs"
        fi

        # --- RESTART n8n si des workflows ont ete modifies ---
        if [ "$N8N_SUCCESS" -gt 0 ]; then
          log_info "Restart n8n pour enregistrer les webhooks..."
          docker restart n8n > /dev/null 2>&1 || true
          wait_for_n8n 60
        else
          log_info "Aucun workflow synchronise — pas de restart n8n"
        fi

        # --- VERIFICATION FINALE ---
        log_info "Verification finale..."
        python3 -c "
import json, urllib.request, os, sys

api_url = os.environ.get('N8N_API_URL', '')
api_key = os.environ.get('N8N_API_KEY', '')

if not api_url or not api_key:
    sys.exit(0)

all_workflows = []
cursor = ''
for _ in range(20):
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

active = len([w for w in all_workflows if w.get('active')])
total = len(all_workflows)
print(f'{active}/{total} workflows actifs')
" 2>&1 | while IFS= read -r line; do log_ok "$line"; done
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
  if [ -f "$PROJECT_DIR/ecosystem.config.js" ]; then
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

  pm2 save --force 2>/dev/null
  log_ok "Configuration PM2 sauvegardee"
fi

# =============================================================================
# Etape 7: Verification (health check)
# =============================================================================

log_step "7/$TOTAL_STEPS - Verification des services"

sleep 3

echo ""
pm2 list
echo ""

if [ "$ONLY_CLIENT" != true ]; then
  check_health "http://localhost:3000/health" "API (platform)" || \
    check_health "http://localhost:3000" "API (platform)" || true
fi

if [ "$ONLY_API" != true ]; then
  check_health "http://localhost:3001" "Client (frontend)" || true
fi

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
