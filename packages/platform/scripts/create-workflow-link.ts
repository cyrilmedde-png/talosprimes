import { PrismaClient } from '@prisma/client';
import { createInterface } from 'readline';

const prisma = new PrismaClient();

function question(rl: ReturnType<typeof createInterface>, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  let workflowId: string;
  let workflowName: string;
  let eventType: string;

  // Si les arguments sont fournis en ligne de commande
  if (args.length >= 3) {
    workflowId = args[0];
    workflowName = args[1];
    eventType = args[2];
  } else {
    // Mode interactif
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('📝 Création d\'un WorkflowLink');
    console.log('==============================\n');

    workflowId = await question(rl, 'Workflow ID n8n (ex: 123) : ');
    workflowName = await question(rl, 'Nom du workflow (ex: Onboarding Client) : ');
    const eventTypeInput = await question(rl, 'Type d\'événement (client.created/client.updated/client.deleted) [client.created] : ');
    eventType = eventTypeInput || 'client.created';

    rl.close();
  }

  console.log('\n🔍 Récupération des informations du tenant...\n');

  // Récupérer le tenant (essayer d'abord avec l'ID fixe)
  let tenant = await prisma.tenant.findUnique({
    where: { id: '00000000-0000-0000-0000-000000000001' },
  });

  // Si pas trouvé, chercher par nom
  if (!tenant) {
    tenant = await prisma.tenant.findFirst({
      where: { nomEntreprise: 'TalosPrimes Admin' },
    });
  }

  // Si toujours pas trouvé, lister tous les tenants
  if (!tenant) {
    console.log('⚠️  Tenant "TalosPrimes Admin" non trouvé\n');
    console.log('Tenants disponibles :\n');
    const tenants = await prisma.tenant.findMany({
      take: 10,
      select: {
        id: true,
        nomEntreprise: true,
        emailContact: true,
      },
    });

    if (tenants.length === 0) {
      console.log('❌ Aucun tenant trouvé dans la base de données');
      console.log('💡 Exécutez d\'abord : pnpm db:seed');
      process.exit(1);
    }

    tenants.forEach((t) => {
      console.log(`  - ${t.nomEntreprise} (${t.id})`);
    });

    console.log('\n❌ Veuillez exécuter le seed d\'abord : pnpm db:seed');
    process.exit(1);
  }

  console.log(`  Tenant ID: ${tenant.id}`);
  console.log(`  Nom: ${tenant.nomEntreprise}\n`);

  // Récupérer ou créer un module métier
  let module = await prisma.moduleMetier.findFirst({
    where: { code: 'crm_base' },
  });

  if (!module) {
    console.log('⚠️  Module "crm_base" non trouvé, création...\n');
    module = await prisma.moduleMetier.create({
      data: {
        code: 'crm_base',
        nomAffiche: 'CRM Base',
        prixParMois: 0,
      },
    });
  }

  console.log(`  Module ID: ${module.id}`);
  console.log(`  Code: ${module.code}\n`);

  // Vérifier si un WorkflowLink existe déjà
  const existing = await prisma.workflowLink.findFirst({
    where: {
      tenantId: tenant.id,
      typeEvenement: eventType,
    },
  });

  if (existing) {
    console.log(`⚠️  Un WorkflowLink existe déjà pour l'événement "${eventType}"\n`);
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const update = await question(rl, 'Voulez-vous le mettre à jour ? (y/n) : ');
    rl.close();

    if (update.toLowerCase() !== 'y') {
      console.log('Annulé.');
      process.exit(0);
    }

    await prisma.workflowLink.update({
      where: { id: existing.id },
      data: {
        workflowN8nId: workflowId,
        workflowN8nNom: workflowName,
        statut: 'actif',
      },
    });

    console.log('\n✅ WorkflowLink mis à jour');
    console.log(`  - Workflow ID: ${workflowId}`);
    console.log(`  - Nom: ${workflowName}`);
    console.log(`  - Événement: ${eventType}`);
    console.log(`  - Statut: actif\n`);
    process.exit(0);
  }

  // Créer le WorkflowLink
  console.log('📝 Création du WorkflowLink...\n');

  const workflowLink = await prisma.workflowLink.create({
    data: {
      tenantId: tenant.id,
      moduleMetierId: module.id,
      typeEvenement: eventType,
      workflowN8nId: workflowId,
      workflowN8nNom: workflowName,
      statut: 'actif',
    },
  });

  console.log('✅ WorkflowLink créé avec succès\n');
  console.log('  - ID: ' + workflowLink.id);
  console.log('  - Workflow ID: ' + workflowId);
  console.log('  - Nom: ' + workflowName);
  console.log('  - Événement: ' + eventType);
  console.log('  - Statut: actif\n');
}

main()
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

