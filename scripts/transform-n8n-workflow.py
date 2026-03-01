#!/usr/bin/env python3
"""
Transform n8n workflow JSON before uploading to n8n API.

Applies all fixes from reimport-n8n-workflows.sh:
- Code nodes: code -> jsCode, $input.body fix, $().all()/.first() fixes, $json refs
- Postgres nodes: Jinja syntax, each(item), $json -> explicit Parser refs, schema fixes
- Credential ID replacement
- Cleanup read-only fields

Usage:
  python3 transform-n8n-workflow.py <workflow.json> [current_n8n.json]

  - workflow.json:     the backup JSON to transform
  - current_n8n.json:  (optional) the current workflow from n8n API, used to extract real credential IDs

Environment variables:
  CREDENTIAL_MAP:  JSON string mapping credential names to IDs (fallback)

Outputs transformed JSON to stdout.
Diagnostic messages go to stderr.
"""

import sys
import json
import os
import re
import traceback


def find_parser_node(nodes):
    """Find the Parser node name dynamically."""
    for node in nodes:
        if 'parser' in node.get('name', '').lower():
            return node['name']
    return None


def fix_code_node(node, parser_node_name):
    """Fix Code node issues: jsCode rename, $input.body, $() refs, $json refs."""
    params = node.get('parameters', {})

    # Rename 'code' -> 'jsCode' if needed
    if 'code' in params and 'jsCode' not in params:
        params['jsCode'] = params.pop('code')

    js = params.get('jsCode', '')
    if not js:
        return

    # Fix $input.body -> $input.first().json.body
    if '$input.body' in js:
        js = js.replace('$input.body', '$input.first().json.body')

    # Fix $('NodeName').all() -> .all().map(item => item.json)
    js = re.sub(
        r"\$\('([^']+)'\)\.all\(\)(?!\.map)",
        r"$('\1').all().map(item => item.json)",
        js
    )

    # Fix $('NodeName').first() assigned to variable -> .first().json
    js = re.sub(
        r"\$\('([^']+)'\)\.first\(\)(?=\s*[;,\)])",
        r"$('\1').first().json",
        js
    )

    # Fix $('NodeName').first().field -> .first().json.field
    js = re.sub(
        r"\$\('([^']+)'\)\.first\(\)\.(?!json\b)(\w+)",
        r"$('\1').first().json.\2",
        js
    )

    # Fix $json.lines -> Parser reference
    node_name_lower = node.get('name', '').lower()
    if parser_node_name and '$json.lines' in js:
        js = js.replace('$json.lines', f"$('{parser_node_name}').first().json.lines")

    # Fix $json.page/limit/offset in Format Response nodes
    if parser_node_name and ('format' in node_name_lower or 'response' in node_name_lower):
        for field in ['page', 'limit', 'offset']:
            js = js.replace(f'$json.{field}', f"$('{parser_node_name}').first().json.{field}")

    # Code nodes MUST return items in n8n v2
    if 'return ' not in js and 'return\n' not in js:
        js = js.rstrip() + '\nreturn $input.all();'

    params['jsCode'] = js


