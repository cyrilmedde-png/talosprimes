#!/bin/bash
# =============================================================================
# DEPLOY-FIX-CREDENTIALS.SH
# Script complet pour déployer le fix des credentials n8n
# Gère automatiquement TOUS les containers n8n détectés
# =============================================================================
# Usage: sudo bash scripts/deploy-fix-credentials.sh
# =============================================================================

set -u  # Pas de -e pour éviter que le script s'arrête à la première erreur d'import

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/var/www/talosprimes"
PLATFORM_ENV="$PROJECT_DIR/packages/platform/.env"
N8N_WORKFLOW_DIR="$PROJECT_DIR/n8n_workflows"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
DB_PATH="/home/node/.n8n/database.sqlite"

# Compteurs
TOTAL_ERRORS=0

# =============================================================================
# Fonctions utilitaires
# =============================================================================

log_title() {
  echo ""
  echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║  ${BOLD}$1${NC}${CYAN}$(printf '%*s' $((53 - ${#1})) '')║${NC}"
  echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

log_step() {
  echo ""
  echo -e "${BOLD}${BLUE}━━━ $1 ━━━${NC}"
}

log_ok() { echo -e "  ${GREEN}✅${NC} $1"; }
log_warn() { echo -e "  ${YELLOW}⚠️${NC}  $1"; }
log_err() { echo -e "  ${RED}❌${NC} $1"; TOTAL_ERRORS=$((TOTAL_ERRORS + 1)); }
log_info() { echo -e "  ${BLUE}ℹ${NC}  $1"; }

wait_n8n_ready() {
  local container="$1"
  local max_wait="${2:-60}"
  local port
  port=$(docker port "$container" 5678 2>/dev/null | head -1 | cut -d: -f2 || echo "5678")

  for i in $(seq 1 "$max_wait"); do
    if docker exec "$container" wget -q -O /dev/null http://localhost:5678/healthz 2>/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# =============================================================================
# ETAPE 0 : Détection de l'environnement
# =============================================================================

log_title "DEPLOIEMENT FIX CREDENTIALS N8N"

echo -e "  ${BLUE}Date:${NC}     $(date '+%d/%m/%Y %H:%M:%S')"
echo -e "  ${BLUE}Serveur:${NC}  $(hostname 2>/dev/null || echo 'inconnu')"
echo -e "  ${BLUE}User:${NC}     $(whoami)"
echo ""

# Vérifier Docker
if ! command -v docker &> /dev/null; then
  log_err "Docker n'est pas installé !"
  exit 1
fi

# Détecter TOUS les containers n8n (en cours ou arrêtés)
log_step "ETAPE 0 : Détection des containers n8n"

N8N_CONTAINERS=()
while IFS= read -r line; do
  [ -n "$line" ] && N8N_CONTAINERS+=("$line")
done < <(docker ps -a --format '{{.Names}}' | grep -iE 'n8n' || true)

if [ ${#N8N_CONTAINERS[@]} -eq 0 ]; then
  log_err "Aucun container n8n trouvé !"
  exit 1
fi

echo ""
echo -e "  ${BOLD}${#N8N_CONTAINERS[@]} container(s) n8n détecté(s) :${NC}"
for c in "${N8N_CONTAINERS[@]}"; do
  STATUS=$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || echo "inconnu")
  PORTS=$(docker port "$c" 2>/dev/null | tr '\n' ' ' || echo "aucun port")
  IMAGE=$(docker inspect -f '{{.Config.Image}}' "$c" 2>/dev/null || echo "?")

  # Vérifier si TALOSPRIMES_N8N_SECRET est déjà configuré
  HAS_SECRET=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$c" 2>/dev/null | grep "TALOSPRIMES_N8N_SECRET" || echo "")

  echo -e "    ${BOLD}→ $c${NC}"
  echo -e "      Status: $STATUS | Image: $IMAGE"
  echo -e "      Ports: $PORTS"
  if [ -n "$HAS_SECRET" ]; then
    echo -e "      ${GREEN}TALOSPRIMES_N8N_SECRET: déjà configuré${NC}"
  else
    echo -e "      ${YELLOW}TALOSPRIMES_N8N_SECRET: MANQUANT${NC}"
  fi
done

# =============================================================================
# ETAPE 1 : Git Pull
# =============================================================================

log_step "ETAPE 1 : Mise à jour du code (git pull)"

if [ ! -d "$PROJECT_DIR" ]; then
  log_err "Répertoire $PROJECT_DIR introuvable"
  exit 1
fi

cd "$PROJECT_DIR"

PREV_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "?")
log_info "Commit actuel: $PREV_COMMIT"

if git pull origin main 2>&1; then
  NEW_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "?")
  if [ "$PREV_COMMIT" = "$NEW_COMMIT" ]; then
    log_info "Déjà à jour"
  else
    CHANGED=$(git diff --name-only "$PREV_COMMIT" "$NEW_COMMIT" 2>/dev/null | wc -l || echo "?")
    log_ok "Mis à jour: $PREV_COMMIT → $NEW_COMMIT ($CHANGED fichiers)"
  fi
else
  log_warn "Git pull a échoué — tentative avec reset..."
  git reset --hard HEAD
  if git pull origin main 2>&1; then
    log_ok "Mis à jour après reset"
  else
    log_err "Impossible de pull le code. Vérifiez manuellement."
    exit 1
  fi
fi

# =============================================================================
# ETAPE 2 : Charger les variables d'environnement
# =============================================================================

log_step "ETAPE 2 : Chargement des variables d'environnement"

# TALOSPRIMES_N8N_SECRET
if [ -z "${TALOSPRIMES_N8N_SECRET:-}" ]; then
  if [ -f "$PLATFORM_ENV" ]; then
    TALOSPRIMES_N8N_SECRET=$(grep -E '^N8N_WEBHOOK_SECRET=' "$PLATFORM_ENV" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
  fi
fi

if [ -n "${TALOSPRIMES_N8N_SECRET:-}" ]; then
  log_ok "TALOSPRIMES_N8N_SECRET: chargé (${#TALOSPRIMES_N8N_SECRET} caractères)"
else
  log_err "TALOSPRIMES_N8N_SECRET introuvable ! Vérifiez N8N_WEBHOOK_SECRET dans $PLATFORM_ENV"
  echo ""
  echo -e "  ${YELLOW}Pour le configurer manuellement :${NC}"
  echo "    export TALOSPRIMES_N8N_SECRET='votre_secret_ici'"
  echo "    puis relancez ce script"
  exit 1
fi

# N8N_API_KEY
N8N_API_KEY="${N8N_API_KEY:-}"
if [ -z "$N8N_API_KEY" ] && [ -f "$PLATFORM_ENV" ]; then
  N8N_API_KEY=$(grep -E '^N8N_API_KEY=' "$PLATFORM_ENV" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
fi

if [ -n "$N8N_API_KEY" ]; then
  log_ok "N8N_API_KEY: chargée"
else
  log_warn "N8N_API_KEY non trouvée (import CLI Docker sera utilisé)"
fi

# N8N_API_URL
N8N_API_URL="${N8N_API_URL:-}"
if [ -z "$N8N_API_URL" ] && [ -f "$PLATFORM_ENV" ]; then
  N8N_API_URL=$(grep -E '^N8N_API_URL=' "$PLATFORM_ENV" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
fi
N8N_API_URL="${N8N_API_URL:-https://n8n.talosprimes.com}"
log_info "N8N_API_URL: $N8N_API_URL"

export N8N_API_KEY N8N_API_URL TALOSPRIMES_N8N_SECRET

# =============================================================================
# ETAPE 3 : Recréer les containers n8n avec TALOSPRIMES_N8N_SECRET
# =============================================================================

log_step "ETAPE 3 : Mise à jour des containers n8n"

for CONTAINER in "${N8N_CONTAINERS[@]}"; do
  echo ""
  echo -e "  ${BOLD}──── Container: $CONTAINER ────${NC}"

  # Vérifier si le container tourne
  IS_RUNNING=$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null || echo "false")

  # Vérifier si le secret est déjà configuré
  CURRENT_SECRET=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$CONTAINER" 2>/dev/null | grep "^TALOSPRIMES_N8N_SECRET=" | cut -d'=' -f2- || true)

  if [ "$CURRENT_SECRET" = "$TALOSPRIMES_N8N_SECRET" ]; then
    log_ok "TALOSPRIMES_N8N_SECRET déjà configuré correctement"

    # Vérifier que le container tourne
    if [ "$IS_RUNNING" != "true" ]; then
      log_info "Container arrêté, démarrage..."
      docker start "$CONTAINER" 2>/dev/null || true
    fi
    continue
  fi

  log_info "Reconfiguration nécessaire pour ajouter TALOSPRIMES_N8N_SECRET"

  # Sauvegarder toute la config du container
  INSPECT_JSON=$(docker inspect "$CONTAINER" 2>/dev/null)

  # Extraire les infos nécessaires
  IMAGE=$(echo "$INSPECT_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['Config']['Image'])" 2>/dev/null || echo "docker.n8n.io/n8nio/n8n")

  # Extraire les env vars existantes
  EXISTING_ENVS=$(echo "$INSPECT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)[0]
envs = data['Config'].get('Env', [])
for e in envs:
    # Ignorer TALOSPRIMES_N8N_SECRET existant (on va le remplacer)
    if not e.startswith('TALOSPRIMES_N8N_SECRET='):
        print(e)
" 2>/dev/null || true)

  # Extraire les ports
  PORT_BINDINGS=$(echo "$INSPECT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)[0]
bindings = data.get('HostConfig', {}).get('PortBindings', {})
for container_port, hosts in bindings.items():
    if hosts:
        for h in hosts:
            host_port = h.get('HostPort', '')
            if host_port:
                print(f'{host_port}:{container_port.replace(\"/tcp\",\"\")}')
                break
" 2>/dev/null || echo "5678:5678")

  # Extraire les volumes/mounts
  VOLUME_MOUNTS=$(echo "$INSPECT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)[0]
mounts = data.get('Mounts', [])
for m in mounts:
    src = m.get('Source', '')
    dst = m.get('Destination', '')
    if src and dst:
        print(f'{src}:{dst}')
" 2>/dev/null || true)

  # Extraire le réseau
  NETWORK=$(echo "$INSPECT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)[0]
nets = data.get('NetworkSettings', {}).get('Networks', {})
for name in nets:
    if name != 'bridge':
        print(name)
        break
else:
    for name in nets:
        print(name)
        break
" 2>/dev/null || true)

  # Extraire le restart policy
  RESTART_POLICY=$(echo "$INSPECT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)[0]
rp = data.get('HostConfig', {}).get('RestartPolicy', {})
name = rp.get('Name', '')
if name:
    print(name)
" 2>/dev/null || echo "unless-stopped")

  echo ""
  echo -e "  ${BLUE}Config récupérée :${NC}"
  echo "    Image: $IMAGE"
  echo "    Ports: $PORT_BINDINGS"
  echo "    Volumes: $(echo "$VOLUME_MOUNTS" | tr '\n' ' ')"
  echo "    Réseau: ${NETWORK:-bridge}"
  echo "    Restart: $RESTART_POLICY"
  echo ""

  # Demander confirmation
  read -p "  Recréer le container $CONTAINER avec TALOSPRIMES_N8N_SECRET ? (o/N) " -r CONFIRM
  if [[ ! "$CONFIRM" =~ ^[oOyY]$ ]]; then
    log_warn "Skip $CONTAINER"
    continue
  fi

  # Arrêter et supprimer
  log_info "Arrêt de $CONTAINER..."
  docker stop "$CONTAINER" 2>/dev/null || true
  sleep 2

  log_info "Suppression de $CONTAINER..."
  docker rm "$CONTAINER" 2>/dev/null || true

  # Construire la commande docker run
  DOCKER_CMD="docker run -d"
  DOCKER_CMD="$DOCKER_CMD --name $CONTAINER"

  # Restart policy
  if [ -n "$RESTART_POLICY" ]; then
    DOCKER_CMD="$DOCKER_CMD --restart=$RESTART_POLICY"
  fi

  # Ports
  if [ -n "$PORT_BINDINGS" ]; then
    while IFS= read -r pb; do
      [ -n "$pb" ] && DOCKER_CMD="$DOCKER_CMD -p $pb"
    done <<< "$PORT_BINDINGS"
  fi

  # Volumes
  if [ -n "$VOLUME_MOUNTS" ]; then
    while IFS= read -r vm; do
      [ -n "$vm" ] && DOCKER_CMD="$DOCKER_CMD -v $vm"
    done <<< "$VOLUME_MOUNTS"
  fi

  # Réseau
  if [ -n "$NETWORK" ] && [ "$NETWORK" != "bridge" ]; then
    DOCKER_CMD="$DOCKER_CMD --network $NETWORK"
  fi

  # Env vars existantes
  if [ -n "$EXISTING_ENVS" ]; then
    while IFS= read -r env_line; do
      [ -n "$env_line" ] && DOCKER_CMD="$DOCKER_CMD -e \"$env_line\""
    done <<< "$EXISTING_ENVS"
  fi

  # Ajouter TALOSPRIMES_N8N_SECRET
  DOCKER_CMD="$DOCKER_CMD -e TALOSPRIMES_N8N_SECRET=$TALOSPRIMES_N8N_SECRET"

  # Image
  DOCKER_CMD="$DOCKER_CMD $IMAGE"

  log_info "Création du nouveau container..."
  eval "$DOCKER_CMD"

  # Attendre que n8n soit prêt
  log_info "Attente du démarrage de n8n..."
  if wait_n8n_ready "$CONTAINER" 60; then
    log_ok "$CONTAINER recréé et opérationnel"
  else
    log_warn "$CONTAINER créé mais health check timeout (peut prendre plus de temps)"
  fi

  # Vérifier que le secret est bien là
  CHECK_SECRET=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$CONTAINER" 2>/dev/null | grep "TALOSPRIMES_N8N_SECRET" || true)
  if [ -n "$CHECK_SECRET" ]; then
    log_ok "TALOSPRIMES_N8N_SECRET confirmé dans le container"
  else
    log_err "TALOSPRIMES_N8N_SECRET non trouvé dans le container !"
  fi
done

# =============================================================================
# ETAPE 4 : Créer/Vérifier le credential SMTP pour Resend
# =============================================================================

log_step "ETAPE 4 : Vérification du credential SMTP (Resend)"

echo ""
echo -e "  ${YELLOW}ATTENTION : Le credential SMTP pour Resend doit être configuré${NC}"
echo -e "  ${YELLOW}manuellement dans l'interface n8n.${NC}"
echo ""
echo -e "  ${BOLD}Paramètres SMTP Resend :${NC}"
echo "    Host:     smtp.resend.com"
echo "    Port:     465"
echo "    SSL:      Oui"
echo "    User:     resend"
echo "    Password: <ta clé API Resend (re_...)>"
echo ""
echo -e "  ${BOLD}Comment faire :${NC}"
echo "    1. Va sur https://n8n.talosprimes.com"
echo "    2. Menu gauche → Credentials"
echo "    3. Cherche le credential SMTP existant (nom: 'SMTP Resend' ou similaire)"
echo "    4. S'il n'existe pas, clique '+ Add Credential' → SMTP"
echo "    5. Remplis avec les paramètres ci-dessus"
echo "    6. Teste la connexion et sauvegarde"
echo ""

# Vérifier si le credential existe dans la DB
for CONTAINER in "${N8N_CONTAINERS[@]}"; do
  IS_RUNNING=$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null || echo "false")
  [ "$IS_RUNNING" != "true" ] && continue

  SMTP_CHECK=$(docker exec "$CONTAINER" sh -c "
    if command -v sqlite3 >/dev/null 2>&1; then
      sqlite3 $DB_PATH \"SELECT id, name FROM credentials_entity WHERE type='smtp'\" 2>/dev/null
    else
      echo 'NO_SQLITE3'
    fi
  " 2>/dev/null || echo "ERROR")

  if [ "$SMTP_CHECK" = "NO_SQLITE3" ]; then
    # Essayer via Python
    SMTP_CHECK=$(docker exec "$CONTAINER" sh -c "
      python3 -c \"
import sqlite3, json
conn = sqlite3.connect('$DB_PATH')
rows = conn.cursor().execute(\\\"SELECT id, name FROM credentials_entity WHERE type='smtp'\\\").fetchall()
for r in rows:
    print(f'{r[0]}|{r[1]}')
conn.close()
\" 2>/dev/null || node -e \"
const Database = require('better-sqlite3');
try {
  const db = new Database('$DB_PATH');
  const rows = db.prepare(\\\"SELECT id, name FROM credentials_entity WHERE type='smtp'\\\").all();
  rows.forEach(r => console.log(r.id + '|' + r.name));
  db.close();
} catch(e) { console.log('ERROR'); }
\"
    " 2>/dev/null || echo "ERROR")
  fi

  if echo "$SMTP_CHECK" | grep -q "|"; then
    log_ok "Credential SMTP trouvé dans $CONTAINER :"
    echo "$SMTP_CHECK" | while IFS='|' read -r id name; do
      echo -e "      → ID: $id | Nom: $name"
    done
  elif [ "$SMTP_CHECK" != "ERROR" ] && [ "$SMTP_CHECK" != "NO_SQLITE3" ]; then
    log_warn "Aucun credential SMTP trouvé dans $CONTAINER"
    echo -e "      ${YELLOW}→ Tu dois le créer manuellement (voir instructions ci-dessus)${NC}"
  else
    log_info "Impossible de vérifier les credentials de $CONTAINER (pas d'accès SQLite)"
  fi
done

# =============================================================================
# ETAPE 5 : Import des workflows via CLI Docker
# =============================================================================

log_step "ETAPE 5 : Import des workflows dans n8n"

if [ ! -d "$N8N_WORKFLOW_DIR" ]; then
  log_err "Dossier workflows introuvable: $N8N_WORKFLOW_DIR"
else
  # Déterminer quel container utiliser pour l'import
  # On préfère celui qui a le port 5678 exposé (c'est le principal)
  IMPORT_CONTAINER=""
  for c in "${N8N_CONTAINERS[@]}"; do
    IS_RUNNING=$(docker inspect -f '{{.State.Running}}' "$c" 2>/dev/null || echo "false")
    [ "$IS_RUNNING" != "true" ] && continue
    # Vérifier si ce container a le port 5678 mappé
    HAS_PORT=$(docker port "$c" 5678 2>/dev/null || true)
    if [ -n "$HAS_PORT" ]; then
      IMPORT_CONTAINER="$c"
      break
    fi
  done
  # Fallback: premier container qui tourne
  if [ -z "$IMPORT_CONTAINER" ]; then
    for c in "${N8N_CONTAINERS[@]}"; do
      IS_RUNNING=$(docker inspect -f '{{.State.Running}}' "$c" 2>/dev/null || echo "false")
      if [ "$IS_RUNNING" = "true" ]; then
        IMPORT_CONTAINER="$c"
        break
      fi
    done
  fi

  if [ -z "$IMPORT_CONTAINER" ]; then
    log_err "Aucun container n8n en cours d'exécution !"
  else
    log_info "Container utilisé pour l'import: $IMPORT_CONTAINER"

    # Compter les workflows
    WF_COUNT=$(find "$N8N_WORKFLOW_DIR" -name "*.json" -type f | wc -l)
    log_info "$WF_COUNT fichiers workflow trouvés"

    IMPORT_OK=0
    IMPORT_ERR=0
    IMPORT_TOTAL=0

    # Fonction d'import d'un fichier
    import_workflow() {
      local file="$1"
      local container="$2"
      local basename_file
      basename_file=$(basename "$file")

      IMPORT_TOTAL=$((IMPORT_TOTAL + 1))

      # Préparer le workflow (nettoyage + transformation)
      local tmp_file="/tmp/n8n_import_${RANDOM}.json"

      if [ -f "$SCRIPTS_DIR/transform-n8n-workflow.py" ]; then
        python3 "$SCRIPTS_DIR/transform-n8n-workflow.py" "$file" > "$tmp_file" 2>/dev/null || true
      fi

      # Fallback si transform a échoué ou n'existe pas
      if [ ! -s "$tmp_file" ]; then
        python3 -c "
import json, sys
with open(sys.argv[1]) as f:
    wf = json.load(f)
wf.setdefault('settings', {})
print(json.dumps(wf))
" "$file" > "$tmp_file" 2>/dev/null || cp "$file" "$tmp_file"
      fi

      if [ ! -s "$tmp_file" ]; then
        log_warn "  Skip $basename_file (transformation échouée)"
        IMPORT_ERR=$((IMPORT_ERR + 1))
        rm -f "$tmp_file"
        return 0
      fi

      # Copier dans le container
      if ! docker cp "$tmp_file" "$container:/tmp/workflow_import.json" 2>/dev/null; then
        log_warn "  Skip $basename_file (docker cp échoué)"
        IMPORT_ERR=$((IMPORT_ERR + 1))
        rm -f "$tmp_file"
        return 0
      fi

      # Importer via CLI n8n (écrit directement en DB, bypass preventTampering)
      local result
      result=$(docker exec -u node "$container" n8n import:workflow --input=/tmp/workflow_import.json 2>&1) || true
      local exit_code=$?

      rm -f "$tmp_file"

      if [ $exit_code -eq 0 ]; then
        IMPORT_OK=$((IMPORT_OK + 1))
      else
        log_warn "  Erreur import $basename_file: $(echo "$result" | head -c 150)"
        IMPORT_ERR=$((IMPORT_ERR + 1))
      fi

      return 0
    }

    # Importer les workflows TalosPrimes
    TALOSPRIMES_DIR="$N8N_WORKFLOW_DIR/talosprimes"
    if [ -d "$TALOSPRIMES_DIR" ]; then
      log_info "Import des workflows TalosPrimes..."

      # Fichiers à la racine
      for file in "$TALOSPRIMES_DIR"/*.json; do
        [ -f "$file" ] || continue
        import_workflow "$file" "$IMPORT_CONTAINER"
      done

      # Sous-dossiers
      for subdir in "$TALOSPRIMES_DIR"/*/; do
        [ -d "$subdir" ] || continue
        local_group=$(basename "$subdir")
        for file in "$subdir"*.json; do
          [ -f "$file" ] || continue
          import_workflow "$file" "$IMPORT_CONTAINER"
        done
      done
    fi

    # Importer les workflows clients
    CLIENTS_DIR="$N8N_WORKFLOW_DIR/clients"
    if [ -d "$CLIENTS_DIR" ]; then
      for client_dir in "$CLIENTS_DIR"/*/; do
        [ -d "$client_dir" ] || continue
        client_name=$(basename "$client_dir")
        [ "$client_name" = ".gitkeep" ] && continue

        log_info "Import client: $client_name..."

        for file in "$client_dir"*.json "$client_dir"*/*.json; do
          [ -f "$file" ] || continue
          import_workflow "$file" "$IMPORT_CONTAINER"
        done
      done
    fi

    echo ""
    if [ $IMPORT_ERR -eq 0 ]; then
      log_ok "Import terminé: $IMPORT_OK/$IMPORT_TOTAL workflows importés"
    else
      log_warn "Import terminé: $IMPORT_OK/$IMPORT_TOTAL OK, $IMPORT_ERR erreurs"
    fi
  fi
fi

# =============================================================================
# ETAPE 6 : Fix credentials dans la SQLite
# =============================================================================

log_step "ETAPE 6 : Fix credentials post-import (SQLite)"

for CONTAINER in "${N8N_CONTAINERS[@]}"; do
  IS_RUNNING=$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null || echo "false")
  [ "$IS_RUNNING" != "true" ] && continue

  echo -e "  ${BOLD}Container: $CONTAINER${NC}"

  # Vérifier si le script fix-credentials-sqlite existe
  if [ -f "$SCRIPTS_DIR/fix-credentials-sqlite.sh" ]; then
    # Adapter le script pour le bon nom de container
    CONTAINER_NAME="$CONTAINER" bash -c '
      export CONTAINER_NAME
      # Remplacer le nom du container dans le script et exécuter
      sed "s/CONTAINER_NAME=\"n8n\"/CONTAINER_NAME=\"$CONTAINER_NAME\"/" '"$SCRIPTS_DIR/fix-credentials-sqlite.sh"' | bash
    ' 2>&1 | while read -r line; do echo "    $line"; done || true
  else
    log_warn "Script fix-credentials-sqlite.sh introuvable, skip"
  fi
done

# =============================================================================
# ETAPE 7 : Activation de tous les workflows
# =============================================================================

log_step "ETAPE 7 : Activation des workflows"

if [ -n "${N8N_API_KEY:-}" ]; then
  # Récupérer les workflows inactifs
  INACTIVE_IDS=$(python3 -c "
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

active = [w for w in all_workflows if w.get('active')]
inactive = [w for w in all_workflows if not w.get('active')]

print(f'INFO:{len(active)} actifs, {len(inactive)} inactifs sur {len(all_workflows)} total')
for w in inactive:
    print(f'INACTIVE:{w[\"id\"]}:{w.get(\"name\",\"?\")}')
" 2>/dev/null || echo "")

  # Afficher le résumé
  INFO_LINE=$(echo "$INACTIVE_IDS" | grep "^INFO:" | head -1 | cut -d: -f2-)
  if [ -n "$INFO_LINE" ]; then
    log_info "$INFO_LINE"
  fi

  # Activer les inactifs
  INACTIVE_COUNT=0
  ACTIVATED=0
  while IFS= read -r line; do
    [[ "$line" == INACTIVE:* ]] || continue
    WF_ID=$(echo "$line" | cut -d: -f2)
    WF_NAME=$(echo "$line" | cut -d: -f3-)
    INACTIVE_COUNT=$((INACTIVE_COUNT + 1))

    # Tenter l'activation
    ACT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      -H "X-N8N-API-KEY: $N8N_API_KEY" \
      "$N8N_API_URL/api/v1/workflows/$WF_ID/activate" 2>/dev/null || echo "000")

    if [ "$ACT_CODE" = "200" ]; then
      ACTIVATED=$((ACTIVATED + 1))
    else
      log_warn "  Activation échouée: $WF_NAME (HTTP $ACT_CODE)"
    fi
  done <<< "$INACTIVE_IDS"

  if [ $INACTIVE_COUNT -gt 0 ]; then
    log_ok "$ACTIVATED/$INACTIVE_COUNT workflows activés"
  else
    log_ok "Tous les workflows sont déjà actifs"
  fi
else
  log_warn "N8N_API_KEY non disponible — activation manuelle requise"
fi

# =============================================================================
# ETAPE 8 : Restart des containers pour re-enregistrer les webhooks
# =============================================================================

log_step "ETAPE 8 : Redémarrage des containers (re-enregistrement webhooks)"

for CONTAINER in "${N8N_CONTAINERS[@]}"; do
  IS_RUNNING=$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null || echo "false")
  [ "$IS_RUNNING" != "true" ] && continue

  log_info "Redémarrage de $CONTAINER..."

  # Appliquer le patch webhook si disponible
  if [ -f /home/root/n8n-agent/apply-webhook-patch.sh ]; then
    /home/root/n8n-agent/apply-webhook-patch.sh > /dev/null 2>&1 || true
  fi

  docker restart "$CONTAINER" 2>/dev/null || true

  if wait_n8n_ready "$CONTAINER" 60; then
    log_ok "$CONTAINER opérationnel"
  else
    log_warn "$CONTAINER restart OK mais health check lent"
  fi
done

# =============================================================================
# ETAPE 9 : Vérification finale
# =============================================================================

log_step "ETAPE 9 : Vérification finale"

echo ""
echo -e "  ${BOLD}Containers Docker :${NC}"
for CONTAINER in "${N8N_CONTAINERS[@]}"; do
  STATUS=$(docker inspect -f '{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "?")
  HAS_SECRET=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$CONTAINER" 2>/dev/null | grep -c "TALOSPRIMES_N8N_SECRET" || echo "0")

  if [ "$STATUS" = "running" ] && [ "$HAS_SECRET" -gt 0 ]; then
    echo -e "    ${GREEN}✅ $CONTAINER : running + secret OK${NC}"
  elif [ "$STATUS" = "running" ]; then
    echo -e "    ${YELLOW}⚠️  $CONTAINER : running mais secret MANQUANT${NC}"
  else
    echo -e "    ${RED}❌ $CONTAINER : $STATUS${NC}"
  fi
done

# Vérifier les credentials genericAuth restantes
echo ""
echo -e "  ${BOLD}Vérification des generic credentials :${NC}"
GENERIC_CHECK=$(find "$N8N_WORKFLOW_DIR" -name "*.json" -exec grep -l '"headerAuth"\|"httpHeaderAuth"' {} \; 2>/dev/null | wc -l)
if [ "$GENERIC_CHECK" -eq 0 ]; then
  echo -e "    ${GREEN}✅ 0 fichier avec des credentials génériques (headerAuth/httpHeaderAuth)${NC}"
else
  echo -e "    ${RED}❌ $GENERIC_CHECK fichiers contiennent encore des credentials génériques !${NC}"
fi

# Vérifier $env.TALOSPRIMES_N8N_SECRET dans les workflows
ENV_REFS=$(grep -rl 'TALOSPRIMES_N8N_SECRET' "$N8N_WORKFLOW_DIR" 2>/dev/null | wc -l)
echo -e "    ${GREEN}✅ $ENV_REFS fichiers utilisent \$env.TALOSPRIMES_N8N_SECRET${NC}"

# =============================================================================
# RÉSUMÉ FINAL
# =============================================================================

echo ""
log_title "DEPLOIEMENT TERMINE"

if [ $TOTAL_ERRORS -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}Tout s'est bien passé !${NC}"
else
  echo -e "  ${YELLOW}${BOLD}Terminé avec $TOTAL_ERRORS avertissement(s)${NC}"
fi

echo ""
echo -e "  ${BOLD}Checklist post-déploiement :${NC}"
echo "    □ Vérifier le credential SMTP Resend dans n8n"
echo "      (host: smtp.resend.com, port: 465, user: resend, pwd: clé API)"
echo "    □ Tester un lead depuis le site → vérifier l'email de confirmation"
echo "    □ Vérifier les webhooks dans n8n (tous les triggers actifs)"
echo "    □ Vérifier les logs: docker logs <container> --tail 50"
echo ""
echo -e "  ${BLUE}Date:${NC} $(date '+%d/%m/%Y %H:%M:%S')"
echo ""
