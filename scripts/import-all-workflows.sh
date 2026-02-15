#!/bin/bash
# Import tous les workflows n8n en une seule fois via l'API REST
# Usage: bash scripts/import-all-workflows.sh

N8N_URL="${N8N_API_URL:-https://n8n.talosprimes.com}"
API_KEY="${N8N_API_KEY:-}"

if [ -z "$API_KEY" ]; then
  echo "❌ N8N_API_KEY requis. Export-le avant de lancer ce script:"
  echo "   export N8N_API_KEY=votre_cle_api"
  exit 1
fi

echo "🔗 n8n URL: $N8N_URL"
echo ""

# Récupérer la liste des workflows existants une seule fois
echo "📋 Récupération des workflows existants..."
EXISTING_WORKFLOWS=$(curl -s -H "X-N8N-API-KEY: $API_KEY" "$N8N_URL/api/v1/workflows")

TOTAL=0
SUCCESS=0
ERRORS=0

for dir in n8n_workflows/*/; do
  [ -d "$dir" ] || continue
  for file in "$dir"*.json; do
    [ -f "$file" ] || continue

    NAME=$(basename "$file" .json)
    TOTAL=$((TOTAL + 1))

    # Vérifier si le workflow existe déjà (par nom)
    EXISTING=$(echo "$EXISTING_WORKFLOWS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
workflows = data.get('data', [])
for w in workflows:
    if w.get('name') == '$NAME':
        print(w['id'])
        break
" 2>/dev/null)

    # Préparer le payload : injecter settings + nettoyer les propriétés interdites
    if [ -n "$EXISTING" ]; then
      # UPDATE : retirer active, id, createdAt, updatedAt + champs non autorisés
      PAYLOAD=$(python3 -c "
import sys, json
with open('$file') as f:
    wf = json.load(f)
if 'settings' not in wf:
    wf['settings'] = {}
# Retirer les champs read-only/non autorisés pour PUT
for k in ['active', 'id', 'createdAt', 'updatedAt', 'versionId', 'triggerCount', 'sharedWithProjects', 'homeProject', 'tags', 'meta', 'pinData', 'staticData']:
    wf.pop(k, None)
print(json.dumps(wf))
" 2>/dev/null)
    else
      # CREATE : retirer les propriétés additionnelles non autorisées
      PAYLOAD=$(python3 -c "
import sys, json
with open('$file') as f:
    wf = json.load(f)
if 'settings' not in wf:
    wf['settings'] = {}
# Retirer les champs non autorisés pour POST
for k in ['active', 'id', 'createdAt', 'updatedAt', 'versionId', 'triggerCount', 'sharedWithProjects', 'homeProject', 'tags', 'meta', 'pinData', 'staticData']:
    wf.pop(k, None)
# Ne garder que les propriétés autorisées par l'API POST
allowed = {'name', 'nodes', 'connections', 'settings', 'staticData'}
wf = {k: v for k, v in wf.items() if k in allowed}
if 'settings' not in wf:
    wf['settings'] = {}
print(json.dumps(wf))
" 2>/dev/null)
    fi

    if [ -z "$PAYLOAD" ]; then
      echo "❌ JSON invalide: $file"
      ERRORS=$((ERRORS + 1))
      continue
    fi

    if [ -n "$EXISTING" ]; then
      # Mettre à jour le workflow existant
      RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
        -H "X-N8N-API-KEY: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" \
        "$N8N_URL/api/v1/workflows/$EXISTING")

      HTTP_CODE=$(echo "$RESPONSE" | tail -1)

      if [ "$HTTP_CODE" = "200" ]; then
        # Activer le workflow
        curl -s -X POST \
          -H "X-N8N-API-KEY: $API_KEY" \
          -H "Content-Type: application/json" \
          "$N8N_URL/api/v1/workflows/$EXISTING/activate" > /dev/null 2>&1
        echo "✅ Mis à jour + activé: $NAME (id: $EXISTING)"
        SUCCESS=$((SUCCESS + 1))
      else
        BODY=$(echo "$RESPONSE" | sed '$d')
        MSG=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin).get('message',''))" 2>/dev/null)
        echo "❌ [$HTTP_CODE] Erreur update: $NAME — $MSG"
        ERRORS=$((ERRORS + 1))
      fi
    else
      # Créer un nouveau workflow
      RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "X-N8N-API-KEY: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" \
        "$N8N_URL/api/v1/workflows")

      HTTP_CODE=$(echo "$RESPONSE" | tail -1)
      BODY=$(echo "$RESPONSE" | sed '$d')

      if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        NEW_ID=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
        # Activer le workflow
        if [ -n "$NEW_ID" ]; then
          curl -s -X POST \
            -H "X-N8N-API-KEY: $API_KEY" \
            -H "Content-Type: application/json" \
            "$N8N_URL/api/v1/workflows/$NEW_ID/activate" > /dev/null 2>&1
        fi
        echo "✅ Créé + activé: $NAME (id: $NEW_ID)"
        SUCCESS=$((SUCCESS + 1))
      else
        MSG=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin).get('message',''))" 2>/dev/null)
        echo "❌ [$HTTP_CODE] Erreur create: $NAME — $MSG"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  done
done

echo ""
echo "📊 Résumé: $SUCCESS/$TOTAL réussis, $ERRORS erreurs"
