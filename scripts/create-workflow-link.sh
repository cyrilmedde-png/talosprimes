#!/bin/bash

# Script pour créer un WorkflowLink dans la base de données
# Usage: ./create-workflow-link.sh [WORKFLOW_ID] [WORKFLOW_NAME] [EVENT_TYPE]

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Vérifier que nous sommes dans le bon répertoire
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ ! -f "$PROJECT_ROOT/packages/platform/prisma/schema.prisma" ]; then
  echo -e "${RED}❌ Erreur: Structure du projet non trouvée${NC}"
  exit 1
fi

cd "$PROJECT_ROOT/packages/platform"

# Demander les informations si non fournies
if [ -z "$1" ]; then
  echo "📝 Création d'un WorkflowLink"
  echo "=============================="
  echo ""
  echo "Entrez les informations du workflow n8n :"
  echo ""
  read -p "Workflow ID n8n (ex: 123) : " WORKFLOW_ID
  read -p "Nom du workflow (ex: Onboarding Client) : " WORKFLOW_NAME
  read -p "Type d'événement (client.created/client.updated/client.deleted) [client.created] : " EVENT_TYPE
  EVENT_TYPE=${EVENT_TYPE:-client.created}
else
  WORKFLOW_ID=$1
  WORKFLOW_NAME=${2:-"Workflow Test"}
  EVENT_TYPE=${3:-client.created}
fi

# Charger les variables d'environnement
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ Erreur: DATABASE_URL non trouvé${NC}"
  echo "Assurez-vous que le fichier .env existe dans packages/platform/"
  exit 1
fi

echo ""
echo -e "${BLUE}🔍 Récupération des informations du tenant...${NC}"

# Essayer d'abord avec l'ID fixe du seed
TENANT_ID=$(psql "$DATABASE_URL" -t -c "SELECT id FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001' LIMIT 1;" 2>/dev/null | xargs || echo "")

# Si pas trouvé, chercher par nom
if [ -z "$TENANT_ID" ]; then
  TENANT_ID=$(psql "$DATABASE_URL" -t -c "SELECT id FROM tenants WHERE nom_entreprise = 'TalosPrimes Admin' LIMIT 1;" 2>/dev/null | xargs || echo "")
fi

# Si toujours pas trouvé, lister tous les tenants
if [ -z "$TENANT_ID" ]; then
  echo -e "${YELLOW}⚠️  Tenant 'TalosPrimes Admin' non trouvé${NC}"
  echo ""
  echo -e "${BLUE}Tenants disponibles dans la base de données :${NC}"
  psql "$DATABASE_URL" -c "SELECT id, nom_entreprise, email_contact FROM tenants LIMIT 10;" 2>/dev/null || echo "Erreur lors de la requête"
  echo ""
  read -p "Entrez le Tenant ID manuellement (ou appuyez sur Entrée pour annuler) : " MANUAL_TENANT_ID
  
  if [ -z "$MANUAL_TENANT_ID" ]; then
    echo "Annulé."
    exit 0
  fi
  
  # Vérifier que le tenant existe
  TENANT_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM tenants WHERE id = '$MANUAL_TENANT_ID';" 2>/dev/null | xargs || echo "0")
  
  if [ "$TENANT_EXISTS" = "0" ]; then
    echo -e "${RED}❌ Erreur: Tenant ID '$MANUAL_TENANT_ID' n'existe pas${NC}"
    exit 1
  fi
  
  TENANT_ID="$MANUAL_TENANT_ID"
fi

echo "  Tenant ID: $TENANT_ID"

# Récupérer ou créer un module métier
MODULE_ID=$(psql "$DATABASE_URL" -t -c "SELECT id FROM module_metiers WHERE code = 'crm_base' LIMIT 1;" 2>/dev/null | xargs || echo "")

if [ -z "$MODULE_ID" ]; then
  echo -e "${YELLOW}⚠️  Module 'crm_base' non trouvé, création...${NC}"
  MODULE_ID=$(psql "$DATABASE_URL" -t -c "
    INSERT INTO module_metiers (id, code, nom_affiché, prix_par_mois, created_at, updated_at)
    VALUES (gen_random_uuid(), 'crm_base', 'CRM Base', 0.00, NOW(), NOW())
    RETURNING id;
  " 2>/dev/null | xargs || echo "")
  
  if [ -z "$MODULE_ID" ]; then
    echo -e "${RED}❌ Erreur: Impossible de créer le module${NC}"
    exit 1
  fi
fi

echo "  Module ID: $MODULE_ID"

# Vérifier si un WorkflowLink existe déjà
EXISTING=$(psql "$DATABASE_URL" -t -c "
  SELECT id FROM workflow_links 
  WHERE tenant_id = '$TENANT_ID' 
  AND type_evenement = '$EVENT_TYPE' 
  LIMIT 1;
" 2>/dev/null | xargs || echo "")

if [ -n "$EXISTING" ]; then
  echo ""
  echo -e "${YELLOW}⚠️  Un WorkflowLink existe déjà pour cet événement${NC}"
  read -p "Voulez-vous le mettre à jour ? (y/n) : " UPDATE
  if [ "$UPDATE" = "y" ] || [ "$UPDATE" = "Y" ]; then
    psql "$DATABASE_URL" -c "
      UPDATE workflow_links
      SET workflow_n8n_id = '$WORKFLOW_ID',
          workflow_n8n_nom = '$WORKFLOW_NAME',
          statut = 'actif',
          updated_at = NOW()
      WHERE id = '$EXISTING';
    " >/dev/null 2>&1
    echo -e "${GREEN}✅ WorkflowLink mis à jour${NC}"
    exit 0
  else
    echo "Annulé."
    exit 0
  fi
fi

# Créer le WorkflowLink
echo ""
echo -e "${BLUE}📝 Création du WorkflowLink...${NC}"

psql "$DATABASE_URL" -c "
  INSERT INTO workflow_links (
    id,
    tenant_id,
    module_metier_id,
    type_evenement,
    workflow_n8n_id,
    workflow_n8n_nom,
    statut,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    '$TENANT_ID',
    '$MODULE_ID',
    '$EVENT_TYPE',
    '$WORKFLOW_ID',
    '$WORKFLOW_NAME',
    'actif',
    NOW(),
    NOW()
  );
" >/dev/null 2>&1

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ WorkflowLink créé avec succès${NC}"
  echo ""
  echo "  - Workflow ID: $WORKFLOW_ID"
  echo "  - Nom: $WORKFLOW_NAME"
  echo "  - Événement: $EVENT_TYPE"
  echo "  - Statut: actif"
else
  echo -e "${RED}❌ Erreur lors de la création du WorkflowLink${NC}"
  exit 1
fi

