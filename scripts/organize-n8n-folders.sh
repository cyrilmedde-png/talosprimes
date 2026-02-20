#!/bin/bash
# =============================================================
# organize-n8n-folders.sh
# Crée des dossiers dans n8n et déplace les workflows dedans
# Tout en Python (login + session cookie gérés en interne)
# AVEC PAUSES entre chaque appel API
#
# Usage: bash scripts/organize-n8n-folders.sh
# =============================================================

set +e

# Charger N8N_API_KEY pour lister les workflows
set -a
source /var/www/talosprimes/packages/platform/.env 2>/dev/null
set +a
export N8N_API_URL="${N8N_API_URL:-http://localhost:5678}"
export N8N_API_KEY="${N8N_API_KEY:-}"

echo "========================================="
echo "  ORGANISATION n8n - Dossiers"
echo "  AVEC PAUSES (1s/appel, 3s/10 appels)"
echo "========================================="
echo ""

python3 << 'PYTHON_SCRIPT'
import json, urllib.request, time, sys, os

# ---- Config ----
N8N_URL = "http://localhost:5678"
N8N_EMAIL = "direction@talosprimes.com"
N8N_PASSWORD = "21052024_Aa!"
API_KEY = os.environ.get('N8N_API_KEY', '')

# ---- Session avec token Bearer (cookie Secure ne passe pas en HTTP) ----
AUTH_TOKEN = None

def rest_post(path, body):
    global AUTH_TOKEN
    data = json.dumps(body).encode()
    headers = {'Content-Type': 'application/json'}
    if AUTH_TOKEN:
        headers['Cookie'] = f'n8n-auth={AUTH_TOKEN}'
    req = urllib.request.Request(f'{N8N_URL}{path}', data=data, method='POST', headers=headers)
    resp = urllib.request.urlopen(req, timeout=30)
    # Capturer le cookie n8n-auth du Set-Cookie header
    for h in resp.headers.get_all('Set-Cookie') or []:
        if 'n8n-auth=' in h:
            AUTH_TOKEN = h.split('n8n-auth=')[1].split(';')[0]
    return json.loads(resp.read())

def rest_get(path):
    headers = {}
    if AUTH_TOKEN:
        headers['Cookie'] = f'n8n-auth={AUTH_TOKEN}'
    req = urllib.request.Request(f'{N8N_URL}{path}', headers=headers)
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())

def rest_patch(path, body):
    data = json.dumps(body).encode()
    headers = {'Content-Type': 'application/json'}
    if AUTH_TOKEN:
        headers['Cookie'] = f'n8n-auth={AUTH_TOKEN}'
    req = urllib.request.Request(f'{N8N_URL}{path}', data=data, method='PATCH', headers=headers)
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())

# ---- API publique (pour lister workflows) ----
def api_get(path):
    req = urllib.request.Request(f'{N8N_URL}{path}',
        headers={'X-N8N-API-KEY': API_KEY})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())

# ==== ETAPE 0 : Login ====
print("[0/3] Login n8n...")
try:
    # Login et capturer le token manuellement
    login_data = json.dumps({'emailOrLdapLoginId': N8N_EMAIL, 'password': N8N_PASSWORD}).encode()
    login_req = urllib.request.Request(f'{N8N_URL}/rest/login', data=login_data, method='POST',
        headers={'Content-Type': 'application/json'})
    login_resp = urllib.request.urlopen(login_req, timeout=30)
    for h in login_resp.headers.get_all('Set-Cookie') or []:
        if 'n8n-auth=' in h:
            AUTH_TOKEN = h.split('n8n-auth=')[1].split(';')[0]
    login = json.loads(login_resp.read())
    if 'data' not in login or not AUTH_TOKEN:
        print(f"  [ERREUR] Login echoue: token={AUTH_TOKEN is not None}")
        sys.exit(1)
    print(f"  -> Login OK (token={AUTH_TOKEN[:20]}...)")
except Exception as e:
    print(f"  [ERREUR] Login echoue: {e}")
    sys.exit(1)

# Recuperer project ID personnel
projects = rest_get('/rest/projects')
project_id = None
for p in projects.get('data', []):
    if p.get('type') == 'personal':
        project_id = p['id']
        break

