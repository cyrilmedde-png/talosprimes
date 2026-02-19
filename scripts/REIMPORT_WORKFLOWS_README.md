# N8N Workflow Reimporter Guide

## Overview

The `reimport-n8n-workflows.sh` script is designed to reimport n8n workflows from JSON backup files into the running n8n instance. It's specifically built to fix workflows that have empty Code nodes by restoring their full implementations from backup files.

## Key Features

- **Webhook Path Matching**: Automatically finds existing workflows by matching webhook paths from the backup filenames
- **Credential ID Replacement**: Maps old credential IDs from backups to current n8n instance credentials
- **Batch Processing**: Handles multiple workflows in a single run
- **Error Handling**: Comprehensive error checking and recovery
- **Logging**: Detailed logging with timestamps to track all operations
- **Activation**: Automatically activates workflows after successful import
- **Production Ready**: Includes safety checks, validation, and proper exit codes

## Supported Workflows

The script is configured to reimport the following workflows:

### Devis (Quotes)
- devis-list.json
- devis-get.json
- devis-created.json
- devis-sent.json
- devis-accepted.json
- devis-deleted.json
- devis-convert-to-invoice.json

### Bons de Commande (Purchase Orders)
- bdc-list.json
- bdc-get.json
- bdc-created.json
- bdc-validated.json
- bdc-deleted.json
- bdc-convert-to-invoice.json

### Proforma (Proforma Invoices)
- proforma-list.json
- proforma-get.json
- proforma-created.json
- proforma-sent.json
- proforma-accepted.json
- proforma-deleted.json
- proforma-convert-to-invoice.json

### Notifications
- notification-created.json
- notification-deleted.json
- notification-read.json
- notifications-list.json

### Logs
- logs-list.json
- logs-stats.json

### Agent Telephonique (Twilio)
- twilio-outbound-call.json
- twilio-test-call.json

## Prerequisites

### Required Tools
- `bash` 4.0+
- `curl`
- `python3`
- `jq` (for advanced JSON operations)

### Environment Setup

You need access to:
1. The n8n API endpoint (default: `http://localhost:5678`)
2. A valid n8n API key
3. The backup JSON files in `n8n_workflows/talosprimes/`
4. The platform `.env` file with `N8N_API_KEY` configured

### N8N Instance Requirements

- N8N API must be accessible
- API key must have workflow management permissions
- Current n8n credentials must already be configured:
  - Postgres credential ID: `6Kosza77d9Ld32mw` (Supabase)
  - TalosPrimes API Auth ID: `AuJmz6W8aeutvysV`
  - Resend API Auth ID: `ZoJkKnTqGisK2Idh`
  - Twilio credential ID: `9dKAFunSg4lJcj77`
  - N8N API key credential ID: `UOxVqcaXs0NeqsmD`

## Usage

### Basic Usage (From Project Root)

```bash
# Use API key from packages/platform/.env
./scripts/reimport-n8n-workflows.sh

# Provide API key as argument
./scripts/reimport-n8n-workflows.sh "your-n8n-api-key"

# Provide API key and custom N8N URL
./scripts/reimport-n8n-workflows.sh "your-n8n-api-key" "https://n8n.example.com"
```

### Using Environment Variables

```bash
# Export API key
export N8N_API_KEY="your-n8n-api-key"
./scripts/reimport-n8n-workflows.sh

# Export API key and URL
export N8N_API_KEY="your-n8n-api-key"
export N8N_API_URL="https://n8n.example.com"
./scripts/reimport-n8n-workflows.sh
```

### From a Different Directory

```bash
cd /sessions/beautiful-stoic-cori/mnt/talosprimes
./scripts/reimport-n8n-workflows.sh
```

## Configuration

### Credential ID Mapping

The script maps backup credential names/IDs to current n8n instance credentials. Edit the `CREDENTIAL_MAP` array in the script to update mappings:

```bash
declare -A CREDENTIAL_MAP=(
    ["postgres"]="6Kosza77d9Ld32mw"
    ["Supabase Postgres"]="6Kosza77d9Ld32mw"
    ["httpHeaderAuth:talosprimes"]="AuJmz6W8aeutvysV"
    ["TalosPrimes API Auth"]="AuJmz6W8aeutvysV"
    # ... more mappings
)
```

### Backup Directory

By default, the script looks for backups in:
```
n8n_workflows/talosprimes/
```

To use a custom backup directory, modify the `BACKUP_DIR` variable in the script:

```bash
BACKUP_DIR="${PROJECT_DIR}/path/to/custom/backups"
```

### API Endpoint

Default n8n API endpoint: `http://localhost:5678`

