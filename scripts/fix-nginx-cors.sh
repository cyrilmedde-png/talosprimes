#!/bin/bash
# Script pour corriger les headers CORS dans Nginx
# Problème : Nginx ajoute des headers CORS avec wildcard alors que Fastify utilise credentials: true

set -e

echo "🔧 Correction des headers CORS dans Nginx"
echo "=========================================="
echo ""

# Vérifier que le script est exécuté en root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Veuillez exécuter ce script avec sudo"
    exit 1
fi

# Variables
API_CONFIG="/etc/nginx/sites-available/talosprimes-api"
DOMAIN="talosprimes.com"

if [ ! -f "$API_CONFIG" ]; then
    echo "❌ Fichier de configuration Nginx non trouvé : $API_CONFIG"
    exit 1
fi

echo "📝 Correction de la configuration Nginx..."
echo ""

# Créer une sauvegarde
cp "$API_CONFIG" "${API_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Sauvegarde créée : ${API_CONFIG}.backup.*"

# Retirer les headers CORS de Nginx (Fastify les gère)
cat > "$API_CONFIG" <<'EOF'
# Backend API TalosPrimes
server {
    listen 80;
    server_name api.talosprimes.com;

    location / {
        # NE PAS ajouter de headers CORS ici - Fastify les gère
        # Le backend gère CORS avec credentials: true, donc pas de wildcard possible
        
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
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

echo "✅ Configuration Nginx mise à jour"
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
    echo "Restauration de la sauvegarde..."
    mv "${API_CONFIG}.backup."* "$API_CONFIG"
    exit 1
fi

echo ""
echo "✅ Correction terminée !"
echo ""
echo "📋 Prochaines étapes :"
echo "   1. Vérifier que CORS_ORIGIN=https://talosprimes.com dans /var/www/talosprimes/packages/platform/.env"
echo "   2. Redémarrer le backend : pm2 restart talosprimes-api"
echo "   3. Tester la connexion sur https://talosprimes.com/login"
echo ""

