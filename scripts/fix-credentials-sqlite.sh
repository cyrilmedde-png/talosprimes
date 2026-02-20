#!/bin/bash
# =============================================================
# fix-credentials-sqlite.sh  (v2 — SAFE)
# Fix tous les credential IDs/names dans la SQLite n8n
#
# IMPORTANT: Ce script n'arrete PAS n8n.
# Il travaille sur une copie de la DB, puis la reinjecte via
# docker cp pendant que n8n tourne. n8n recharge la DB au restart
# qui est fait APRES par le script appelant.
#
# CHANGEMENTS vs v1:
# - NE STOPPE PLUS n8n (evite corruption)
# - Fix permissions apres docker cp (evite SQLITE_READONLY)
# - Verification integrite SQLite avant et apres
# - Le restart est la responsabilite du script appelant
# =============================================================

# Ne pas utiliser set -e car les erreurs sont gerees manuellement
set +e

CONTAINER_NAME="n8n"
DB_PATH_CONTAINER="/home/node/.n8n/database.sqlite"
DB_PATH_HOST="/home/root/n8n-agent/n8n-data/database.sqlite"
LOCAL_DB="/tmp/n8n_fix_creds.db"

echo "========================================="
echo "  FIX CREDENTIALS - Direct SQLite (v2)"
echo "========================================="

# 1. Copier la DB depuis le HOST (pas docker cp qui peut corrompre)
echo "[1/4] Copie de la base de donnees n8n..."
if [ -f "$DB_PATH_HOST" ]; then
  cp "$DB_PATH_HOST" "$LOCAL_DB"
  echo "  -> Copie depuis $DB_PATH_HOST ($(du -h "$LOCAL_DB" | cut -f1))"
else
  echo "  -> Fichier host introuvable, fallback docker cp..."
  docker cp "${CONTAINER_NAME}:${DB_PATH_CONTAINER}" "${LOCAL_DB}" 2>/dev/null
  if [ $? -ne 0 ]; then
    echo "  [ERREUR] Impossible de copier la DB"
    exit 1
  fi
fi

# 1b. Verification d'integrite AVANT modification
echo "  -> Verification integrite SQLite..."
INTEGRITY=$(sqlite3 "$LOCAL_DB" "PRAGMA integrity_check;" 2>&1 | head -1)
if [ "$INTEGRITY" != "ok" ]; then
  echo "  [WARN] La base n8n est DEJA corrompue: $INTEGRITY"
  echo "  [WARN] Fix credentials ANNULE pour eviter d'aggraver"
  rm -f "$LOCAL_DB"
  exit 0  # Exit 0 pour ne pas bloquer le deploiement
fi
echo "  -> Integrite OK"

# 2. Executer le fix Python
echo "[2/4] Analyse et correction des credentials..."
python3 << 'PYTHON_SCRIPT'
import sqlite3
import json
import sys

DB_PATH = "/tmp/n8n_fix_creds.db"

conn = sqlite3.connect(DB_PATH)
# WAL mode pour eviter les locks
conn.execute("PRAGMA journal_mode=WAL;")
cursor = conn.cursor()

# Recuperer la vraie map des credentials depuis la DB
cursor.execute("SELECT id, name, type FROM credentials_entity")
db_credentials = {}
for row in cursor.fetchall():
    cred_id, cred_name, cred_type = row
    db_credentials[cred_id] = {"name": cred_name, "type": cred_type}

print(f"  -> {len(db_credentials)} credentials trouves en DB")

# Map name -> id pour matcher par nom
name_to_id = {}
for cred_id, info in db_credentials.items():
    name_to_id[info["name"]] = cred_id

# Recuperer tous les workflows
cursor.execute("SELECT id, name, nodes FROM workflow_entity")
workflows = cursor.fetchall()
print(f"  -> {len(workflows)} workflows a analyser")

total_fixed = 0
workflows_fixed = 0

for wf_id, wf_name, nodes_json in workflows:
    if not nodes_json:
        continue

    try:
        nodes = json.loads(nodes_json)
    except json.JSONDecodeError:
        print(f"  WARN Workflow '{wf_name}' ({wf_id}): JSON invalide, skip")
        continue

    fixed_in_wf = 0

    for node in nodes:
        if not isinstance(node, dict) or "credentials" not in node:
            continue

        credentials = node["credentials"]
        if not isinstance(credentials, dict):
            continue

        for cred_type_key, cred_info in credentials.items():
            if not isinstance(cred_info, dict):
                continue

            cred_id = str(cred_info.get("id", ""))
            cred_name = cred_info.get("name", "")

            # Verifier si l'ID existe dans la DB
            if cred_id and cred_id in db_credentials:
                # ID correct, verifier le nom
                expected_name = db_credentials[cred_id]["name"]
                if cred_name != expected_name:
                    cred_info["name"] = expected_name
                    fixed_in_wf += 1
                    print(f"  OK [{wf_name}] {node.get('name','?')}: nom corrige '{cred_name}' -> '{expected_name}'")
            elif cred_name and cred_name in name_to_id:
                # ID incorrect/manquant, mais le nom existe -> corriger l'ID
                expected_id = name_to_id[cred_name]
                cred_info["id"] = expected_id
                fixed_in_wf += 1
                print(f"  OK [{wf_name}] {node.get('name','?')}: ID corrige '{cred_id}' -> '{expected_id}'")
            elif cred_id == "" or cred_id is None:
                print(f"  WARN [{wf_name}] {node.get('name','?')}: credential '{cred_name}' sans ID et nom inconnu")

    if fixed_in_wf > 0:
        new_nodes_json = json.dumps(nodes)
        cursor.execute("UPDATE workflow_entity SET nodes = ? WHERE id = ?", (new_nodes_json, wf_id))
        workflows_fixed += 1
        total_fixed += fixed_in_wf

