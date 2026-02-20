#!/bin/bash
# Diagnostic complet de l'erreur leads/clients
# Usage: bash scripts/diagnostic-leads-error.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Diagnostic erreur Leads/Clients         ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""

# ===== 1. Vérifier le .env du backend =====
echo -e "${CYAN}══════ 1. Variables .env du backend ══════${NC}"
ENV_FILE="/var/www/talosprimes/packages/platform/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}❌ Fichier .env non trouvé: $ENV_FILE${NC}"
  # Chercher ailleurs
  ENV_FILE=$(find /var/www/talosprimes -name ".env" -path "*/platform/*" 2>/dev/null | head -1)
  if [ -n "$ENV_FILE" ]; then
    echo -e "${YELLOW}📂 Trouvé: $ENV_FILE${NC}"
  else
    echo -e "${RED}❌ Aucun .env trouvé pour la plateforme${NC}"
  fi
fi

if [ -f "$ENV_FILE" ]; then
  echo ""
  echo "N8N_API_URL:"
  grep -E '^N8N_API_URL=' "$ENV_FILE" | sed 's/=/ = /'
  echo ""
  echo "N8N_API_KEY (premiers 20 chars):"
  N8N_KEY=$(grep -E '^N8N_API_KEY=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  if [ -n "$N8N_KEY" ]; then
    echo -e "  ${GREEN}✓ Présent: ${N8N_KEY:0:20}...${NC}"
  else
    echo -e "  ${RED}❌ MANQUANT ou VIDE${NC}"
  fi
  echo ""
  echo "N8N_WEBHOOK_SECRET:"
  WH_SECRET=$(grep -E '^N8N_WEBHOOK_SECRET=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  if [ -n "$WH_SECRET" ]; then
    echo -e "  ${GREEN}✓ Présent: ${WH_SECRET:0:10}...${NC}"
  else
    echo -e "  ${RED}❌ MANQUANT ou VIDE${NC}"
  fi
  echo ""
  echo "USE_N8N_VIEWS:"
  grep -E '^USE_N8N_VIEWS=' "$ENV_FILE" || echo -e "  ${YELLOW}⚠️ Non défini (défaut: false)${NC}"
  echo ""
  echo "USE_N8N_COMMANDS:"
  grep -E '^USE_N8N_COMMANDS=' "$ENV_FILE" || echo -e "  ${YELLOW}⚠️ Non défini (défaut: false)${NC}"
fi

echo ""

# ===== 2. Vérifier n8n container =====
echo -e "${CYAN}══════ 2. Container n8n ══════${NC}"
N8N_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E '^n8n$' || true)
if [ -n "$N8N_CONTAINER" ]; then
  echo -e "${GREEN}✓ Container 'n8n' en cours d'exécution${NC}"
  echo "  Uptime: $(docker inspect -f '{{.State.StartedAt}}' n8n)"
  echo "  Ports: $(docker port n8n 2>/dev/null)"
else
  echo -e "${RED}❌ Container 'n8n' non trouvé ou arrêté${NC}"
  docker ps -a --format '{{.Names}} {{.Status}}' | grep n8n
fi

echo ""

# ===== 3. Tester les webhooks n8n =====
echo -e "${CYAN}══════ 3. Test webhooks n8n ══════${NC}"

N8N_URL="${N8N_API_URL:-https://n8n.talosprimes.com}"

# Test health
echo -n "Health check ($N8N_URL/healthz): "
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$N8N_URL/healthz" 2>/dev/null)
if [ "$HEALTH" = "200" ]; then
  echo -e "${GREEN}✓ OK (200)${NC}"
else
  echo -e "${RED}❌ HTTP $HEALTH${NC}"
fi

echo ""
echo "Test des webhooks critiques:"

# Test clients_list webhook
echo -n "  POST /webhook/clients_list: "
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"event":"clients_list","tenantId":"test","limit":"5"}' \
  "$N8N_URL/webhook/clients_list" 2>/dev/null)
if [ "$RESP" = "200" ]; then
  echo -e "${GREEN}✓ OK (200)${NC}"
elif [ "$RESP" = "404" ]; then
  echo -e "${RED}❌ 404 - Webhook NON enregistré${NC}"
else
  echo -e "${YELLOW}⚠️ HTTP $RESP${NC}"
fi

# Test leads_list webhook
echo -n "  POST /webhook/leads_list: "
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"event":"leads_list","tenantId":"test","limit":"5"}' \
  "$N8N_URL/webhook/leads_list" 2>/dev/null)
if [ "$RESP" = "200" ]; then
  echo -e "${GREEN}✓ OK (200)${NC}"
elif [ "$RESP" = "404" ]; then
  echo -e "${RED}❌ 404 - Webhook NON enregistré${NC}"
else
  echo -e "${YELLOW}⚠️ HTTP $RESP${NC}"
fi

# Test lead_create webhook
echo -n "  POST /webhook/lead_create: "
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"event":"lead_create","tenantId":"test"}' \
  "$N8N_URL/webhook/lead_create" 2>/dev/null)
