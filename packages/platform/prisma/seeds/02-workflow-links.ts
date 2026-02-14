import { PrismaClient } from '@prisma/client';

const FACTURATION_WORKFLOWS: { typeEvenement: string; workflowN8nId: string; workflowN8nNom: string }[] = [
  { typeEvenement: 'invoice_create', workflowN8nId: 'invoice_create', workflowN8nNom: 'invoice-created' },
  { typeEvenement: 'invoices_list', workflowN8nId: 'invoices_list', workflowN8nNom: 'invoices-list' },
  { typeEvenement: 'invoice_get', workflowN8nId: 'invoice_get', workflowN8nNom: 'invoice-get' },
  { typeEvenement: 'invoice_update', workflowN8nId: 'invoice_update', workflowN8nNom: 'invoice-update' },
  { typeEvenement: 'invoice_paid', workflowN8nId: 'invoice_paid', workflowN8nNom: 'invoice-paid' },
  { typeEvenement: 'invoice_overdue', workflowN8nId: 'invoice_overdue', workflowN8nNom: 'invoice-overdue' },
  { typeEvenement: 'invoice_generate_pdf', workflowN8nId: 'invoice_generate_pdf', workflowN8nNom: 'invoice-generate-pdf' },
];

/**
 * Attache les workflow links facturation au tenant donné.
 * À appeler après seed modules et seed tenant.
 */
export async function seedWorkflowLinksFacturation(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  const module = await prisma.moduleMetier.findUnique({ where: { code: 'facturation' } });
  if (!module) {
    console.warn('⚠️ Module facturation absent : exécutez d’abord seed modules.');
    return;
  }

  console.log('🔗 Workflow links facturation...');

  for (const w of FACTURATION_WORKFLOWS) {
    await prisma.workflowLink.upsert({
      where: {
        tenantId_typeEvenement: { tenantId, typeEvenement: w.typeEvenement },
      },
      update: {
        workflowN8nId: w.workflowN8nId,
        workflowN8nNom: w.workflowN8nNom,
        moduleMetierId: module.id,
        statut: 'actif',
      },
      create: {
        tenantId,
        moduleMetierId: module.id,
        typeEvenement: w.typeEvenement,
        workflowN8nId: w.workflowN8nId,
        workflowN8nNom: w.workflowN8nNom,
        statut: 'actif',
      },
    });
  }

  console.log(`✅ ${FACTURATION_WORKFLOWS.length} workflow links facturation OK`);
}
