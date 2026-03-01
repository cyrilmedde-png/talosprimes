#!/bin/bash

# =============================================================================
# Script de creation de sous-domaine pour espace client TalosPrimes
# =============================================================================
# Usage: ./scripts/setup-subdomain.sh <slug>
#
# Cree un vhost nginx pour <slug>.talosprimes.com qui pointe vers le frontend
# et obtient un certificat SSL via certbot.
#
# Prerequis:
#   - nginx installe et actif
#   - certbot installe
#   - DNS *.talosprimes.com pointe vers ce serveur (wildcard A record)
#     OU le record A specifique <slug>.talosprimes.com existe
# =============================================================================

set -e

# --- Config ---
DOMAIN="talosprimes.com"
FRONTEND_PORT=3001
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
CERTBOT_EMAIL="contact@talosprimes.com"

# --- Couleurs ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
log_err()  { echo -e "${RED}[ERR]${NC} $1"; }
log_info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

# --- Validation ---
SLUG="$1"

if [ -z "$SLUG" ]; then
  log_err "Usage: $0 <slug>"
  log_err "Exemple: $0 dupont-sarl"
  exit 1
fi

# Nettoyer le slug
SLUG=$(echo "$SLUG" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g; s/-\+/-/g; s/^-//; s/-$//')

if [ -z "$SLUG" ]; then
  log_err "Slug invalide apres nettoyage"
  exit 1
fi

SUBDOMAIN="${SLUG}.${DOMAIN}"
VHOST_FILE="${NGINX_SITES_AVAILABLE}/${SUBDOMAIN}"

log_info "Creation du sous-domaine: $SUBDOMAIN"

# --- Verifier si deja configure ---
if [ -f "$VHOST_FILE" ]; then
  log_info "Le vhost $SUBDOMAIN existe deja"
  # Verifier si le lien symbolique existe aussi
  if [ -L "${NGINX_SITES_ENABLED}/${SUBDOMAIN}" ]; then
    log_ok "Sous-domaine $SUBDOMAIN deja actif — rien a faire"
    exit 0
  fi
  # Activer le site existant
  ln -sf "$VHOST_FILE" "${NGINX_SITES_ENABLED}/${SUBDOMAIN}"
  nginx -t 2>&1 && systemctl reload nginx
  log_ok "Sous-domaine $SUBDOMAIN reactive"
  exit 0
fi

# --- Creer le vhost nginx (HTTP d'abord pour certbot) ---
log_info "Creation du vhost nginx..."

cat > "$VHOST_FILE" << NGINX_CONF
# Vhost auto-genere pour espace client: $SUBDOMAIN
# Date: $(date '+%Y-%m-%d %H:%M:%S')

server {
    listen 80;
    listen [::]:80;
    server_name ${SUBDOMAIN};

    # Redirect vers HTTPS (sera mis a jour par certbot)
    location / {
        proxy_pass http://127.0.0.1:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Client-Subdomain ${SLUG};
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX_CONF

# --- Activer le site ---
ln -sf "$VHOST_FILE" "${NGINX_SITES_ENABLED}/${SUBDOMAIN}"

# --- Tester et recharger nginx ---
log_info "Test de la configuration nginx..."
if nginx -t 2>&1; then
  systemctl reload nginx
  log_ok "nginx recharge avec le nouveau vhost"
else
  log_err "Erreur dans la config nginx — suppression du vhost"
  rm -f "$VHOST_FILE" "${NGINX_SITES_ENABLED}/${SUBDOMAIN}"
  exit 1
fi

# --- Obtenir le certificat SSL ---
log_info "Obtention du certificat SSL via certbot..."
if certbot --nginx -d "$SUBDOMAIN" --non-interactive --agree-tos --email "$CERTBOT_EMAIL" --redirect 2>&1; then
  log_ok "Certificat SSL obtenu et nginx mis a jour"
else
  log_info "Certbot a echoue (DNS pas encore propage?) — le site reste en HTTP"
  log_info "Relancez plus tard: certbot --nginx -d $SUBDOMAIN"
fi

# --- Resultat ---
echo ""
log_ok "Sous-domaine $SUBDOMAIN configure avec succes"
log_ok "URL: https://${SUBDOMAIN}"
echo ""
