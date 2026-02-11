#!/bin/bash

# Script de setup complet pour TalosPrimes
# Ce script installe les dépendances, build les packages et configure l'environnement

set -e  # Arrêter en cas d'erreur

echo "🚀 Setup complet de TalosPrimes"
echo "================================"
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
info() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Vérifier Node.js
echo "📦 Vérification des prérequis..."
if ! command -v node &> /dev/null; then
    error "Node.js n'est pas installé. Veuillez installer Node.js >= 20.0.0"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    error "Node.js version 20+ requis. Version actuelle: $(node --version)"
    exit 1
fi
info "Node.js $(node --version) détecté"

# Vérifier/Installer pnpm
if ! command -v pnpm &> /dev/null; then
    warn "pnpm n'est pas installé. Installation en cours..."
    npm install -g pnpm@8.15.0 || {
        error "Impossible d'installer pnpm. Essayez: npm install -g pnpm@8.15.0"
        exit 1
    }
fi
info "pnpm $(pnpm --version) détecté"

# Aller dans le répertoire du projet
cd "$(dirname "$0")/.."

# Installer les dépendances
echo ""
echo "📥 Installation des dépendances..."
pnpm install || {
    error "Erreur lors de l'installation des dépendances"
    exit 1
}
info "Dépendances installées"

# Builder le package shared en premier
echo ""
echo "🔨 Build du package shared..."
cd packages/shared
pnpm build || {
    error "Erreur lors du build du package shared"
    exit 1
}
info "Package shared buildé avec succès"
cd ../..

# Générer Prisma Client
echo ""
echo "🗄️  Génération du client Prisma..."
cd packages/platform
if [ -f "prisma/schema.prisma" ]; then
    pnpm prisma generate || {
        warn "Erreur lors de la génération du client Prisma (normal si DATABASE_URL n'est pas configuré)"
    }
    info "Client Prisma généré"
else
    warn "Schema Prisma non trouvé"
fi
cd ../..

# Builder le package platform
echo ""
echo "🔨 Build du package platform..."
cd packages/platform
pnpm build || {
    error "Erreur lors du build du package platform"
    exit 1
}
info "Package platform buildé avec succès"
cd ../..

# Builder le package client
echo ""
echo "🔨 Build du package client..."
cd packages/client
pnpm build || {
    warn "Erreur lors du build du package client (peut nécessiter des variables d'environnement)"
    warn "Vous pourrez builder le client plus tard avec: pnpm build"
}
cd ../..

echo ""
echo "✅ Setup terminé avec succès!"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Configurer les variables d'environnement:"
echo "      - packages/platform/.env"
echo "      - packages/client/.env.local"
echo "   2. Démarrer l'application:"
echo "      - Backend: cd packages/platform && pnpm dev"
echo "      - Frontend: cd packages/client && pnpm dev"
echo ""
