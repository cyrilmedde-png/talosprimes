#!/bin/bash

# Script de vérification de la configuration n8n
# Usage: ./scripts/verify-n8n-setup.sh

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Vérification de la Configuration n8n${NC}"
echo "=========================================="
echo ""

# Aller dans le répertoire du projet
cd "$(dirname "$0")/.."

# Variables
PLATFORM_DIR="packages/platform"
ENV_FILE="$PLATFORM_DIR/.env"
ERRORS=0
WARNINGS=0

# Fonctions
info() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

error() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

section() {
    echo ""
    echo -e "${BLUE}📋 $1${NC}"
    echo "----------------------------------------"
}

# 1. Vérifier que le fichier .env existe
section "1. Vérification du fichier .env"

if [ ! -f "$ENV_FILE" ]; then
    error "Fichier .env non trouvé dans $PLATFORM_DIR"
    echo "   Créez le fichier avec les variables N8N requises"
else
    info "Fichier .env trouvé"
fi

# 2. Vérifier les variables d'environnement
section "2. Vérification des variables d'environnement"

if [ -f "$ENV_FILE" ]; then
    # Charger les variables
    source "$ENV_FILE" 2>/dev/null || true
    
    # N8N_API_URL
    if [ -z "$N8N_API_URL" ]; then
        error "N8N_API_URL non défini"
    else
        info "N8N_API_URL = $N8N_API_URL"
    fi
    
    # Authentification
    if [ -n "$N8N_API_KEY" ]; then
        info "N8N_API_KEY configuré (API Key)"
    elif [ -n "$N8N_USERNAME" ] && [ -n "$N8N_PASSWORD" ]; then
        info "N8N_USERNAME/PASSWORD configuré (Basic Auth)"
    else
        warn "Aucune authentification n8n configurée (N8N_API_KEY ou N8N_USERNAME/PASSWORD)"
    fi
    
    # N8N_WEBHOOK_SECRET
    if [ -z "$N8N_WEBHOOK_SECRET" ]; then
        warn "N8N_WEBHOOK_SECRET non défini (requis pour que n8n appelle l'API)"
    else
        if [ ${#N8N_WEBHOOK_SECRET} -lt 32 ]; then
            warn "N8N_WEBHOOK_SECRET trop court (minimum 32 caractères recommandé)"
        else
            info "N8N_WEBHOOK_SECRET configuré"
        fi
    fi
    
    # USE_N8N_VIEWS et USE_N8N_COMMANDS
    if [ "$USE_N8N_VIEWS" = "true" ]; then
        info "USE_N8N_VIEWS = true (délégation des GET activée)"
    else
        info "USE_N8N_VIEWS = false (délégation des GET désactivée)"
    fi
    
    if [ "$USE_N8N_COMMANDS" = "true" ]; then
        info "USE_N8N_COMMANDS = true (délégation des POST/PATCH/DELETE activée)"
    else
        info "USE_N8N_COMMANDS = false (délégation des POST/PATCH/DELETE désactivée)"
    fi
fi

# 3. Vérifier que le backend est démarré
section "3. Vérification du backend"

if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "talosprimes-api.*online"; then
        info "Backend démarré (PM2)"
    else
        warn "Backend non démarré ou en erreur"
        echo "   Exécutez: pm2 restart talosprimes-api"
    fi
else
    warn "PM2 non trouvé (vérification impossible)"
fi

# 4. Tester la connexion à n8n (si backend démarré)
section "4. Test de connexion à n8n"

if [ -n "$N8N_API_URL" ]; then
    # Tester si n8n est accessible
    if curl -s --max-time 5 "$N8N_API_URL/healthz" > /dev/null 2>&1; then
        info "n8n accessible à $N8N_API_URL"
    else
        warn "n8n non accessible à $N8N_API_URL"
        echo "   Vérifiez que n8n est démarré et accessible"
    fi
else
    warn "Impossible de tester (N8N_API_URL non défini)"
fi

# 5. Vérifier les WorkflowLinks en base de données
section "5. Vérification des WorkflowLinks"

if [ -f "$PLATFORM_DIR/.env" ]; then
    cd "$PLATFORM_DIR"
    
    # Vérifier si Prisma est disponible
    if command -v pnpm &> /dev/null; then
        # Compter les WorkflowLinks (approximatif via Prisma Studio ou script)
        info "Pour vérifier les WorkflowLinks, exécutez:"
        echo "   cd $PLATFORM_DIR && pnpm prisma studio"
        echo "   OU"
        echo "   pnpm workflow:setup-leads"
    else
        warn "pnpm non trouvé (vérification impossible)"
    fi
    
    cd - > /dev/null
else
    warn "Impossible de vérifier (fichier .env non trouvé)"
fi

# 6. Vérifier les workflows JSON
section "6. Vérification des workflows JSON"

if [ -d "n8n_workflows" ]; then
    WORKFLOW_COUNT=$(find n8n_workflows -name "*.json" | wc -l)
    if [ "$WORKFLOW_COUNT" -gt 0 ]; then
        info "$WORKFLOW_COUNT workflow(s) JSON trouvé(s)"

        # TalosPrimes
        if [ -d "n8n_workflows/talosprimes" ]; then
            TP_COUNT=$(find n8n_workflows/talosprimes -name "*.json" | wc -l)
            echo "   TalosPrimes: $TP_COUNT workflow(s)"
            for dir in n8n_workflows/talosprimes/*/; do
                if [ -d "$dir" ]; then
                    COUNT=$(find "$dir" -name "*.json" | wc -l)
                    if [ "$COUNT" -gt 0 ]; then
                        echo "   - $(basename "$dir"): $COUNT workflow(s)"
                    fi
                fi
            done
        fi

        # Clients
        if [ -d "n8n_workflows/clients" ]; then
            for client_dir in n8n_workflows/clients/*/; do
                if [ -d "$client_dir" ]; then
                    CLIENT_COUNT=$(find "$client_dir" -name "*.json" | wc -l)
                    if [ "$CLIENT_COUNT" -gt 0 ]; then
                        echo "   Client $(basename "$client_dir"): $CLIENT_COUNT workflow(s)"
                    fi
                fi
            done
        fi
    else
        warn "Aucun workflow JSON trouvé"
    fi
else
    warn "Dossier n8n_workflows non trouvé"
fi

# Résumé
echo ""
echo "=========================================="
echo -e "${BLUE}📊 Résumé${NC}"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Configuration n8n complète et correcte${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Configuration n8n partielle ($WARNINGS avertissement(s))${NC}"
    echo ""
    echo "Consultez GUIDE_COMPLET_N8N.md pour compléter la configuration"
    exit 0
else
    echo -e "${RED}❌ Configuration n8n incomplète ($ERRORS erreur(s), $WARNINGS avertissement(s))${NC}"
    echo ""
    echo "Consultez GUIDE_COMPLET_N8N.md pour corriger les problèmes"
    exit 1
fi
