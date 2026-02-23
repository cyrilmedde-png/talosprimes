import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const DEMO_TENANT_ID = 'de000000-0000-0000-0000-000000000001';
const DEMO_USER_EMAIL = 'demo@talosprimes.com';
const DEMO_USER_PASSWORD = 'demo2026';

/**
 * Crée le tenant démo avec des données pré-remplies pour les essais clients.
 * Les données sont réinitialisables en relançant ce seed.
 */
export async function seedDemoTenant(prisma: PrismaClient): Promise<void> {
  console.log('🎭 Création du tenant démo...');

  // 1. Tenant démo
  await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    update: {
      nomEntreprise: 'Entreprise Démo',
      emailContact: 'contact@entreprise-demo.fr',
      statut: 'actif',
    },
    create: {
      id: DEMO_TENANT_ID,
      nomEntreprise: 'Entreprise Démo',
      siret: '12345678901234',
      adressePostale: '10 Rue de la Démonstration',
      codePostal: '75001',
      ville: 'Paris',
      telephone: '+33 1 23 45 67 89',
      emailContact: 'contact@entreprise-demo.fr',
      tvaIntracom: 'FR12345678901',
      metier: 'Services informatiques',
      statut: 'actif',
    },
  });
  console.log('  ✅ Tenant démo OK');

  // 2. Utilisateur démo
  const hashedPassword = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: DEMO_TENANT_ID, email: DEMO_USER_EMAIL } },
    update: { passwordHash: hashedPassword, statut: 'actif' },
    create: {
      tenantId: DEMO_TENANT_ID,
      email: DEMO_USER_EMAIL,
      passwordHash: hashedPassword,
      nom: 'Démo',
      prenom: 'Utilisateur',
      role: 'admin',
      statut: 'actif',
    },
  });
  console.log('  ✅ Utilisateur démo OK');

  // 3. Subscription avec tous les modules actifs
  const allModules = [
    'clients', 'leads', 'facturation', 'devis', 'bons_commande',
    'avoirs', 'proformas', 'comptabilite', 'agent_telephonique',
    'articles', 'logs', 'notifications',
  ];
  await prisma.subscription.upsert({
    where: { tenantId: DEMO_TENANT_ID },
    update: { modulesActives: allModules },
    create: {
      tenantId: DEMO_TENANT_ID,
      modulesActives: allModules,
      montantMensuelActuel: new Prisma.Decimal(0),
      dateDebut: new Date(),
      dateProchainRenouvellement: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      fournisseurPaiement: 'stripe',
      statusPaiement: 'ok',
    },
  });
  console.log('  ✅ Subscription démo OK');

  // 4. Clients démo
  const clientIds: string[] = [];
  const demoClients = [
    { nom: 'Martin', prenom: 'Sophie', email: 'sophie.martin@demo.fr', raisonSociale: 'Martin Consulting', type: 'b2b' as const },
    { nom: 'Dupont', prenom: 'Pierre', email: 'pierre.dupont@demo.fr', raisonSociale: null, type: 'b2c' as const },
    { nom: 'Bernard', prenom: 'Marie', email: 'marie.bernard@demo.fr', raisonSociale: 'Bernard & Associés', type: 'b2b' as const },
    { nom: 'Petit', prenom: 'Jean', email: 'jean.petit@demo.fr', raisonSociale: 'Petit Tech', type: 'b2b' as const },
    { nom: 'Robert', prenom: 'Claire', email: 'claire.robert@demo.fr', raisonSociale: null, type: 'b2c' as const },
  ];

  for (const c of demoClients) {
    const existing = await prisma.clientFinal.findFirst({
      where: { tenantId: DEMO_TENANT_ID, email: c.email },
    });
    if (existing) {
      clientIds.push(existing.id);
    } else {
      const created = await prisma.clientFinal.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          nom: c.nom,
          prenom: c.prenom,
          email: c.email,
          raisonSociale: c.raisonSociale,
          type: c.type,
          statut: 'actif',
          adresse: '123 Rue Démo, 75001 Paris',
          telephone: '+33 6 12 34 56 78',
        },
      });
      clientIds.push(created.id);
    }
  }
  console.log('  ✅ Clients démo OK (%d)', clientIds.length);

  // 5. Quelques factures démo
  const invoiceCount = await prisma.invoice.count({ where: { tenantId: DEMO_TENANT_ID } });
  if (invoiceCount === 0 && clientIds.length > 0) {
    const year = new Date().getFullYear();
    const demoInvoices = [
      { clientIdx: 0, montantHt: 1500, tva: 20, statut: 'payee' as const, jours: -30 },
      { clientIdx: 1, montantHt: 800, tva: 20, statut: 'envoyee' as const, jours: -15 },
      { clientIdx: 2, montantHt: 3200, tva: 20, statut: 'brouillon' as const, jours: -5 },
      { clientIdx: 3, montantHt: 950, tva: 20, statut: 'payee' as const, jours: -45 },
      { clientIdx: 0, montantHt: 2100, tva: 20, statut: 'envoyee' as const, jours: -10 },
    ];

    for (let i = 0; i < demoInvoices.length; i++) {
      const inv = demoInvoices[i];
      const dateFacture = new Date(Date.now() + inv.jours * 24 * 60 * 60 * 1000);
      const dateEcheance = new Date(dateFacture.getTime() + 30 * 24 * 60 * 60 * 1000);
      const montantTtc = Number((inv.montantHt * (1 + inv.tva / 100)).toFixed(2));

      await prisma.invoice.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          clientFinalId: clientIds[inv.clientIdx],
          type: 'facture_client_final',
          numeroFacture: `INV-${year}-${String(i + 1).padStart(6, '0')}`,
          dateFacture,
          dateEcheance,
          montantHt: inv.montantHt,
          montantTtc,
          tvaTaux: inv.tva,
          statut: inv.statut,
          description: `Facture démo #${i + 1}`,
        },
      });
    }
    console.log('  ✅ Factures démo OK');
  }

  // 6. Exercice comptable + journaux
  try {
    const year = new Date().getFullYear();
    await prisma.exerciceComptable.upsert({
      where: { tenantId_code: { tenantId: DEMO_TENANT_ID, code: String(year) } },
      update: {},
      create: {
        tenantId: DEMO_TENANT_ID,
        code: String(year),
        dateDebut: new Date(`${year}-01-01`),
        dateFin: new Date(`${year}-12-31`),
        cloture: false,
      },
    });

    const journaux = [
      { code: 'VE', libelle: 'Journal des Ventes', type: 'VE' as const },
      { code: 'AC', libelle: 'Journal des Achats', type: 'AC' as const },
      { code: 'BQ', libelle: 'Journal de Banque', type: 'BQ' as const },
      { code: 'OD', libelle: 'Journal des Opérations Diverses', type: 'OD' as const },
    ];
    for (const j of journaux) {
      await prisma.journalComptable.upsert({
        where: { tenantId_code: { tenantId: DEMO_TENANT_ID, code: j.code } },
        update: {},
        create: { tenantId: DEMO_TENANT_ID, code: j.code, libelle: j.libelle, type: j.type },
      });
    }
    console.log('  ✅ Comptabilité démo OK');
  } catch (e) {
    console.warn('  ⚠️ Erreur comptabilité démo:', e);
  }

  console.log('🎭 Tenant démo prêt ! Login: %s / %s', DEMO_USER_EMAIL, DEMO_USER_PASSWORD);
}
