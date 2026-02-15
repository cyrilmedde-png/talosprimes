import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedModules } from './seeds/01-modules';
import { seedWorkflowLinksFacturation, seedWorkflowLinksArticles, seedWorkflowLinksBdc, seedWorkflowLinksDevis, seedWorkflowLinksAvoir, seedWorkflowLinksProforma } from './seeds/02-workflow-links';
import { runSeedLanding } from './seed-landing';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  console.log('🌱 Démarrage du seed...');

  // 1. Créer le tenant (entreprise principale)
  console.log('📦 Création du tenant principal...');
  
  const tenant = await prisma.tenant.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nomEntreprise: 'TalosPrimes Admin',
      emailContact: 'groupemclem@gmail.com',
      pays: 'FR',
      devise: 'EUR',
      langue: 'fr',
      metier: 'admin',
      statut: 'actif',
    },
  });

  console.log(`✅ Tenant créé: ${tenant.nomEntreprise} (${tenant.id})`);

  // 2. Créer l'utilisateur admin
  console.log('👤 Création de l\'utilisateur admin...');
  
  const hashedPassword = await hashPassword('21052024_Aa!');
  
  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'groupemclem@gmail.com',
      },
    },
    update: {
      passwordHash: hashedPassword,
      role: 'super_admin',
      statut: 'actif',
    },
    create: {
      tenantId: tenant.id,
      email: 'groupemclem@gmail.com',
      passwordHash: hashedPassword,
      role: 'super_admin',
      statut: 'actif',
    },
  });

  console.log(`✅ Utilisateur créé: ${user.email} (rôle: ${user.role})`);

  // 3. Créer un abonnement de base pour le tenant
  console.log('💳 Création de l\'abonnement...');
  
  const subscription = await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      modulesActives: [],
      montantMensuelActuel: 0,
      dateDebut: new Date(),
      dateProchainRenouvellement: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
      fournisseurPaiement: 'stripe',
      statusPaiement: 'ok',
    },
  });

  console.log(`✅ Abonnement créé (montant: ${subscription.montantMensuelActuel}€)`);

  // 4. Modules métiers (ex: facturation)
  await seedModules(prisma);

  // 5. Contenu landing + testimonials
  await runSeedLanding(prisma);

  // 6. Workflow links pour le tenant
  await seedWorkflowLinksFacturation(prisma, tenant.id);
  await seedWorkflowLinksArticles(prisma, tenant.id);
  await seedWorkflowLinksBdc(prisma, tenant.id);
  await seedWorkflowLinksDevis(prisma, tenant.id);
  await seedWorkflowLinksAvoir(prisma, tenant.id);
  await seedWorkflowLinksProforma(prisma, tenant.id);

  console.log('\n🎉 Seed terminé avec succès !');
  console.log('\n📋 Résumé:');
  console.log(`   - Tenant: ${tenant.nomEntreprise}`);
  console.log(`   - Email: ${user.email}`);
  console.log(`   - Rôle: ${user.role}`);
  console.log(`   - Mot de passe: 21052024_Aa!`);
  console.log('\n🔐 Vous pouvez maintenant vous connecter avec ces identifiants.');
  console.log('\n💡 Données de démo (clients + factures) : pnpm db:seed:dev');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

