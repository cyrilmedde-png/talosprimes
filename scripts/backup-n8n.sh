#!/bin/bash
# =============================================================
# backup-n8n.sh
# Sauvegarde complete de n8n : DB + workflows JSON + credentials
# Un seul fichier conserve (le precedent est ecrase)
#
# Usage: ./scripts/backup-n8n.sh [BACKUP_DIR]
#   BACKUP_DIR: dossier de destination (defaut: /home/root/n8n-agent/backups)
#
# Produit: n8n-backup-latest.tar.gz contenant:
#   - database.sqlite (copie brute de la DB)
#   - workflows/*.json (chaque workflow exporte en JSON via API)
#   - credentials.json (map des credentials name -> id/type)
#   - metadata.json (date, nombre de workflows, hash DB, etc.)
# =============================================================

set +e

# Configuration
CONTAINER_NAME="n8n"
DB_PATH_HOST="/home/root/n8n-agent/n8n-data/database.sqlite"
BACKUP_DIR="${1:-/home/root/n8n-agent/backups}"
BACKUP_FILE="$BACKUP_DIR/n8n-backup-latest.tar.gz"
export TMP_DIR="/tmp/n8n-backup-$$"

# Charger les variables n8n si disponibles
if [ -f "/var/www/talosprimes/packages/platform/.env" ]; then
  source /var/www/talosprimes/packages/platform/.env 2>/dev/null
fi

export N8N_API_URL="${N8N_API_URL:-http://localhost:5678}"
export N8N_API_KEY="${N8N_API_KEY:-}"

echo "========================================="
echo "  BACKUP n8n - Sauvegarde complete"
echo "========================================="
echo "  Date: $(date '+%d/%m/%Y %H:%M:%S')"

# Creer les dossiers
mkdir -p "$BACKUP_DIR"
mkdir -p "$TMP_DIR/workflows"

# ---------------------------------------------------------------
# 1. Copie de la base SQLite
# ---------------------------------------------------------------
echo ""
echo "[1/4] Copie de la base de donnees..."

if [ -f "$DB_PATH_HOST" ]; then
  # Verifier l'integrite avant de copier
  INTEGRITY=$(sqlite3 "$DB_PATH_HOST" "PRAGMA integrity_check;" 2>&1 | head -1)
  if [ "$INTEGRITY" = "ok" ]; then
    # Copie atomique via sqlite3 .backup (safe meme si n8n tourne)
    sqlite3 "$DB_PATH_HOST" ".backup '$TMP_DIR/database.sqlite'"
    if [ $? -eq 0 ]; then
      # Verifier integrite de la copie
      COPY_INTEGRITY=$(sqlite3 "$TMP_DIR/database.sqlite" "PRAGMA integrity_check;" 2>&1 | head -1)
      if [ "$COPY_INTEGRITY" = "ok" ]; then
        DB_SIZE=$(du -h "$TMP_DIR/database.sqlite" | cut -f1)
        DB_HASH=$(md5sum "$TMP_DIR/database.sqlite" | cut -d' ' -f1)
        echo "  -> DB copiee via sqlite3 .backup ($DB_SIZE, integrite OK)"
      else
        echo "  [WARN] Copie corrompue malgre .backup — retry avec cp"
        cp "$DB_PATH_HOST" "$TMP_DIR/database.sqlite"
        DB_SIZE=$(du -h "$TMP_DIR/database.sqlite" | cut -f1)
        DB_HASH="COPY_ISSUE"
      fi
    else
      echo "  [WARN] sqlite3 .backup echoue — fallback cp"
      cp "$DB_PATH_HOST" "$TMP_DIR/database.sqlite"
      DB_SIZE=$(du -h "$TMP_DIR/database.sqlite" | cut -f1)
      DB_HASH=$(md5sum "$TMP_DIR/database.sqlite" | cut -d' ' -f1)
    fi
  else
    echo "  [WARN] DB corrompue ($INTEGRITY) — copie quand meme"
    cp "$DB_PATH_HOST" "$TMP_DIR/database.sqlite"
    DB_SIZE=$(du -h "$TMP_DIR/database.sqlite" | cut -f1)
    DB_HASH="CORRUPT"
  fi
