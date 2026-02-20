#!/bin/bash
# =============================================================
# organize-n8n-workflows.sh
# Supprime les doublons et classe les workflows dans des tags
# AVEC PAUSES entre chaque appel API pour eviter corruption SQLite
#
# Usage: bash scripts/organize-n8n-workflows.sh
# =============================================================

set +e

# Charger les variables
if [ -f "/var/www/talosprimes/packages/platform/.env" ]; then
  set -a
  source /var/www/talosprimes/packages/platform/.env 2>/dev/null
  set +a
fi

export N8N_API_URL="${N8N_API_URL:-http://localhost:5678}"
export N8N_API_KEY="${N8N_API_KEY:-}"

# Debug : verifier que la cle est bien chargee
echo "[DEBUG] N8N_API_URL=$N8N_API_URL"
echo "[DEBUG] N8N_API_KEY=${N8N_API_KEY:0:8}..."

if [ -z "$N8N_API_KEY" ]; then
  echo "[ERREUR] N8N_API_KEY non definie"
  echo "  Verifiez que /var/www/talosprimes/packages/platform/.env contient N8N_API_KEY"
  exit 1
fi

# Verifier que n8n repond
HTTP_CHECK=$(curl -s -o /dev/null -w "%{http_code}" -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_API_URL/api/v1/workflows?limit=1" 2>/dev/null)
if [ "$HTTP_CHECK" != "200" ]; then
  echo "[ERREUR] n8n ne repond pas correctement (HTTP $HTTP_CHECK)"
  echo "  Verifiez que n8n tourne et que la cle API est correcte"
  exit 1
fi

echo ""
echo "========================================="
echo "  ORGANISATION n8n - Doublons + Tags"
echo "  AVEC PAUSES (1s/appel, 3s/10 appels)"
echo "========================================="
echo ""

# =============================================================
# ETAPE 1 : Supprimer les doublons (avec pauses)
# =============================================================
echo "[1/3] Suppression des doublons..."

python3 << 'PYTHON_DEDUP'
import json, urllib.request, os, sys, time

api_url = os.environ.get('N8N_API_URL', 'http://localhost:5678')
api_key = os.environ.get('N8N_API_KEY', '')

if not api_key:
    print('  [ERREUR] N8N_API_KEY vide dans Python!')
    sys.exit(1)

def api_get(path):
    req = urllib.request.Request(f'{api_url}{path}', headers={'X-N8N-API-KEY': api_key})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())

def api_delete(path):
    req = urllib.request.Request(f'{api_url}{path}', method='DELETE', headers={'X-N8N-API-KEY': api_key})
    resp = urllib.request.urlopen(req, timeout=30)
    return resp.status

# Recuperer tous les workflows (avec pagination)
all_workflows = []
cursor = ''
for _ in range(50):
    url = f'/api/v1/workflows?limit=250'
    if cursor:
        url += f'&cursor={cursor}'
    data = api_get(url)
    wfs = data.get('data', [])
    all_workflows.extend(wfs)
    cursor = data.get('nextCursor', '')
    if not cursor or not wfs:
        break
    time.sleep(1)

print(f'  -> {len(all_workflows)} workflows trouves')

# Grouper par nom
by_name = {}
for wf in all_workflows:
    name = wf.get('name', '')
    if name not in by_name:
        by_name[name] = []
    by_name[name].append(wf)

# Identifier les doublons
to_delete = []
to_keep = []
for name, wfs in by_name.items():
    if len(wfs) == 1:
        to_keep.append(wfs[0])
        continue

    # Garder le premier actif, ou le premier si aucun actif
    active = [w for w in wfs if w.get('active')]
    if active:
        keeper = active[0]
    else:
        keeper = wfs[0]

    to_keep.append(keeper)
    for wf in wfs:
        if wf['id'] != keeper['id']:
            to_delete.append(wf)

print(f'  -> {len(to_keep)} workflows uniques a garder')
print(f'  -> {len(to_delete)} doublons a supprimer')

if not to_delete:
    print('  -> Aucun doublon, rien a supprimer')
