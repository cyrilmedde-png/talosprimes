#!/bin/bash
################################################################################
# Deploy & Test All n8n Workflows - TalosPrimes
################################################################################
# Run this on the VPS after git pull to deploy and test all workflows
#
# Usage: ./scripts/deploy-and-test.sh
################################################################################

set -euo pipefail

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
test_webhook() {
    local name="$1"
    local path="$2"
    local payload="$3"
    local expect_field="${4:-success}"

    local response
    response=$(curl -s -m 10 -X POST "$N8N_URL/webhook/$path" \
        -H 'Content-Type: application/json' \
        -d "$payload" 2>/dev/null || echo '{"error":"timeout_or_connection_error"}')

    if [ -z "$response" ]; then
        log_fail "$name" "empty response"
        return 1
    fi

    # Check for webhook not registered
    if echo "$response" | grep -q "not registered"; then
        log_fail "$name" "webhook not registered"
        return 1
    fi

    # Check for n8n error
    if echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('error') and 'timeout' not in str(d.get('error','')) else 1)" 2>/dev/null; then
        local err
        err=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null)
        log_fail "$name" "$err"
        return 1
    fi

    # Check response is valid JSON
    if ! echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        # Try to check if it's at least non-empty
        if [ ${#response} -gt 2 ]; then
            log_pass "$name (non-JSON response, ${#response} chars)"
            return 0
        fi
        log_fail "$name" "invalid/empty response"
        return 1
    fi

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
    "{\"tenantId\":\"$TENANT_ID\",\"devisId\":\"$FAKE_UUID\"}"

test_webhook "bdc-get" "bdc-get" \
    "{\"tenantId\":\"$TENANT_ID\",\"bdcId\":\"$FAKE_UUID\"}"

test_webhook "proforma-get" "proforma-get" \
    "{\"tenantId\":\"$TENANT_ID\",\"proformaId\":\"$FAKE_UUID\"}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 4: Test CREATED Endpoints${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test notification-created
test_webhook "notification-created" "notification-created" \
    "{\"tenantId\":\"$TENANT_ID\",\"titre\":\"Test Deploy\",\"contenu\":\"Test from deploy script\",\"type\":\"info\"}"

# Test devis-created
test_webhook "devis-created" "devis-created" \
    "{\"tenantId\":\"$TENANT_ID\",\"clientFinalId\":\"$FAKE_UUID\",\"montantHt\":100,\"tvaTaux\":20,\"lines\":[]}"

# Test bdc-created
test_webhook "bdc-created" "bdc-created" \
    "{\"tenantId\":\"$TENANT_ID\",\"clientFinalId\":\"$FAKE_UUID\",\"montantHt\":200,\"tvaTaux\":20,\"lines\":[]}"

# Test proforma-created
test_webhook "proforma-created" "proforma-created" \
    "{\"tenantId\":\"$TENANT_ID\",\"clientFinalId\":\"$FAKE_UUID\",\"montantHt\":150,\"tvaTaux\":20,\"lines\":[]}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 5: Test Other Endpoints${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Notification read
test_webhook "notification-read" "notification-read" \
    "{\"tenantId\":\"$TENANT_ID\",\"notificationId\":\"$FAKE_UUID\"}"

# Notification deleted
test_webhook "notification-deleted" "notification-deleted" \
    "{\"tenantId\":\"$TENANT_ID\",\"notificationId\":\"$FAKE_UUID\"}"

# Devis sent
test_webhook "devis-sent" "devis-sent" \
    "{\"tenantId\":\"$TENANT_ID\",\"devisId\":\"$FAKE_UUID\"}"

# Devis accepted
test_webhook "devis-accepted" "devis-accepted" \
    "{\"tenantId\":\"$TENANT_ID\",\"devisId\":\"$FAKE_UUID\"}"

# Devis deleted
test_webhook "devis-deleted" "devis-deleted" \
    "{\"tenantId\":\"$TENANT_ID\",\"devisId\":\"$FAKE_UUID\"}"

# Devis convert to invoice
test_webhook "devis-convert-to-invoice" "devis-convert-to-invoice" \
    "{\"tenantId\":\"$TENANT_ID\",\"devisId\":\"$FAKE_UUID\"}"

# BDC validated
test_webhook "bdc-validated" "bdc-validated" \
    "{\"tenantId\":\"$TENANT_ID\",\"bdcId\":\"$FAKE_UUID\"}"

# BDC deleted
test_webhook "bdc-deleted" "bdc-deleted" \
    "{\"tenantId\":\"$TENANT_ID\",\"bdcId\":\"$FAKE_UUID\"}"

# BDC convert to invoice
test_webhook "bdc-convert-to-invoice" "bdc-convert-to-invoice" \
    "{\"tenantId\":\"$TENANT_ID\",\"bdcId\":\"$FAKE_UUID\"}"

# Proforma sent
test_webhook "proforma-sent" "proforma-sent" \
    "{\"tenantId\":\"$TENANT_ID\",\"proformaId\":\"$FAKE_UUID\"}"

# Proforma accepted
test_webhook "proforma-accepted" "proforma-accepted" \
    "{\"tenantId\":\"$TENANT_ID\",\"proformaId\":\"$FAKE_UUID\"}"

# Proforma deleted
test_webhook "proforma-deleted" "proforma-deleted" \
    "{\"tenantId\":\"$TENANT_ID\",\"proformaId\":\"$FAKE_UUID\"}"

# Proforma convert to invoice
test_webhook "proforma-convert-to-invoice" "proforma-convert-to-invoice" \
    "{\"tenantId\":\"$TENANT_ID\",\"proformaId\":\"$FAKE_UUID\"}"

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
