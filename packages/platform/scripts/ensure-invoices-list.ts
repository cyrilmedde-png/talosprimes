#!/usr/bin/env tsx
/**
 * Crée ou met à jour le WorkflowLink "invoices_list" pour tous les tenants.
 * À lancer après avoir importé le workflow invoices-list.json dans n8n.
 *
 * Usage: pnpm workflow:ensure-invoices-list
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INVOICES_LIST = {
  eventType: 'invoices_list',
  workflowId: 'invoices_list',
  workflowName: 'Factures - Liste (vue)',
};

async function main() {
  console.log('🔧 Création du lien Workflow invoices_list\n');

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
    console.log('✅ Module créé\n');
  }

  const tenants = await prisma.tenant.findMany({ orderBy: { nomEntreprise: 'asc' } });
  if (tenants.length === 0) {
    console.error('❌ Aucun tenant. Exécutez d\'abord: pnpm db:seed');
    process.exit(1);
  }

  for (const tenant of tenants) {
    const existing = await prisma.workflowLink.findUnique({
      where: {
        tenantId_typeEvenement: {
          tenantId: tenant.id,
          typeEvenement: INVOICES_LIST.eventType,
        },
      },
    });

    if (existing) {
      await prisma.workflowLink.update({
        where: { id: existing.id },
        data: {
          workflowN8nId: INVOICES_LIST.workflowId,
          workflowN8nNom: INVOICES_LIST.workflowName,
          statut: 'actif',
        },
      });
      console.log(`   ✅ ${tenant.nomEntreprise} : invoices_list mis à jour`);
    } else {
      await prisma.workflowLink.create({
        data: {
          tenantId: tenant.id,
          moduleMetierId: moduleMetier.id,
          typeEvenement: INVOICES_LIST.eventType,
          workflowN8nId: INVOICES_LIST.workflowId,
          workflowN8nNom: INVOICES_LIST.workflowName,
          statut: 'actif',
        },
      });
      console.log(`   ✅ ${tenant.nomEntreprise} : invoices_list créé`);
    }
  }

  console.log('\n✅ Lien "invoices_list" configuré pour tous les tenants.');
  console.log('   Vérifiez que le workflow "invoices-list" est importé et activé dans n8n (path: invoices_list).\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
