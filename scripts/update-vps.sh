#!/bin/bash

# Script de mise à jour automatique du VPS TalosPrimes
# Usage: ./scripts/update-vps.sh [--skip-build] [--skip-restart]

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/talosprimes"
SKIP_BUILD=false
SKIP_RESTART=false

# Parser les arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-restart)
      SKIP_RESTART=true
      shift
      ;;
    *)
      echo -e "${RED}Option inconnue: $1${NC}"
      echo "Usage: $0 [--skip-build] [--skip-restart]"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Mise à jour TalosPrimes VPS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -d "$PROJECT_DIR" ]; then
  echo -e "${RED}❌ Erreur: Le répertoire $PROJECT_DIR n'existe pas${NC}"
  exit 1
fi

cd "$PROJECT_DIR"

# 1. Mettre à jour pnpm
echo -e "${YELLOW}📦 Vérification et mise à jour de pnpm...${NC}"
CURRENT_PNPM_VERSION=$(pnpm --version 2>/dev/null || echo "0.0.0")
echo -e "${BLUE}  Version actuelle: $CURRENT_PNPM_VERSION${NC}"

# Installer/mettre à jour pnpm via corepack (méthode recommandée)
if command -v corepack &> /dev/null; then
  echo -e "${BLUE}  → Mise à jour via corepack...${NC}"
  corepack enable
  corepack prepare pnpm@latest --activate
  NEW_PNPM_VERSION=$(pnpm --version)
  echo -e "${GREEN}  ✅ pnpm mis à jour vers $NEW_PNPM_VERSION${NC}"
elif command -v npm &> /dev/null; then
  echo -e "${BLUE}  → Installation via npm...${NC}"
  npm install -g pnpm@latest
  NEW_PNPM_VERSION=$(pnpm --version)
  echo -e "${GREEN}  ✅ pnpm installé/mis à jour vers $NEW_PNPM_VERSION${NC}"
else
  echo -e "${YELLOW}  ⚠️  corepack et npm non trouvés, installation via script...${NC}"
  curl -fsSL https://get.pnpm.io/install.sh | sh -
  export PNPM_HOME="$HOME/.local/share/pnpm"
  export PATH="$PNPM_HOME:$PATH"
  NEW_PNPM_VERSION=$(pnpm --version)
  echo -e "${GREEN}  ✅ pnpm installé vers $NEW_PNPM_VERSION${NC}"
fi
echo ""

# 2. Récupérer les dernières modifications depuis GitHub
echo -e "${YELLOW}📥 Récupération des modifications depuis GitHub...${NC}"
if git pull origin main; then
  echo -e "${GREEN}✅ Modifications récupérées avec succès${NC}"
else
  echo -e "${RED}❌ Erreur lors de la récupération des modifications${NC}"
  exit 1
fi
echo ""

# 3. Installer les dépendances
echo -e "${YELLOW}📦 Installation des dépendances...${NC}"
# Déterminer la commande pnpm à utiliser
if command -v pnpm &> /dev/null; then
  PNPM_CMD="pnpm"
elif [ -f "$HOME/.local/share/pnpm/pnpm" ]; then
  PNPM_CMD="$HOME/.local/share/pnpm/pnpm"
  export PNPM_HOME="$HOME/.local/share/pnpm"
  export PATH="$PNPM_HOME:$PATH"
else
  echo -e "${RED}❌ Erreur: pnpm n'est pas installé${NC}"
  exit 1
fi

if $PNPM_CMD install; then
  echo -e "${GREEN}✅ Dépendances installées avec succès${NC}"
else
  echo -e "${RED}❌ Erreur lors de l'installation des dépendances${NC}"
  exit 1
fi
echo ""

# 4. Build des packages
if [ "$SKIP_BUILD" = false ]; then
  echo -e "${YELLOW}🔨 Build des packages...${NC}"
  
  # Build shared
  echo -e "${BLUE}  → Build @talosprimes/shared...${NC}"
  if cd packages/shared && $PNPM_CMD build; then
    echo -e "${GREEN}  ✅ Shared buildé${NC}"
  else
    echo -e "${RED}  ❌ Erreur lors du build de shared${NC}"
    exit 1
  fi
  cd "$PROJECT_DIR"
  
  # Build platform
  echo -e "${BLUE}  → Build @talosprimes/platform...${NC}"
  if cd packages/platform && $PNPM_CMD build; then
    echo -e "${GREEN}  ✅ Platform buildé${NC}"
  else
    echo -e "${RED}  ❌ Erreur lors du build de platform${NC}"
    exit 1
  fi
  cd "$PROJECT_DIR"
  
  # Build client
  echo -e "${BLUE}  → Build @talosprimes/client...${NC}"
  if cd packages/client && $PNPM_CMD build; then
    echo -e "${GREEN}  ✅ Client buildé${NC}"
  else
    echo -e "${RED}  ❌ Erreur lors du build de client${NC}"
    exit 1
  fi
  cd "$PROJECT_DIR"
  
  echo -e "${GREEN}✅ Tous les packages ont été buildés${NC}"
  echo ""
else
  echo -e "${YELLOW}⏭️  Build ignoré (--skip-build)${NC}"
  echo ""
fi

# 4. Redémarrer les services PM2
if [ "$SKIP_RESTART" = false ]; then
  echo -e "${YELLOW}🔄 Redémarrage des services PM2...${NC}"
  
  # Redémarrer backend
  if pm2 restart talosprimes-api --update-env 2>/dev/null; then
    echo -e "${GREEN}  ✅ Backend redémarré${NC}"
  else
    echo -e "${YELLOW}  ⚠️  Backend non trouvé, création...${NC}"
    cd packages/platform
    pm2 start "pnpm start" --name talosprimes-api
    pm2 save
    cd "$PROJECT_DIR"
    echo -e "${GREEN}  ✅ Backend créé et démarré${NC}"
  fi
  
  # Redémarrer frontend
  if pm2 restart talosprimes-client --update-env 2>/dev/null; then
    echo -e "${GREEN}  ✅ Frontend redémarré${NC}"
  else
    echo -e "${YELLOW}  ⚠️  Frontend non trouvé, création...${NC}"
    cd packages/client
    pm2 start "pnpm start" --name talosprimes-client
    pm2 save
    cd "$PROJECT_DIR"
    echo -e "${GREEN}  ✅ Frontend créé et démarré${NC}"
  fi
  
  echo -e "${GREEN}✅ Services redémarrés${NC}"
  echo ""
else
  echo -e "${YELLOW}⏭️  Redémarrage ignoré (--skip-restart)${NC}"
  echo ""
fi

# 5. Afficher le statut PM2
echo -e "${BLUE}📊 Statut des services:${NC}"
pm2 list
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ Mise à jour terminée avec succès!${NC}"
echo -e "${GREEN}========================================${NC}"

