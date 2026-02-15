import { PrismaClient } from '@prisma/client';

type WfDef = { typeEvenement: string; workflowN8nId: string; workflowN8nNom: string };

const FACTURATION_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'invoice_create', workflowN8nId: 'invoice_create', workflowN8nNom: 'invoice-created' },
  { typeEvenement: 'invoices_list', workflowN8nId: 'invoices_list', workflowN8nNom: 'invoices-list' },
  { typeEvenement: 'invoice_get', workflowN8nId: 'invoice_get', workflowN8nNom: 'invoice-get' },
  { typeEvenement: 'invoice_update', workflowN8nId: 'invoice_update', workflowN8nNom: 'invoice-update' },
  { typeEvenement: 'invoice_paid', workflowN8nId: 'invoice_paid', workflowN8nNom: 'invoice-paid' },
  { typeEvenement: 'invoice_overdue', workflowN8nId: 'invoice_overdue', workflowN8nNom: 'invoice-overdue' },
  { typeEvenement: 'invoice_generate_pdf', workflowN8nId: 'invoice_generate_pdf', workflowN8nNom: 'invoice-generate-pdf' },
];

const ARTICLES_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'article_codes_list', workflowN8nId: 'article_codes_list', workflowN8nNom: 'article-codes-list' },
  { typeEvenement: 'article_code_create', workflowN8nId: 'article_code_create', workflowN8nNom: 'article-code-created' },
  { typeEvenement: 'article_code_update', workflowN8nId: 'article_code_update', workflowN8nNom: 'article-code-updated' },
  { typeEvenement: 'article_code_delete', workflowN8nId: 'article_code_delete', workflowN8nNom: 'article-code-deleted' },
];

const DEVIS_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'devis_list', workflowN8nId: 'devis_list', workflowN8nNom: 'devis-list' },
  { typeEvenement: 'devis_get', workflowN8nId: 'devis_get', workflowN8nNom: 'devis-get' },
  { typeEvenement: 'devis_create', workflowN8nId: 'devis_create', workflowN8nNom: 'devis-created' },
  { typeEvenement: 'devis_send', workflowN8nId: 'devis_send', workflowN8nNom: 'devis-sent' },
  { typeEvenement: 'devis_accept', workflowN8nId: 'devis_accept', workflowN8nNom: 'devis-accepted' },
  { typeEvenement: 'devis_convert_to_invoice', workflowN8nId: 'devis_convert_to_invoice', workflowN8nNom: 'devis-convert-to-invoice' },
  { typeEvenement: 'devis_delete', workflowN8nId: 'devis_delete', workflowN8nNom: 'devis-deleted' },
];

const BDC_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'bdc_list', workflowN8nId: 'bdc_list', workflowN8nNom: 'bdc-list' },
  { typeEvenement: 'bdc_get', workflowN8nId: 'bdc_get', workflowN8nNom: 'bdc-get' },
  { typeEvenement: 'bdc_create', workflowN8nId: 'bdc_create', workflowN8nNom: 'bdc-created' },
  { typeEvenement: 'bdc_validate', workflowN8nId: 'bdc_validate', workflowN8nNom: 'bdc-validated' },
  { typeEvenement: 'bdc_convert_to_invoice', workflowN8nId: 'bdc_convert_to_invoice', workflowN8nNom: 'bdc-convert-to-invoice' },
  { typeEvenement: 'bdc_delete', workflowN8nId: 'bdc_delete', workflowN8nNom: 'bdc-deleted' },
];

const AVOIR_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'avoir_list', workflowN8nId: 'avoir_list', workflowN8nNom: 'avoir-list' },
  { typeEvenement: 'avoir_get', workflowN8nId: 'avoir_get', workflowN8nNom: 'avoir-get' },
  { typeEvenement: 'avoir_create', workflowN8nId: 'avoir_create', workflowN8nNom: 'avoir-created' },
  { typeEvenement: 'avoir_validate', workflowN8nId: 'avoir_validate', workflowN8nNom: 'avoir-validated' },
  { typeEvenement: 'avoir_delete', workflowN8nId: 'avoir_delete', workflowN8nNom: 'avoir-deleted' },
];

const PROFORMA_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'proforma_list', workflowN8nId: 'proforma_list', workflowN8nNom: 'proforma-list' },
  { typeEvenement: 'proforma_get', workflowN8nId: 'proforma_get', workflowN8nNom: 'proforma-get' },
  { typeEvenement: 'proforma_create', workflowN8nId: 'proforma_create', workflowN8nNom: 'proforma-created' },
  { typeEvenement: 'proforma_send', workflowN8nId: 'proforma_send', workflowN8nNom: 'proforma-sent' },
  { typeEvenement: 'proforma_accept', workflowN8nId: 'proforma_accept', workflowN8nNom: 'proforma-accepted' },
  { typeEvenement: 'proforma_convert_to_invoice', workflowN8nId: 'proforma_convert_to_invoice', workflowN8nNom: 'proforma-convert-to-invoice' },
  { typeEvenement: 'proforma_delete', workflowN8nId: 'proforma_delete', workflowN8nNom: 'proforma-deleted' },
];

/** Upsert une liste de workflow links pour un module et un tenant. */
async function seedWorkflowLinks(
  prisma: PrismaClient,
  tenantId: string,
  moduleCode: string,
  workflows: WfDef[],
  label: string
): Promise<void> {
  const mod = await prisma.moduleMetier.findUnique({ where: { code: moduleCode } });
  if (!mod) {
    console.warn(`⚠️ Module ${moduleCode} absent : exécutez d'abord seed modules.`);
    return;
  }

  console.log(`🔗 Workflow links ${label}...`);

  for (const w of workflows) {
    await prisma.workflowLink.upsert({
      where: {
        tenantId_typeEvenement: { tenantId, typeEvenement: w.typeEvenement },
      },
      update: {
        workflowN8nId: w.workflowN8nId,
        workflowN8nNom: w.workflowN8nNom,
        moduleMetierId: mod.id,
        statut: 'actif',
      },
      create: {
        tenantId,
        moduleMetierId: mod.id,
        typeEvenement: w.typeEvenement,
        workflowN8nId: w.workflowN8nId,
        workflowN8nNom: w.workflowN8nNom,
        statut: 'actif',
      },
    });
  }

  console.log(`✅ ${workflows.length} workflow links ${label} OK`);
}

/**
 * Attache les workflow links facturation au tenant donné.
 * À appeler après seed modules et seed tenant.
 */
export async function seedWorkflowLinksFacturation(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'facturation', FACTURATION_WORKFLOWS, 'facturation');
}

/**
 * Attache les workflow links codes articles au tenant donné.
 */
export async function seedWorkflowLinksArticles(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'articles', ARTICLES_WORKFLOWS, 'articles');
}

/**
 * Attache les workflow links bons de commande au tenant donné.
 */
/**
 * Attache les workflow links devis au tenant donné.
 */
export async function seedWorkflowLinksDevis(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'devis', DEVIS_WORKFLOWS, 'devis');
}

export async function seedWorkflowLinksBdc(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'bons_commande', BDC_WORKFLOWS, 'bons de commande');
}

/**
 * Attache les workflow links avoirs au tenant donné.
 */
export async function seedWorkflowLinksAvoir(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'avoirs', AVOIR_WORKFLOWS, 'avoirs');
}

/**
 * Attache les workflow links proformas au tenant donné.
 */
export async function seedWorkflowLinksProforma(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'proformas', PROFORMA_WORKFLOWS, 'proformas');
}
