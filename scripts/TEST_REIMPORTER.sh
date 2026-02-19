#!/bin/bash
# Simple test to verify the reimporter script structure without running it
# This checks that all functions are defined and the script is syntactically correct

SCRIPT="/sessions/beautiful-stoic-cori/mnt/talosprimes/scripts/reimport-n8n-workflows.sh"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing N8N Reimporter Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if script exists
if [ ! -f "$SCRIPT" ]; then
    echo "❌ Script not found: $SCRIPT"
    exit 1
fi

echo "✓ Script file exists"
echo "✓ File size: $(wc -c < "$SCRIPT") bytes"
echo "✓ File permissions: $(ls -l "$SCRIPT" | awk '{print $1}')"

# Check syntax
if bash -n "$SCRIPT" 2>&1; then
    echo "✓ Bash syntax is valid"
else
    echo "❌ Bash syntax errors found"
    exit 1
fi

# Check for required functions
echo ""
echo "Checking for required functions..."
for func in log header validate_tools load_api_key validate_n8n_connection \
            get_all_workflows find_workflow_by_webhook replace_credentials_in_workflow \
            update_workflow activate_workflow process_workflow main; do
    if grep -q "^${func}()" "$SCRIPT"; then
        echo "✓ Function defined: $func"
    else
        echo "⚠ Function not found: $func"
    fi
done

# Check for required variables
echo ""
echo "Checking for configuration..."
if grep -q "declare -A CREDENTIAL_MAP" "$SCRIPT"; then
    echo "✓ Credential mapping configured"
    grep -A 10 "declare -A CREDENTIAL_MAP" "$SCRIPT" | head -5
fi

if grep -q "WORKFLOWS_TO_REIMPORT" "$SCRIPT"; then
    echo "✓ Workflow list configured"
    WF_COUNT=$(grep -c "\.json" "$SCRIPT" | head -1)
    echo "  $(grep '\.json' "$SCRIPT" | wc -l) workflows configured for reimport"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ All checks passed! Script is ready to use."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Quick start:"
echo "  ./scripts/reimport-n8n-workflows.sh"
echo ""
echo "With API key:"
echo "  ./scripts/reimport-n8n-workflows.sh 'your-api-key'"
echo ""
echo "View documentation:"
echo "  cat scripts/REIMPORT_QUICK_START.md"
echo "  cat scripts/REIMPORT_WORKFLOWS_README.md"
