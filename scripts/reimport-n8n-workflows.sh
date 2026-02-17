#!/bin/bash

################################################################################
# N8N Workflow Reimporter - TalosPrimes
################################################################################
# Reimports n8n workflows from JSON backup files, updating broken workflows
# that have empty Code nodes with full implementations from backups.
#
# Features:
# - Finds existing workflow IDs by matching webhook paths
# - Replaces old credential IDs with current n8n instance credentials
# - Updates workflows via PUT /api/v1/workflows/{id}
# - Activates workflows after successful import
# - Comprehensive logging and error handling
#
# Usage:
#   ./scripts/reimport-n8n-workflows.sh [API_KEY] [N8N_URL]
#   ./scripts/reimport-n8n-workflows.sh                    (uses .env)
#
# Environment Variables:
#   N8N_API_KEY     - n8n API key (required)
#   N8N_API_URL     - n8n API endpoint (default: http://localhost:5678)
#   ENV_FILE        - Path to .env file (default: packages/platform/.env)
#
# Examples:
#   ./scripts/reimport-n8n-workflows.sh
#   ./scripts/reimport-n8n-workflows.sh "my-api-key" "https://n8n.example.com"
#   N8N_API_KEY="my-key" ./scripts/reimport-n8n-workflows.sh
#
################################################################################

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/n8n_workflows/talosprimes"
PLATFORM_DIR="${PROJECT_DIR}/packages/platform"
LOG_FILE="${SCRIPT_DIR}/../reimport-workflows-$(date +%Y%m%d_%H%M%S).log"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Credential ID mappings (current n8n instance)
declare -A CREDENTIAL_MAP=(
    ["postgres"]="6Kosza77d9Ld32mw"
    ["Supabase Postgres"]="6Kosza77d9Ld32mw"
    ["httpHeaderAuth:talosprimes"]="AuJmz6W8aeutvysV"
    ["TalosPrimes API Auth"]="AuJmz6W8aeutvysV"
    ["httpHeaderAuth:resend"]="ZoJkKnTqGisK2Idh"
    ["RESEND"]="ZoJkKnTqGisK2Idh"
    ["twilio"]="9dKAFunSg4lJcj77"
    ["Twilio account"]="9dKAFunSg4lJcj77"
    ["n8nApi"]="UOxVqcaXs0NeqsmD"
    ["X-N8N-API-KEY"]="UOxVqcaXs0NeqsmD"
)

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Statistics
TOTAL_WORKFLOWS=0
SUCCESSFUL_UPDATES=0
FAILED_UPDATES=0
SKIPPED_WORKFLOWS=0

# ============================================================================
# Functions
# ============================================================================

# Log function with timestamp and colors
log() {
    local level="$1"
    shift
    local message="$*"
    local color=""

    case "$level" in
        "INFO") color="$BLUE" ;;
        "SUCCESS") color="$GREEN" ;;
        "WARN") color="$YELLOW" ;;
        "ERROR") color="$RED" ;;
        *) color="$NC" ;;
    esac

    echo -e "${color}[${TIMESTAMP}] [${level}]${NC} ${message}" | tee -a "$LOG_FILE"
}

# Print section header
header() {
    local title="$1"
    echo "" | tee -a "$LOG_FILE"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}${title}${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
}

