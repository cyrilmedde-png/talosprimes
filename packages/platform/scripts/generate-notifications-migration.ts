#!/usr/bin/env tsx
/**
 * Script pour générer la migration Prisma pour les notifications
 * Usage: pnpm tsx scripts/generate-notifications-migration.ts
 */

import { execSync } from 'child_process';
import { resolve } from 'path';

const prismaPath = resolve(__dirname, '../prisma/schema.prisma');

console.log('🔄 Génération de la migration Prisma pour les notifications...\n');

try {
  // Générer la migration
  console.log('📝 Génération de la migration...');
  execSync(
    'pnpm prisma migrate dev --name add_notifications_table --create-only',
    {
      cwd: resolve(__dirname, '..'),
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || '',
      },
    }
  );

  console.log('\n✅ Migration générée avec succès !');
  console.log('\n📋 Prochaines étapes :');
  console.log('1. Vérifiez le fichier de migration dans prisma/migrations/');
  console.log('2. Appliquez la migration avec : pnpm prisma migrate deploy');
  console.log('3. Régénérez le client Prisma avec : pnpm prisma generate');
} catch (error) {
  console.error('\n❌ Erreur lors de la génération de la migration:', error);
  process.exit(1);
}