def fix_postgres_node(node, parser_node_name):
    """Fix Postgres node queries: Jinja, each(item), $json refs, schema fixes."""
    params = node.get('parameters', {})
    query = params.get('query', '')
    if not query:
        return

    skip_json_replace = False

    # ---- Skip already-fixed queries (valid n8n expressions with .map()) ----
    # If query uses n8n expressions with .map() and .join(), it's already correct
    if '.map(' in query and '.join(' in query and '={{ ' in query:
        skip_json_replace = True
        # Still apply schema fixes below, but skip syntax transformations
        params['query'] = query
        # Jump to schema fixes only
        # Fix table name: bon_commandes -> bons_commande
        if 'bon_commandes' in query:
            query = query.replace('bon_commandes', 'bons_commande')
        params['query'] = query
        return

    # ---- Jinja syntax handling ----
    # Strip {% if %}...{% endif %} blocks
    query = re.sub(r'\{%\s*if\s+[^%]*%\}.*?\{%\s*endif\s*%\}', '', query, flags=re.DOTALL)

    # Convert {% for %} loops to JavaScript .map().join()
    if '{%' in query and 'for' in query:
        if 'bon_commande_lines' in query:
            pn = "08. Prepare Lines"
            ref = f"$('{pn}').first().json"
            parts = []
            parts.append("={{ " + ref + ".lines && " + ref + ".lines.length > 0")
            parts.append(" ? " + ref + '.lines.map((line, idx) => ')
            parts.append('"INSERT INTO bon_commande_lines (id, bon_commande_id, code_article, designation, quantite, prix_unitaire_ht, total_ht, ordre) VALUES (gen_random_uuid(), ')
            parts.append("'\" + " + ref + ".bonId + \"', \" + ")
            parts.append('(line.codeArticle ? "\'" + line.codeArticle + "\'" : "null") + ", ')
            parts.append("'\" + (line.designation || '') + \"', \" + ")
            parts.append('(line.quantite || 0) + ", " + (line.prixUnitaireHt || 0) + ", " + (line.totalHt || 0) + ", " + idx + ")"')
            parts.append(').join("; ") + "; SELECT 1" : "SELECT 1" }}')
            query = ''.join(parts)
            skip_json_replace = True
        elif 'avoir_lines' in query:
            query = '={{ $json.lineQueries && $json.lineQueries.length > 0 ? "INSERT INTO avoir_lines (avoir_id, ordre, code_article, designation, quantite, prix_unitaire_ht, total_ht) VALUES " + $json.lineQueries.map(item => "(\'" + item.avoirId + "\', " + item.ordre + ", \'" + (item.codeArticle || \'\') + "\', \'" + (item.designation || \'\') + "\', " + item.quantite + ", " + item.prixUnitaireHt + ", " + item.totalHt + ")").join(", ") : "SELECT 1" }}'
            skip_json_replace = True

    # ---- Convert each(item) pseudo-syntax ----
    if 'each(item)' in query:
        if 'devis_lines' in query:
            ref = "$('08. Prepare Lines').first().json"
            query = '={{ ' + ref + '.lineInserts && ' + ref + '.lineInserts.length > 0 ? ' + ref + ".lineInserts.map(item => \"INSERT INTO devis_lines (id, devis_id, code_article, designation, quantite, prix_unitaire_ht, total_ht, ordre) VALUES (gen_random_uuid(), '\" + item.devisId + \"', \" + (item.codeArticle ? \"'\" + item.codeArticle + \"'\" : \"null\") + \", '\" + (item.designation || item.description || '') + \"', \" + (item.quantite || 0) + \", \" + (item.prixUnitaireHt || item.prixUnitaire || 0) + \", \" + (item.totalHt || item.montantHt || 0) + \", \" + (item.ordre || item.ligneNumero || 0) + \")\").join(\"; \") + \"; SELECT 1\" : \"SELECT 1\" }}"
            skip_json_replace = True
        elif 'proforma_lines' in query:
            ref = "$('08. Prepare Lines').first().json"
            query = '={{ ' + ref + '.lineInserts && ' + ref + '.lineInserts.length > 0 ? ' + ref + ".lineInserts.map(item => \"INSERT INTO proforma_lines (id, proforma_id, code_article, designation, quantite, prix_unitaire_ht, total_ht, ordre) VALUES (gen_random_uuid(), '\" + item.proformaId + \"', \" + (item.codeArticle ? \"'\" + item.codeArticle + \"'\" : \"null\") + \", '\" + (item.designation || item.description || '') + \"', \" + (item.quantite || 0) + \", \" + (item.prixUnitaireHt || item.prixUnitaire || 0) + \", \" + (item.totalHt || item.montantHt || 0) + \", \" + (item.ordre || item.ligneNumero || 0) + \")\").join(\"; \") + \"; SELECT 1\" : \"SELECT 1\" }}"
            skip_json_replace = True
        elif 'invoice_lines' in query:
            ref = "$('10. Prepare Lines').first().json"
            query = '={{ ' + ref + '.lines && ' + ref + '.lines.length > 0 ? ' + ref + ".lines.map(item => \"INSERT INTO invoice_lines (id, invoice_id, code_article, designation, quantite, prix_unitaire_ht, total_ht, ordre) VALUES (gen_random_uuid(), '\" + " + ref + ".invoiceId + \"', \" + (item.code_article ? \"'\" + item.code_article + \"'\" : \"null\") + \", '\" + (item.designation || '') + \"', \" + (item.quantite || 0) + \", \" + (item.prix_unitaire_ht || 0) + \", \" + (item.total_ht || 0) + \", \" + (item.ordre || 0) + \")\").join(\"; \") + \"; SELECT 1\" : \"SELECT 1\" }}"
            skip_json_replace = True

    # ---- Replace $json. with explicit Parser reference ----
    # IMPORTANT: Ne PAS remplacer quand la query est une simple expression
    # comme "={{ $json.query }}" ou "={{ $json.someField }}" — dans ces cas,
    # $json référence la sortie du nœud PRÉCÉDENT (ex: Build SQL), pas le Parser.
    # On ne remplace que quand $json. est intégré dans du SQL brut.
    if '$json.' in query and parser_node_name and not skip_json_replace:
        # Détecter si c'est une simple expression $json (référence au nœud précédent)
        simple_expr = re.match(r'^=\{\{\s*\$json\.\w+\s*\}\}$', query.strip())
        # Détecter si $json est déjà qualifié avec $('...').first().json
        already_qualified = "$('".lower() in query.lower() and '.first().json.' in query
        if not simple_expr and not already_qualified:
            explicit_ref = f"$('{parser_node_name}').first().json."
            query = query.replace('$json.', explicit_ref)

    # Fix $('NodeName').first().field -> .first().json.field in Postgres expressions
    query = re.sub(
        r"\$\('([^']+)'\)\.first\(\)\.(?!json\b)(\w+)",
        r"$('\1').first().json.\2",
        query
    )

    # ---- Schema fixes ----

    # Notifications table has NO updated_at column
    if 'notifications' in query and 'updated_at' in query:
        query = re.sub(r',\s*updated_at\s*=\s*NOW\(\)', '', query)
        query = re.sub(r',\s*updated_at\)', ')', query)
        query = re.sub(r",\s*NOW\(\)\)\s*RETURNING", ') RETURNING', query)
        query = query.replace(', updated_at', '')

    # Fix table name: bon_commandes -> bons_commande
    if 'bon_commandes' in query:
        query = query.replace('bon_commandes', 'bons_commande')

    # Generic fix: add gen_random_uuid() to INSERTs missing it
    if 'INSERT INTO' in query and 'gen_random_uuid' not in query:
        insert_match = re.match(r"(=?INSERT INTO\s+\w+\s*\()(\s*\w+)", query)
        if insert_match and insert_match.group(2).strip() != 'id':
            query = query.replace(
                insert_match.group(0),
                insert_match.group(1) + 'id, ' + insert_match.group(2).strip()
            )
            values_match = re.search(r"VALUES\s*\(", query)
            if values_match:
                query = query[:values_match.end()] + "gen_random_uuid(), " + query[values_match.end():]

    # Fix proforma alias: FROM proformas d -> FROM proformas p
    if 'FROM proformas d ' in query:
        query = query.replace('FROM proformas d ', 'FROM proformas p ')

    # Fix event_logs column names
    if 'event_logs' in query:
        query = re.sub(r'(?<!\.)workflow\b(?!_n8n)', 'workflow_n8n_id', query)
        query = re.sub(r'(?<!\.)message\b(?!_erreur)', 'message_erreur', query)
        query = re.sub(r'(?<!\.)metadata\b', 'payload', query)
        query = query.replace(', updated_at', '')

    params['query'] = query


