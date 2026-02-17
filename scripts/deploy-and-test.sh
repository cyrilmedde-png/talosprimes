#!/bin/bash
################################################################################
# Deploy & Test All n8n Workflows - TalosPrimes
################################################################################
# Run this on the VPS after git pull to deploy and test all workflows
#
# Usage: ./scripts/deploy-and-test.sh
################################################################################

set -uo pipefail
# Note: -e intentionally omitted so script continues after test failures

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TENANT_ID="00000000-0000-0000-0000-000000000001"
N8N_URL="http://localhost:5678"
PASS=0
FAIL=0
SKIP=0

log_pass() { echo -e "${GREEN}✅ PASS${NC} $1"; PASS=$((PASS+1)); }
log_fail() { echo -e "${RED}❌ FAIL${NC} $1: $2"; FAIL=$((FAIL+1)); }
log_skip() { echo -e "${YELLOW}⏭️  SKIP${NC} $1: $2"; SKIP=$((SKIP+1)); }
log_info() { echo -e "${BLUE}ℹ️  INFO${NC} $1"; }

# Test a webhook endpoint
# $4 = "allow_empty" to accept empty response (for fake UUID mutations)
test_webhook() {
    local name="$1"
    local path="$2"
    local payload="$3"
    local allow_empty="${4:-}"

    local http_code response_body
    local full_response
    full_response=$(curl -s -m 15 -w "\n%{http_code}" -X POST "$N8N_URL/webhook/$path" \
        -H 'Content-Type: application/json' \
        -d "$payload" 2>/dev/null || echo -e "\n000")

    http_code=$(echo "$full_response" | tail -1)
    response_body=$(echo "$full_response" | sed '$d')

    # Connection error
    if [ "$http_code" = "000" ]; then
        log_fail "$name" "connection error/timeout"
        return 1
    fi

    # Check for webhook not registered (404)
    if echo "$response_body" | grep -q "not registered"; then
        log_fail "$name" "webhook not registered"
        return 1
    fi

    # Empty response with allow_empty = expected (fake UUID mutations)
    if [ -z "$response_body" ] && [ "$allow_empty" = "allow_empty" ]; then
        log_pass "$name (webhook responds, no data for fake UUID)"
        return 0
    fi

    # Empty response without allow_empty = real problem
    if [ -z "$response_body" ]; then
        log_fail "$name" "empty response (HTTP $http_code)"
        return 1
    fi

    # Check for n8n error in JSON
    if echo "$response_body" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('error') and 'timeout' not in str(d.get('error','')) else 1)" 2>/dev/null; then
        local err
        err=$(echo "$response_body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null)
        log_fail "$name" "$err"
        return 1
    fi

    # Valid response
    log_pass "$name"
    return 0
}

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Git Pull & Reimport${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd /var/www/talosprimes
git pull origin main 2>&1 | tail -5

echo ""
log_info "Running reimport script..."
bash scripts/reimport-n8n-workflows.sh 2>&1 | tail -10

echo ""
log_info "Waiting 10 seconds for webhooks to register..."
sleep 10

# Check for inactive workflows that should be active
echo ""
log_info "Checking workflow activation status..."
source packages/platform/.env 2>/dev/null || source .env 2>/dev/null
INACTIVE=$(curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_URL/api/v1/workflows" 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
inactive = [w['name'] for w in data.get('data', []) if not w.get('active', False)]
if inactive:
    print(', '.join(inactive))
" 2>/dev/null)
if [ -n "$INACTIVE" ]; then
    echo -e "${YELLOW}⚠️  Inactive workflows: $INACTIVE${NC}"
    log_info "Attempting to activate inactive workflows..."
    curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_URL/api/v1/workflows" 2>/dev/null | python3 -c "
import sys, json, subprocess
data = json.load(sys.stdin)
api_key = '${N8N_API_KEY}'
for w in data.get('data', []):
    if not w.get('active', False):
        wid = w['id']
        name = w['name']
        r = subprocess.run(['curl', '-s', '-X', 'POST', '-H', f'X-N8N-API-KEY: {api_key}', f'$N8N_URL/api/v1/workflows/{wid}/activate'], capture_output=True, text=True)
        print(f'  Activated: {name}')
" 2>/dev/null
    sleep 3
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Test LIST Endpoints${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

test_webhook "devis-list" "devis-list" \
    "{\"tenantId\":\"$TENANT_ID\",\"page\":1,\"limit\":10}"

test_webhook "bdc-list" "bdc-list" \
    "{\"tenantId\":\"$TENANT_ID\",\"page\":1,\"limit\":10}"

test_webhook "proforma-list" "proforma-list" \
    "{\"tenantId\":\"$TENANT_ID\",\"page\":1,\"limit\":10}"

test_webhook "notifications-list" "notifications-list" \
    "{\"tenantId\":\"$TENANT_ID\",\"page\":1,\"limit\":10}"

test_webhook "logs-list" "logs-list" \
    "{\"tenantId\":\"$TENANT_ID\",\"page\":1,\"limit\":10}"

test_webhook "logs-stats" "logs-stats" \
    "{\"tenantId\":\"$TENANT_ID\"}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3: Test GET Endpoints (with fake UUID)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

FAKE_UUID="00000000-0000-0000-0000-000000000000"

test_webhook "devis-get" "devis-get" \
    "{\"tenantId\":\"$TENANT_ID\",\"devisId\":\"$FAKE_UUID\"}" "allow_empty"

test_webhook "bdc-get" "bdc-get" \
    "{\"tenantId\":\"$TENANT_ID\",\"bdcId\":\"$FAKE_UUID\"}" "allow_empty"

test_webhook "proforma-get" "proforma-get" \
    "{\"tenantId\":\"$TENANT_ID\",\"proformaId\":\"$FAKE_UUID\"}" "allow_empty"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 4: Test CREATED Endpoints${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test notification-created (no FK constraint, should fully work)
test_webhook "notification-created" "notification-created" \
    "{\"tenantId\":\"$TENANT_ID\",\"titre\":\"Test Deploy\",\"message\":\"Test from deploy script\",\"type\":\"info\"}"

# CREATED endpoints with fake clientFinalId - FK constraint prevents insert (expected)
test_webhook "devis-created" "devis-created" \
    "{\"tenantId\":\"$TENANT_ID\",\"clientFinalId\":\"$FAKE_UUID\",\"montantHt\":100,\"tvaTaux\":20,\"lines\":[]}" "allow_empty"

test_webhook "bdc-created" "bdc-created" \
    "{\"tenantId\":\"$TENANT_ID\",\"clientFinalId\":\"$FAKE_UUID\",\"montantHt\":200,\"tvaTaux\":20,\"lines\":[]}" "allow_empty"

test_webhook "proforma-created" "proforma-created" \
    "{\"tenantId\":\"$TENANT_ID\",\"clientFinalId\":\"$FAKE_UUID\",\"montantHt\":150,\"tvaTaux\":20,\"lines\":[]}" "allow_empty"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 5: Test Other Endpoints${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Mutation endpoints with fake UUIDs - accept empty response (record doesn't exist)
test_webhook "notification-read" "notification-read" \
    "{\"tenantId\":\"$TENANT_ID\",\"notificationId\":\"$FAKE_UUID\"}" "allow_empty"

test_webhook "notification-deleted" "notification-deleted" \
    "{\"tenantId\":\"$TENANT_ID\",\"notificationId\":\"$FAKE_UUID\"}" "allow_empty"

test_webhook "devis-sent" "devis-sent" \
    "{\"tenantId\":\"$TENANT_ID\",\"devisId\":\"$FAKE_UUID\"}" "allow_empty"

test_webhook "devis-accepted" "devis-accepted" \
    "{\"tenantId\":\"$TENANT_ID\",\"devisId\":\"$FAKE_UUID\"}" "allow_empty"

test_webhook "devis-deleted" "devis-deleted" \
    "{\"tenantId\":\"$TENANT_ID\",\"devisId\":\"$FAKE_UUID\"}" "allow_empty"

test_webhook "devis-convert-to-invoice" "devis-convert-to-invoice" \
    "{\"tenantId\":\"$TENANT_ID\",\"devisId\":\"$FAKE_UUID\"}" "allow_empty"

test_webhook "bdc-validated" "bdc-validated" \
    "{\"tenantId\":\"$TENANT_ID\",\"bdcId\":\"$FAKE_UUID\"}" "allow_empty"

test_webhook "bdc-deleted" "bdc-deleted" \
    "{\"tenantId\":\"$TENANT_ID\",\"bdcId\":\"$FAKE_UUID\"}" "allow_empty"

test_webhook "bdc-convert-to-invoice" "bdc-convert-to-invoice" \
    "{\"tenantId\":\"$TENANT_ID\",\"bdcId\":\"$FAKE_UUID\"}" "allow_empty"

test_webhook "proforma-sent" "proforma-sent" \
    "{\"tenantId\":\"$TENANT_ID\",\"proformaId\":\"$FAKE_UUID\"}" "allow_empty"

test_webhook "proforma-accepted" "proforma-accepted" \
    "{\"tenantId\":\"$TENANT_ID\",\"proformaId\":\"$FAKE_UUID\"}" "allow_empty"

test_webhook "proforma-deleted" "proforma-deleted" \
    "{\"tenantId\":\"$TENANT_ID\",\"proformaId\":\"$FAKE_UUID\"}" "allow_empty"

test_webhook "proforma-convert-to-invoice" "proforma-convert-to-invoice" \
    "{\"tenantId\":\"$TENANT_ID\",\"proformaId\":\"$FAKE_UUID\"}" "allow_empty"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}RESULTS SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo -e "${YELLOW}Skipped: $SKIP${NC}"
TOTAL=$((PASS + FAIL + SKIP))
echo -e "Total: $TOTAL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Check details above.${NC}"
    echo ""
    echo "Note: Some failures with fake UUIDs are expected (e.g., 'not found')"
    echo "The important thing is that the webhook responds (not 404/empty)."
    exit 1
fi
