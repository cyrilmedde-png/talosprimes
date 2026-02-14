#!/usr/bin/env tsx
/**
 * Crée le WorkflowLink "invoices_list" pour TOUS les tenants.
 * Rien d'autre. À lancer si la page Factures affiche "Workflow non trouvé pour invoices_list".
 *
 * Usage: cd packages/platform && pnpm exec tsx scripts/create-invoices-list-link.ts
 *    ou: pnpm workflow:ensure-invoices-list   (si la commande est dans package.json)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INVOICES_LIST = {
  eventType: 'invoices_list',
  workflowId: 'invoices_list',
  workflowName: 'Factures - Liste (vue)',
};

async function main() {
  console.log('Création du lien invoices_list pour tous les tenants...\n');

  let mod = await prisma.moduleMetier.findFirst({ where: { code: 'invoices' } });
  if (!mod) {
    mod = await prisma.moduleMetier.create({
      data: {
        code: 'invoices',
        nomAffiche: 'Gestion des Factures',
        description: 'Module factures',
        metierCible: 'tous',
        prixParMois: 0,
        categorie: 'Comptabilité',
        icone: 'FileIcon',
      },
    });
    console.log('Module Factures créé (id: %s)\n', mod.id);
  }

  const tenants = await prisma.tenant.findMany({ orderBy: { nomEntreprise: 'asc' } });
  if (tenants.length === 0) {
    console.error('Aucun tenant. Lancez d\'abord: pnpm db:seed');
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
      console.log('  %s : invoices_list mis à jour', tenant.nomEntreprise);
    } else {
      await prisma.workflowLink.create({
        data: {
          tenantId: tenant.id,
          moduleMetierId: mod.id,
          typeEvenement: INVOICES_LIST.eventType,
          workflowN8nId: INVOICES_LIST.workflowId,
          workflowN8nNom: INVOICES_LIST.workflowName,
          statut: 'actif',
        },
      });
      console.log('  %s : invoices_list créé', tenant.nomEntreprise);
    }
  }

  console.log('\nOK. Lien invoices_list configuré pour %d tenant(s).', tenants.length);
}

main()
  .catch((e) => {
    console.error('Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
