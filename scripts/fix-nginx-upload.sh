#!/bin/bash

# Fix CORS + client_max_body_size pour upload vidéos marketing
# Usage: sudo bash scripts/fix-nginx-upload.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔧 Fix nginx pour upload vidéos (CORS + client_max_body_size)${NC}"

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Exécutez avec sudo${NC}"
    exit 1
fi

# Trouver le fichier de config API nginx actuel
API_CONF=""
for f in /etc/nginx/sites-enabled/talosprimes-api /etc/nginx/sites-available/talosprimes-api; do
    if [ -f "$f" ]; then
        API_CONF="$f"
        break
    fi
done

# Vérifier aussi les configs certbot/SSL
if [ -z "$API_CONF" ]; then
    # Chercher dans tous les fichiers nginx une config pour api.talosprimes.com
    API_CONF=$(grep -rl "server_name.*api\.talosprimes\.com" /etc/nginx/sites-enabled/ 2>/dev/null | head -1)
fi

if [ -z "$API_CONF" ]; then
    echo -e "${RED}❌ Config nginx pour api.talosprimes.com non trouvée${NC}"
    echo -e "${YELLOW}Fichiers disponibles :${NC}"
    ls -la /etc/nginx/sites-enabled/
    exit 1
fi

echo -e "${GREEN}📄 Config trouvée : $API_CONF${NC}"
echo ""

# Backup
cp "$API_CONF" "${API_CONF}.bak.$(date +%Y%m%d%H%M%S)"
echo -e "${GREEN}💾 Backup créé${NC}"

# Vérifier si client_max_body_size est déjà présent
if grep -q "client_max_body_size" "$API_CONF"; then
    echo -e "${YELLOW}⚠️  client_max_body_size déjà présent, mise à jour...${NC}"
    sed -i 's/client_max_body_size.*/client_max_body_size 100m;/' "$API_CONF"
else
    echo -e "${GREEN}➕ Ajout de client_max_body_size 100m...${NC}"
    # Ajouter après la première ligne "server {"
    sed -i '/server {/a\    client_max_body_size 100m;' "$API_CONF"
fi

# Mettre à jour les headers CORS pour inclure PATCH et les headers custom
# Remplacer les Access-Control-Allow-Methods
sed -i "s/add_header 'Access-Control-Allow-Methods' '[^']*'/add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS'/g" "$API_CONF"

# Remplacer les Access-Control-Allow-Headers
sed -i "s/add_header 'Access-Control-Allow-Headers' '[^']*'/add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-TalosPrimes-N8N-Secret, X-Idempotency-Key'/g" "$API_CONF"

# Ajouter Access-Control-Allow-Credentials si absent
if ! grep -q "Access-Control-Allow-Credentials" "$API_CONF"; then
    echo -e "${GREEN}➕ Ajout de Access-Control-Allow-Credentials...${NC}"
    sed -i "/Access-Control-Allow-Headers.*always/a\\        add_header 'Access-Control-Allow-Credentials' 'true' always;" "$API_CONF"
fi

# Augmenter les timeouts pour upload vidéos
sed -i 's/proxy_connect_timeout [0-9]*s;/proxy_connect_timeout 120s;/g' "$API_CONF"
sed -i 's/proxy_send_timeout [0-9]*s;/proxy_send_timeout 120s;/g' "$API_CONF"
sed -i 's/proxy_read_timeout [0-9]*s;/proxy_read_timeout 120s;/g' "$API_CONF"

echo ""
echo -e "${GREEN}🧪 Test de la configuration...${NC}"
if nginx -t 2>&1; then
    echo -e "${GREEN}✅ Configuration valide${NC}"
    echo -e "${GREEN}🔄 Rechargement de nginx...${NC}"
    systemctl reload nginx
    echo -e "${GREEN}✅ Nginx rechargé !${NC}"
else
    echo -e "${RED}❌ Erreur de configuration ! Restauration du backup...${NC}"
    cp "${API_CONF}.bak."* "$API_CONF" 2>/dev/null
    systemctl reload nginx
    echo -e "${YELLOW}⚠️  Backup restauré${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Fix terminé !${NC}"
echo -e "${YELLOW}Changements appliqués :${NC}"
echo "  - client_max_body_size: 100m (pour vidéos)"
echo "  - CORS: PATCH ajouté aux méthodes"
echo "  - CORS: headers custom ajoutés (X-TalosPrimes-N8N-Secret, X-Idempotency-Key)"
echo "  - CORS: credentials activé"
echo "  - Timeouts: 120s (upload vidéos)"
echo ""
