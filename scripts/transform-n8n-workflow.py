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
    if '$json.' in query and parser_node_name and not skip_json_replace:
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
    """Main transformation pipeline."""

    # Load credential map from environment (global fallback)
    global_map = json.loads(os.environ.get('CREDENTIAL_MAP', '{}'))

    # Extract real credential IDs from current n8n workflow (if provided)
    local_map = {}
    if current_n8n_path and os.path.exists(current_n8n_path):
        try:
            with open(current_n8n_path) as f:
                current_wf = json.load(f)
            for node in current_wf.get('nodes', []):
                for cred_type, cred_info in node.get('credentials', {}).items():
                    if isinstance(cred_info, dict):
                        cname = cred_info.get('name', '')
                        cid = str(cred_info.get('id', ''))
                        if cname and cid and 'REPLACE' not in cid and cid not in ('', 'null', 'None'):
                            local_map[cname] = cid
        except Exception:
            pass

    # Merge: local_map has priority, then global_map as fallback
    cred_map = {**global_map, **local_map}

    # Load the workflow backup
    with open(wf_path) as f:
        wf = json.load(f)

    wf.setdefault('settings', {})

    # Remove read-only fields
    for k in ['active', 'id', 'createdAt', 'updatedAt', 'versionId',
              'triggerCount', 'sharedWithProjects', 'homeProject',
              'tags', 'meta', 'pinData', 'staticData']:
        wf.pop(k, None)

    # ==================================================================
    # TRANSFORMATIONS
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
    # CREDENTIAL REPLACEMENT
    # ==================================================================
    replaced = 0
    unresolved = []
    for node in nodes:
        creds = node.get('credentials', {})
        for cred_type, cred_info in creds.items():
            if isinstance(cred_info, dict):
                cred_name = cred_info.get('name', '')
                cred_id = str(cred_info.get('id', ''))
                if cred_name and cred_name in cred_map:
                    cred_info['id'] = cred_map[cred_name]
                    replaced += 1
                elif 'REPLACE' in cred_id:
                    unresolved.append(cred_name)

    if replaced > 0:
        print(f'      {replaced} credentials resolues depuis n8n', file=sys.stderr)
    if unresolved:
        names = ', '.join(set(unresolved))
        print(f'      ATTENTION: credentials non resolues: {names}', file=sys.stderr)

    # Ensure required fields
    wf.setdefault('nodes', [])
    wf.setdefault('connections', {})
    wf.setdefault('settings', {})

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
