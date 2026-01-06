#!/bin/bash

# Script d'installation manuelle du certificat SSL
# Usage: sudo ./install-ssl-manual.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DOMAIN="talosprimes.com"
API_SUBDOMAIN="api.talosprimes.com"

echo -e "${GREEN}🔒 Installation manuelle du certificat SSL${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Veuillez exécuter ce script avec sudo${NC}"
    exit 1
fi

# Vérifier que le certificat existe
if [ ! -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
    echo -e "${RED}❌ Certificat SSL non trouvé${NC}"
    echo "Exécutez d'abord : sudo ./configure-ssl.sh"
    exit 1
fi

echo -e "${GREEN}✅ Certificat SSL trouvé${NC}"
echo ""

# Mettre à jour les configurations Nginx pour HTTPS
echo -e "${GREEN}📝 Mise à jour des configurations Nginx...${NC}"

# Configuration Frontend avec SSL
cat > /etc/nginx/sites-available/talosprimes-frontend <<EOF
# Frontend TalosPrimes - HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # Certificats SSL
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Redirection www vers non-www
    if (\$host = www.$DOMAIN) {
        return 301 https://$DOMAIN\$request_uri;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Logs
    access_log /var/log/nginx/talosprimes-frontend-access.log;
    error_log /var/log/nginx/talosprimes-frontend-error.log;
}
EOF

# Configuration Backend API avec SSL
cat > /etc/nginx/sites-available/talosprimes-api <<EOF
# Backend API TalosPrimes - HTTPS
server {
    listen 80;
    server_name $API_SUBDOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $API_SUBDOMAIN;

    # Certificats SSL
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        # Gérer les requêtes OPTIONS (preflight CORS)
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }

        # CORS headers pour les autres requêtes
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;

        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Logs
    access_log /var/log/nginx/talosprimes-api-access.log;
    error_log /var/log/nginx/talosprimes-api-error.log;
}
EOF

# Activer les configurations
echo -e "${GREEN}🔗 Activation des configurations...${NC}"
ln -sf /etc/nginx/sites-available/talosprimes-frontend /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/talosprimes-api /etc/nginx/sites-enabled/

# Tester la configuration
echo -e "${GREEN}🧪 Test de la configuration Nginx...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Configuration Nginx valide${NC}"
else
    echo -e "${RED}❌ Erreur dans la configuration Nginx${NC}"
    exit 1
fi

# Redémarrer Nginx
echo -e "${GREEN}🔄 Redémarrage de Nginx...${NC}"
systemctl restart nginx

if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx est actif avec SSL${NC}"
else
    echo -e "${RED}❌ Nginx n'est pas actif${NC}"
    systemctl status nginx
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Installation SSL terminée !${NC}"
echo ""
echo -e "${YELLOW}📋 Prochaines étapes :${NC}"
echo ""
echo "1. Mettez à jour les variables d'environnement :"
echo "   - Backend: CORS_ORIGIN=https://$DOMAIN"
echo "   - Frontend: NEXT_PUBLIC_API_URL=https://$API_SUBDOMAIN"
echo ""
echo "2. Rebuild le frontend :"
echo "   cd /var/www/talosprimes/packages/client"
echo "   pnpm build"
echo "   pm2 restart talosprimes-client"
echo ""
echo "3. Testez :"
echo "   curl https://$DOMAIN"
echo "   curl https://$API_SUBDOMAIN/health"
echo ""

