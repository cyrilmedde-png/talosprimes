#!/usr/bin/env tsx
/**
 * Script pour configurer automatiquement tous les WorkflowLinks pour les abonnements
 * Usage: pnpm tsx packages/platform/scripts/setup-subscriptions-workflows.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ID fixe du tenant TalosPrimes Admin (depuis le seed)
const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Configuration des workflows abonnements
const WORKFLOWS = [
  {
    eventType: 'subscription_renewal',
    workflowId: 'subscription-renewal',
    workflowName: 'Abonnements - Renouvellement automatique',
    description: 'Renouvellement automatique d\'un abonnement avec génération de facture',
  },
  {
    eventType: 'subscription_cancelled',
    workflowId: 'subscription-cancelled',
    workflowName: 'Abonnements - Annulation',
    description: 'Annulation d\'un abonnement (avec ou sans Stripe)',
  },
  {
    eventType: 'subscription_upgrade',
    workflowId: 'subscription-upgrade',
    workflowName: 'Abonnements - Changement de plan',
    description: 'Upgrade ou downgrade d\'un abonnement avec calcul du prorata',
  },
  {
    eventType: 'subscription_suspended',
    workflowId: 'subscription-suspended',
    workflowName: 'Abonnements - Suspension',
    description: 'Suspension d\'un abonnement pour impayé ou autre raison',
  },
];

async function main() {
  console.log('🔧 Configuration des WorkflowLinks pour les abonnements\n');

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

  // Récupérer ou créer le module métier "Abonnements"
  let moduleMetier = await prisma.moduleMetier.findUnique({
    where: { code: 'abonnements' },
  });

  if (!moduleMetier) {
    console.log('📦 Création du module métier "Abonnements"...');
    moduleMetier = await prisma.moduleMetier.create({
      data: {
        code: 'abonnements',
        nomAffiche: 'Gestion des Abonnements',
        description: 'Module de gestion des abonnements et facturation récurrente',
        metierCible: 'tous',
        prixParMois: 0,
        categorie: 'Facturation',
        icone: 'CreditCardIcon',
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
    where: { tenantId: TENANT_ID, moduleMetier: { code: 'abonnements' } },
    include: { moduleMetier: true },
  });

  for (const link of links) {
    console.log(`   - ${link.typeEvenement} → ${link.workflowN8nNom} (${link.statut})`);
  }

  console.log('\n🎯 Prochaines étapes:');
  console.log('   1. Importer les workflows JSON dans n8n (depuis n8n_workflows/abonnements/)');
  console.log('   2. Activer chaque workflow dans n8n');
  console.log('   3. Vérifier que les webhook URLs sont correctes');
  console.log('   4. Tester les différentes opérations sur les abonnements\n');
}

main()
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