# Validate required tools
validate_tools() {
    local required_tools=("curl" "python3" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log "ERROR" "Required tool not found: $tool"
            exit 1
        fi
    done
    log "SUCCESS" "All required tools are available"
}

# Load API key from .env if not provided
load_api_key() {
    if [ -n "${N8N_API_KEY:-}" ]; then
        log "INFO" "Using N8N_API_KEY from environment"
        return 0
    fi

    if [ -f "$PLATFORM_DIR/.env" ]; then
        log "INFO" "Loading N8N_API_KEY from $PLATFORM_DIR/.env"
        N8N_API_KEY=$(grep -E '^N8N_API_KEY=' "$PLATFORM_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" || echo "")
        if [ -n "$N8N_API_KEY" ]; then
            export N8N_API_KEY
            return 0
        fi
    fi

    log "ERROR" "N8N_API_KEY not found. Please provide it via:"
    log "ERROR" "  - Command argument: ./script.sh 'API_KEY'"
    log "ERROR" "  - Environment variable: export N8N_API_KEY='...'"
    log "ERROR" "  - Or add N8N_API_KEY to $PLATFORM_DIR/.env"
    return 1
}

# Validate n8n connection
validate_n8n_connection() {
    log "INFO" "Testing connection to n8n at $N8N_API_URL..."

    local response
    response=$(curl -s -w "\n%{http_code}" -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_API_URL/api/v1/workflows" 2>&1)
    local http_code
    http_code=$(echo "$response" | tail -1)

    if [ "$http_code" -eq 200 ]; then
        log "SUCCESS" "Connection successful (HTTP $http_code)"
        return 0
    else
        log "ERROR" "Failed to connect to n8n (HTTP $http_code)"
        log "ERROR" "Response: $(echo "$response" | head -1)"
        return 1
    fi
}

# Temp file for workflows cache
export WORKFLOWS_CACHE="/tmp/n8n_workflows_cache_$$.json"

# Cleanup on exit
cleanup() {
    rm -f "$WORKFLOWS_CACHE"
}
trap cleanup EXIT

# Fetch all workflows from n8n API into temp file
fetch_all_workflows() {
    log "INFO" "Fetching all workflows from n8n..."

    curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
        "$N8N_API_URL/api/v1/workflows?limit=250" > "$WORKFLOWS_CACHE" 2>/dev/null

    local count
    count=$(python3 -c "import json; print(len(json.load(open('$WORKFLOWS_CACHE')).get('data',[])))" 2>/dev/null || echo "0")
    log "INFO" "Found $count workflows in n8n"

    if [ "$count" -eq 0 ]; then
        log "ERROR" "No workflows found - check API key and connection"
        return 1
    fi
    return 0
}

# Find workflow ID by webhook path (reads from cache file)
find_workflow_by_webhook() {
    local webhook_path="$1"

    export WEBHOOK_PATH="$webhook_path"
    python3 << 'PYEOF'
import json, os

webhook_path = os.environ.get('WEBHOOK_PATH', '')
cache_file = os.environ.get('WORKFLOWS_CACHE', '')

with open(cache_file, 'r') as f:
    data = json.load(f)

for workflow in data.get('data', []):
    for node in workflow.get('nodes', []):
        if node.get('type') == 'n8n-nodes-base.webhook':
            node_path = node.get('parameters', {}).get('path', '')
            if node_path == webhook_path:
                print(workflow.get('id', ''))
                exit(0)
print('')
PYEOF
}

# Replace credential IDs in workflow JSON
replace_credentials_in_workflow() {
    local backup_json="$1"

    export BACKUP_FILE="$backup_json"
    python3 << 'PYEOF'
import json, os

backup_file = os.environ.get('BACKUP_FILE', '')

with open(backup_file, 'r') as f:
    workflow = json.load(f)

# Credential mappings
cred_map = {
    "postgres": "6Kosza77d9Ld32mw",
    "Supabase Postgres": "6Kosza77d9Ld32mw",
    "httpHeaderAuth:talosprimes": "AuJmz6W8aeutvysV",
    "TalosPrimes API Auth": "AuJmz6W8aeutvysV",
    "httpHeaderAuth:resend": "ZoJkKnTqGisK2Idh",
    "RESEND": "ZoJkKnTqGisK2Idh",
    "twilio": "9dKAFunSg4lJcj77",
    "Twilio account": "9dKAFunSg4lJcj77",
    "n8nApi": "UOxVqcaXs0NeqsmD",
    "X-N8N-API-KEY": "UOxVqcaXs0NeqsmD"
}

# ---- Step 1: Find Parser node name dynamically ----
parser_node_name = None
nodes = workflow.get('nodes', [])
for node in nodes:
    name = node.get('name', '')
    if 'parser' in name.lower():
        parser_node_name = name
        break

# ---- Step 2: Process each node ----
for node in nodes:
    # Fix Code nodes: rename 'code' -> 'jsCode' AND fix $input.body references
    if node.get('type') == 'n8n-nodes-base.code':
        params = node.get('parameters', {})
        if 'code' in params and 'jsCode' not in params:
            params['jsCode'] = params.pop('code')
        js = params.get('jsCode', '')
        if js:
            import re
            # Fix old-style $input.body -> $input.first().json.body
            if '$input.body' in js:
                js = js.replace('$input.body', '$input.first().json.body')
            # Fix $('NodeName').all() -> .all().map(item => item.json)
            # Unwrap n8n item wrappers so responses return clean data
            js = re.sub(r"\$\('([^']+)'\)\.all\(\)(?!\.map)", r"$('\1').all().map(item => item.json)", js)
            # Fix $('NodeName').first() assigned to variable -> .first().json
            # e.g. const x = $('Node').first(); -> const x = $('Node').first().json;
            js = re.sub(r"\$\('([^']+)'\)\.first\(\)(?=\s*[;,\)])", r"$('\1').first().json", js)
            # Fix $('NodeName').first().field -> .first().json.field (inline usage)
            # In n8n, .first() returns an item with a .json property
            js = re.sub(r"\$\('([^']+)'\)\.first\(\)\.(?!json\b)(\w+)", r"$('\1').first().json.\2", js)
            # Fix $json.page/limit/offset in Format Response nodes
            # These reference Parser data, not the previous connected node
            node_name = node.get('name', '').lower()
            if parser_node_name and ('format' in node_name or 'response' in node_name):
                for field in ['page', 'limit', 'offset']:
                    js = js.replace('$json.' + field, "$('{}').first().json.{}".format(parser_node_name, field))
            # Code nodes MUST return items in n8n v2
            # If no return statement, add passthrough to avoid "doesn't return items properly"
            if 'return ' not in js and 'return\n' not in js:
                js = js.rstrip() + '\nreturn $input.all();'
            params['jsCode'] = js

    # Fix Postgres nodes
    if node.get('type') == 'n8n-nodes-base.postgres':
        params = node.get('parameters', {})
        query = params.get('query', '')
        if query:
            # Replace $json. with explicit Parser reference
            if '$json.' in query and parser_node_name:
                explicit_ref = "$('{}').first().json.".format(parser_node_name)
                query = query.replace('$json.', explicit_ref)
            # Fix schema mismatches
            # Notifications table has NO updated_at column
            if 'notifications' in query and 'updated_at' in query:
                import re
                # Fix UPDATE SET clause first: remove ', updated_at = NOW()'
                query = re.sub(r',\s*updated_at\s*=\s*NOW\(\)', '', query)
                # Fix INSERT: remove updated_at from column list and NOW() from values
                query = re.sub(r',\s*updated_at\)', ')', query)
                query = re.sub(r",\s*NOW\(\)\)\s*RETURNING", ') RETURNING', query)
                # Fix SELECT/RETURNING: remove ', updated_at' from column lists
                query = query.replace(', updated_at', '')
            # Fix table name: bon_commandes -> bons_commande
            if 'bon_commandes' in query:
                query = query.replace('bon_commandes', 'bons_commande')
            # Fix INSERT INTO notifications: add id = gen_random_uuid()
            if 'INSERT INTO notifications' in query and 'gen_random_uuid' not in query:
                query = query.replace(
                    'INSERT INTO notifications (tenant_id,',
                    'INSERT INTO notifications (id, tenant_id,'
                )
                query = query.replace(
                    "VALUES (",
                    "VALUES (gen_random_uuid(), "
                )
            # Fix INSERT INTO call_logs: add id = gen_random_uuid()
            if 'INSERT INTO call_logs' in query and 'gen_random_uuid' not in query:
                query = query.replace(
                    'INSERT INTO call_logs (tenant_id,',
                    'INSERT INTO call_logs (id, tenant_id,'
                )
                query = query.replace(
                    "VALUES (",
                    "VALUES (gen_random_uuid(), "
                )
            # Fix proforma alias: FROM proformas d -> FROM proformas p
            if 'FROM proformas d ' in query:
                query = query.replace('FROM proformas d ', 'FROM proformas p ')
            # Fix event_logs column names (backup vs actual DB schema)
            # Only rename SQL column names, NOT JS property refs (preceded by '.')
            if 'event_logs' in query:
                import re
                # workflow -> workflow_n8n_id (SQL column only, not .json.workflow)
                query = re.sub(r'(?<!\.)workflow\b(?!_n8n)', 'workflow_n8n_id', query)
                # message -> message_erreur (SQL column only, not .json.message)
                query = re.sub(r'(?<!\.)message\b(?!_erreur)', 'message_erreur', query)
                # metadata -> payload (SQL column only)
                query = re.sub(r'(?<!\.)metadata\b', 'payload', query)
                # updated_at doesn't exist in event_logs
                query = query.replace(', updated_at', '')
            params['query'] = query

    # Replace credential IDs
    credentials = node.get('credentials', {})
    for cred_type, cred_info in credentials.items():
        if isinstance(cred_info, dict):
            cred_name = cred_info.get('name', '')
            cred_id = cred_info.get('id', '')
            if 'REPLACE_WITH' in cred_id or cred_name in cred_map:
                new_id = cred_map.get(cred_name) or cred_map.get(cred_type)
                if new_id:
                    node['credentials'][cred_type]['id'] = new_id

# Remove read-only fields for PUT request
for field in ['active', 'id', 'createdAt', 'updatedAt', 'versionId',
              'triggerCount', 'sharedWithProjects', 'homeProject', 'tags',
              'meta', 'pinData', 'staticData']:
    workflow.pop(field, None)

# Ensure nodes and connections exist
if 'nodes' not in workflow:
    workflow['nodes'] = []
if 'connections' not in workflow:
    workflow['connections'] = {}
if 'settings' not in workflow:
    workflow['settings'] = {}

print(json.dumps(workflow))
PYEOF
}

# Update workflow via n8n API
update_workflow() {
    local workflow_id="$1"
    local workflow_json="$2"
    local workflow_name="$3"

    log "INFO" "Updating workflow: $workflow_name (ID: $workflow_id)"

    # Send PUT request
    local response
    response=$(curl -s -w "\n%{http_code}" -X PUT \
        -H "X-N8N-API-KEY: $N8N_API_KEY" \
        -H "Content-Type: application/json" \
        -d "$workflow_json" \
        "$N8N_API_URL/api/v1/workflows/$workflow_id" 2>&1)

    local http_code
    http_code=$(echo "$response" | tail -1)
    local body
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq 200 ]; then
        log "SUCCESS" "Workflow updated successfully: $workflow_name"
        return 0
    else
        local error_msg
        error_msg=$(echo "$body" | python3 -c "import sys, json; print(json.load(sys.stdin).get('message', 'Unknown error'))" 2>/dev/null || echo "Unknown error")
        log "ERROR" "Failed to update workflow: $workflow_name (HTTP $http_code) - $error_msg"
        return 1
    fi
}

# Deactivate workflow (to force webhook re-registration on activate)
deactivate_workflow() {
    local workflow_id="$1"
    local workflow_name="$2"

    curl -s -X POST \
        -H "X-N8N-API-KEY: $N8N_API_KEY" \
        -H "Content-Type: application/json" \
        "$N8N_API_URL/api/v1/workflows/$workflow_id/deactivate" > /dev/null 2>&1
    # Small delay to let n8n clean up webhook registrations
    sleep 0.3
}

# Activate workflow
activate_workflow() {
    local workflow_id="$1"
    local workflow_name="$2"

    log "INFO" "Activating workflow: $workflow_name"

    local response
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "X-N8N-API-KEY: $N8N_API_KEY" \
        -H "Content-Type: application/json" \
        "$N8N_API_URL/api/v1/workflows/$workflow_id/activate" 2>&1)

    local http_code
    http_code=$(echo "$response" | tail -1)

    if [ "$http_code" -eq 200 ]; then
        log "SUCCESS" "Workflow activated: $workflow_name"
        return 0
    else
        local error_msg
        error_msg=$(echo "$response" | sed '$d' | python3 -c "import sys, json; print(json.load(sys.stdin).get('message', 'Unknown error'))" 2>/dev/null || echo "Unknown error")
        log "WARN" "Failed to activate workflow: $workflow_name (HTTP $http_code) - $error_msg"
        return 0  # Don't fail the whole process
    fi
}

