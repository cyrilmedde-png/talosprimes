#!/usr/bin/env node
/**
 * Script pour supprimer les WorkflowLinks qui écoutent client.created
 * Usage: node scripts/delete-client-created-workflowlink.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Recherche des WorkflowLinks pour client.created...\n');

  // Trouver tous les WorkflowLinks qui écoutent client.created
  const workflowLinks = await prisma.workflowLink.findMany({
    where: {
      typeEvenement: 'client.created',
    },
  });

  if (workflowLinks.length === 0) {
    console.log('✅ Aucun WorkflowLink trouvé pour client.created');
    console.log('   Le problème est résolu.\n');
    return;
  }

  console.log(`⚠️  Trouvé ${workflowLinks.length} WorkflowLink(s) pour client.created:\n`);

  for (const link of workflowLinks) {
    console.log(`   - ID: ${link.id}`);
    console.log(`     Tenant: ${link.tenantId}`);
    console.log(`     Workflow: ${link.workflowN8nNom} (${link.workflowN8nId})`);
    console.log(`     Statut: ${link.statut}`);
    console.log('');
  }

  console.log('🚫 Suppression de ces WorkflowLinks...\n');

  // Supprimer tous les WorkflowLinks qui écoutent client.created
  const deleted = await prisma.workflowLink.deleteMany({
    where: {
      typeEvenement: 'client.created',
    },
  });

  console.log(`✅ ${deleted.count} WorkflowLink(s) supprimé(s)\n`);

  console.log('📝 Note importante:');
  console.log('   - L\'événement client.created continuera d\'être émis');
  console.log('   - Mais il ne déclenchera plus automatiquement de workflow');
  console.log('   - L\'onboarding devra être déclenché explicitement via /api/clients/:id/onboarding\n');
}

main()
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