if [ "$RESP" = "200" ] || [ "$RESP" = "201" ]; then
  echo -e "${GREEN}✓ OK ($RESP)${NC}"
elif [ "$RESP" = "404" ]; then
  echo -e "${RED}❌ 404 - Webhook NON enregistré${NC}"
else
  echo -e "${YELLOW}⚠️ HTTP $RESP${NC}"
fi

echo ""

# ===== 4. Vérifier les WorkflowLinks en DB =====
echo -e "${CYAN}══════ 4. WorkflowLinks en base PostgreSQL ══════${NC}"

if [ -f "$ENV_FILE" ]; then
  DB_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  if [ -n "$DB_URL" ]; then
    echo "Vérification des WorkflowLinks pour leads et clients..."

    # Compter les workflow links actifs
    TOTAL=$(psql "$DB_URL" -t -A -c "SELECT COUNT(*) FROM workflow_links WHERE statut = 'actif';" 2>/dev/null)
    if [ -n "$TOTAL" ]; then
      echo -e "  Total WorkflowLinks actifs: ${GREEN}$TOTAL${NC}"

      echo ""
      echo "  WorkflowLinks pour leads/clients:"
      psql "$DB_URL" -c "
        SELECT wl.type_evenement, wl.workflow_n8n_id, wl.workflow_n8n_nom, wl.statut, t.nom as tenant
        FROM workflow_links wl
        LEFT JOIN tenants t ON wl.tenant_id = t.id
        WHERE wl.type_evenement IN ('leads_list', 'lead_create', 'lead_get', 'lead_delete', 'lead_update_status', 'clients_list', 'client_create', 'client_get', 'client_create_from_lead')
        ORDER BY wl.type_evenement;
      " 2>/dev/null

      if [ $? -ne 0 ]; then
        echo -e "${YELLOW}⚠️ Erreur psql - tentative avec docker exec...${NC}"
        # Essayer via docker si psql n'est pas installé localement
        echo "  (psql non disponible localement, vérifier manuellement)"
      fi
    else
      echo -e "  ${YELLOW}⚠️ Impossible de se connecter à PostgreSQL${NC}"
      echo "  DATABASE_URL: ${DB_URL:0:50}..."
    fi
  else
    echo -e "${RED}❌ DATABASE_URL non trouvé dans .env${NC}"
  fi
fi

echo ""

# ===== 5. Vérifier les logs du backend =====
echo -e "${CYAN}══════ 5. Logs récents du backend (PM2) ══════${NC}"
if command -v pm2 &>/dev/null; then
  echo "Dernières erreurs n8n dans les logs PM2:"
  pm2 logs --nostream --lines 50 2>/dev/null | grep -i -E "n8n|webhook|502|500|leads|clients" | tail -20
  echo ""
else
  echo "PM2 non disponible, check systemd ou journalctl..."
  journalctl -u talosprimes --no-pager --lines 30 2>/dev/null | grep -i -E "n8n|webhook|502|500|leads" | tail -15
fi

echo ""

# ===== 6. Vérifier les webhooks enregistrés dans n8n =====
echo -e "${CYAN}══════ 6. Webhooks enregistrés dans n8n (via API) ══════${NC}"

# Récupérer la clé API depuis le .env du backend
if [ -n "$N8N_KEY" ]; then
  echo "Workflows actifs contenant 'lead' ou 'client' dans le nom:"
  curl -s -H "X-N8N-API-KEY: $N8N_KEY" "$N8N_URL/api/v1/workflows?limit=250" 2>/dev/null | \
    python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    workflows = data.get('data', [])
    found = 0
    for wf in workflows:
        name = wf.get('name', '').lower()
        if 'lead' in name or 'client' in name:
            status = '✅ ACTIF' if wf.get('active') else '❌ INACTIF'
            print(f'  {status} | {wf[\"name\"]} (id: {wf[\"id\"]})')
            found += 1
    if found == 0:
        print('  Aucun workflow leads/clients trouvé')
    print(f'  --- Total workflows: {len(workflows)} ---')
except Exception as e:
    print(f'  Erreur: {e}')
" 2>/dev/null
else
  echo -e "${YELLOW}⚠️ N8N_API_KEY non disponible, impossible de lister les workflows${NC}"
fi

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Résumé des actions à faire              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo "Si les webhooks renvoient 404:"
echo "  → docker restart n8n  (enregistre les webhooks au démarrage)"
echo ""
echo "Si N8N_API_KEY est manquant/ancien:"
echo "  → Copier la nouvelle clé dans $ENV_FILE"
echo "  → pm2 restart all"
echo ""
echo "Si WorkflowLinks sont vides:"
echo "  → Il faut recréer les workflow_links en DB pour votre tenant"
echo "  → Utiliser le script: bash scripts/seed-workflow-links.sh"
echo ""
echo "Si USE_N8N_VIEWS=true et problèmes n8n:"
echo "  → Temporairement: mettre USE_N8N_VIEWS=false dans .env"
echo "  → pm2 restart all"
echo "  → La page utilisera Prisma directement (sans passer par n8n)"
echo ""