Override with:
```bash
export N8N_API_URL="https://n8n.example.com"
./scripts/reimport-n8n-workflows.sh
```

## How It Works

### Step-by-Step Process

1. **Pre-flight Checks**
   - Validates required tools (curl, python3, jq)
   - Loads N8N_API_KEY from environment or .env file
   - Tests connection to n8n API

2. **Fetch Existing Workflows**
   - Retrieves all workflows from n8n instance
   - Stores in memory for quick lookups

3. **Process Each Workflow**
   - For each backup file in the list:
     - Extract webhook path from filename
     - Find existing workflow with matching webhook path
     - Validate backup JSON syntax
     - Replace credential IDs with current instance credentials
     - Send PUT request to update workflow
     - Activate workflow if update successful

4. **Logging and Summary**
   - Logs all operations with timestamps
   - Generates summary report
   - Returns appropriate exit code

### Webhook Path Matching

The script uses the filename to find existing workflows:

- Filename: `devis-list.json` → Webhook path: `devis-list`
- The script searches all workflows for one with a webhook node having this path
- If found, updates that workflow; if not found, skips it

### Credential Replacement

For each node in the workflow:
1. Checks if credentials are referenced
2. Looks up credential name/type in the mapping table
3. Replaces old credential ID with current instance ID
4. Preserves all other node configuration

## Output and Logging

### Console Output

The script provides real-time feedback:

```
[2024-02-17 16:45:30] [INFO] Starting workflow reimport process...
[2024-02-17 16:45:30] [SUCCESS] All required tools are available
[2024-02-17 16:45:31] [SUCCESS] Connection successful (HTTP 200)
[2024-02-17 16:45:32] [INFO] Processing: devis/devis-list.json
[2024-02-17 16:45:32] [INFO] Found existing workflow ID: abc123def456
[2024-02-17 16:45:33] [SUCCESS] Workflow updated successfully: devis-list
[2024-02-17 16:45:34] [SUCCESS] Workflow activated: devis-list
```

### Log File

A detailed log file is created with timestamps:
```
reimport-workflows-20240217_164530.log
```

Location: `scripts/` directory in project root

Review logs for detailed information about each operation:
```bash
tail -f scripts/reimport-workflows-*.log
```

## Error Handling

### Common Issues and Solutions

#### API Key Error
```
[ERROR] N8N_API_KEY not found
```

**Solution**: Provide API key via environment variable or argument:
```bash
export N8N_API_KEY="your-key"
./scripts/reimport-n8n-workflows.sh
```

#### Connection Error
```
[ERROR] Failed to connect to n8n (HTTP 403)
```

**Solution**: Check API key validity and n8n is running:
```bash
curl -H "X-N8N-API-KEY: $N8N_API_KEY" http://localhost:5678/api/v1/workflows
```

#### Backup File Not Found
```
[WARN] Backup file not found: devis/devis-list.json
```

**Solution**: Verify backup files exist:
```bash
ls -la n8n_workflows/talosprimes/devis/
```

#### Invalid JSON
```
[ERROR] Invalid JSON in backup file: devis/devis-list.json
```

**Solution**: Validate and fix the JSON file:
```bash
python3 -m json.tool n8n_workflows/talosprimes/devis/devis-list.json
```

#### Credential ID Not Found
```
[ERROR] Failed to process credentials
```

**Solution**: Update credential mappings in the script or ensure credentials exist in n8n:
```bash
# Check available credentials in n8n
curl -H "X-N8N-API-KEY: $N8N_API_KEY" http://localhost:5678/api/v1/credentials
```

## Advanced Usage

### Dry Run (Simulation)

To preview what the script would do without making changes:

```bash
# Create a wrapper that logs but doesn't execute API calls
bash -x ./scripts/reimport-n8n-workflows.sh 2>&1 | grep "curl" | head -20
```

### Manual Credential Mapping

To manually check and update credential IDs:

```bash
# Get all credentials in n8n
curl -H "X-N8N-API-KEY: $N8N_API_KEY" http://localhost:5678/api/v1/credentials | python3 -m json.tool

# Get a specific workflow
curl -H "X-N8N-API-KEY: $N8N_API_KEY" http://localhost:5678/api/v1/workflows/{id} | python3 -m json.tool
```

### Processing Individual Workflows

To process a single workflow manually:

```bash
# Extract and prepare the JSON
WORKFLOW_JSON=$(python3 << 'EOF'
import json
with open('n8n_workflows/talosprimes/devis/devis-list.json') as f:
    wf = json.load(f)
# Update credentials as needed
for node in wf['nodes']:
    if 'credentials' in node:
        # Update credential IDs here
        pass
# Remove read-only fields
for field in ['active', 'id', 'createdAt', 'updatedAt']:
    wf.pop(field, None)
print(json.dumps(wf))
EOF
)

# Update the workflow
curl -X PUT \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$WORKFLOW_JSON" \
  http://localhost:5678/api/v1/workflows/{workflow_id}
```

## Troubleshooting

### Enable Debug Mode

To see detailed curl output and Python execution:

```bash
bash -x ./scripts/reimport-n8n-workflows.sh 2>&1 | tee debug.log
```

### Check N8N API Health

```bash
# Check if n8n is running
curl -v http://localhost:5678/

# Check API key validity
curl -H "X-N8N-API-KEY: $N8N_API_KEY" http://localhost:5678/api/v1/user

# List all workflows
curl -H "X-N8N-API-KEY: $N8N_API_KEY" http://localhost:5678/api/v1/workflows | jq '.'
```

### Verify Backup Files

```bash
# Check if backup files are valid JSON
for file in n8n_workflows/talosprimes/**/*.json; do
  if ! python3 -m json.tool "$file" > /dev/null 2>&1; then
    echo "Invalid JSON: $file"
  fi
done
```

### Check Credentials

```bash
# List all credentials in n8n
curl -H "X-N8N-API-KEY: $N8N_API_KEY" http://localhost:5678/api/v1/credentials | python3 -m json.tool | grep -E "(name|id)" | head -20
```

## Performance Considerations

### Processing Time

- Each workflow typically takes 1-2 seconds to process
- 28 workflows would take approximately 1-2 minutes total
- Actual time depends on:
  - Network latency to n8n instance
  - JSON size and complexity
  - n8n API response time

### Resource Usage

- Memory: Minimal (< 50MB)
- CPU: Low (single-threaded bash/curl/python)
- Network: Light (one API call per workflow)
- Disk: Negligible (logs only)

## Best Practices

1. **Backup Current State**
   ```bash
   curl -H "X-N8N-API-KEY: $N8N_API_KEY" http://localhost:5678/api/v1/workflows > backup-before-reimport.json
   ```

2. **Test on Development First**
   - Run against a development n8n instance first
   - Verify all workflows update correctly
   - Check for any errors in the logs

3. **Run During Maintenance Window**
   - Workflows will be temporarily unavailable during updates
   - Coordinate with team to avoid disruptions

4. **Monitor After Reimport**
   - Check workflow execution logs in n8n UI
   - Verify webhook paths are correct
   - Test critical workflows manually

5. **Keep Logs**
   - Archive logs after successful import
   - Use for troubleshooting if issues arise later

## Security Considerations

- **API Key Security**: Never commit API keys to version control
- **Log Files**: May contain sensitive information; handle accordingly
- **Backup Files**: Ensure backup access is restricted
- **HTTPS**: Use HTTPS for remote n8n instances
- **Environment Variables**: Avoid exposing API keys in shell history

```bash
# Use environment variables to avoid shell history
export N8N_API_KEY="secret-key"
unset N8N_API_KEY  # Clear after use
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Reimport N8N Workflows
on:
  workflow_dispatch:

jobs:
  reimport:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run reimport script
        env:
          N8N_API_KEY: ${{ secrets.N8N_API_KEY }}
          N8N_API_URL: https://n8n.talosprimes.com
        run: ./scripts/reimport-n8n-workflows.sh
```

## Exit Codes

- `0`: All workflows reimported successfully
- `1`: One or more operations failed
- Script exits early with code 1 if:
  - Required tools are missing
  - API key cannot be loaded
  - Connection to n8n fails

## Changelog

### Version 1.0 (2024-02-17)
- Initial release
- Support for 28 workflows across 6 categories
- Credential ID mapping
- Webhook path matching
- Full logging and error handling
- Batch processing capability

## Support and Maintenance

### Updating Workflows

To add or remove workflows from the reimport list, edit the `WORKFLOWS_TO_REIMPORT` array in the script:

```bash
declare -a WORKFLOWS_TO_REIMPORT=(
    "devis/devis-list.json"
    "devis/devis-get.json"
    # Add more here
)
```

### Updating Credentials

When n8n credentials change, update the `CREDENTIAL_MAP`:

```bash
declare -A CREDENTIAL_MAP=(
    ["postgres"]="new-credential-id"
    # Update as needed
)
```

## Related Documentation

- [N8N API Documentation](https://docs.n8n.io/api/overview/)
- [N8N Workflow Export/Import](https://docs.n8n.io/workflows/export-import/)
- [Backup and Recovery Guide](./GUIDE_COMPLET_N8N.md)