else
  # Fallback docker cp
  docker cp "${CONTAINER_NAME}:/home/node/.n8n/database.sqlite" "$TMP_DIR/database.sqlite" 2>/dev/null
  if [ $? -eq 0 ]; then
    DB_SIZE=$(du -h "$TMP_DIR/database.sqlite" | cut -f1)
    DB_HASH=$(md5sum "$TMP_DIR/database.sqlite" | cut -d' ' -f1)
    echo "  -> DB copiee via docker cp ($DB_SIZE)"
  else
    echo "  [ERREUR] Impossible de copier la DB"
    DB_SIZE="0"
    DB_HASH="MISSING"
  fi
fi

# ---------------------------------------------------------------
# 2. Export des workflows via API
# ---------------------------------------------------------------
echo ""
echo "[2/4] Export des workflows via API..."

WF_COUNT=0
WF_ACTIVE=0
WF_EXPORT_OK=0

if [ -n "$N8N_API_KEY" ]; then
  # Verifier que n8n repond
  HTTP_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$N8N_API_URL/healthz" 2>/dev/null)

  if [ "$HTTP_CHECK" = "200" ]; then
    # Exporter via Python (gestion pagination + details complets)
    python3 << 'PYTHON_EXPORT'
import json, urllib.request, os, sys

api_url = os.environ.get('N8N_API_URL', 'http://localhost:5678')
api_key = os.environ.get('N8N_API_KEY', '')
tmp_dir = os.environ.get('TMP_DIR', '/tmp/n8n-backup')

# Recuperer tous les workflows (avec pagination)
all_workflows = []
cursor = ''
for _ in range(50):
    url = f'{api_url}/api/v1/workflows?limit=250'
    if cursor:
        url += f'&cursor={cursor}'
    req = urllib.request.Request(url, headers={'X-N8N-API-KEY': api_key})
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read())
    except Exception as e:
        print(f'  [ERREUR] API: {e}', file=sys.stderr)
        break
    wfs = data.get('data', [])
    all_workflows.extend(wfs)
    cursor = data.get('nextCursor', '')
    if not cursor or not wfs:
        break

total = len(all_workflows)
active = len([w for w in all_workflows if w.get('active')])
exported = 0

print(f'  -> {total} workflows trouves ({active} actifs)')

# Exporter chaque workflow en detail
for wf in all_workflows:
    wf_id = wf.get('id', '')
    if not wf_id:
        continue
    try:
        req = urllib.request.Request(f'{api_url}/api/v1/workflows/{wf_id}',
            headers={'X-N8N-API-KEY': api_key})
        resp = urllib.request.urlopen(req, timeout=15)
        full_wf = json.loads(resp.read())

        # Sauvegarder en JSON
        filepath = os.path.join(tmp_dir, 'workflows', f'{wf_id}.json')
        with open(filepath, 'w') as f:
            json.dump(full_wf, f, indent=2)
        exported += 1
    except Exception as e:
        print(f'  [WARN] Export {wf_id} echoue: {e}')

print(f'  -> {exported}/{total} workflows exportes')

# Ecrire les compteurs pour le script bash
with open(os.path.join(tmp_dir, '.counts'), 'w') as f:
    f.write(f'{total}\n{active}\n{exported}\n')
PYTHON_EXPORT

    # Recuperer les compteurs
    if [ -f "$TMP_DIR/.counts" ]; then
      WF_COUNT=$(sed -n '1p' "$TMP_DIR/.counts")
      WF_ACTIVE=$(sed -n '2p' "$TMP_DIR/.counts")
      WF_EXPORT_OK=$(sed -n '3p' "$TMP_DIR/.counts")
      rm -f "$TMP_DIR/.counts"
    fi
  else
    echo "  [WARN] n8n ne repond pas (HTTP $HTTP_CHECK) — export API impossible"

    # Fallback: extraire depuis SQLite
    if [ -f "$TMP_DIR/database.sqlite" ] && [ "$DB_HASH" != "MISSING" ]; then
      echo "  -> Fallback: extraction depuis SQLite..."
      python3 << 'PYTHON_SQLITE_EXPORT'
import sqlite3, json, os, sys

tmp_dir = os.environ.get('TMP_DIR', '/tmp/n8n-backup')
db_path = os.path.join(tmp_dir, 'database.sqlite')

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, active, nodes, connections, settings, staticData FROM workflow_entity")
    rows = cursor.fetchall()
    conn.close()

    exported = 0
    for row in rows:
        wf_id, name, active, nodes_json, conn_json, settings_json, static_json = row
        try:
            wf = {
                'id': wf_id,
                'name': name,
                'active': bool(active),
                'nodes': json.loads(nodes_json) if nodes_json else [],
                'connections': json.loads(conn_json) if conn_json else {},
                'settings': json.loads(settings_json) if settings_json else {},
                'staticData': json.loads(static_json) if static_json else None,
            }
            filepath = os.path.join(tmp_dir, 'workflows', f'{wf_id}.json')
            with open(filepath, 'w') as f:
                json.dump(wf, f, indent=2)
            exported += 1
        except:
            pass

    total = len(rows)
    active_count = len([r for r in rows if r[2]])
    print(f'  -> {exported}/{total} workflows extraits depuis SQLite')

    with open(os.path.join(tmp_dir, '.counts'), 'w') as f:
        f.write(f'{total}\n{active_count}\n{exported}\n')
