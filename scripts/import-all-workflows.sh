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
    EXISTING=$(curl -s -H "X-N8N-API-KEY: $API_KEY" \
      "$N8N_URL/api/v1/workflows" | \
      python3 -c "
import sys, json
data = json.load(sys.stdin)
workflows = data.get('data', [])
for w in workflows:
    if w.get('name') == '$NAME':
        print(w['id'])
        break
" 2>/dev/null)
    
    if [ -n "$EXISTING" ]; then
      # Mettre à jour le workflow existant
      RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
        -H "X-N8N-API-KEY: $API_KEY" \
        -H "Content-Type: application/json" \
        -d @"$file" \
        "$N8N_URL/api/v1/workflows/$EXISTING")
      
      HTTP_CODE=$(echo "$RESPONSE" | tail -1)
      
      if [ "$HTTP_CODE" = "200" ]; then
        # Activer le workflow
        curl -s -X POST \
          -H "X-N8N-API-KEY: $API_KEY" \
          -H "Content-Type: application/json" \
          -d '{"active": true}' \
          "$N8N_URL/api/v1/workflows/$EXISTING/activate" > /dev/null 2>&1
        echo "✅ [$HTTP_CODE] Mis à jour + activé: $NAME (id: $EXISTING)"
        SUCCESS=$((SUCCESS + 1))
      else
        echo "❌ [$HTTP_CODE] Erreur update: $NAME"
        ERRORS=$((ERRORS + 1))
      fi
    else
      # Créer un nouveau workflow
      RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "X-N8N-API-KEY: $API_KEY" \
        -H "Content-Type: application/json" \
        -d @"$file" \
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
            -d '{"active": true}' \
            "$N8N_URL/api/v1/workflows/$NEW_ID/activate" > /dev/null 2>&1
        fi
        echo "✅ [$HTTP_CODE] Créé + activé: $NAME (id: $NEW_ID)"
        SUCCESS=$((SUCCESS + 1))
      else
        echo "❌ [$HTTP_CODE] Erreur create: $NAME"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  done
done

echo ""
echo "📊 Résumé: $SUCCESS/$TOTAL réussis, $ERRORS erreurs"
