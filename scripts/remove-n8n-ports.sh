#!/bin/bash

# Script pour supprimer la section ports du docker-compose.yaml de n8n
# Usage: sudo ./remove-n8n-ports.sh

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

COMPOSE_FILE="/root/docker-compose.yaml"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Suppression des ports n8n             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Vérifier que le fichier existe
if [ ! -f "$COMPOSE_FILE" ]; then
  echo -e "${RED}❌ Fichier $COMPOSE_FILE non trouvé${NC}"
  exit 1
fi

echo -e "${BLUE}📋 Fichier trouvé : $COMPOSE_FILE${NC}"
echo ""

# Afficher la section ports actuelle
echo -e "${BLUE}📋 Section ports actuelle :${NC}"
if grep -A 3 "ports:" "$COMPOSE_FILE" | grep -q "443\|5678"; then
  grep -A 3 "ports:" "$COMPOSE_FILE" | sed 's/^/  /' || true
else
  echo "  Aucune section ports trouvée"
fi
echo ""

# Créer un backup
BACKUP_FILE="${COMPOSE_FILE}.backup.$(date +%Y%m%d-%H%M%S)"
cp "$COMPOSE_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup créé : $BACKUP_FILE${NC}"
echo ""

# Supprimer la section ports pour n8n
echo -e "${BLUE}📋 Suppression de la section ports...${NC}"

# Utiliser sed pour supprimer les lignes ports
# Supprimer la ligne "ports:" et les lignes suivantes qui contiennent des ports
sed -i '/^[[:space:]]*ports:/,/^[[:space:]]*[a-z]/ {
  /^[[:space:]]*ports:/d
  /^[[:space:]]*-.*443.*5678/d
  /^[[:space:]]*-.*5678.*5678/d
  /^[[:space:]]*- ".*5678:.*"/d
  /^[[:space:]]*- ".*443:.*"/d
}' "$COMPOSE_FILE"

# Supprimer aussi les lignes vides après la suppression
sed -i '/^[[:space:]]*ports:[[:space:]]*$/,/^[[:space:]]*[a-z]/ { 
  /^[[:space:]]*ports:[[:space:]]*$/d; 
}' "$COMPOSE_FILE" 2>/dev/null || true

# Méthode plus agressive : supprimer toutes les lignes contenant "ports" dans la section n8n
python3 << 'PYTHON_SCRIPT'
import re
import sys

file_path = "/root/docker-compose.yaml"

try:
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    new_lines = []
    in_n8n_service = False
    skip_ports = False
    indent_level = 0
    
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.lstrip()
        
        # Détecter le début du service n8n
        if re.match(r'^\s*n8n:', line) or re.match(r'^\s*container_name:\s*n8n', line):
            in_n8n_service = True
            new_lines.append(line)
            i += 1
            continue
        
        # Si on est dans le service n8n
        if in_n8n_service:
            # Détecter la section ports
            if re.match(r'^\s+ports:', line):
                skip_ports = True
                indent_level = len(line) - len(line.lstrip())
                i += 1
                continue
            
            # Si on est en train de sauter les ports
            if skip_ports:
                current_indent = len(line) - len(line.lstrip())
                # Si la ligne suivante est au même niveau ou moins indentée, on arrête de sauter
                if line.strip() and current_indent <= indent_level:
                    skip_ports = False
                    in_n8n_service = False
                    new_lines.append(line)
                # Sinon, on continue de sauter (c'est une ligne de la section ports)
                i += 1
                continue
            
            # Détecter la fin du service (nouveau service ou retour au niveau racine)
            if line.strip() and not line.startswith(' ') and not line.startswith('\t'):
                in_n8n_service = False
                new_lines.append(line)
                i += 1
                continue
        
        new_lines.append(line)
        i += 1
    
    with open(file_path, 'w') as f:
        f.writelines(new_lines)
    
    print("✅ Section ports supprimée")
    
except Exception as e:
    print(f"❌ Erreur: {e}")
    sys.exit(1)
PYTHON_SCRIPT

echo ""

# Vérifier que la section ports a été supprimée
echo -e "${BLUE}📋 Vérification...${NC}"
if grep -A 3 "ports:" "$COMPOSE_FILE" | grep -q "443\|5678"; then
  echo -e "${YELLOW}⚠️  Des ports sont encore présents${NC}"
  echo "Vérifiez manuellement le fichier"
else
  echo -e "${GREEN}✅ Section ports supprimée${NC}"
fi

echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Modification terminée                 ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "📋 Prochaines étapes :"
echo "  1. Vérifiez le fichier :"
echo "     nano $COMPOSE_FILE"
echo ""
echo "  2. Cherchez la section n8n et assurez-vous qu'il n'y a pas de section 'ports:'"
echo ""
echo "  3. Démarrer le conteneur :"
echo "     cd /root"
echo "     docker compose up -d"
echo ""

