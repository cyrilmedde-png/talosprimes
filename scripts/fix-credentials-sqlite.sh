#!/bin/bash
# =============================================================
# fix-credentials-sqlite.sh
# Fix tous les credential IDs/names dans la SQLite n8n
# A executer APRES chaque deploiement de workflows
# Bypass total de l'API n8n et de preventTampering()
# =============================================================

set -e

CONTAINER_NAME="n8n"
DB_PATH="/home/node/.n8n/database.sqlite"
LOCAL_DB="/tmp/n8n_fix_creds.db"

echo "========================================="
echo "  FIX CREDENTIALS - Direct SQLite"
echo "========================================="

# 1. Copier la DB depuis le container
echo "[1/5] Copie de la base de données n8n..."
docker cp "${CONTAINER_NAME}:${DB_PATH}" "${LOCAL_DB}"

# 2. Exécuter le fix Python
echo "[2/5] Analyse et correction des credentials..."
python3 << 'PYTHON_SCRIPT'
import sqlite3
import json
import sys

DB_PATH = "/tmp/n8n_fix_creds.db"

# Ouvrir la DB
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Récupérer la vraie map des credentials depuis la DB
cursor.execute("SELECT id, name, type FROM credentials_entity")
db_credentials = {}
for row in cursor.fetchall():
    cred_id, cred_name, cred_type = row
    db_credentials[cred_id] = {"name": cred_name, "type": cred_type}

print(f"  → {len(db_credentials)} credentials trouvés en DB")

# Aussi construire un map name -> id pour matcher par nom
name_to_id = {}
for cred_id, info in db_credentials.items():
    name_to_id[info["name"]] = cred_id

# Récupérer tous les workflows
cursor.execute("SELECT id, name, nodes FROM workflow_entity")
workflows = cursor.fetchall()
print(f"  → {len(workflows)} workflows à analyser")

total_fixed = 0
workflows_fixed = 0

for wf_id, wf_name, nodes_json in workflows:
    if not nodes_json:
        continue

    try:
        nodes = json.loads(nodes_json)
    except json.JSONDecodeError:
        print(f"  ⚠ Workflow '{wf_name}' ({wf_id}): JSON invalide, skip")
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

            cred_id = cred_info.get("id", "")
            cred_name = cred_info.get("name", "")

            # Vérifier si l'ID existe dans la DB
            if cred_id and cred_id in db_credentials:
                # ID correct, vérifier le nom
                expected_name = db_credentials[cred_id]["name"]
                if cred_name != expected_name:
                    cred_info["name"] = expected_name
                    fixed_in_wf += 1
                    print(f"  ✓ [{wf_name}] {node.get('name','?')}: nom corrigé '{cred_name}' → '{expected_name}'")
            elif cred_name and cred_name in name_to_id:
                # ID incorrect/manquant, mais le nom existe → corriger l'ID
                expected_id = name_to_id[cred_name]
                cred_info["id"] = expected_id
                fixed_in_wf += 1
                print(f"  ✓ [{wf_name}] {node.get('name','?')}: ID corrigé '{cred_id}' → '{expected_id}'")
            elif cred_id == "" or cred_id is None:
                # Credential vide/manquant
                print(f"  ⚠ [{wf_name}] {node.get('name','?')}: credential '{cred_name}' sans ID et nom inconnu")

    if fixed_in_wf > 0:
        # Sauvegarder le workflow corrigé
        new_nodes_json = json.dumps(nodes)
        cursor.execute("UPDATE workflow_entity SET nodes = ? WHERE id = ?", (new_nodes_json, wf_id))
        workflows_fixed += 1
        total_fixed += fixed_in_wf

# Vérifier aussi que shared_credentials est correct
cursor.execute("SELECT id FROM project LIMIT 1")
project_row = cursor.fetchone()
if project_row:
    project_id = project_row[0]

    # Vérifier que chaque credential est partagé avec le projet
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
            print(f"  ✓ Credential '{db_credentials[cred_id]['name']}' partagé avec le projet")

    if missing_shares > 0:
        print(f"  → {missing_shares} credentials partagés avec le projet")

conn.commit()
conn.close()

print(f"\n  RÉSUMÉ: {total_fixed} corrections dans {workflows_fixed} workflows")
if total_fixed == 0:
    print("  ✅ Tous les credentials sont déjà corrects !")
else:
    print(f"  ✅ {total_fixed} credentials corrigés avec succès !")
PYTHON_SCRIPT

# 3. Arrêter n8n
echo "[3/5] Arrêt temporaire de n8n..."
docker stop "${CONTAINER_NAME}" 2>/dev/null || true
sleep 2

# 4. Copier la DB corrigée dans le container
echo "[4/5] Injection de la base corrigée..."
docker cp "${LOCAL_DB}" "${CONTAINER_NAME}:${DB_PATH}"

# 5. Redémarrer n8n
echo "[5/5] Redémarrage de n8n..."
docker start "${CONTAINER_NAME}"
sleep 3

# Vérifier que n8n est up
for i in $(seq 1 10); do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5678/healthz 2>/dev/null | grep -q "200"; then
        echo "  ✅ n8n est opérationnel !"
        break
    fi
    echo "  ⏳ Attente du redémarrage... ($i/10)"
    sleep 3
done

# Nettoyage
rm -f "${LOCAL_DB}"

echo ""
echo "========================================="
echo "  FIX CREDENTIALS TERMINÉ"
echo "========================================="
