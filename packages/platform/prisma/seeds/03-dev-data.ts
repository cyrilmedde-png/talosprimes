import { Prisma, PrismaClient } from '@prisma/client';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Génère des données de démo en base (clients finaux + factures) pour le tenant par défaut.
 * À utiliser uniquement en développement.
 */
export async function seedDevData(prisma: PrismaClient): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { id: DEFAULT_TENANT_ID } });
  if (!tenant) {
    console.warn('⚠️ Tenant par défaut absent : exécutez d’abord db:seed.');
    return;
  }

  console.log('🧪 Données de démo (clients + factures)...');

  const client1 = await prisma.clientFinal.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'demo@client-a.fr' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      type: 'b2b',
      raisonSociale: 'Client A SARL',
      email: 'demo@client-a.fr',
      telephone: '01 23 45 67 89',
      adresse: '10 rue de la Paix, 75002 Paris',
      statut: 'actif',
    },
  });

  const client2 = await prisma.clientFinal.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'marie.dupont@example.com' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      type: 'b2c',
      prenom: 'Marie',
      nom: 'Dupont',
      email: 'marie.dupont@example.com',
      statut: 'actif',
    },
  });

  const now = new Date();
  const dateFacture = new Date(now.getFullYear(), now.getMonth(), 1);
  const dateEcheance = new Date(now.getFullYear(), now.getMonth() + 1, 15);

  const numero1 = `INV-${now.getFullYear()}-000001`;
  const numero2 = `INV-${now.getFullYear()}-000002`;

  await prisma.invoice.upsert({
    where: { numeroFacture: numero1 },
    update: {},
    create: {
      tenantId: tenant.id,
      type: 'facture_client_final',
      clientFinalId: client1.id,
      numeroFacture: numero1,
      dateFacture,
      dateEcheance,
      montantHt: new Prisma.Decimal(1000),
      montantTtc: new Prisma.Decimal(1200),
      tvaTaux: new Prisma.Decimal(20),
      statut: 'brouillon',
    },
  });

  await prisma.invoice.upsert({
    where: { numeroFacture: numero2 },
    update: {},
    create: {
      tenantId: tenant.id,
      type: 'facture_client_final',
      clientFinalId: client2.id,
      numeroFacture: numero2,
      dateFacture,
      dateEcheance,
      montantHt: new Prisma.Decimal(2500),
      montantTtc: new Prisma.Decimal(3000),
      tvaTaux: new Prisma.Decimal(20),
      statut: 'envoyee',
    },
  });

  console.log('✅ 2 clients et 2 factures de démo créés.');
}
