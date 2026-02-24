#!/bin/bash
# Script de debug OCR - à exécuter sur le VPS
# Usage: bash scripts/debug-ocr.sh

set -euo pipefail

echo "=========================================="
echo "  DEBUG OCR Scanner - TalosPrimes"
echo "=========================================="
echo ""

# Config
N8N_URL="http://localhost:5678"
PLATFORM_ENV="/var/www/talosprimes/packages/platform/.env"

# Charger les variables d'env
if [ -f "$PLATFORM_ENV" ]; then
  export $(grep -E '^(N8N_API_KEY|N8N_API_URL)' "$PLATFORM_ENV" | xargs)
fi

N8N_API_KEY="${N8N_API_KEY:-}"
N8N_API_URL="${N8N_API_URL:-$N8N_URL}"

echo "1. Vérification n8n..."
echo "---"
if curl -sf "$N8N_URL/healthz" > /dev/null 2>&1; then
  echo "   ✅ n8n est accessible"
else
  echo "   ❌ n8n ne répond pas sur $N8N_URL"
  exit 1
fi

echo ""
echo "2. Vérification du workflow invoice-scan-ocr..."
echo "---"
WF_INFO=$(curl -sf -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_API_URL/api/v1/workflows" 2>/dev/null || echo '{}')
OCR_WF=$(echo "$WF_INFO" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for wf in data.get('data', []):
    if 'invoice-scan-ocr' in wf.get('name', '').lower() or 'invoice-scan-ocr' in wf.get('name', ''):
        print(f'ID: {wf[\"id\"]}, Name: {wf[\"name\"]}, Active: {wf[\"active\"]}')
        break
else:
    print('NOT_FOUND')
" 2>/dev/null || echo "PARSE_ERROR")

if [ "$OCR_WF" = "NOT_FOUND" ] || [ "$OCR_WF" = "PARSE_ERROR" ]; then
  echo "   ❌ Workflow invoice-scan-ocr non trouvé dans n8n!"
  echo "   Workflows disponibles:"
  echo "$WF_INFO" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for wf in data.get('data', []):
    print(f'   - {wf[\"name\"]} (id={wf[\"id\"]}, active={wf[\"active\"]})')
" 2>/dev/null || echo "   Impossible de lister"
  exit 1
else
  echo "   ✅ $OCR_WF"
fi

echo ""
echo "3. Test du webhook avec une mini image PNG (1x1 pixel rouge)..."
echo "---"

# Image PNG 1x1 pixel rouge en base64
TINY_PNG="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

RESPONSE=$(curl -sf -w "\n---HTTP_CODE:%{http_code}---" \
  -X POST "$N8N_URL/webhook/invoice-scan-ocr" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"invoice_scan_ocr\",
    \"tenantId\": \"00000000-0000-0000-0000-000000000001\",
    \"documentBase64\": \"$TINY_PNG\",
    \"fileName\": \"test.png\",
    \"mimeType\": \"image/png\",
    \"data\": {
      \"tenantId\": \"00000000-0000-0000-0000-000000000001\",
      \"documentBase64\": \"$TINY_PNG\",
      \"fileName\": \"test.png\",
      \"mimeType\": \"image/png\"
    }
  }" 2>&1 || echo "CURL_ERROR")

HTTP_CODE=$(echo "$RESPONSE" | grep -oP 'HTTP_CODE:\K\d+' || echo "000")
BODY=$(echo "$RESPONSE" | sed 's/\n---HTTP_CODE:[0-9]*---$//')

echo "   HTTP Status: $HTTP_CODE"
echo "   Response (premiers 500 chars):"
echo "   ${BODY:0:500}"

if [ "$HTTP_CODE" = "200" ]; then
  echo ""
  echo "   ✅ Le webhook répond!"

  # Vérifier si la réponse est du JSON valide
  if echo "$BODY" | python3 -c "import json, sys; d=json.load(sys.stdin); print(f'   JSON valide: {list(d.keys())}')" 2>/dev/null; then
    echo "   ✅ JSON valide"
  else
    echo "   ❌ Réponse non-JSON! C'est le bug {{ \$json }} → [object Object]"
    echo "   Le workflow n8n doit être mis à jour (respondWith: firstIncomingItem)"
  fi
elif [ "$HTTP_CODE" = "404" ]; then
  echo "   ❌ Webhook non trouvé (404) — le workflow n'est pas actif ou pas enregistré"
  echo "   Solution: docker restart n8n"
else
  echo "   ❌ Erreur HTTP $HTTP_CODE"
fi

echo ""
echo "4. Vérification des dernières exécutions n8n..."
echo "---"

# Récupérer l'ID du workflow
WF_ID=$(echo "$WF_INFO" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for wf in data.get('data', []):
    if 'invoice-scan-ocr' in wf.get('name', '').lower():
        print(wf['id'])
        break
" 2>/dev/null || echo "")

if [ -n "$WF_ID" ]; then
  EXECUTIONS=$(curl -sf -H "X-N8N-API-KEY: $N8N_API_KEY" \
    "$N8N_API_URL/api/v1/executions?workflowId=$WF_ID&limit=5" 2>/dev/null || echo '{}')

  echo "$EXECUTIONS" | python3 -c "
import json, sys
data = json.load(sys.stdin)
execs = data.get('data', [])
if not execs:
    print('   Aucune exécution trouvée')
else:
    for ex in execs[:5]:
        status = ex.get('status', '?')
        finished = ex.get('stoppedAt', ex.get('startedAt', '?'))
        icon = '✅' if status == 'success' else '❌'
        print(f'   {icon} {status} - {finished} (id: {ex.get(\"id\", \"?\")})')
" 2>/dev/null || echo "   Impossible de lire les exécutions"
fi

echo ""
echo "5. Logs platform récents (OCR)..."
echo "---"
pm2 logs platform --nostream --lines 30 2>&1 | grep -i -E "ocr|scan|invoice_scan" | tail -10 || echo "   Pas de logs OCR récents"

echo ""
echo "6. Vérification du Respond node dans le workflow déployé..."
echo "---"
if [ -n "$WF_ID" ]; then
  WF_DETAIL=$(curl -sf -H "X-N8N-API-KEY: $N8N_API_KEY" \
    "$N8N_API_URL/api/v1/workflows/$WF_ID" 2>/dev/null || echo '{}')

  echo "$WF_DETAIL" | python3 -c "
import json, sys
data = json.load(sys.stdin)
nodes = data.get('nodes', [])
for node in nodes:
    if 'respond' in node.get('name', '').lower() or node.get('type', '') == 'n8n-nodes-base.respondToWebhook':
        params = node.get('parameters', {})
        respond_with = params.get('respondWith', '?')
        print(f'   Node: {node[\"name\"]}')
        print(f'   respondWith: {respond_with}')
        if 'responseBody' in params:
            body = str(params['responseBody'])[:100]
            print(f'   responseBody: {body}')
            if '\$json' in body and respond_with == 'json':
                print('   ⚠️  BUG DETECTE: {{ \$json }} dans un champ string produit [object Object]')
                print('   SOLUTION: Changer respondWith en \"firstIncomingItem\"')
        elif respond_with == 'firstIncomingItem':
            print('   ✅ Utilise firstIncomingItem (correct)')
" 2>/dev/null || echo "   Impossible de lire le workflow"
fi

echo ""
echo "=========================================="
echo "  Résumé"
echo "=========================================="
echo ""
echo "Si le webhook retourne du non-JSON → le fix n8n n'est pas déployé"
echo "Si le webhook retourne success:false → OpenAI a échoué (vérifier crédits/clé)"
echo "Si le webhook retourne success:true + extractedData → tout fonctionne côté n8n"
echo ""
echo "Pour déployer le fix:"
echo "  1. git push origin main (depuis votre Mac)"
echo "  2. Sur le VPS: cd /var/www/talosprimes && git pull && uptp"
echo "  3. Relancer ce script pour vérifier"
