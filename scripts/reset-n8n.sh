#!/bin/bash

# =============================================================================
# Reset complet de n8n - TalosPrimes
# =============================================================================
# Ce script remet n8n a zero avec une configuration propre.
# Il sauvegarde les anciennes donnees, recree un environnement frais,
# et genere une encryption key stable.
#
# Usage: ./scripts/reset-n8n.sh
#
# IMPORTANT: Executez ce script en tant que root sur le VPS
# =============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
N8N_DIR="/home/root/n8n-agent"
N8N_DATA="$N8N_DIR/n8n-data"
N8N_BACKUP="$N8N_DIR/n8n-data-backup-$(date +%Y%m%d-%H%M%S)"
COMPOSE_FILE="$N8N_DIR/docker-compose.yml"

# Valeurs connues
N8N_ENCRYPTION_KEY="OsfTZ7GJvYcado7XYMgZUz4gySHIMmis"
N8N_WEBHOOK_SECRET="Wx0t2B5hR4"
N8N_DOMAIN="n8n.talosprimes.com"

echo ""
echo -e "${BOLD}${RED}========================================${NC}"
echo -e "${BOLD}${RED}  n8n - RESET COMPLET${NC}"
echo -e "${BOLD}${RED}========================================${NC}"
echo ""
echo -e "${YELLOW}ATTENTION: Ce script va:${NC}"
echo -e "  1. Arreter le container n8n"
echo -e "  2. Sauvegarder les donnees actuelles"
echo -e "  3. Creer un dossier de donnees vierge"
echo -e "  4. Ecrire un docker-compose.yml propre"
echo -e "  5. Redemarrer n8n avec une base propre"
echo ""
echo -e "${YELLOW}Les anciennes donnees seront conservees dans:${NC}"
echo -e "  $N8N_BACKUP"
echo ""

read -p "Continuer ? (oui/non) " CONFIRM
if [ "$CONFIRM" != "oui" ]; then
  echo "Annule."
  exit 0
fi

# =============================================================================
# Etape 1: Arreter n8n
# =============================================================================

echo ""
echo -e "${CYAN}━━━ Etape 1/5: Arret de n8n ━━━${NC}"

cd "$N8N_DIR"

# Arreter via docker-compose
if [ -f "$COMPOSE_FILE" ]; then
  docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true
  echo -e "  ${GREEN}[OK]${NC} docker-compose down"
fi

# Arreter tout container n8n restant
for cid in $(docker ps -aq --filter "name=n8n" 2>/dev/null); do
  docker stop "$cid" 2>/dev/null || true
  docker rm "$cid" 2>/dev/null || true
  echo -e "  ${GREEN}[OK]${NC} Container $cid supprime"
done

echo -e "  ${GREEN}[OK]${NC} n8n arrete"

# =============================================================================
# Etape 2: Sauvegarder les anciennes donnees
# =============================================================================

echo ""
echo -e "${CYAN}━━━ Etape 2/5: Sauvegarde des donnees ━━━${NC}"

if [ -d "$N8N_DATA" ]; then
  mv "$N8N_DATA" "$N8N_BACKUP"
  echo -e "  ${GREEN}[OK]${NC} Donnees sauvegardees dans $N8N_BACKUP"
else
  echo -e "  ${YELLOW}[INFO]${NC} Pas de donnees existantes a sauvegarder"
fi

# Aussi sauvegarder le docker volume s'il existe
if docker volume inspect root_n8n_data > /dev/null 2>&1; then
  echo -e "  ${BLUE}[INFO]${NC} Volume Docker root_n8n_data existe (conserve pour reference)"
fi

# =============================================================================
# Etape 3: Creer un dossier de donnees frais
# =============================================================================

echo ""
echo -e "${CYAN}━━━ Etape 3/5: Creation dossier frais ━━━${NC}"

mkdir -p "$N8N_DATA"
chown -R 1000:1000 "$N8N_DATA"
echo -e "  ${GREEN}[OK]${NC} Dossier $N8N_DATA cree (owner: 1000:1000)"

# =============================================================================
# Etape 4: Ecrire le docker-compose.yml
# =============================================================================

echo ""
echo -e "${CYAN}━━━ Etape 4/5: Configuration docker-compose ━━━${NC}"

# Backup ancien docker-compose
if [ -f "$COMPOSE_FILE" ]; then
  cp "$COMPOSE_FILE" "${COMPOSE_FILE}.bak-$(date +%Y%m%d-%H%M%S)"
  echo -e "  ${BLUE}[INFO]${NC} Ancien docker-compose sauvegarde"
fi

