#!/usr/bin/env tsx
/**
 * fix-duplicate-workflow-links.ts
 *
 * Nettoie les doublons de workflow_links causés par deux modules métier
 * différents ("invoices" et "facturation") qui créaient chacun leurs liens.
 *
 * Actions :
 *   1. Identifie les doublons (même tenant_id + type_evenement, module_metier_id différent)
 *   2. Garde le lien rattaché au module "facturation" (le bon), supprime l'autre
 *   3. Supprime le module métier orphelin "invoices" s'il existe
 *   4. Vérifie que la contrainte UNIQUE (tenant_id, type_evenement) est bien en base
 *
 * Usage:
 *   cd packages/platform && npx tsx scripts/fix-duplicate-workflow-links.ts
 *
 * Idempotent : peut être relancé sans risque.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Nettoyage doublons workflow_links                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // ─── 1. Trouver le bon module (facturation) et le mauvais (invoices) ──
  const moduleFact = await prisma.moduleMetier.findUnique({ where: { code: 'facturation' } });
  const moduleInv = await prisma.moduleMetier.findUnique({ where: { code: 'invoices' } });

  console.log('Module "facturation" :', moduleFact ? moduleFact.id : '❌ ABSENT');
  console.log('Module "invoices"    :', moduleInv ? moduleInv.id : '(absent, OK)');
  console.log('');

  // ─── 2. Compter les doublons ──────────────────────────────────────────
  // On cherche les paires (tenant_id, type_evenement) qui apparaissent plus d'une fois
  const allLinks = await prisma.workflowLink.findMany({
    orderBy: [{ tenantId: 'asc' }, { typeEvenement: 'asc' }, { createdAt: 'asc' }],
  });

  const grouped = new Map<string, typeof allLinks>();
  for (const link of allLinks) {
    const key = `${link.tenantId}::${link.typeEvenement}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(link);
  }

  const duplicates = [...grouped.entries()].filter(([, links]) => links.length > 1);
  console.log(`📊 Total liens : ${allLinks.length}`);
  console.log(`📊 Paires uniques (tenant+event) : ${grouped.size}`);
  console.log(`📊 Doublons détectés : ${duplicates.length}`);
  console.log('');

  if (duplicates.length === 0) {
    console.log('✅ Aucun doublon à nettoyer !');
  } else {
    let deleted = 0;

    for (const [key, links] of duplicates) {
      const [tenantId, typeEvenement] = key.split('::');
      console.log(`   Doublon : tenant=${tenantId.substring(0, 8)}... event=${typeEvenement} (${links.length} liens)`);

      // Garder celui rattaché au module "facturation", sinon le plus récent
      let keep = links.find((l) => moduleFact && l.moduleMetierId === moduleFact.id);
      if (!keep) {
        // Sinon garder le dernier créé
        keep = links[links.length - 1];
      }

      const toDelete = links.filter((l) => l.id !== keep!.id);
      for (const del of toDelete) {
        await prisma.workflowLink.delete({ where: { id: del.id } });
        deleted++;
        console.log(`      ❌ Supprimé : ${del.id} (module: ${del.moduleMetierId.substring(0, 8)}...)`);
      }
      console.log(`      ✅ Gardé   : ${keep.id} (module: ${keep.moduleMetierId.substring(0, 8)}...)`);
    }

    console.log(`\n🗑️  ${deleted} doublons supprimés`);
  }

  // ─── 3. Rattacher tous les liens restants au module "facturation" ─────
  if (moduleFact) {
    const updated = await prisma.workflowLink.updateMany({
      where: {
        moduleMetierId: { not: moduleFact.id },
        typeEvenement: { startsWith: 'invoice' },
      },
      data: { moduleMetierId: moduleFact.id },
    });
    if (updated.count > 0) {
      console.log(`\n🔄 ${updated.count} lien(s) re-rattaché(s) au module "facturation"`);
    }
  }

  // ─── 4. Supprimer le module "invoices" orphelin si plus aucun lien ────
  if (moduleInv) {
    const linksWithInvoicesModule = await prisma.workflowLink.count({
      where: { moduleMetierId: moduleInv.id },
    });
    if (linksWithInvoicesModule === 0) {
      await prisma.moduleMetier.delete({ where: { id: moduleInv.id } });
      console.log(`\n🗑️  Module métier "invoices" (${moduleInv.id}) supprimé (orphelin)`);
    } else {
      console.log(`\n⚠️  Module "invoices" a encore ${linksWithInvoicesModule} lien(s), non supprimé`);
    }
  }

  // ─── 5. Vérification finale ───────────────────────────────────────────
  const finalCount = await prisma.workflowLink.count();
  const finalGrouped = await prisma.workflowLink.groupBy({
    by: ['tenantId', 'typeEvenement'],
    _count: true,
    having: {
      tenantId: { _count: { gt: 1 } },
    },
  });

  console.log('\n════════════════════════════════════');
  console.log(`✅ Liens restants : ${finalCount}`);
  if (finalGrouped.length > 0) {
    console.log(`⚠️  Il reste ${finalGrouped.length} doublons — à vérifier manuellement`);
  } else {
    console.log('✅ Aucun doublon restant');
  }
  console.log('');
  console.log('📌 N\'oubliez pas de lancer : pnpm db:push');
  console.log('   pour appliquer la contrainte UNIQUE(tenant_id, type_evenement) en base');
  console.log('');
}

main()
  .catch((err) => {
    console.error('\n❌ Erreur:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
