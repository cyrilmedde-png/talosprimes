#!/bin/bash

# Vérifie si Nginx a auth_basic devant n8n (cause du 403 "Authorization data is wrong!")
# Usage: sudo ./scripts/check-nginx-auth-n8n.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Vérification auth_basic Nginx pour n8n..."
echo ""

for f in /etc/nginx/sites-enabled/n8n /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/*n8n* /etc/nginx/conf.d/*n8n* 2>/dev/null; do
    [ -f "$f" ] || continue
    if grep -q "auth_basic" "$f"; then
        echo -e "${RED}✗ auth_basic trouvé dans $f${NC}"
        grep -n "auth_basic\|server_name" "$f" | head -20
        echo ""
        echo -e "${YELLOW}Pour désactiver : sudo nano $f${NC}"
        echo "Commentez les lignes auth_basic et auth_basic_user_file"
        echo "Puis : sudo nginx -t && sudo systemctl reload nginx"
        exit 1
    fi
done

echo -e "${GREEN}✓ Aucun auth_basic trouvé pour n8n${NC}"
echo "Le 403 vient probablement de n8n (Basic Auth dans n8n)."
echo "Recréez le conteneur : cd /root && docker-compose up -d --force-recreate n8n"