except Exception as e:
    print(f'  [ERREUR] SQLite: {e}')
PYTHON_SQLITE_EXPORT

      if [ -f "$TMP_DIR/.counts" ]; then
        WF_COUNT=$(sed -n '1p' "$TMP_DIR/.counts")
        WF_ACTIVE=$(sed -n '2p' "$TMP_DIR/.counts")
        WF_EXPORT_OK=$(sed -n '3p' "$TMP_DIR/.counts")
        rm -f "$TMP_DIR/.counts"
      fi
    fi
  fi
else
  echo "  [WARN] N8N_API_KEY non defini — export API impossible"
fi

# ---------------------------------------------------------------
# 3. Export des credentials
# ---------------------------------------------------------------
echo ""
echo "[3/4] Export des credentials..."

CRED_COUNT=0
if [ -f "$TMP_DIR/database.sqlite" ] && [ "$DB_HASH" != "MISSING" ]; then
  python3 << 'PYTHON_CREDS'
import sqlite3, json, os

tmp_dir = os.environ.get('TMP_DIR', '/tmp/n8n-backup')
db_path = os.path.join(tmp_dir, 'database.sqlite')

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, type FROM credentials_entity")
    rows = cursor.fetchall()
    conn.close()

    creds = []
    for cred_id, name, cred_type in rows:
        creds.append({'id': cred_id, 'name': name, 'type': cred_type})

    filepath = os.path.join(tmp_dir, 'credentials.json')
    with open(filepath, 'w') as f:
        json.dump(creds, f, indent=2)

    print(f'  -> {len(creds)} credentials sauvegardees')

    with open(os.path.join(tmp_dir, '.cred_count'), 'w') as f:
        f.write(str(len(creds)))
except Exception as e:
    print(f'  [ERREUR] {e}')
PYTHON_CREDS

  if [ -f "$TMP_DIR/.cred_count" ]; then
    CRED_COUNT=$(cat "$TMP_DIR/.cred_count")
    rm -f "$TMP_DIR/.cred_count"
  fi
else
  echo "  [WARN] Pas de DB disponible — credentials non exportees"
fi

# ---------------------------------------------------------------
# 4. Metadata + compression
# ---------------------------------------------------------------
echo ""
echo "[4/4] Creation de l'archive..."

# Ecrire les metadonnees
cat > "$TMP_DIR/metadata.json" << METADATA_EOF
{
  "date": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "date_local": "$(date '+%d/%m/%Y %H:%M:%S')",
  "hostname": "$(hostname)",
  "db_size": "$DB_SIZE",
  "db_hash": "$DB_HASH",
  "workflows_total": $WF_COUNT,
  "workflows_active": $WF_ACTIVE,
  "workflows_exported": $WF_EXPORT_OK,
  "credentials_count": $CRED_COUNT,
  "n8n_version": "$(docker exec $CONTAINER_NAME n8n --version 2>/dev/null || echo 'unknown')",
  "backup_script_version": "2.0"
}
METADATA_EOF

# Compresser — ecrase le precedent
tar -czf "$BACKUP_FILE" -C "$TMP_DIR" . 2>/dev/null
ARCHIVE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

# Nettoyage
rm -rf "$TMP_DIR"

echo "  -> Archive: $BACKUP_FILE ($ARCHIVE_SIZE)"

# Resume
echo ""
echo "========================================="
echo "  BACKUP TERMINE"
echo "========================================="
echo "  Fichier  : $BACKUP_FILE"
echo "  Taille   : $ARCHIVE_SIZE"
echo "  DB       : $DB_SIZE (hash: ${DB_HASH:0:12}...)"
echo "  Workflows: $WF_EXPORT_OK/$WF_COUNT exportes ($WF_ACTIVE actifs)"
echo "  Creds    : $CRED_COUNT"
echo "  Date     : $(date '+%d/%m/%Y %H:%M:%S')"
echo "========================================="
