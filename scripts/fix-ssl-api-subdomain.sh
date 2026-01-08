#!/bin/bash
# Script pour générer/corriger le certificat SSL pour api.talosprimes.com

set -e

echo "🔒 Génération du certificat SSL pour api.talosprimes.com"
echo "========================================================="
echo ""

# Vérifier que le script est exécuté en root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Veuillez exécuter ce script avec sudo"
    exit 1
fi

DOMAIN="talosprimes.com"
API_SUBDOMAIN="api.talosprimes.com"

echo "📋 Domaine principal : $DOMAIN"
echo "📋 Sous-domaine API : $API_SUBDOMAIN"
echo ""

# Vérifier si certbot est installé
if ! command -v certbot &> /dev/null; then
    echo "📦 Installation de Certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
    echo "✅ Certbot installé"
fi

# Vérifier la configuration Nginx actuelle
API_CONFIG="/etc/nginx/sites-available/talosprimes-api"
if [ ! -f "$API_CONFIG" ]; then
    echo "❌ Configuration Nginx non trouvée : $API_CONFIG"
    echo "   Exécutez d'abord : sudo ./scripts/configure-nginx.sh"
    exit 1
fi

echo "🧪 Test de la configuration Nginx..."
if ! nginx -t; then
    echo "❌ Erreur dans la configuration Nginx"
    exit 1
fi

# Vérifier si le certificat existe déjà
if [ -d "/etc/letsencrypt/live/$API_SUBDOMAIN" ]; then
    echo "✅ Certificat existant trouvé pour $API_SUBDOMAIN"
    echo "🔄 Renouvellement du certificat..."
    certbot renew --cert-name "$API_SUBDOMAIN" --quiet
else
    echo "📝 Génération d'un nouveau certificat pour $API_SUBDOMAIN..."
    
    # Vérifier que le domaine pointe bien vers le serveur
    echo "⚠️  Assurez-vous que $API_SUBDOMAIN pointe vers ce serveur (A record)"
    echo "   Test DNS : dig +short $API_SUBDOMAIN"
    read -p "Continuer ? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        echo "Annulé."
        exit 0
    fi
    
    # Générer le certificat avec Certbot (mode standalone)
    echo ""
    echo "🔒 Génération du certificat SSL..."
    certbot certonly --standalone \
        -d "$API_SUBDOMAIN" \
        --non-interactive \
        --agree-tos \
        --email "admin@$DOMAIN" \
        --preferred-challenges http \
        --expand || {
        echo "❌ Erreur lors de la génération du certificat"
        echo ""
        echo "💡 Solutions possibles :"
        echo "   1. Vérifier que $API_SUBDOMAIN pointe vers ce serveur"
        echo "   2. Vérifier que le port 80 est ouvert (certbot a besoin de vérifier le domaine)"
        echo "   3. Essayer manuellement : certbot certonly --standalone -d $API_SUBDOMAIN"
        exit 1
    }
fi

echo "✅ Certificat SSL configuré pour $API_SUBDOMAIN"
echo ""

# Mettre à jour la configuration Nginx pour HTTPS
echo "📝 Mise à jour de la configuration Nginx pour HTTPS..."
cat > "$API_CONFIG" <<EOF
# Backend API TalosPrimes - HTTPS
server {
    listen 80;
    server_name $API_SUBDOMAIN;
    
    # Redirection HTTP → HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $API_SUBDOMAIN;

    # Certificats SSL
    ssl_certificate /etc/letsencrypt/live/$API_SUBDOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$API_SUBDOMAIN/privkey.pem;
    
    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Headers de sécurité
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        # NE PAS ajouter de headers CORS ici - Fastify les gère
        # Le backend gère CORS avec credentials: true, donc pas de wildcard possible
        
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

echo "✅ Configuration Nginx mise à jour pour HTTPS"
echo ""

# Tester la configuration
echo "🧪 Test de la configuration Nginx..."
if nginx -t; then
    echo "✅ Configuration Nginx valide"
    echo ""
    echo "🔄 Rechargement de Nginx..."
    systemctl reload nginx
    echo "✅ Nginx rechargé"
else
    echo "❌ Erreur dans la configuration Nginx"
    exit 1
fi

echo ""
echo "✅ Certificat SSL configuré et activé pour $API_SUBDOMAIN"
echo ""
echo "📋 Prochaines étapes :"
echo "   1. Vérifier que https://$API_SUBDOMAIN/health fonctionne"
echo "   2. Redémarrer le backend : pm2 restart talosprimes-api"
echo "   3. Tester la connexion sur https://$DOMAIN/login"
echo ""
echo "🔒 Le certificat sera automatiquement renouvelé par Certbot"
echo ""