else:
    # Supprimer les doublons AVEC PAUSES
    deleted = 0
    errors = 0
    for i, wf in enumerate(to_delete):
        try:
            # D'abord desactiver si actif
            if wf.get('active'):
                try:
                    req = urllib.request.Request(
                        f'{api_url}/api/v1/workflows/{wf["id"]}/deactivate',
                        method='POST',
                        headers={'X-N8N-API-KEY': api_key}
                    )
                    urllib.request.urlopen(req, timeout=30)
                    time.sleep(1)  # PAUSE apres desactivation
                except:
                    pass

            status = api_delete(f'/api/v1/workflows/{wf["id"]}')
            deleted += 1
            print(f'  [{deleted}/{len(to_delete)}] Supprime: {wf.get("name","")} (id={wf["id"]})')
        except Exception as e:
            print(f'  [WARN] Echec suppression {wf["id"]} ({wf.get("name","")}): {e}')
            errors += 1

        # PAUSE entre chaque appel
        time.sleep(1)
        # PAUSE supplementaire tous les 10 appels
        if (i + 1) % 10 == 0:
            print(f'  ... pause 3s ({i+1}/{len(to_delete)}) ...')
            time.sleep(3)

    print(f'  -> {deleted} doublons supprimes, {errors} erreurs')

# Ecrire la liste des workflows restants pour l'etape 2
remaining = []
for wf in to_keep:
    remaining.append({'id': wf['id'], 'name': wf.get('name', ''), 'active': wf.get('active', False)})

with open('/tmp/n8n-remaining-wf.json', 'w') as f:
    json.dump(remaining, f)

PYTHON_DEDUP

echo ""

# =============================================================
# ETAPE 2 : Creer les tags
# =============================================================
echo "[2/3] Creation des tags..."

python3 << 'PYTHON_TAGS'
import json, urllib.request, os, sys, time

api_url = os.environ.get('N8N_API_URL', 'http://localhost:5678')
api_key = os.environ.get('N8N_API_KEY', '')

def api_get(path):
    req = urllib.request.Request(f'{api_url}{path}', headers={'X-N8N-API-KEY': api_key})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())

def api_post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(f'{api_url}{path}', data=data, method='POST',
        headers={'X-N8N-API-KEY': api_key, 'Content-Type': 'application/json'})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())

# Regles de classification : (mot-cle -> tag)
TAG_RULES = [
    ('invoice',                                   'Factures'),
    ('facture',                                   'Factures'),
    ('devis',                                     'Devis'),
    ('avoir',                                     'Avoirs'),
    ('proforma',                                  'Proforma'),
    ('bdc',                                       'Bons de Commande'),
    ('Clients -',                                 'Clients'),
    ('client_',                                   'Clients'),
    ('client-space',                              'Espace Client'),
    ('Leads -',                                   'Leads'),
    ('lead_',                                     'Leads'),
    ('Inscription',                               'Leads'),
    ('Onboarding',                                'Onboarding'),
    ('Abonnements',                               'Abonnements'),
    ('Stripe',                                    'Abonnements'),
    ('compta',                                    'Comptabilite'),
    ('notification',                              'Notifications'),
    ('sms',                                       'SMS / Appels'),
    ('twilio',                                    'SMS / Appels'),
    ('call-log',                                  'SMS / Appels'),
    ('Agent',                                     'Agent IA'),
    ('agent',                                     'Agent IA'),
    ('questionnaire',                             'Questionnaires'),
    ('article-code',                              'Articles'),
    ('logs',                                      'Logs'),
    ('Deploy',                                    'Deploy'),
]

def get_tag_for_workflow(name):
    for keyword, tag in TAG_RULES:
        if keyword in name:
            return tag
    return 'Autres'

# Recuperer les tags existants
try:
    existing_tags = api_get('/api/v1/tags')
    if isinstance(existing_tags, list):
        tag_map = {t['name']: t['id'] for t in existing_tags}
    elif isinstance(existing_tags, dict):
        tag_map = {t['name']: t['id'] for t in existing_tags.get('data', existing_tags.get('items', []))}
    else:
        tag_map = {}
except:
    tag_map = {}

print(f'  -> {len(tag_map)} tags existants')

# Charger les workflows restants
with open('/tmp/n8n-remaining-wf.json', 'r') as f:
    workflows = json.load(f)

# Determiner les tags necessaires
needed_tags = set()
wf_tags = {}
for wf in workflows:
    tag = get_tag_for_workflow(wf['name'])
    wf_tags[wf['id']] = tag
    needed_tags.add(tag)

print(f'  -> {len(needed_tags)} tags necessaires: {", ".join(sorted(needed_tags))}')

# Creer les tags manquants (avec pauses)
created = 0
for tag_name in sorted(needed_tags):
    if tag_name not in tag_map:
        try:
            result = api_post('/api/v1/tags', {'name': tag_name})
            tag_map[tag_name] = result.get('id', '')
            created += 1
            print(f'  + Tag cree: {tag_name}')
            time.sleep(1)  # PAUSE entre chaque creation
        except Exception as e:
            print(f'  [WARN] Echec creation tag "{tag_name}": {e}')

