import { PrismaClient } from '@prisma/client';
import { seedDevData } from './03-dev-data';

const prisma = new PrismaClient();

seedDevData(prisma)
  .catch((e) => {
    console.error('❌ Erreur seed dev:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
