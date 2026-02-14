#!/usr/bin/env tsx
/**
 * Script complet : configure tout pour les workflows factures TalosPrimes.
 *
 * - Crée le module métier "Factures" si besoin
 * - Crée ou met à jour les WorkflowLinks pour tous les tenants :
 *   • invoice_create  → Création d'une facture
 *   • invoices_list   → Liste des factures (USE_N8N_VIEWS)
 *   • invoice_get     → Détail d'une facture (USE_N8N_VIEWS)
 *   • invoice_update  → Mise à jour d'une facture (USE_N8N_COMMANDS)
 *   • invoice_paid    → Facture marquée payée
 *   • invoice_overdue → Relance factures en retard
 *
 * Usage:
 *   cd packages/platform && pnpm workflow:setup-invoices
 *
 * Prérequis: base de données accessible (DATABASE_URL), au moins un tenant (pnpm db:seed).
 * Idempotent : peut être relancé sans risque.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WORKFLOWS = [
  {
    eventType: 'invoice_create',
    workflowId: 'invoice_create',
    workflowName: 'Factures - Création',
    webhookPath: '/webhook/invoice-created',
    description: 'Déclenché à la création d\'une facture depuis l\'interface',
  },
  {
    eventType: 'invoices_list',
    workflowId: 'invoices_list',
    workflowName: 'Factures - Liste (vue)',
    webhookPath: '/webhook/invoices-list',
    description: 'Liste paginée des factures (page Factures, USE_N8N_VIEWS=true)',
  },
  {
    eventType: 'invoice_get',
    workflowId: 'invoice_get',
    workflowName: 'Factures - Détail (vue)',
    webhookPath: '/webhook/invoice-get',
    description: 'Détail d\'une facture avec client (USE_N8N_VIEWS=true)',
  },
  {
    eventType: 'invoice_update',
    workflowId: 'invoice_update',
    workflowName: 'Factures - Mise à jour',
    webhookPath: '/webhook/invoice-update',
    description: 'Mise à jour dynamique d\'une facture (USE_N8N_COMMANDS=true)',
  },
  {
    eventType: 'invoice_paid',
    workflowId: 'invoice_paid',
    workflowName: 'Factures - Paiement reçu',
    webhookPath: '/webhook/invoice-paid',
    description: 'Déclenché quand une facture est marquée payée',
  },
  {
    eventType: 'invoice_overdue',
    workflowId: 'invoice_overdue',
    workflowName: 'Factures - En retard (relance)',
    webhookPath: '/webhook/invoice-overdue',
    description: 'Liste des factures en retard pour un tenant',
  },
] as const;

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Configuration complète des workflows Factures (n8n)        ║');
  console.log('║  6 workflows × tous les tenants                             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // ─── 1. Module métier Factures ─────────────────────────────────────────
  let moduleMetier = await prisma.moduleMetier.findUnique({
    where: { code: 'invoices' },
  });

  if (!moduleMetier) {
    console.log('📦 Création du module métier "Factures"...');
    moduleMetier = await prisma.moduleMetier.create({
      data: {
        code: 'invoices',
        nomAffiche: 'Gestion des Factures',
        description: 'Module de gestion des factures et paiements',
        metierCible: 'tous',
        prixParMois: 0,
        categorie: 'Comptabilité',
        icone: 'FileIcon',
      },
    });
    console.log('   ✅ Module créé (id: %s)\n', moduleMetier.id);
  } else {
    console.log('📦 Module métier "Factures" : %s (id: %s)\n', moduleMetier.nomAffiche, moduleMetier.id);
  }

  // ─── 2. Tenants ─────────────────────────────────────────────────────────
  const tenants = await prisma.tenant.findMany({ orderBy: { nomEntreprise: 'asc' } });
  if (tenants.length === 0) {
    console.error('❌ Aucun tenant trouvé.');
    console.error('   Exécutez d\'abord : pnpm db:seed');
    process.exit(1);
  }
  console.log('📋 Tenants : %d trouvé(s)\n', tenants.length);

  // ─── 3. WorkflowLinks pour chaque tenant × chaque workflow ────────────────
  let created = 0;
  let updated = 0;

  for (const tenant of tenants) {
    console.log('   Tenant : %s', tenant.nomEntreprise);

    for (const w of WORKFLOWS) {
      const existing = await prisma.workflowLink.findUnique({
        where: {
          tenantId_typeEvenement: {
            tenantId: tenant.id,
            typeEvenement: w.eventType,
          },
        },
      });

      const data = {
        workflowN8nId: w.workflowId,
        workflowN8nNom: w.workflowName,
        statut: 'actif' as const,
      };

      if (existing) {
        await prisma.workflowLink.update({
          where: { id: existing.id },
          data,
        });
        updated++;
        console.log('      • %s → mis à jour', w.eventType);
      } else {
        await prisma.workflowLink.create({
          data: {
            tenantId: tenant.id,
            moduleMetierId: moduleMetier.id,
            typeEvenement: w.eventType,
            ...data,
          },
        });
        created++;
        console.log('      • %s → créé', w.eventType);
      }
    }
    console.log('');
  }

  // ─── 4. Résumé ──────────────────────────────────────────────────────────
  console.log('─────────────────────────────────────────────────────────────');
  console.log('✅ Terminé. Liens créés : %d | mis à jour : %d', created, updated);
  console.log('─────────────────────────────────────────────────────────────');
  console.log('');
  console.log('📝 Workflows configurés (eventType → webhookPath) :');
  WORKFLOWS.forEach((w) => {
    console.log('   • %s → %s', w.eventType, w.webhookPath);
  });
  console.log('');
  console.log('🎯 Prochaines étapes :');
  console.log('   1. Importer les 7 workflows JSON dans n8n :');
  console.log('      n8n_workflows/factures/invoice-created.json');
  console.log('      n8n_workflows/factures/invoices-list.json');
  console.log('      n8n_workflows/factures/invoice-get.json');
  console.log('      n8n_workflows/factures/invoice-update.json');
  console.log('      n8n_workflows/factures/invoice-paid.json');
  console.log('      n8n_workflows/factures/invoice-overdue.json');
  console.log('      n8n_workflows/factures/invoice-overdue-cron.json');
  console.log('   2. Dans chaque workflow n8n :');
  console.log('      - Vérifier la credential Postgres sur les nœuds BDD');
  console.log('      - Activer le workflow (toggle ON) et sauvegarder');
  console.log('   3. Côté plateforme :');
  console.log('      - USE_N8N_VIEWS=true   → liste et détail factures via n8n');
  console.log('      - USE_N8N_COMMANDS=true → création et mise à jour via n8n');
  console.log('   4. URLs des webhooks (https://n8n.talosprimes.com) :');
  WORKFLOWS.forEach((w) => {
    console.log('      %s → https://n8n.talosprimes.com%s', w.eventType, w.webhookPath);
  });
  console.log('');
}

main()
  .catch((err) => {
    console.error('');
    console.error('❌ Erreur:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
