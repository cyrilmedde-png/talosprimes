#!/bin/bash

# Script pour configurer Nginx comme reverse proxy pour n8n
# Usage: sudo ./configure-nginx-n8n.sh

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

DOMAIN="n8n.talosprimes.com"
CONTAINER_NAME="root-n8n-1"
CONTAINER_PORT="5678"
NGINX_CONFIG="/etc/nginx/sites-available/n8n"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Configuration Nginx pour n8n         ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Vérifier que le script est exécuté en root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Ce script doit être exécuté en root (utilisez sudo)${NC}"
  exit 1
fi

# Demander le domaine si nécessaire
read -p "Domaine n8n [$DOMAIN]: " INPUT_DOMAIN
DOMAIN=${INPUT_DOMAIN:-$DOMAIN}

echo -e "${BLUE}📋 Configuration :${NC}"
echo "  - Domaine: $DOMAIN"
echo "  - Conteneur: $CONTAINER_NAME"
echo "  - Port interne: $CONTAINER_PORT"
echo ""

# Vérifier que le conteneur existe
if ! docker ps -a --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
  echo -e "${YELLOW}⚠️  Conteneur $CONTAINER_NAME non trouvé${NC}"
  echo "Le conteneur sera peut-être créé plus tard. Continuons..."
fi

# Obtenir le réseau Docker utilisé par le conteneur
NETWORK_NAME=""
if docker ps -a --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
  NETWORK_NAME=$(docker inspect "$CONTAINER_NAME" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' | head -1)
  echo -e "${BLUE}📋 Réseau Docker détecté : $NETWORK_NAME${NC}"
else
  # Par défaut, utiliser le réseau créé par docker-compose
  NETWORK_NAME="root_default"
  echo -e "${BLUE}📋 Utilisation du réseau par défaut : $NETWORK_NAME${NC}"
fi

# Vérifier si le certificat SSL existe
SSL_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
HAS_SSL=false

if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
  HAS_SSL=true
  echo -e "${GREEN}✅ Certificat SSL trouvé${NC}"
else
  echo -e "${YELLOW}⚠️  Certificat SSL non trouvé${NC}"
  echo "  Le script créera une configuration HTTP. Vous pourrez ajouter SSL plus tard."
fi

# Créer la configuration Nginx
echo -e "${BLUE}📝 Création de la configuration Nginx...${NC}"

cat > "$NGINX_CONFIG" <<EOF
# Configuration Nginx pour n8n
# Domaine: $DOMAIN
# Conteneur: $CONTAINER_NAME
# Généré le: $(date)

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Redirection HTTP vers HTTPS si SSL est disponible
    if (\$ssl_protocol = "") {
        return 301 https://\$server_name\$request_uri;
    }

    # Fallback si pas de SSL
    location / {
        proxy_pass http://$CONTAINER_NAME:$CONTAINER_PORT;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}

EOF

# Ajouter la configuration HTTPS si SSL est disponible
if [ "$HAS_SSL" = true ]; then
  cat >> "$NGINX_CONFIG" <<EOF

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # Certificats SSL
    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;

    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/n8n-access.log;
    error_log /var/log/nginx/n8n-error.log;

    # Reverse proxy vers n8n
    location / {
        proxy_pass http://$CONTAINER_NAME:$CONTAINER_PORT;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts pour les longues exécutions de workflows
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
        
        # Buffer sizes
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Webhook endpoint (peut nécessiter des configurations spéciales)
    location /webhook/ {
        proxy_pass http://$CONTAINER_NAME:$CONTAINER_PORT/webhook/;
        proxy_http_version 1.1;
        
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        proxy_read_timeout 300;
        proxy_send_timeout 300;
    }
}
EOF
fi

echo -e "${GREEN}✅ Configuration créée : $NGINX_CONFIG${NC}"
echo ""

# Activer la configuration
echo -e "${BLUE}🔗 Activation de la configuration...${NC}"
if [ -f "/etc/nginx/sites-enabled/n8n" ]; then
  rm -f /etc/nginx/sites-enabled/n8n
fi
ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/n8n
echo -e "${GREEN}✅ Configuration activée${NC}"
echo ""

# Tester la configuration
echo -e "${BLUE}🧪 Test de la configuration Nginx...${NC}"
if nginx -t; then
  echo -e "${GREEN}✅ Configuration Nginx valide${NC}"
else
  echo -e "${RED}❌ Erreur dans la configuration Nginx${NC}"
  exit 1
fi
echo ""

# Redémarrer Nginx
echo -e "${BLUE}🔄 Redémarrage de Nginx...${NC}"
systemctl reload nginx || systemctl restart nginx
echo -e "${GREEN}✅ Nginx redémarré${NC}"
echo ""

# Résumé
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Configuration terminée              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Nginx configuré pour n8n${NC}"
echo ""
echo "📋 Résumé :"
echo "  - Domaine: $DOMAIN"
echo "  - Conteneur: $CONTAINER_NAME:$CONTAINER_PORT"
if [ "$HAS_SSL" = true ]; then
  echo "  - SSL: ✅ Activé"
else
  echo "  - SSL: ⚠️  Non configuré"
  echo ""
  echo "Pour ajouter SSL, exécutez :"
  echo "  sudo certbot --nginx -d $DOMAIN"
fi
echo ""
echo "📋 Prochaines étapes :"
echo "  1. Vérifiez que le conteneur n8n est démarré :"
echo "     docker ps | grep $CONTAINER_NAME"
echo ""
echo "  2. Testez l'accès à n8n :"
echo "     curl -I http://$DOMAIN"
if [ "$HAS_SSL" = true ]; then
  echo "     curl -I https://$DOMAIN"
fi
echo ""
echo "  3. Vérifiez les logs si nécessaire :"
echo "     tail -f /var/log/nginx/n8n-error.log"
echo ""

