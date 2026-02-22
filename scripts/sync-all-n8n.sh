#!/bin/bash
# ==============================================
# SYNC FORCE de TOUS les workflows n8n
# Usage: bash scripts/sync-all-n8n.sh
# ==============================================

set -euo pipefail

N8N_URL="${N8N_URL:-http://localhost:5678}"
N8N_API_KEY="${N8N_API_KEY:-$(grep -oP 'N8N_API_KEY=\K.*' /var/www/talosprimes/.env 2>/dev/null || cat /home/root/n8n-agent/.env 2>/dev/null | grep -oP 'N8N_API_KEY=\K.*' || echo '')}"
WF_DIR="/var/www/talosprimes/n8n_workflows"

if [ -z "$N8N_API_KEY" ]; then
  echo "[ERREUR] N8N_API_KEY non trouvée. Export-la avant de lancer ce script."
  exit 1
fi

echo "=========================================="
echo "  SYNC FORCE - Tous les workflows n8n"
echo "=========================================="
echo "  URL: $N8N_URL"
echo "  Dir: $WF_DIR"

# Récupérer la liste des workflows existants
echo ""
echo "[INFO] Récupération des workflows existants..."
EXISTING=$(curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_URL/api/v1/workflows?limit=200" 2>/dev/null || echo '{"data":[]}')
echo "[INFO] $(echo "$EXISTING" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo '?') workflows dans n8n"

SUCCESS=0
FAIL=0
TOTAL=0

# Parcourir tous les fichiers JSON
for WF_FILE in $(find "$WF_DIR" -name "*.json" -type f | sort); do
  TOTAL=$((TOTAL + 1))
  WF_NAME=$(python3 -c "import json; print(json.load(open('$WF_FILE')).get('name',''))" 2>/dev/null)

  if [ -z "$WF_NAME" ]; then
    echo "[SKIP] $WF_FILE - pas de nom"
    continue
  fi

  # Trouver l'ID dans n8n
  WF_ID=$(echo "$EXISTING" | python3 -c "
import sys, json
data = json.load(sys.stdin).get('data', [])
for w in data:
    if w.get('name') == '$WF_NAME':
        print(w['id'])
        break
" 2>/dev/null)

  if [ -z "$WF_ID" ]; then
    echo "[SKIP] $WF_NAME - pas trouvé dans n8n (workflow nouveau?)"
    FAIL=$((FAIL + 1))
    continue
  fi

  # Transformer: ne garder que les clés autorisées
  PAYLOAD=$(python3 -c "
import json, sys
wf = json.load(open('$WF_FILE'))
allowed = {'name', 'nodes', 'connections', 'settings'}
out = {k: v for k, v in wf.items() if k in allowed}
json.dump(out, sys.stdout)
" 2>/dev/null)

  # PUT sans versionId
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PUT \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "$N8N_URL/api/v1/workflows/$WF_ID" 2>/dev/null)

  if [ "$HTTP_CODE" = "200" ]; then
    SUCCESS=$((SUCCESS + 1))
    # Print only every 10 or on error for cleaner output
    if [ $((SUCCESS % 10)) -eq 0 ]; then
      echo "[OK] $SUCCESS workflows synchés..."
    fi
  else
    echo "[ERREUR] $WF_NAME (id=$WF_ID) -> HTTP $HTTP_CODE"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "=========================================="
echo "  RÉSULTAT"
echo "=========================================="
echo "  Total:   $TOTAL"
echo "  OK:      $SUCCESS"
echo "  Erreurs: $FAIL"
echo "=========================================="

# Restart n8n pour enregistrer les webhooks
if [ $SUCCESS -gt 0 ]; then
  echo ""
  echo "[INFO] Restart n8n pour enregistrer les webhooks..."
  docker restart n8n >/dev/null 2>&1 || true
  echo "[OK] n8n redémarré"
fi
