#!/usr/bin/env tsx
/**
 * Script pour configurer automatiquement tous les WorkflowLinks pour les factures
 * Usage: pnpm workflow:setup-invoices
 */

import { PrismaClient } from '@prisma/client';
import { createInterface } from 'readline';

const prisma = new PrismaClient();

// ID fixe du tenant TalosPrimes Admin (depuis le seed)
const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Configuration des workflows factures
const WORKFLOWS = [
  {
    eventType: 'invoice_create',
    workflowId: 'invoice_create',
    workflowName: 'Factures - Création (via Webhook)',
    description: 'Création d\'une facture (POST /api/invoices)',
  },
  {
    eventType: 'invoice_paid',
    workflowId: 'invoice_paid',
    workflowName: 'Factures - Paiement (via Webhook)',
    description: 'Marquage d\'une facture comme payée (POST /api/invoices/paid)',
  },
  {
    eventType: 'invoice_overdue',
    workflowId: 'invoice_overdue',
    workflowName: 'Factures - En retard (via Webhook)',
    description: 'Détection d\'une facture en retard (POST /api/invoices/overdue)',
  },
];

async function main() {
  console.log('🔧 Configuration des WorkflowLinks pour les factures\n');

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

  // Récupérer ou créer le module métier "Factures"
  let moduleMetier = await prisma.moduleMetier.findUnique({
    where: { code: 'invoices' },
  });

  if (!moduleMetier) {
    console.log('📦 Création du module métier "Factures"...');
    moduleMetier = await prisma.moduleMetier.create({
      data: {
        code: 'invoices',
        nomAffiche: 'Gestion des Factures',
        description: 'Module de gestion des factures et paiements',
        metierCible: 'tous',
        prixParMois: 0,
        categorie: 'Comptabilité',
        icone: 'FileIcon',
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
    where: { tenantId: TENANT_ID, moduleMetier: { code: 'invoices' } },
    include: { moduleMetier: true },
  });

  for (const link of links) {
    console.log(`   - ${link.typeEvenement} → ${link.workflowN8nNom} (${link.statut})`);
  }

  console.log('\n🎯 Prochaines étapes:');
  console.log('   1. Importer les workflows JSON dans n8n (depuis n8n_workflows/invoices/)');
  console.log('   2. Activer chaque workflow dans n8n');
  console.log('   3. Vérifier que les webhook URLs sont correctes (https://n8n.talosprimes.com/webhook/invoice-...)');
  console.log('   4. Tester la création d\'une facture depuis l\'interface\n');
}

main()
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