def transform_workflow(wf_path, current_n8n_path=None):
    """Main transformation pipeline.

    CREDENTIAL STRATEGY: Never replace credentials from the backup JSON.
    Instead, copy credentials directly from the current n8n workflow (node by node).
    This ensures credentials are never lost or corrupted during deployment.
    """

    # Load the workflow backup
    with open(wf_path) as f:
        wf = json.load(f)

    wf.setdefault('settings', {})

    # Remove read-only fields (but preserve versionId — needed for PUT API)
    for k in ['active', 'id', 'createdAt', 'updatedAt',
              'triggerCount', 'sharedWithProjects', 'homeProject',
              'tags', 'meta', 'pinData', 'staticData', '_comment']:
        wf.pop(k, None)
    # versionId will be injected from the current n8n workflow below
    wf.pop('versionId', None)

    # ==================================================================
    # EXTRACT CREDENTIALS FROM CURRENT N8N WORKFLOW
    # Build a map: node_name -> credentials (from the live n8n workflow)
    # Also build a map: cred_name -> {id, name} for fallback by credential name
    # ==================================================================
    current_node_creds = {}  # node_name -> credentials dict
    current_cred_by_name = {}  # cred_name -> {id, name}
    if current_n8n_path and os.path.exists(current_n8n_path):
        try:
            with open(current_n8n_path) as f:
                current_wf = json.load(f)

            # Inject versionId from current n8n workflow (required for PUT API)
            current_version_id = current_wf.get('versionId')
            if current_version_id:
                wf['versionId'] = current_version_id
                print(f"      versionId injecte: {current_version_id}", file=sys.stderr)

            for node in current_wf.get('nodes', []):
                node_name = node.get('name', '')
                creds = node.get('credentials', {})
                if creds and node_name:
                    current_node_creds[node_name] = creds
                    for cred_type, cred_info in creds.items():
                        if isinstance(cred_info, dict):
                            cname = cred_info.get('name', '')
                            cid = str(cred_info.get('id', ''))
                            if cname and cid and cid not in ('', 'null', 'None'):
                                current_cred_by_name[cname] = cred_info
                                print(f"      Credential existante: {cname} -> {cid}", file=sys.stderr)
        except Exception as e:
            print(f"      ERREUR lecture workflow n8n actuel: {e}", file=sys.stderr)

    # ==================================================================
    # TRANSFORMATIONS (code fixes, query fixes)
    # ==================================================================
    nodes = wf.get('nodes', [])
    parser_node_name = find_parser_node(nodes)

    transform_count = 0
    for node in nodes:
        if node.get('type') == 'n8n-nodes-base.code':
            fix_code_node(node, parser_node_name)
            transform_count += 1
        if node.get('type') == 'n8n-nodes-base.postgres':
            fix_postgres_node(node, parser_node_name)
            transform_count += 1

    if transform_count > 0:
        print(f'      {transform_count} nodes transformes', file=sys.stderr)

    # ==================================================================
    # CREDENTIAL PRESERVATION (never replace — always copy from n8n)
    # Strategy:
    #   1. If the node exists in current n8n by name → copy its credentials entirely
    #   2. Else, for each credential in the backup node, try to match by credential
    #      name from any node in the current n8n workflow
    #   3. Only as last resort, keep the backup's credential IDs + use global map
    # ==================================================================
    global_map = json.loads(os.environ.get('CREDENTIAL_MAP', '{}'))
    preserved = 0
    fallback = 0
    for node in nodes:
        node_name = node.get('name', '')
        backup_creds = node.get('credentials', {})

        if not backup_creds:
            continue

        # Strategy 1: exact node name match → copy ALL credentials from n8n
        if node_name in current_node_creds:
            node['credentials'] = current_node_creds[node_name]
            preserved += 1
            print(f"      [{node_name}] credentials copiees depuis n8n (match exact)", file=sys.stderr)
            continue

        # Strategy 2: match by credential name from any n8n node
        for cred_type, cred_info in backup_creds.items():
            if isinstance(cred_info, dict):
                cred_name = cred_info.get('name', '')
                if cred_name and cred_name in current_cred_by_name:
                    live = current_cred_by_name[cred_name]
                    cred_info['id'] = live.get('id', cred_info.get('id'))
                    preserved += 1
                    print(f"      [{node_name}] credential '{cred_name}' -> {live.get('id')} (match par nom)", file=sys.stderr)
                elif cred_name and cred_name in global_map:
                    cred_info['id'] = global_map[cred_name]
                    fallback += 1
                    print(f"      [{node_name}] credential '{cred_name}' -> {global_map[cred_name]} (fallback global)", file=sys.stderr)
                else:
                    print(f"      [{node_name}] ATTENTION: credential '{cred_name}' non trouvee dans n8n", file=sys.stderr)

    if preserved > 0:
        print(f'      {preserved} credentials preservees depuis n8n', file=sys.stderr)
    if fallback > 0:
        print(f'      {fallback} credentials via fallback global', file=sys.stderr)

    # Ensure required fields
    wf.setdefault('nodes', [])
    wf.setdefault('connections', {})
    wf.setdefault('settings', {})

    # STRICT WHITELIST: only output properties accepted by n8n v1 PUT API
    # This prevents "request/body must NOT have additional properties" errors
    # when the n8n API has additionalProperties: false in its schema
    allowed_keys = {'name', 'nodes', 'connections', 'settings', 'staticData', 'versionId'}
    extra_keys = set(wf.keys()) - allowed_keys
    for k in extra_keys:
        wf.pop(k, None)
        print(f"      Removed extra top-level key: {k}", file=sys.stderr)

    # Output transformed JSON
    print(json.dumps(wf))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <workflow.json> [current_n8n.json]", file=sys.stderr)
        sys.exit(1)

    wf_path = sys.argv[1]
    current_path = sys.argv[2] if len(sys.argv) > 2 else None

    try:
        transform_workflow(wf_path, current_path)
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
