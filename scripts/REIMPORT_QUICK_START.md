# Quick Start: N8N Workflow Reimporter

## 30-Second Setup

```bash
cd /sessions/beautiful-stoic-cori/mnt/talosprimes
./scripts/reimport-n8n-workflows.sh
```

The script will:
1. Load API key from `packages/platform/.env`
2. Connect to n8n at `http://localhost:5678`
3. Find and update all broken workflows
4. Activate them automatically
5. Show you the results

## Pre-requisites Checklist

- [ ] You have access to the VPS
- [ ] N8N is running: `curl http://localhost:5678`
- [ ] API key is in `.env`: Check `packages/platform/.env` for `N8N_API_KEY`
- [ ] Backup files exist: `ls n8n_workflows/talosprimes/devis/`

## Running the Reimporter

### Option 1: Use .env (Recommended)
```bash
./scripts/reimport-n8n-workflows.sh
```

### Option 2: Provide API Key as Argument
```bash
./scripts/reimport-n8n-workflows.sh "your-api-key-here"
```

### Option 3: Use Environment Variable
```bash
export N8N_API_KEY="your-api-key-here"
./scripts/reimport-n8n-workflows.sh
```

### Option 4: Custom N8N URL
```bash
./scripts/reimport-n8n-workflows.sh "api-key" "https://n8n.example.com"
```

## What Gets Reimported

The script updates **28 workflows** across 6 modules:

- **Devis**: 7 workflows (list, get, created, sent, accepted, deleted, convert-to-invoice)
- **Bons de Commande**: 6 workflows (list, get, created, validated, deleted, convert-to-invoice)
- **Proforma**: 7 workflows (list, get, created, sent, accepted, deleted, convert-to-invoice)
- **Notifications**: 4 workflows (created, deleted, read, list)
- **Logs**: 2 workflows (list, stats)
- **Twilio**: 2 workflows (outbound-call, test-call)

## Expected Output

Success output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
N8N Workflow Reimporter - TalosPrimes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2024-02-17 16:45:30] [INFO] Starting workflow reimport process...
[2024-02-17 16:45:30] [SUCCESS] All required tools are available
[2024-02-17 16:45:31] [SUCCESS] Connection successful (HTTP 200)
[2024-02-17 16:45:32] [INFO] Retrieved workflow list from n8n
...
[2024-02-17 16:46:15] [SUCCESS] ✅ All workflows reimported successfully!
```

## Troubleshooting in 60 Seconds

### Problem: "N8N_API_KEY not found"
**Solution**: Set the API key
```bash
export N8N_API_KEY="your-key"
./scripts/reimport-n8n-workflows.sh
```

### Problem: "Failed to connect to n8n"
**Solution**: Check if n8n is running
```bash
curl http://localhost:5678
# Should return HTML, not connection refused
```

### Problem: "Backup file not found"
**Solution**: Verify backup files exist
```bash
ls -la n8n_workflows/talosprimes/devis/
```

### Problem: HTTP 403 error
**Solution**: Check API key is valid
```bash
curl -H "X-N8N-API-KEY: $N8N_API_KEY" http://localhost:5678/api/v1/workflows
# Should return JSON, not 403
```

## Checking the Results

### View the log
```bash
tail -f scripts/reimport-workflows-*.log
```

### Check n8n UI
1. Open http://localhost:5678 in browser
2. Click "Workflows"
3. Verify workflows are active (green status)
4. Click on a workflow to verify nodes are populated

### Test a workflow manually
```bash
# Test the devis-list workflow
curl -X POST http://localhost:5678/webhook/devis-list \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test"}'
```

## Common API Key Locations

### In packages/platform/.env
```bash
grep N8N_API_KEY packages/platform/.env
```

### In environment
```bash
echo $N8N_API_KEY
```

### Getting the API key from N8N
```bash
# From inside n8n container
docker exec n8n cat /home/node/.n8n/config.json | grep apiKey

# Or from the N8N UI
# Account Settings → API Keys
```

## Next Steps

1. **Monitor Workflows**: Check n8n UI to verify all workflows are active
2. **Test Critical Paths**: Run a few workflows manually to ensure they work
3. **Check Logs**: Review the reimport log for any warnings
4. **Backup**: Keep a copy of the reimport log for records

## Performance

- **Time to complete**: ~1-2 minutes for all 28 workflows
- **Network impact**: Minimal (light API calls only)
- **System load**: Very low (single-threaded, no heavy processing)

## What's Happening Behind the Scenes

1. Loads the API key from your `.env` file
2. Tests the connection to n8n API
3. Fetches all existing workflows from n8n
4. For each backup file:
   - Finds the workflow by webhook path (e.g., "devis-list")
   - Reads the backup JSON file
   - Replaces old credential IDs with new ones
   - Sends updated workflow to n8n API
   - Activates the workflow
5. Logs everything with timestamps
6. Shows you a summary of what happened

## API Credentials Being Mapped

The script automatically updates these credential references:

| Type | Old ID | New ID |
|------|--------|--------|
| Postgres | `REPLACE_WITH_...` | `6Kosza77d9Ld32mw` |
| TalosPrimes API | Any old value | `AuJmz6W8aeutvysV` |
| Resend | Any old value | `ZoJkKnTqGisK2Idh` |
| Twilio | Any old value | `9dKAFunSg4lJcj77` |
| N8N API | Any old value | `UOxVqcaXs0NeqsmD` |

## Getting Help

### View full documentation
```bash
cat scripts/REIMPORT_WORKFLOWS_README.md
```

### Check script options
```bash
head -50 scripts/reimport-n8n-workflows.sh
```

### Debug mode
```bash
bash -x ./scripts/reimport-n8n-workflows.sh 2>&1 | tee debug.log
```

## After Successful Reimport

- [ ] All 28 workflows show as active in n8n UI
- [ ] Log file shows 28 successful updates
- [ ] Test a few workflows by calling their webhooks
- [ ] Check n8n execution logs to verify workflows run correctly
- [ ] Save the log file for records: `cp scripts/reimport-workflows-*.log ~/backups/`

## One-Command Reimport

Copy and paste this to reimport everything at once:

```bash
cd /sessions/beautiful-stoic-cori/mnt/talosprimes && ./scripts/reimport-n8n-workflows.sh
```

That's it! The script handles the rest.
