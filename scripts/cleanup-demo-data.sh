#!/bin/bash
# ============================================================
# cleanup-demo-data.sh
# Purge les données du tenant demo toutes les 24-48h
# GARDE : le tenant, le user, le ClientSpace (le compte reste fonctionnel)
# SUPPRIME : leads, clients, factures, devis, notifications, etc.
#
# Usage: ./scripts/cleanup-demo-data.sh
# Cron:  0 4 * * * /root/talosprimes/scripts/cleanup-demo-data.sh >> /var/log/talosprimes-demo-cleanup.log 2>&1
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Charger le DATABASE_URL depuis .env
if [ -f "$PROJECT_DIR/.env" ]; then
  source <(grep '^DATABASE_URL=' "$PROJECT_DIR/.env")
elif [ -f "$PROJECT_DIR/packages/platform/.env" ]; then
  source <(grep '^DATABASE_URL=' "$PROJECT_DIR/packages/platform/.env")
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL non trouvé"
  exit 1
fi

echo "🧹 [$(date '+%Y-%m-%d %H:%M:%S')] Début nettoyage données demo..."

# Récupérer le tenantId du demo via client_spaces.tenant_slug
DEMO_TENANT_ID=$(psql "$DATABASE_URL" -t -A -c "
  SELECT client_tenant_id FROM client_spaces
  WHERE tenant_slug = 'demo' AND status = 'actif'
  LIMIT 1;
" 2>/dev/null || echo "")

if [ -z "$DEMO_TENANT_ID" ]; then
  echo "⚠️  Aucun espace client 'demo' actif trouvé — rien à nettoyer."
  exit 0
fi

echo "🎯 Tenant demo trouvé: $DEMO_TENANT_ID"

# Purge des données — l'ordre compte (FK constraints)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL

BEGIN;

-- Notifications
DELETE FROM notifications WHERE tenant_id = '$DEMO_TENANT_ID';

-- Comptabilité
DELETE FROM compta_ia_logs WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM immobilisations WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM declarations_tva WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM rapprochements_bancaires WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM lettrages WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM ecritures_comptables WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM journaux_comptables WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM plan_comptable WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM exercices_comptables WHERE tenant_id = '$DEMO_TENANT_ID';

-- Documents commerciaux
DELETE FROM avoirs WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM proformas WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM invoices WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM bons_commande WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM devis WHERE tenant_id = '$DEMO_TENANT_ID';

-- CRM
DELETE FROM leads WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM client_finals WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM partners WHERE tenant_id = '$DEMO_TENANT_ID';

-- Agent IA
DELETE FROM agent_calendar_events WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM call_logs WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM sms_logs WHERE tenant_id = '$DEMO_TENANT_ID';

-- Questionnaires
DELETE FROM questionnaire_responses WHERE questionnaire_id IN (
  SELECT id FROM questionnaires WHERE tenant_id = '$DEMO_TENANT_ID'
);
DELETE FROM questionnaires WHERE tenant_id = '$DEMO_TENANT_ID';

-- Équipe
DELETE FROM equipe_pointages WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM equipe_absences WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM equipe_members WHERE tenant_id = '$DEMO_TENANT_ID';

-- Projets
DELETE FROM projet_taches WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM projets WHERE tenant_id = '$DEMO_TENANT_ID';

-- BTP
DELETE FROM btp_situations WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM btp_chantiers WHERE tenant_id = '$DEMO_TENANT_ID';

-- RH
DELETE FROM rh_conges WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM rh_documents WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM rh_entretiens WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM rh_formations WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM rh_bulletins_paie WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM rh_contrats WHERE tenant_id = '$DEMO_TENANT_ID';

-- RGPD
DELETE FROM consent_logs WHERE tenant_id = '$DEMO_TENANT_ID';
DELETE FROM rgpd_requests WHERE tenant_id = '$DEMO_TENANT_ID';

COMMIT;

SQL

echo "✅ [$(date '+%Y-%m-%d %H:%M:%S')] Nettoyage demo terminé — tenant $DEMO_TENANT_ID purgé."
