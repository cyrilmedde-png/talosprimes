import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Crée ou met à jour les modules métiers (ex: facturation).
 * Utilisé par le seed principal pour que les workflow_links aient un module.
 */
export async function seedModules(prisma: PrismaClient): Promise<void> {
  console.log('📦 Modules métiers...');

  const prixZero = new Prisma.Decimal(0);
  await prisma.moduleMetier.upsert({
    where: { code: 'facturation' },
    update: {
      nomAffiche: 'Facturation',
      description: 'Module de gestion des factures : création, suivi, paiement, relance',
      prixParMois: prixZero,
    },
    create: {
      code: 'facturation',
      nomAffiche: 'Facturation',
      description: 'Module de gestion des factures : création, suivi, paiement, relance',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module facturation OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'articles' },
    update: {
      nomAffiche: 'Codes Articles',
      description: 'Module de gestion du catalogue articles : création, modification, suppression',
      prixParMois: prixZero,
    },
    create: {
      code: 'articles',
      nomAffiche: 'Codes Articles',
      description: 'Module de gestion du catalogue articles : création, modification, suppression',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module articles OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'bons_commande' },
    update: {
      nomAffiche: 'Bons de Commande',
      description: 'Module de gestion des bons de commande : création, validation, conversion en facture',
      prixParMois: prixZero,
    },
    create: {
      code: 'bons_commande',
      nomAffiche: 'Bons de Commande',
      description: 'Module de gestion des bons de commande : création, validation, conversion en facture',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module bons_commande OK');
}
