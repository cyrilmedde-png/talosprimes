import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedModules } from './seeds/01-modules';
import { seedWorkflowLinksFacturation, seedWorkflowLinksArticles, seedWorkflowLinksBdc, seedWorkflowLinksDevis, seedWorkflowLinksAvoir, seedWorkflowLinksProforma, seedWorkflowLinksLogs, seedWorkflowLinksNotifications, seedWorkflowLinksAgentTelephonique, seedWorkflowLinksClients, seedWorkflowLinksLeads, seedWorkflowLinksComptabilite } from './seeds/02-workflow-links';
import { seedPlanComptable, seedJournauxComptables, seedExerciceComptable } from './seeds/04-plan-comptable';
import { seedDemoTenant } from './seeds/05-demo-tenant';
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
  await seedWorkflowLinksLogs(prisma, tenant.id);
  await seedWorkflowLinksNotifications(prisma, tenant.id);
  await seedWorkflowLinksAgentTelephonique(prisma, tenant.id);
  await seedWorkflowLinksClients(prisma, tenant.id);
  await seedWorkflowLinksLeads(prisma, tenant.id);
  await seedWorkflowLinksComptabilite(prisma, tenant.id);

  // 7. Plan Comptable Général + Journaux + Exercice
  await seedPlanComptable(prisma, tenant.id);
  await seedJournauxComptables(prisma, tenant.id);
  await seedExerciceComptable(prisma, tenant.id);

  // 8. Agent Téléphonique - données de démo
  console.log('📱 Création des données Agent Téléphonique...');

  // Créer la config Twilio
  await prisma.twilioConfig.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      phoneNumber: '+33123456789',
      agentName: 'Sophie',
      companyName: tenant.nomEntreprise,
      niche: 'plomberie',
      businessHours: 'du lundi au samedi, de huit heures à vingt heures',
      dispatchDelay: 15,
      basePrice: 'quatre-vingt-neuf euros le déplacement',
      humanContact: 'notre responsable technique',
      active: false,
    },
  });

  // Créer un lead de démo d'abord (nécessaire pour le questionnaire)
  const demoLead = await prisma.lead.upsert({
    where: { email: 'jean.dupont@email.com' },
    update: {},
    create: {
      tenant: { connect: { id: tenant.id } },
      nom: 'Dupont',
      prenom: 'Jean',
      email: 'jean.dupont@email.com',
      telephone: '+33712345678',
      source: 'telephone',
      statut: 'nouveau',
      notes: 'Fuite d\'eau sous l\'évier — 123 Rue de la Paix, 75000 Paris',
    },
  });

  // Nettoyer les anciennes données de démo Agent IA (seed idempotent)
  await prisma.questionnaire.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.smsLog.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.callLog.deleteMany({ where: { tenantId: tenant.id } });

  // Créer les appels téléphoniques (CallLogs)
  await prisma.callLog.create({
    data: {
      tenantId: tenant.id,
      callerPhone: '+33612345678',
      direction: 'entrant',
      status: 'completed',
      duration: 450,
      urgencyLevel: 'CRITIQUE',
      sentiment: 'FRUSTRE',
      followUpRequired: true,
      notes: 'Client très insatisfait, fuite importante',
    },
  });

  await prisma.callLog.create({
    data: {
      tenantId: tenant.id,
      callerPhone: '+33698765432',
      direction: 'entrant',
      status: 'completed',
      duration: 240,
      urgencyLevel: 'URGENT',
      sentiment: 'NEUTRE',
      actionTaken: 'DISPATCH',
      notes: 'Besoin intervention rapide',
    },
  });

  await prisma.callLog.create({
    data: {
      tenantId: tenant.id,
      callerPhone: '+33712345678',
      direction: 'entrant',
      status: 'completed',
      duration: 180,
      urgencyLevel: 'STANDARD',
      sentiment: 'POSITIF',
      actionTaken: 'RDV',
      notes: 'Demande de rendez-vous pour révision',
    },
  });

  await prisma.callLog.create({
    data: {
      tenantId: tenant.id,
      callerPhone: '+33654321098',
      direction: 'entrant',
      status: 'completed',
      duration: 120,
      urgencyLevel: 'INFO',
      sentiment: 'POSITIF',
      actionTaken: 'INFO',
      notes: 'Demande de tarifs et disponibilités',
    },
  });

  await prisma.callLog.create({
    data: {
      tenantId: tenant.id,
      callerPhone: '+33687654321',
      direction: 'sortant',
      status: 'completed',
      duration: 300,
      urgencyLevel: 'STANDARD',
      sentiment: 'NEUTRE',
      notes: 'Suivi suite interventions précédentes',
    },
  });

  // Créer les SMS (SmsLogs)
  await prisma.smsLog.create({
    data: {
      tenantId: tenant.id,
      fromNumber: '+33123456789',
      toNumber: '+33712345678',
      direction: 'sortant',
      body: 'Merci pour votre appel. Votre RDV est confirmé pour demain à 10h.',
      status: 'sent',
    },
  });

  await prisma.smsLog.create({
    data: {
      tenantId: tenant.id,
      fromNumber: '+33712345678',
      toNumber: '+33123456789',
      direction: 'entrant',
      body: 'OK merci',
      status: 'received',
    },
  });

  // Créer un questionnaire de démo
  await prisma.questionnaire.create({
    data: {
      tenantId: tenant.id,
      leadId: demoLead.id,
      channel: 'telephone',
      status: 'en_cours',
      questions: [
        { question: 'Quel est le problème principal ?', answer: null, order: 0 },
        { question: 'Niveau d\'urgence ?', answer: 'Urgent', order: 1 },
      ] as any,
    },
  });

  console.log('✅ Agent Téléphonique — seed données démo');

  // 9. Tenant démo + données démo (demo.talosprimes.com)
  await seedDemoTenant(prisma);

  // 10. Workflow links pour le tenant démo
  const DEMO_TENANT_ID = 'demo0000-0000-0000-0000-000000000001';
  await seedWorkflowLinksFacturation(prisma, DEMO_TENANT_ID);
  await seedWorkflowLinksArticles(prisma, DEMO_TENANT_ID);
  await seedWorkflowLinksBdc(prisma, DEMO_TENANT_ID);
  await seedWorkflowLinksDevis(prisma, DEMO_TENANT_ID);
  await seedWorkflowLinksAvoir(prisma, DEMO_TENANT_ID);
  await seedWorkflowLinksProforma(prisma, DEMO_TENANT_ID);
  await seedWorkflowLinksLogs(prisma, DEMO_TENANT_ID);
  await seedWorkflowLinksNotifications(prisma, DEMO_TENANT_ID);
  await seedWorkflowLinksAgentTelephonique(prisma, DEMO_TENANT_ID);
  await seedWorkflowLinksClients(prisma, DEMO_TENANT_ID);
  await seedWorkflowLinksLeads(prisma, DEMO_TENANT_ID);
  await seedWorkflowLinksComptabilite(prisma, DEMO_TENANT_ID);
  console.log('  ✅ Workflow links démo OK');

  console.log('\n🎉 Seed terminé avec succès !');
  console.log('\n📋 Résumé:');
  console.log(`   - Tenant: ${tenant.nomEntreprise}`);
  console.log(`   - Email: ${user.email}`);
  console.log(`   - Rôle: ${user.role}`);
  console.log(`   - Mot de passe: 21052024_Aa!`);
  console.log('\n🔐 Vous pouvez maintenant vous connecter avec ces identifiants.');
  console.log('\n🎭 Tenant démo: demo@talosprimes.com / demo2026');
  console.log('   URL: https://demo.talosprimes.com');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

