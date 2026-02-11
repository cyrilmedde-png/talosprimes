#!/usr/bin/env tsx
/**
 * Script pour configurer automatiquement tous les WorkflowLinks pour les clients
 * Usage: pnpm workflow:setup-clients
 */

import { PrismaClient } from '@prisma/client';
import { createInterface } from 'readline';

const prisma = new PrismaClient();

// ID fixe du tenant TalosPrimes Admin (depuis le seed)
const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Configuration des workflows clients
const WORKFLOWS = [
  {
    eventType: 'client_create_from_lead',
    workflowId: 'client_create_from_lead',
    workflowName: 'Clients - Create from Lead (via Webhook)',
    description: 'Création d\'un client depuis un lead converti (POST /api/clients/create-from-lead)',
  },
  {
    eventType: 'client_create',
    workflowId: 'client_create',
    workflowName: 'Clients - Create (via Webhook)',
    description: 'Création d\'un client directement (POST /api/clients)',
  },
  {
    eventType: 'clients_list',
    workflowId: 'clients_list',
    workflowName: 'Clients - List (via Webhook)',
    description: 'Récupération de la liste des clients (GET /api/clients)',
  },
  {
    eventType: 'client_get',
    workflowId: 'client_get',
    workflowName: 'Clients - Get (via Webhook)',
    description: 'Récupération d\'un client par ID (GET /api/clients/:id)',
  },
  {
    eventType: 'client_update',
    workflowId: 'client_update',
    workflowName: 'Clients - Update (via Webhook)',
    description: 'Mise à jour d\'un client (PUT /api/clients/:id)',
  },
  {
    eventType: 'client_delete',
    workflowId: 'client_delete',
    workflowName: 'Clients - Delete (via Webhook)',
    description: 'Suppression d\'un client (DELETE /api/clients/:id)',
  },
  {
    eventType: 'client.deleted',
    workflowId: 'client-deleted-cleanup-lead',
    workflowName: 'Clients - Après suppression : supprimer le lead du tunnel',
    description: 'Quand un client est supprimé, supprime le lead (même email) pour qu\'il ne réapparaisse pas dans le tunnel leads→clients',
  },
  {
    eventType: 'client.onboarding',
    workflowId: 'client-onboarding',
    workflowName: 'Clients - Onboarding (via Webhook)',
    description: 'Onboarding automatique : création espace client, abonnement et activation modules',
  },
];

async function main() {
  console.log('🔧 Configuration des WorkflowLinks pour les clients\n');

  // Vérifier que le tenant existe
  const tenant = await prisma.tenant.findUnique({
    where: { id: TENANT_ID },
  });

  if (!tenant) {
    console.error(`❌ Tenant ${TENANT_ID} non trouvé.`);
    console.error('   Exécutez d\'abord: pnpm db:seed');
    process.exit(1);
  }

  console.log(`✅ Tenant trouvé: ${tenant.nomEntreprise}\n`);

  // Récupérer ou créer le module métier "Clients"
  let moduleMetier = await prisma.moduleMetier.findUnique({
    where: { code: 'clients' },
  });

  if (!moduleMetier) {
    console.log('📦 Création du module métier "Clients"...');
    moduleMetier = await prisma.moduleMetier.create({
      data: {
        code: 'clients',
        nomAffiche: 'Gestion des Clients',
        description: 'Module de gestion des clients finaux',
        metierCible: 'tous',
        prixParMois: 0,
        categorie: 'CRM',
        icone: 'UsersIcon',
      },
    });
    console.log('✅ Module métier créé\n');
  } else {
    console.log(`✅ Module métier existant: ${moduleMetier.nomAffiche}\n`);
  }

  // Configurer chaque workflow
  for (const workflow of WORKFLOWS) {
    console.log(`🔗 Configuration: ${workflow.eventType}`);
    console.log(`   ${workflow.description}`);

    // Vérifier si le WorkflowLink existe déjà
    const existing = await prisma.workflowLink.findUnique({
      where: {
        tenantId_typeEvenement: {
          tenantId: TENANT_ID,
          typeEvenement: workflow.eventType,
        },
      },
    });

    if (existing) {
      // Mettre à jour
      await prisma.workflowLink.update({
        where: { id: existing.id },
        data: {
          workflowN8nId: workflow.workflowId,
          workflowN8nNom: workflow.workflowName,
          statut: 'actif',
        },
      });
      console.log('   ✅ Mis à jour\n');
    } else {
      // Créer
      await prisma.workflowLink.create({
        data: {
          tenantId: TENANT_ID,
          moduleMetierId: moduleMetier.id,
          typeEvenement: workflow.eventType,
          workflowN8nId: workflow.workflowId,
          workflowN8nNom: workflow.workflowName,
          statut: 'actif',
        },
      });
      console.log('   ✅ Créé\n');
    }
  }

  console.log('✅ Configuration terminée!\n');
  console.log('📝 WorkflowLinks créés:');
  const links = await prisma.workflowLink.findMany({
    where: { tenantId: TENANT_ID, moduleMetier: { code: 'clients' } },
    include: { moduleMetier: true },
  });

  for (const link of links) {
    console.log(`   - ${link.typeEvenement} → ${link.workflowN8nNom} (${link.statut})`);
  }

  console.log('\n🎯 Prochaines étapes:');
  console.log('   1. Importer les workflows JSON dans n8n (depuis n8n_workflows/clients/)');
  console.log('   2. Activer chaque workflow dans n8n');
  console.log('   3. Vérifier que les webhook URLs sont correctes (https://n8n.talosprimes.com/webhook/...)');
  console.log('   4. Tester la création d\'un client depuis l\'interface\n');
}

main()
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