cat > "$COMPOSE_FILE" << 'DOCKEREOF'
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      # === CRITICAL: Encryption key - NE JAMAIS CHANGER ===
      - N8N_ENCRYPTION_KEY=OsfTZ7GJvYcado7XYMgZUz4gySHIMmis

      # === Webhook & URL ===
      - WEBHOOK_URL=https://n8n.talosprimes.com/
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=https

      # === Timezone ===
      - GENERIC_TIMEZONE=Europe/Paris
      - TZ=Europe/Paris

      # === Execution settings ===
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168

      # === Log level ===
      - N8N_LOG_LEVEL=info

      # === Security ===
      - N8N_SECURE_COOKIE=false
    volumes:
      - ./n8n-data:/home/node/.n8n
    user: "1000:1000"
DOCKEREOF

echo -e "  ${GREEN}[OK]${NC} docker-compose.yml ecrit"

# =============================================================================
# Etape 5: Demarrer n8n frais
# =============================================================================

echo ""
echo -e "${CYAN}━━━ Etape 5/5: Demarrage de n8n ━━━${NC}"

cd "$N8N_DIR"
docker-compose up -d 2>/dev/null || docker compose up -d

# Attendre le demarrage
echo -e "  ${BLUE}[INFO]${NC} Attente du demarrage (15s)..."
sleep 15

# Verifier que le container tourne
if docker ps --format '{{.Names}}' | grep -q "^n8n$"; then
  echo -e "  ${GREEN}[OK]${NC} Container n8n actif"
else
  echo -e "  ${RED}[ERREUR]${NC} n8n ne demarre pas !"
  echo -e "  ${BLUE}[INFO]${NC} Logs:"
  docker logs n8n --tail 30
  exit 1
fi

# Verifier la reponse HTTP
sleep 5
if curl -sf --max-time 5 "http://localhost:5678" > /dev/null 2>&1; then
  echo -e "  ${GREEN}[OK]${NC} n8n repond sur http://localhost:5678"
else
  echo -e "  ${YELLOW}[WARN]${NC} n8n ne repond pas encore (peut prendre 30s au premier lancement)"
fi

# =============================================================================
# Resume
# =============================================================================

echo ""
echo -e "${BOLD}${GREEN}========================================${NC}"
echo -e "${BOLD}${GREEN}  Reset n8n termine !${NC}"
echo -e "${BOLD}${GREEN}========================================${NC}"
echo ""
echo -e "${BOLD}Prochaines etapes:${NC}"
echo ""
echo -e "  ${CYAN}1.${NC} Ouvrir ${BOLD}https://${N8N_DOMAIN}${NC}"
echo -e "     → Creer votre compte owner"
echo ""
echo -e "  ${CYAN}2.${NC} Creer les credentials (Settings > Credentials):"
echo ""
echo -e "     ${BOLD}a) Header Auth${NC} (pour l'API TalosPrimes)"
echo -e "        Name:         ${GREEN}TalosPrimes API${NC}"
echo -e "        Header Name:  ${GREEN}x-talosprimes-n8n-secret${NC}"
echo -e "        Header Value: ${GREEN}${N8N_WEBHOOK_SECRET}${NC}"
echo ""
echo -e "     ${BOLD}b) Telegram API${NC}"
echo -e "        → Votre bot token de @BotFather"
echo ""
echo -e "     ${BOLD}c) Anthropic API${NC} (Claude)"
echo -e "        → Votre cle API Anthropic"
echo ""
echo -e "     ${BOLD}d) OpenAI API${NC} (Whisper pour transcription vocale)"
echo -e "        → Votre cle API OpenAI"
echo ""
echo -e "     ${BOLD}e) PostgreSQL${NC}"
echo -e "        Host:     localhost ou IP serveur"
echo -e "        Database: talosprimes"
echo -e "        User:     talosprimes"
echo -e "        Password: (votre mot de passe PostgreSQL)"
echo ""
echo -e "     ${BOLD}f) Twilio${NC} (SMS) - si utilise"
echo -e "     ${BOLD}g) Resend${NC} (Email) - si utilise"
echo ""
echo -e "  ${CYAN}3.${NC} Importer les workflows depuis le dossier:"
echo -e "     ${BOLD}/var/www/talosprimes/n8n_workflows/${NC}"
echo ""
echo -e "  ${CYAN}4.${NC} Remapper les credentials dans chaque workflow importe"
echo ""
echo -e "  ${CYAN}5.${NC} Activer les workflows"
echo ""
echo -e "${YELLOW}Backup des anciennes donnees:${NC}"
echo -e "  $N8N_BACKUP"
echo ""