# Process a single workflow
process_workflow() {
    local backup_file="$1"
    local relative_path="${backup_file#$BACKUP_DIR/}"

    TOTAL_WORKFLOWS=$((TOTAL_WORKFLOWS + 1))

    log "INFO" "Processing: $relative_path"

    # Extract webhook path from filename
    # e.g., "devis/devis-list.json" -> "devis-list"
    local filename
    filename=$(basename "$backup_file" .json)

    # Try to find workflow with matching webhook path
    local workflow_id
    workflow_id=$(find_workflow_by_webhook "$filename")

    if [ -z "$workflow_id" ]; then
        log "WARN" "No existing workflow found with webhook path: $filename (skipping)"
        SKIPPED_WORKFLOWS=$((SKIPPED_WORKFLOWS + 1))
        return 1
    fi

    log "INFO" "Found existing workflow ID: $workflow_id"

    # Validate backup JSON
    if ! python3 -m json.tool "$backup_file" > /dev/null 2>&1; then
        log "ERROR" "Invalid JSON in backup file: $backup_file"
        FAILED_UPDATES=$((FAILED_UPDATES + 1))
        return 1
    fi

    # Replace credentials in the backup JSON
    local updated_json
    updated_json=$(replace_credentials_in_workflow "$backup_file")

    if [ -z "$updated_json" ]; then
        log "ERROR" "Failed to process credentials for: $relative_path"
        FAILED_UPDATES=$((FAILED_UPDATES + 1))
        return 1
    fi

    # Deactivate first to force webhook re-registration on activate
    deactivate_workflow "$workflow_id" "$filename"

    # Update workflow
    if update_workflow "$workflow_id" "$updated_json" "$filename"; then
        # Activate (webhooks will be freshly registered)
        activate_workflow "$workflow_id" "$filename"
        SUCCESSFUL_UPDATES=$((SUCCESSFUL_UPDATES + 1))
        return 0
    else
        FAILED_UPDATES=$((FAILED_UPDATES + 1))
        return 1
    fi
}

