#!/bin/bash
# =============================================================
# organize-n8n-folders.sh
# Crée des dossiers dans n8n et déplace les workflows dedans
# Utilise l'API interne /rest/ avec session cookie
# AVEC PAUSES entre chaque appel API
#
# Usage: bash scripts/organize-n8n-folders.sh
# =============================================================

set +e

N8N_URL="http://localhost:5678"
N8N_EMAIL="direction@talosprimes.com"
N8N_PASSWORD='21052024_Aa!'
COOKIE_JAR="/tmp/n8n-session-cookies.txt"

# Login
echo "========================================="
echo "  ORGANISATION n8n - Dossiers"
echo "  AVEC PAUSES (1s/appel, 3s/10 appels)"
echo "========================================="
echo ""

echo "[0/3] Login n8n..."
LOGIN_RESULT=$(curl -s -c "$COOKIE_JAR" -X POST -H "Content-Type: application/json" \
  -d "{\"emailOrLdapLoginId\":\"$N8N_EMAIL\",\"password\":\"$N8N_PASSWORD\"}" \
  "$N8N_URL/rest/login" 2>/dev/null)

if ! echo "$LOGIN_RESULT" | python3 -c "import sys,json; d=json.loads(sys.stdin.read()); assert 'data' in d" 2>/dev/null; then
  echo "[ERREUR] Login echoue"
  echo "$LOGIN_RESULT"
  exit 1
fi
echo "  -> Login OK"

# Recuperer le project ID personnel
PROJECT_ID=$(curl -s -b "$COOKIE_JAR" "$N8N_URL/rest/projects" 2>/dev/null | \
  python3 -c "import sys,json; d=json.loads(sys.stdin.read()); [print(p['id']) for p in d['data'] if p.get('type')=='personal']" 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
  echo "[ERREUR] Impossible de trouver le projet personnel"
  exit 1
fi
echo "  -> Project ID: $PROJECT_ID"
echo ""

# =============================================================
# ETAPE 1 : Creer les dossiers
# =============================================================
echo "[1/3] Creation des dossiers..."

python3 << PYTHON_FOLDERS
import json, urllib.request, http.cookiejar, time, sys

n8n_url = "$N8N_URL"
project_id = "$PROJECT_ID"
cookie_jar_path = "$COOKIE_JAR"

# Charger les cookies
cj = http.cookiejar.MozillaCookieJar(cookie_jar_path)
cj.load(ignore_discard=True, ignore_expires=True)
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def api_get(path):
    req = urllib.request.Request(f'{n8n_url}{path}')
    resp = opener.open(req, timeout=30)
    return json.loads(resp.read())

def api_post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(f'{n8n_url}{path}', data=data, method='POST',
        headers={'Content-Type': 'application/json'})
    resp = opener.open(req, timeout=30)
    return json.loads(resp.read())

# Liste des dossiers a creer (memes categories que les tags)
FOLDERS = [
    'Abonnements',
    'Agent IA',
    'Articles',
    'Avoirs',
    'Bons de Commande',
    'Clients',
    'Comptabilite',
    'Deploy',
    'Devis',
    'Espace Client',
    'Factures',
    'Leads',
    'Logs',
    'Notifications',
    'Onboarding',
    'Proforma',
    'Questionnaires',
    'SMS / Appels',
]

# Verifier les dossiers existants
existing = api_get(f'/rest/projects/{project_id}/folders')
existing_names = {f['name']: f['id'] for f in existing.get('data', [])}
print(f'  -> {len(existing_names)} dossiers existants')

# Creer les dossiers manquants
folder_map = dict(existing_names)
created = 0
for fname in FOLDERS:
    if fname in folder_map:
        print(f'  [SKIP] {fname} (existe deja)')
        continue
    try:
        result = api_post(f'/rest/projects/{project_id}/folders', {'name': fname})
        fdata = result.get('data', result)
        folder_map[fname] = fdata['id']
        created += 1
        print(f'  + Dossier cree: {fname} (id={fdata["id"]})')
        time.sleep(1)
    except Exception as e:
        print(f'  [WARN] Echec creation "{fname}": {e}')

print(f'  -> {created} nouveaux dossiers crees')
print(f'  -> {len(folder_map)} dossiers total')

# Sauvegarder le mapping pour l'etape suivante
with open('/tmp/n8n-folder-map.json', 'w') as f:
    json.dump(folder_map, f)

PYTHON_FOLDERS

echo ""

# =============================================================
# ETAPE 2 : Recuperer les workflows et calculer les moves
# =============================================================
echo "[2/3] Calcul des deplacements..."

# Charger la cle API pour lister les workflows
set -a
source /var/www/talosprimes/packages/platform/.env 2>/dev/null
set +a

python3 << PYTHON_MAPPING
import json, urllib.request, os

api_url = os.environ.get('N8N_API_URL', 'http://localhost:5678')
api_key = os.environ.get('N8N_API_KEY', '')

def api_get(path):
    req = urllib.request.Request(f'{api_url}{path}', headers={'X-N8N-API-KEY': api_key})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())

