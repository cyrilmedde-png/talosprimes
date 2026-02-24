#!/bin/bash

# Script de configuration Nginx pour demo.talosprimes.com
# Usage: sudo bash scripts/setup-demo-nginx.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DEMO_DOMAIN="demo.talosprimes.com"
FRONTEND_PORT=3000
NGINX_CONF="/etc/nginx/sites-available/demo-talosprimes"

echo -e "${GREEN}🎭 Configuration Nginx pour ${DEMO_DOMAIN}${NC}"
echo ""

# Vérifier root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Exécutez avec sudo${NC}"
    exit 1
fi

# Vérifier si le fichier existe déjà
if [ -f "$NGINX_CONF" ]; then
    echo -e "${YELLOW}⚠️  Config existante trouvée, sauvegarde...${NC}"
    cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%Y%m%d_%H%M%S)"
fi

# Créer la config nginx
cat > "$NGINX_CONF" << 'NGINX_EOF'
# demo.talosprimes.com — Mode démo TalosPrimes
# Le middleware Next.js détecte le hostname demo.* et redirige vers /demo (auto-login)

server {
    listen 80;
    server_name demo.talosprimes.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name demo.talosprimes.com;

    # SSL — utiliser le même certificat que talosprimes.com (wildcard ou expand)
    ssl_certificate     /etc/letsencrypt/live/talosprimes.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/talosprimes.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Frontend Next.js (le middleware gère la redirection /demo)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # API backend (le demo appelle le même backend)
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_EOF

echo -e "${GREEN}✅ Config Nginx créée : ${NGINX_CONF}${NC}"

# Activer le site
if [ ! -L "/etc/nginx/sites-enabled/demo-talosprimes" ]; then
    ln -s "$NGINX_CONF" /etc/nginx/sites-enabled/demo-talosprimes
    echo -e "${GREEN}✅ Site activé (symlink créé)${NC}"
else
    echo -e "${YELLOW}ℹ️  Symlink déjà existant${NC}"
fi

# Test nginx
echo -e "${YELLOW}🔍 Test de la configuration Nginx...${NC}"
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Configuration OK${NC}"
    echo ""
    echo -e "${YELLOW}📋 Étapes restantes :${NC}"
    echo "  1. Ajouter l'enregistrement DNS A : demo.talosprimes.com → IP du VPS"
    echo "  2. Étendre le certificat SSL :"
    echo "     certbot --expand -d talosprimes.com -d demo.talosprimes.com -d api.talosprimes.com -d n8n.talosprimes.com"
    echo "  3. Recharger Nginx :"
    echo "     sudo systemctl reload nginx"
    echo ""
    echo -e "${GREEN}🎭 Une fois fait, demo.talosprimes.com sera opérationnel !${NC}"
else
    echo -e "${RED}❌ Erreur dans la config Nginx${NC}"
    exit 1
fi