# Main execution
main() {
    header "N8N Workflow Reimporter - TalosPrimes"

    # Handle command-line arguments
    if [ $# -gt 0 ]; then
        N8N_API_KEY="$1"
        export N8N_API_KEY
    fi
    if [ $# -gt 1 ]; then
        N8N_API_URL="$2"
        export N8N_API_URL
    fi

    # Set defaults
    N8N_API_URL="${N8N_API_URL:-http://localhost:5678}"

    log "INFO" "Starting workflow reimport process..."
    log "INFO" "Log file: $LOG_FILE"
    log "INFO" "Backup directory: $BACKUP_DIR"
    log "INFO" "n8n API URL: $N8N_API_URL"

    # Validation
    header "Pre-flight Checks"
    validate_tools || exit 1
    load_api_key || exit 1
    validate_n8n_connection || exit 1

    # Get all existing workflows
    header "Fetching Existing Workflows"
    fetch_all_workflows || exit 1

    # Define workflows to reimport
    header "Processing Workflows"
    declare -a WORKFLOWS_TO_REIMPORT=(
        "devis/devis-list.json"
        "devis/devis-get.json"
        "devis/devis-created.json"
        "devis/devis-sent.json"
        "devis/devis-accepted.json"
        "devis/devis-deleted.json"
        "devis/devis-convert-to-invoice.json"
        "bons-commande/bdc-list.json"
        "bons-commande/bdc-get.json"
        "bons-commande/bdc-created.json"
        "bons-commande/bdc-validated.json"
        "bons-commande/bdc-deleted.json"
        "bons-commande/bdc-convert-to-invoice.json"
        "proforma/proforma-list.json"
        "proforma/proforma-get.json"
        "proforma/proforma-created.json"
        "proforma/proforma-sent.json"
        "proforma/proforma-accepted.json"
        "proforma/proforma-deleted.json"
        "proforma/proforma-convert-to-invoice.json"
        "notifications/notification-created.json"
        "notifications/notification-deleted.json"
        "notifications/notification-read.json"
        "notifications/notifications-list.json"
        "logs/logs-list.json"
        "logs/logs-stats.json"
        "agent-telephonique/twilio-outbound-call.json"
        "agent-telephonique/twilio-test-call.json"
    )

    # Process each workflow
    for workflow_path in "${WORKFLOWS_TO_REIMPORT[@]}"; do
        local backup_file="$BACKUP_DIR/$workflow_path"

        if [ ! -f "$backup_file" ]; then
            log "WARN" "Backup file not found: $workflow_path"
            SKIPPED_WORKFLOWS=$((SKIPPED_WORKFLOWS + 1))
            continue
        fi

        process_workflow "$backup_file"
        echo "" | tee -a "$LOG_FILE"
    done

    # Summary
    header "Summary"
    log "INFO" "Total workflows processed: $TOTAL_WORKFLOWS"
    log "SUCCESS" "Successful updates: $SUCCESSFUL_UPDATES"
    log "ERROR" "Failed updates: $FAILED_UPDATES"
    log "WARN" "Skipped workflows: $SKIPPED_WORKFLOWS"

    echo "" | tee -a "$LOG_FILE"

    if [ $FAILED_UPDATES -eq 0 ]; then
        log "SUCCESS" "✅ All workflows reimported successfully!"
        return 0
    else
        log "WARN" "⚠️  Some workflows failed to reimport. Check log: $LOG_FILE"
        return 1
    fi
}

# Run main function
main "$@"