# Regles de classification (identiques aux tags)
FOLDER_RULES = [
    ('invoice',        'Factures'),
    ('facture',        'Factures'),
    ('devis',          'Devis'),
    ('avoir',          'Avoirs'),
    ('proforma',       'Proforma'),
    ('bdc',            'Bons de Commande'),
    ('Clients -',      'Clients'),
    ('client_',        'Clients'),
    ('client-space',   'Espace Client'),
    ('Leads -',        'Leads'),
    ('lead_',          'Leads'),
    ('Inscription',    'Leads'),
    ('Onboarding',     'Onboarding'),
    ('Abonnements',    'Abonnements'),
    ('Stripe',         'Abonnements'),
    ('compta',         'Comptabilite'),
    ('notification',   'Notifications'),
    ('sms',            'SMS / Appels'),
    ('twilio',         'SMS / Appels'),
    ('call-log',       'SMS / Appels'),
    ('Agent',          'Agent IA'),
    ('agent',          'Agent IA'),
    ('questionnaire',  'Questionnaires'),
    ('article-code',   'Articles'),
    ('logs',           'Logs'),
    ('Deploy',         'Deploy'),
]

def get_folder_for_workflow(name):
    for keyword, folder in FOLDER_RULES:
        if keyword in name:
            return folder
    return None  # Pas de dossier = reste a la racine

# Recuperer tous les workflows
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

# Charger le mapping des dossiers
with open('/tmp/n8n-folder-map.json', 'r') as f:
    folder_map = json.load(f)

# Calculer les deplacements
moves = []
no_folder = []
for wf in all_workflows:
    folder_name = get_folder_for_workflow(wf['name'])
    if folder_name and folder_name in folder_map:
        moves.append({
            'wf_id': wf['id'],
            'wf_name': wf['name'],
            'folder_name': folder_name,
            'folder_id': folder_map[folder_name]
        })
    else:
        no_folder.append(wf['name'])

print(f'  -> {len(all_workflows)} workflows total')
print(f'  -> {len(moves)} a deplacer dans des dossiers')
print(f'  -> {len(no_folder)} restent a la racine:')
for name in sorted(no_folder):
    print(f'    - {name}')

with open('/tmp/n8n-folder-moves.json', 'w') as f:
    json.dump(moves, f)

PYTHON_MAPPING

echo ""

# =============================================================
# ETAPE 3 : Deplacer les workflows (avec pauses)
# =============================================================
echo "[3/3] Deplacement des workflows dans les dossiers..."

python3 << PYTHON_MOVE
import json, urllib.request, http.cookiejar, time, sys

n8n_url = "$N8N_URL"
cookie_jar_path = "$COOKIE_JAR"

# Charger les cookies
cj = http.cookiejar.MozillaCookieJar(cookie_jar_path)
cj.load(ignore_discard=True, ignore_expires=True)
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def api_patch(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(f'{n8n_url}{path}', data=data, method='PATCH',
        headers={'Content-Type': 'application/json'})
    resp = opener.open(req, timeout=30)
    return json.loads(resp.read())

# Charger les deplacements
with open('/tmp/n8n-folder-moves.json', 'r') as f:
    moves = json.load(f)

# Grouper par dossier pour affichage
by_folder = {}
for m in moves:
    fn = m['folder_name']
    if fn not in by_folder:
        by_folder[fn] = []
    by_folder[fn].append(m['wf_name'])

# Deplacer AVEC PAUSES
moved = 0
errors = 0
for i, m in enumerate(moves):
    try:
        api_patch(f'/rest/workflows/{m["wf_id"]}', {
            'parentFolderId': m['folder_id']
        })
        moved += 1
    except Exception as e:
        print(f'  [WARN] Echec move {m["wf_name"]}: {e}')
        errors += 1

    # PAUSE entre chaque appel
    time.sleep(1)
    # PAUSE supplementaire tous les 10 appels
    if (i + 1) % 10 == 0:
        print(f'  ... {i+1}/{len(moves)} deplaces (pause 3s) ...')
        time.sleep(3)

print(f'  -> {moved}/{len(moves)} workflows deplaces, {errors} erreurs')
print()

# Resume par dossier
print('  RESUME PAR DOSSIER:')
print('  ' + '-' * 50)
for folder in sorted(by_folder.keys()):
    wfs = by_folder[folder]
    print(f'  {folder} ({len(wfs)} workflows)')
    for wf_name in sorted(wfs):
        print(f'    - {wf_name}')
    print()

# Nettoyage
import os
try:
    os.remove('/tmp/n8n-folder-map.json')
    os.remove('/tmp/n8n-folder-moves.json')
except:
    pass

PYTHON_MOVE

echo ""
echo "========================================="
echo "  ORGANISATION EN DOSSIERS TERMINEE"
echo "========================================="
echo ""

# Verification integrite DB
DB_PATH="/home/root/n8n-agent/n8n-data/database.sqlite"
if [ -f "$DB_PATH" ]; then
  INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>&1 | head -1)
  echo "  DB integrite: $INTEGRITY"
fi
echo ""

# Nettoyage
rm -f "$COOKIE_JAR"