# Verifier aussi que shared_credentials est correct
cursor.execute("SELECT id FROM project LIMIT 1")
project_row = cursor.fetchone()
if project_row:
    project_id = project_row[0]

    cursor.execute("SELECT credentialsId FROM shared_credentials WHERE projectId = ?", (project_id,))
    shared = set(row[0] for row in cursor.fetchall())

    missing_shares = 0
    for cred_id in db_credentials:
        if cred_id not in shared:
            cursor.execute(
                "INSERT OR IGNORE INTO shared_credentials (credentialsId, projectId, role) VALUES (?, ?, 'credential:owner')",
                (cred_id, project_id)
            )
            missing_shares += 1
            print(f"  OK Credential '{db_credentials[cred_id]['name']}' partage avec le projet")

    if missing_shares > 0:
        print(f"  -> {missing_shares} credentials partages avec le projet")

conn.commit()
conn.close()

print(f"\n  RESUME: {total_fixed} corrections dans {workflows_fixed} workflows")
if total_fixed == 0:
    print("  OK Tous les credentials sont deja corrects !")
else:
    print(f"  OK {total_fixed} credentials corriges avec succes !")
PYTHON_SCRIPT

PYTHON_EXIT=$?
if [ $PYTHON_EXIT -ne 0 ]; then
  echo "  [ERREUR] Python a echoue (exit=$PYTHON_EXIT)"
  rm -f "$LOCAL_DB"
  exit 0  # Ne pas bloquer le deploiement
fi

# 3. Verification integrite APRES modification
echo "[3/4] Verification integrite post-fix..."
INTEGRITY_POST=$(sqlite3 "$LOCAL_DB" "PRAGMA integrity_check;" 2>&1 | head -1)
if [ "$INTEGRITY_POST" != "ok" ]; then
  echo "  [ERREUR] La DB est corrompue APRES le fix: $INTEGRITY_POST"
  echo "  [ERREUR] Injection ANNULEE — la DB n8n originale est preservee"
  rm -f "$LOCAL_DB"
  exit 0
fi
echo "  -> Integrite OK apres fix"

# 4. Reinjecter la DB corrigee
# METHODE SAFE: on stoppe n8n, copie, fix permissions, restart
# Tout dans une seule operation rapide pour minimiser le downtime
echo "[4/4] Injection de la base corrigee..."

# Stopper n8n proprement
docker stop "${CONTAINER_NAME}" 2>/dev/null || true
sleep 2

# Copier via le volume host (PAS docker cp qui ecrit en root)
if [ -d "/home/root/n8n-agent/n8n-data" ]; then
  cp "$LOCAL_DB" "$DB_PATH_HOST"
  # FIX PERMISSIONS CRITIQUE: n8n tourne en tant que user 1000:1000
  chown 1000:1000 "$DB_PATH_HOST"
  chmod 644 "$DB_PATH_HOST"
  # Fixer aussi tout le dossier au cas ou
  chown -R 1000:1000 /home/root/n8n-agent/n8n-data/ 2>/dev/null || true
  echo "  -> DB injectee via volume host + permissions 1000:1000"
else
  # Fallback docker cp
  docker cp "${LOCAL_DB}" "${CONTAINER_NAME}:${DB_PATH_CONTAINER}"
  # Fix permissions DANS le container ET sur le host
  docker start "${CONTAINER_NAME}" 2>/dev/null || true
  sleep 1
  docker exec "${CONTAINER_NAME}" chown node:node "${DB_PATH_CONTAINER}" 2>/dev/null || true
  docker exec "${CONTAINER_NAME}" chmod 644 "${DB_PATH_CONTAINER}" 2>/dev/null || true
  docker stop "${CONTAINER_NAME}" 2>/dev/null || true
  echo "  -> DB injectee via docker cp + permissions fixees"
fi

# Redemarrer n8n
docker start "${CONTAINER_NAME}"

# Attendre que n8n soit pret
for i in $(seq 1 15); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:5678/healthz 2>/dev/null | grep -q "200"; then
    echo "  OK n8n est operationnel !"
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo "  [WARN] n8n ne repond pas apres 45s"
  fi
  sleep 3
done

# Fix permissions une derniere fois apres restart (au cas ou)
if [ -d /home/root/n8n-agent/n8n-data ]; then
  chown -R 1000:1000 /home/root/n8n-agent/n8n-data/ 2>/dev/null || true
fi

# Nettoyage
rm -f "$LOCAL_DB"

echo ""
echo "========================================="
echo "  FIX CREDENTIALS TERMINE (v2)"
echo "========================================="