print(f'  -> {created} nouveaux tags crees')

# Ecrire le mapping pour l'etape 3
mapping = []
for wf in workflows:
    tag_name = wf_tags[wf['id']]
    tag_id = tag_map.get(tag_name, '')
    if tag_id:
        mapping.append({'wf_id': wf['id'], 'wf_name': wf['name'], 'tag_name': tag_name, 'tag_id': tag_id})

with open('/tmp/n8n-tag-mapping.json', 'w') as f:
    json.dump(mapping, f)

PYTHON_TAGS

echo ""

# =============================================================
# ETAPE 3 : Assigner les tags aux workflows (avec pauses)
# =============================================================
echo "[3/3] Assignation des tags aux workflows..."

python3 << 'PYTHON_ASSIGN'
import json, urllib.request, os, sys, time

api_url = os.environ.get('N8N_API_URL', 'http://localhost:5678')
api_key = os.environ.get('N8N_API_KEY', '')

def api_patch(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(f'{api_url}{path}', data=data, method='PATCH',
        headers={'X-N8N-API-KEY': api_key, 'Content-Type': 'application/json'})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())

def api_put(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(f'{api_url}{path}', data=data, method='PUT',
        headers={'X-N8N-API-KEY': api_key, 'Content-Type': 'application/json'})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())

# Charger le mapping
with open('/tmp/n8n-tag-mapping.json', 'r') as f:
    mapping = json.load(f)

# Grouper par tag pour affichage
by_tag = {}
for m in mapping:
    tag = m['tag_name']
    if tag not in by_tag:
        by_tag[tag] = []
    by_tag[tag].append(m['wf_name'])

# Assigner les tags AVEC PAUSES
assigned = 0
errors = 0
for i, m in enumerate(mapping):
    try:
        api_patch(f'/api/v1/workflows/{m["wf_id"]}', {
            'tags': [{'id': m['tag_id']}]
        })
        assigned += 1
    except Exception as e:
        # Fallback: PUT
        try:
            api_put(f'/api/v1/workflows/{m["wf_id"]}/tags', [{'id': m['tag_id']}])
            assigned += 1
        except Exception as e2:
            print(f'  [WARN] Echec tag {m["wf_name"]}: {e2}')
            errors += 1

    # PAUSE entre chaque appel
    time.sleep(1)
    # PAUSE supplementaire tous les 10 appels
    if (i + 1) % 10 == 0:
        print(f'  ... {i+1}/{len(mapping)} tagges (pause 3s) ...')
        time.sleep(3)

print(f'  -> {assigned}/{len(mapping)} workflows tagges, {errors} erreurs')
print()

# Resume par tag
print('  RESUME PAR TAG:')
print('  ' + '-' * 50)
for tag in sorted(by_tag.keys()):
    wfs = by_tag[tag]
    print(f'  {tag} ({len(wfs)} workflows)')
    for wf_name in sorted(wfs):
        print(f'    - {wf_name}')
    print()

# Nettoyage
try:
    os.remove('/tmp/n8n-remaining-wf.json')
    os.remove('/tmp/n8n-tag-mapping.json')
except:
    pass

PYTHON_ASSIGN

echo ""
echo "========================================="
echo "  ORGANISATION TERMINEE"
echo "========================================="
echo ""

# Verification finale
echo "Verification finale..."
HTTP_CHECK=$(curl -s -o /dev/null -w "%{http_code}" -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_API_URL/healthz" 2>/dev/null)
if [ "$HTTP_CHECK" = "200" ]; then
  TOTAL=$(curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_API_URL/api/v1/workflows?limit=250" | python3 -c "import sys,json; print(len(json.loads(sys.stdin.read()).get('data',[])))")
  ACTIVE=$(curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_API_URL/api/v1/workflows?limit=250&active=true" | python3 -c "import sys,json; print(len(json.loads(sys.stdin.read()).get('data',[])))")
  echo "  Workflows total : $TOTAL"
  echo "  Workflows actifs: $ACTIVE"

  # Verifier integrite DB
  DB_PATH="/home/root/n8n-agent/n8n-data/database.sqlite"
  if [ -f "$DB_PATH" ]; then
    INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>&1 | head -1)
    echo "  DB integrite   : $INTEGRITY"
  fi
else
  echo "  [WARN] n8n ne repond pas (HTTP $HTTP_CHECK)"
fi
echo ""
