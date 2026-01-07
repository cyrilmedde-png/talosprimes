#!/usr/bin/env tsx
/**
 * Script pour configurer automatiquement tous les WorkflowLinks pour les leads
 * Usage: pnpm workflow:setup-leads
 */

import { PrismaClient } from '@prisma/client';
import { createInterface } from 'readline';

const prisma = new PrismaClient();

// ID fixe du tenant TalosPrimes Admin (depuis le seed)
const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Configuration des workflows leads
const WORKFLOWS = [
  {
    eventType: 'lead_create',
    workflowId: 'lead_create',
    workflowName: 'Leads - Create (via Webhook)',
    description: 'Création d\'un lead via l\'API (POST /api/leads)',
  },
  {
    eventType: 'leads_list',
    workflowId: 'leads_list',
    workflowName: 'Leads - List (via Webhook)',
    description: 'Récupération de la liste des leads (GET /api/leads)',
  },
  {
    eventType: 'lead_get',
    workflowId: 'lead_get',
    workflowName: 'Leads - Get (via Webhook)',
    description: 'Récupération d\'un lead par ID (GET /api/leads/:id)',
  },
  {
    eventType: 'lead_update_status',
    workflowId: 'lead_update_status',
    workflowName: 'Leads - Update Status (via Webhook)',
    description: 'Mise à jour du statut d\'un lead (PATCH /api/leads/:id/statut)',
  },
  {
    eventType: 'lead_delete',
    workflowId: 'lead_delete',
    workflowName: 'Leads - Delete (via Webhook)',
    description: 'Suppression d\'un lead (DELETE /api/leads/:id)',
  },
];

async function main() {
  console.log('🔧 Configuration des WorkflowLinks pour les leads\n');

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

  // Récupérer ou créer le module métier "Leads"
  let moduleMetier = await prisma.moduleMetier.findUnique({
    where: { code: 'leads' },
  });

  if (!moduleMetier) {
    console.log('📦 Création du module métier "Leads"...');
    moduleMetier = await prisma.moduleMetier.create({
      data: {
        code: 'leads',
        nomAffiche: 'Gestion des Leads',
        description: 'Module de gestion des leads et inscriptions',
        metierCible: 'tous',
        prixParMois: 0,
        categorie: 'CRM',
        icone: 'UserPlusIcon',
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
    where: { tenantId: TENANT_ID },
    include: { moduleMetier: true },
  });

  for (const link of links) {
    console.log(`   - ${link.typeEvenement} → ${link.workflowN8nNom} (${link.statut})`);
  }

  console.log('\n🎯 Prochaines étapes:');
  console.log('   1. Importer les workflows JSON dans n8n (depuis n8n_workflows/leads/)');
  console.log('   2. Activer chaque workflow dans n8n');
  console.log('   3. Vérifier que les webhook URLs sont correctes (https://n8n.talosprimes.com/webhook/...)');
  console.log('   4. Tester la création d\'un lead depuis l\'interface\n');
}

main()
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

