#!/bin/bash
set -e

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TalosPrimes MCP Server - Installation automatique
# Usage: bash packages/mcp-server/install.sh
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROJECT_DIR="/var/www/talosprimes"
MCP_DIR="$PROJECT_DIR/packages/mcp-server"
NGINX_CONF="/etc/nginx/sites-available/talosprimes.com"
MCP_PORT=3100

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Installation MCP Server TalosPrimes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ━━━ 1. Récupérer les variables depuis le .env existant ━━━
echo "[1/6] Lecture des variables d'environnement..."
ENV_FILE="$PROJECT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE="$PROJECT_DIR/packages/platform/.env"
fi

DATABASE_URL=$(grep -E "^DATABASE_URL=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
N8N_API_URL=$(grep -E "^N8N_API_URL=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
N8N_API_KEY=$(grep -E "^N8N_API_KEY=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")

# Fallbacks
N8N_API_URL=${N8N_API_URL:-"http://localhost:5678"}

# Générer un token sécurisé
MCP_TOKEN=$(openssl rand -hex 32)

echo "  DATABASE_URL: ${DATABASE_URL:0:50}..."
echo "  N8N_API_URL: $N8N_API_URL"
echo "  N8N_API_KEY: ${N8N_API_KEY:0:10}..."
echo "  MCP_TOKEN: ${MCP_TOKEN:0:16}..."
echo ""

# ━━━ 2. Installer les dépendances ━━━
echo "[2/6] Installation des dépendances npm..."
cd "$MCP_DIR"
npm install --production 2>&1 | tail -3
echo ""

# ━━━ 3. Créer le fichier .env du MCP ━━━
echo "[3/6] Création du fichier .env..."
cat > "$MCP_DIR/.env" << ENVEOF
MCP_PORT=$MCP_PORT
MCP_TOKEN=$MCP_TOKEN
DATABASE_URL=$DATABASE_URL
N8N_API_URL=$N8N_API_URL
N8N_API_KEY=$N8N_API_KEY
PROJECT_DIR=$PROJECT_DIR
ENVEOF
echo "  Fichier .env créé dans $MCP_DIR/.env"
echo ""

# ━━━ 4. Mettre à jour ecosystem.config.cjs avec les vraies valeurs ━━━
echo "[4/6] Configuration PM2..."
cat > "$MCP_DIR/ecosystem.config.cjs" << 'PMEOF'
const { readFileSync } = require('fs');
const { resolve } = require('path');

// Charger le .env
const envPath = resolve(__dirname, '.env');
const envVars = {};
try {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) envVars[key.trim()] = vals.join('=').trim();
  }
} catch {}

module.exports = {
  apps: [{
    name: 'mcp-server',
    script: 'server.js',
    cwd: __dirname,
    env: envVars,
  }],
};
PMEOF

# Stopper l'ancien process si existant
pm2 delete mcp-server 2>/dev/null || true

# Lancer le MCP
cd "$MCP_DIR"
pm2 start ecosystem.config.cjs
pm2 save --force
echo ""

# ━━━ 5. Configurer nginx ━━━
echo "[5/6] Configuration nginx..."

# Vérifier si la config MCP existe déjà
if grep -q "location /mcp/" "$NGINX_CONF" 2>/dev/null; then
  echo "  Config nginx MCP déjà présente, skip."
else
  # Trouver la dernière accolade fermante du server block et insérer avant
  # On cherche le fichier nginx principal
  if [ ! -f "$NGINX_CONF" ]; then
    # Essayer d'autres emplacements
    NGINX_CONF=$(find /etc/nginx -name "*.conf" -exec grep -l "talosprimes" {} \; 2>/dev/null | head -1)
    if [ -z "$NGINX_CONF" ]; then
      NGINX_CONF=$(find /etc/nginx/sites-enabled -type l -exec grep -l "talosprimes" {} \; 2>/dev/null | head -1)
    fi
  fi

  if [ -n "$NGINX_CONF" ] && [ -f "$NGINX_CONF" ]; then
    # Ajouter le bloc location /mcp/ avant la dernière }
    sed -i '/^}/i \
    # MCP Server TalosPrimes\
    location /mcp/ {\
        proxy_pass http://localhost:3100/mcp/;\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
    }' "$NGINX_CONF"
    echo "  Config MCP ajoutée dans $NGINX_CONF"

    # Tester et recharger nginx
    nginx -t && systemctl reload nginx
    echo "  Nginx rechargé."
  else
    echo "  ⚠ Fichier nginx introuvable. Ajoute manuellement :"
    echo "    location /mcp/ {"
    echo "        proxy_pass http://localhost:3100/mcp/;"
    echo "    }"
  fi
fi
echo ""

# ━━━ 6. Test ━━━
echo "[6/6] Test du serveur MCP..."
sleep 2

HEALTH=$(curl -s -H "x-mcp-token: $MCP_TOKEN" http://localhost:$MCP_PORT/mcp/health 2>/dev/null)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "  ✅ MCP Server opérationnel !"
else
  echo "  ⚠ Le serveur ne répond pas. Vérifier les logs : pm2 logs mcp-server"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Installation terminée !"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  URL locale  : http://localhost:$MCP_PORT/mcp/health"
echo "  URL publique: https://talosprimes.com/mcp/health"
echo "  Token       : $MCP_TOKEN"
echo ""
echo "  ⚠ IMPORTANT : note le token ci-dessus, tu en auras"
echo "  besoin pour configurer Claude Desktop."
echo ""
echo "  Pour configurer Claude Desktop :"
echo "  Paramètres → Développeur → Modifier la config"
echo ""
