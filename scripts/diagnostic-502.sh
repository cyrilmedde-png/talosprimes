#!/bin/bash

# Script de diagnostic automatique pour erreur 502 Bad Gateway
# Usage: ./diagnostic-502.sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Diagnostic 502 Bad Gateway${NC}"
echo -e "${BLUE}==============================${NC}\n"

# 1. Vérifier PM2
echo -e "${BLUE}1. État PM2 :${NC}"
if pm2 list | grep -q "talosprimes-api"; then
    PM2_STATUS=$(pm2 list | grep "talosprimes-api" | awk '{print $10}')
    if [ "$PM2_STATUS" = "online" ]; then
        echo -e "${GREEN}✅ Backend talosprimes-api est ONLINE${NC}"
    else
        echo -e "${RED}❌ Backend talosprimes-api est $PM2_STATUS${NC}"
        echo -e "${YELLOW}   Solution: pm2 restart talosprimes-api${NC}"
    fi
    pm2 list | grep "talosprimes-api"
else
    echo -e "${RED}❌ Backend talosprimes-api non trouvé dans PM2${NC}"
    echo -e "${YELLOW}   Solution: cd /var/www/talosprimes/packages/platform && pm2 start dist/index.js --name talosprimes-api${NC}"
fi
echo ""

# 2. Vérifier le port 3001
echo -e "${BLUE}2. Port 3001 :${NC}"
if sudo netstat -tlnp 2>/dev/null | grep -q ":3001"; then
    echo -e "${GREEN}✅ Port 3001 est en écoute${NC}"
    sudo netstat -tlnp | grep ":3001"
else
    echo -e "${RED}❌ Port 3001 n'est pas en écoute${NC}"
    echo -e "${YELLOW}   Le backend n'écoute pas sur le port 3001${NC}"
    echo -e "${YELLOW}   Solution: Vérifier que le backend est démarré${NC}"
fi
echo ""

# 3. Tester le backend en local
echo -e "${BLUE}3. Test backend local (http://localhost:3001/health) :${NC}"
if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend répond en local${NC}"
    curl -s http://localhost:3001/health | jq . 2>/dev/null || curl -s http://localhost:3001/health
else
    echo -e "${RED}❌ Backend ne répond pas en local${NC}"
    echo -e "${YELLOW}   Erreur: Connection refused ou timeout${NC}"
    echo -e "${YELLOW}   Solution: Redémarrer le backend${NC}"
fi
echo ""

# 4. Tester la route /api/leads en local
echo -e "${BLUE}4. Test route /api/leads en local :${NC}"
TEST_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -d '{"nom":"Test","prenom":"Diagnostic","email":"test-diagnostic@example.com","telephone":"+33600000000"}' 2>&1)

HTTP_CODE=$(echo "$TEST_RESPONSE" | tail -1)
BODY=$(echo "$TEST_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Route /api/leads fonctionne (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Route /api/leads ne fonctionne pas (HTTP $HTTP_CODE)${NC}"
    echo "$BODY"
fi
echo ""

# 5. Vérifier Nginx
echo -e "${BLUE}5. Configuration Nginx :${NC}"
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✅ Configuration Nginx valide${NC}"
else
    echo -e "${RED}❌ Erreur dans la configuration Nginx${NC}"
    sudo nginx -t
fi
echo ""

# 6. Vérifier la config Nginx pour api.talosprimes.com
echo -e "${BLUE}6. Configuration api.talosprimes.com :${NC}"
if [ -f "/etc/nginx/sites-enabled/talosprimes-api" ]; then
    echo -e "${GREEN}✅ Fichier de configuration trouvé${NC}"
    if grep -q "proxy_pass.*3001" /etc/nginx/sites-enabled/talosprimes-api; then
        echo -e "${GREEN}✅ proxy_pass configuré pour port 3001${NC}"
        grep "proxy_pass" /etc/nginx/sites-enabled/talosprimes-api | head -1
    else
        echo -e "${RED}❌ proxy_pass non trouvé ou mal configuré${NC}"
    fi
else
    echo -e "${RED}❌ Fichier de configuration non trouvé${NC}"
    echo -e "${YELLOW}   Solution: sudo ./scripts/configure-nginx.sh${NC}"
fi
echo ""

# 7. Logs Nginx (dernières erreurs)
echo -e "${BLUE}7. Dernières erreurs Nginx :${NC}"
if [ -f "/var/log/nginx/error.log" ]; then
    ERROR_COUNT=$(sudo tail -50 /var/log/nginx/error.log | grep -c "502\|Bad Gateway\|Connection refused" || echo "0")
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $ERROR_COUNT erreur(s) 502 trouvée(s) dans les logs${NC}"
        sudo tail -10 /var/log/nginx/error.log | grep -E "502|Bad Gateway|Connection refused" || echo "Aucune erreur récente"
    else
        echo -e "${GREEN}✅ Aucune erreur 502 récente${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Fichier de log Nginx non trouvé${NC}"
fi
echo ""

# 8. Logs backend (dernières lignes)
echo -e "${BLUE}8. Dernières lignes logs backend :${NC}"
if pm2 list | grep -q "talosprimes-api"; then
    echo -e "${YELLOW}📋 Dernières 10 lignes :${NC}"
    pm2 logs talosprimes-api --lines 10 --nostream 2>/dev/null | tail -10 || echo "Impossible de récupérer les logs"
else
    echo -e "${RED}❌ Backend non trouvé dans PM2${NC}"
fi
echo ""

# Résumé
echo -e "${BLUE}==============================${NC}"
echo -e "${BLUE}📋 Résumé${NC}"
echo -e "${BLUE}==============================${NC}"

ISSUES=0

if ! pm2 list | grep -q "talosprimes-api.*online"; then
    echo -e "${RED}❌ Backend non démarré${NC}"
    ISSUES=$((ISSUES + 1))
fi

if ! sudo netstat -tlnp 2>/dev/null | grep -q ":3001"; then
    echo -e "${RED}❌ Port 3001 non en écoute${NC}"
    ISSUES=$((ISSUES + 1))
fi

if ! curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend ne répond pas${NC}"
    ISSUES=$((ISSUES + 1))
fi

if [ "$ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les tests passent${NC}"
    echo -e "${YELLOW}💡 Si l'erreur 502 persiste, vérifier la configuration Nginx${NC}"
else
    echo -e "${RED}❌ $ISSUES problème(s) détecté(s)${NC}"
    echo -e "${YELLOW}💡 Voir DIAGNOSTIC_502.md pour les solutions${NC}"
fi

