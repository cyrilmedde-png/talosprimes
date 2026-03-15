#!/bin/bash

# Script de configuration Nginx pour TalosPrimes
# Usage: sudo ./configure-nginx.sh

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables (modifiez selon vos besoins)
DOMAIN="talosprimes.com"
API_SUBDOMAIN="api.talosprimes.com"
FRONTEND_PORT=3000
BACKEND_PORT=3001
N8N_PORT=5678

echo -e "${GREEN}🚀 Configuration Nginx pour TalosPrimes${NC}"
echo ""

# Vérifier que le script est exécuté en root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Veuillez exécuter ce script avec sudo${NC}"
    exit 1
fi

# Demander confirmation du domaine
read -p "Domaine principal [$DOMAIN]: " input_domain
DOMAIN=${input_domain:-$DOMAIN}

read -p "Sous-domaine API [$API_SUBDOMAIN]: " input_api
API_SUBDOMAIN=${input_api:-$API_SUBDOMAIN}

echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  - Frontend: $DOMAIN → localhost:$FRONTEND_PORT"
echo "  - Backend API: $API_SUBDOMAIN → localhost:$BACKEND_PORT"
echo ""

read -p "Continuer ? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "Annulé."
    exit 0
fi

# Créer le répertoire de configuration si nécessaire
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

# Configuration pour le Frontend
echo -e "${GREEN}📝 Création configuration frontend...${NC}"
cat > /etc/nginx/sites-available/talosprimes-frontend <<EOF
# Frontend TalosPrimes
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Redirection www vers non-www
    if (\$host = www.$DOMAIN) {
        return 301 http://$DOMAIN\$request_uri;
    }

    location / {
        proxy_pass http://localhost:$FRONTEND_PORT;
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

# Configuration pour le Backend API
echo -e "${GREEN}📝 Création configuration backend API...${NC}"
cat > /etc/nginx/sites-available/talosprimes-api <<EOF
# Backend API TalosPrimes
server {
    listen 80;
    server_name $API_SUBDOMAIN;

    # Taille max upload (100 Mo pour vidéos marketing)
    client_max_body_size 100m;

    # Gérer les requêtes OPTIONS (preflight CORS)
    location / {
        # Répondre aux OPTIONS avant de proxy
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://talosprimes.com' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-TalosPrimes-N8N-Secret, X-Idempotency-Key' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }

        # CORS headers pour les autres requêtes
        add_header 'Access-Control-Allow-Origin' 'https://talosprimes.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-TalosPrimes-N8N-Secret, X-Idempotency-Key' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;

        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Timeouts (augmentés pour upload vidéos)
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Logs
    access_log /var/log/nginx/talosprimes-api-access.log;
    error_log /var/log/nginx/talosprimes-api-error.log;
}
EOF

# Alternative : Configuration avec chemin /api (si pas de sous-domaine)
echo -e "${GREEN}📝 Création configuration alternative avec /api...${NC}"
cat > /etc/nginx/sites-available/talosprimes-combined <<EOF
# TalosPrimes - Frontend + Backend sur le même domaine
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Redirection www vers non-www
    if (\$host = www.$DOMAIN) {
        return 301 http://$DOMAIN\$request_uri;
    }

    # Backend API sur /api
    location /api {
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

        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Frontend sur toutes les autres routes
    location / {
        proxy_pass http://localhost:$FRONTEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Logs
    access_log /var/log/nginx/talosprimes-combined-access.log;
    error_log /var/log/nginx/talosprimes-combined-error.log;
}
EOF

# Activer les configurations
echo -e "${GREEN}🔗 Activation des configurations...${NC}"

# Demander quelle configuration utiliser
echo ""
echo "Choisissez votre configuration :"
echo "  1) Frontend + Backend séparés (api.$DOMAIN)"
echo "  2) Frontend + Backend sur le même domaine ($DOMAIN/api)"
read -p "Votre choix (1 ou 2): " config_choice

if [ "$config_choice" = "1" ]; then
    # Configuration séparée
    ln -sf /etc/nginx/sites-available/talosprimes-frontend /etc/nginx/sites-enabled/
    ln -sf /etc/nginx/sites-available/talosprimes-api /etc/nginx/sites-enabled/
    echo -e "${GREEN}✅ Configuration séparée activée${NC}"
elif [ "$config_choice" = "2" ]; then
    # Configuration combinée
    ln -sf /etc/nginx/sites-available/talosprimes-combined /etc/nginx/sites-enabled/
    echo -e "${GREEN}✅ Configuration combinée activée${NC}"
else
    echo -e "${RED}❌ Choix invalide${NC}"
    exit 1
fi

# Vérifier et supprimer les anciennes configurations en conflit
echo -e "${YELLOW}🔍 Vérification des configurations existantes...${NC}"
if [ -f /etc/nginx/sites-enabled/talosprime ]; then
    echo -e "${YELLOW}⚠️  Ancienne configuration 'talosprime' détectée, suppression...${NC}"
    rm -f /etc/nginx/sites-enabled/talosprime
fi

# Tester la configuration Nginx
echo -e "${GREEN}🧪 Test de la configuration Nginx...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Configuration Nginx valide${NC}"
else
    echo -e "${RED}❌ Erreur dans la configuration Nginx${NC}"
    echo -e "${YELLOW}💡 Vérifiez les erreurs ci-dessus et les fichiers de configuration${NC}"
    exit 1
fi

# Redémarrer Nginx
echo -e "${GREEN}🔄 Redémarrage de Nginx...${NC}"
systemctl restart nginx

# Vérifier le statut
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx est actif${NC}"
else
    echo -e "${RED}❌ Nginx n'est pas actif${NC}"
    systemctl status nginx
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Configuration Nginx terminée !${NC}"
echo ""
echo -e "${YELLOW}📋 Prochaines étapes :${NC}"
echo ""
echo "1. Configurez vos DNS :"
if [ "$config_choice" = "1" ]; then
    echo "   - $DOMAIN → IP de votre serveur"
    echo "   - $API_SUBDOMAIN → IP de votre serveur"
else
    echo "   - $DOMAIN → IP de votre serveur"
fi
echo ""
echo "2. Configurez SSL avec Let's Encrypt :"
if [ "$config_choice" = "1" ]; then
    echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN -d $API_SUBDOMAIN"
else
    echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi
echo ""
echo "3. Vérifiez que les services tournent :"
echo "   pm2 list"
echo ""
echo "4. Testez :"
if [ "$config_choice" = "1" ]; then
    echo "   curl http://$DOMAIN"
    echo "   curl http://$API_SUBDOMAIN/health"
else
    echo "   curl http://$DOMAIN"
    echo "   curl http://$DOMAIN/api/health"
fi
echo ""

