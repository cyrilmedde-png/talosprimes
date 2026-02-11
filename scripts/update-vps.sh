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
#   --only-api        Deployer uniquement le backend (platform)
#   --only-client     Deployer uniquement le frontend (client)
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
ONLY_API=false
ONLY_CLIENT=false

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
  head -15 "$0" | tail -13
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
    --only-api)      ONLY_API=true; shift ;;
    --only-client)   ONLY_CLIENT=true; shift ;;
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
if [ "$SKIP_BUILD" = true ] || [ "$SKIP_RESTART" = true ] || [ "$SKIP_DEPS" = true ] || [ "$SKIP_PRISMA" = true ] || [ "$ONLY_API" = true ] || [ "$ONLY_CLIENT" = true ]; then
  echo -e "  ${YELLOW}Options:${NC}"
  [ "$SKIP_BUILD" = true ]   && echo -e "    - Build ignore"
  [ "$SKIP_RESTART" = true ] && echo -e "    - Restart ignore"
  [ "$SKIP_DEPS" = true ]    && echo -e "    - Deps ignorees"
  [ "$SKIP_PRISMA" = true ]  && echo -e "    - Prisma ignore"
  [ "$ONLY_API" = true ]     && echo -e "    - Backend uniquement"
  [ "$ONLY_CLIENT" = true ]  && echo -e "    - Frontend uniquement"
fi

# Verifier le repertoire
if [ ! -d "$PROJECT_DIR" ]; then
  log_err "Le repertoire $PROJECT_DIR n'existe pas"
  exit 1
fi

cd "$PROJECT_DIR"

# Creer le dossier de logs si necessaire
mkdir -p "$LOG_DIR"

# =============================================================================
# Etape 1: Git Pull
# =============================================================================

log_step "1/6 - Recuperation du code depuis GitHub"

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

log_step "2/6 - Installation des dependances"

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

log_step "3/6 - Base de donnees (Prisma)"

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

log_step "4/6 - Build des packages"

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
# Etape 5: Redemarrage des services
# =============================================================================

log_step "5/6 - Redemarrage des services PM2"

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
# Etape 6: Verification (health check)
# =============================================================================

log_step "6/6 - Verification des services"

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