if not project_id:
    print("  [ERREUR] Projet personnel non trouve")
    sys.exit(1)
print(f"  -> Project ID: {project_id}")
print()

# ==== ETAPE 1 : Creer les dossiers ====
print("[1/3] Creation des dossiers...")

FOLDERS = [
    'Abonnements', 'Agent IA', 'Articles', 'Avoirs',
    'Bons de Commande', 'Clients', 'Comptabilite', 'Deploy',
    'Devis', 'Espace Client', 'Factures', 'Leads',
    'Logs', 'Notifications', 'Onboarding', 'Proforma',
    'Questionnaires', 'SMS - Appels',
]

# Verifier dossiers existants
existing = rest_get(f'/rest/projects/{project_id}/folders')
existing_map = {f['name']: f['id'] for f in existing.get('data', [])}
print(f"  -> {len(existing_map)} dossiers existants")

# Creer les manquants
folder_map = dict(existing_map)
created = 0
for fname in FOLDERS:
    if fname in folder_map:
        print(f"  [SKIP] {fname} (existe deja)")
        continue
    try:
        result = rest_post(f'/rest/projects/{project_id}/folders', {'name': fname})
        fdata = result.get('data', result)
        folder_map[fname] = fdata['id']
        created += 1
        print(f"  + Dossier cree: {fname}")
        time.sleep(1)
    except Exception as e:
        print(f"  [WARN] Echec creation \"{fname}\": {e}")

print(f"  -> {created} nouveaux dossiers crees, {len(folder_map)} total")
print()

# ==== ETAPE 2 : Calculer les deplacements ====
print("[2/3] Calcul des deplacements...")

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
    ('sms',            'SMS - Appels'),
    ('twilio',         'SMS - Appels'),
    ('call-log',       'SMS - Appels'),
    ('Agent',          'Agent IA'),
    ('agent',          'Agent IA'),
    ('questionnaire',  'Questionnaires'),
    ('article-code',   'Articles'),
    ('logs',           'Logs'),
    ('Deploy',         'Deploy'),
]

def get_folder(name):
    for keyword, folder in FOLDER_RULES:
        if keyword in name:
            return folder
    return None

# Lister les workflows
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

moves = []
no_folder = []
for wf in all_workflows:
    fname = get_folder(wf['name'])
    if fname and fname in folder_map:
        moves.append({
            'wf_id': wf['id'],
            'wf_name': wf['name'],
            'folder_name': fname,
            'folder_id': folder_map[fname]
        })
    else:
        no_folder.append(wf['name'])

print(f"  -> {len(all_workflows)} workflows total")
print(f"  -> {len(moves)} a deplacer")
if no_folder:
    print(f"  -> {len(no_folder)} restent a la racine:")
    for n in sorted(no_folder):
        print(f"    - {n}")
print()

# ==== ETAPE 3 : Deplacer (avec pauses) ====
print("[3/3] Deplacement des workflows...")

by_folder = {}
for m in moves:
    fn = m['folder_name']
    if fn not in by_folder:
        by_folder[fn] = []
    by_folder[fn].append(m['wf_name'])

moved = 0
errors = 0
for i, m in enumerate(moves):
    try:
        rest_patch(f'/rest/workflows/{m["wf_id"]}', {
            'parentFolderId': m['folder_id']
        })
        moved += 1
    except Exception as e:
        print(f"  [WARN] Echec move {m['wf_name']}: {e}")
        errors += 1

    time.sleep(1)
    if (i + 1) % 10 == 0:
        print(f"  ... {i+1}/{len(moves)} deplaces (pause 3s) ...")
        time.sleep(3)

print(f"  -> {moved}/{len(moves)} workflows deplaces, {errors} erreurs")
print()

# Resume
print("  RESUME PAR DOSSIER:")
print("  " + "-" * 50)
for folder in sorted(by_folder.keys()):
    wfs = by_folder[folder]
    print(f"  {folder} ({len(wfs)} workflows)")
    for wf_name in sorted(wfs):
        print(f"    - {wf_name}")
    print()

PYTHON_SCRIPT

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
