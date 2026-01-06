#!/bin/bash

# Script de nettoyage des configurations Nginx en conflit
# Usage: sudo ./cleanup-nginx.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🧹 Nettoyage des configurations Nginx en conflit${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Veuillez exécuter ce script avec sudo${NC}"
    exit 1
fi

# Lister les configurations existantes
echo -e "${YELLOW}📋 Configurations existantes :${NC}"
ls -la /etc/nginx/sites-enabled/ | grep -E "talos|default"

echo ""
read -p "Voulez-vous supprimer les configurations par défaut et les anciennes configs talosprime ? (y/n): " confirm

if [ "$confirm" = "y" ]; then
    # Supprimer la configuration par défaut
    if [ -f /etc/nginx/sites-enabled/default ]; then
        echo -e "${GREEN}🗑️  Suppression de la configuration par défaut...${NC}"
        rm -f /etc/nginx/sites-enabled/default
    fi

    # Supprimer les anciennes configurations talosprime
    echo -e "${GREEN}🗑️  Suppression des anciennes configurations talosprime...${NC}"
    rm -f /etc/nginx/sites-enabled/talosprime*

    # Garder seulement les nouvelles configurations
    echo -e "${GREEN}✅ Nettoyage terminé${NC}"
    
    # Tester la configuration
    echo -e "${GREEN}🧪 Test de la configuration...${NC}"
    if nginx -t; then
        echo -e "${GREEN}✅ Configuration valide${NC}"
        systemctl reload nginx
        echo -e "${GREEN}✅ Nginx rechargé${NC}"
    else
        echo -e "${RED}❌ Erreur dans la configuration${NC}"
        exit 1
    fi
else
    echo "Annulé."
fi

