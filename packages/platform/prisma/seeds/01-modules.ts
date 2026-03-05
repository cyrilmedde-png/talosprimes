import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Crée ou met à jour les modules métiers (ex: facturation).
 * Utilisé par le seed principal pour que les workflow_links aient un module.
 */
export async function seedModules(prisma: PrismaClient): Promise<void> {
  console.log('📦 Modules métiers...');

  const prixZero = new Prisma.Decimal(0);
  await prisma.moduleMetier.upsert({
    where: { code: 'facturation' },
    update: {
      nomAffiche: 'Facturation',
      description: 'Module de gestion des factures : création, suivi, paiement, relance',
      prixParMois: prixZero,
    },
    create: {
      code: 'facturation',
      nomAffiche: 'Facturation',
      description: 'Module de gestion des factures : création, suivi, paiement, relance',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module facturation OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'articles' },
    update: {
      nomAffiche: 'Codes Articles',
      description: 'Module de gestion du catalogue articles : création, modification, suppression',
      prixParMois: prixZero,
    },
    create: {
      code: 'articles',
      nomAffiche: 'Codes Articles',
      description: 'Module de gestion du catalogue articles : création, modification, suppression',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module articles OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'bons_commande' },
    update: {
      nomAffiche: 'Bons de Commande',
      description: 'Module de gestion des bons de commande : création, validation, conversion en facture',
      prixParMois: prixZero,
    },
    create: {
      code: 'bons_commande',
      nomAffiche: 'Bons de Commande',
      description: 'Module de gestion des bons de commande : création, validation, conversion en facture',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module bons_commande OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'devis' },
    update: {
      nomAffiche: 'Devis',
      description: 'Module de gestion des devis : création, envoi, acceptation, conversion en facture',
      prixParMois: prixZero,
    },
    create: {
      code: 'devis',
      nomAffiche: 'Devis',
      description: 'Module de gestion des devis : création, envoi, acceptation, conversion en facture',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module devis OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'avoirs' },
    update: {
      nomAffiche: 'Avoirs',
      description: 'Module de gestion des avoirs : création, validation, annulation',
      prixParMois: prixZero,
    },
    create: {
      code: 'avoirs',
      nomAffiche: 'Avoirs',
      description: 'Module de gestion des avoirs : création, validation, annulation',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module avoirs OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'proformas' },
    update: {
      nomAffiche: 'Proformas',
      description: 'Module de gestion des factures proforma : création, envoi, acceptation, conversion en facture',
      prixParMois: prixZero,
    },
    create: {
      code: 'proformas',
      nomAffiche: 'Proformas',
      description: 'Module de gestion des factures proforma : création, envoi, acceptation, conversion en facture',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module proformas OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'logs' },
    update: {
      nomAffiche: 'Logs',
      description: 'Module de consultation des logs et événements système',
      prixParMois: prixZero,
    },
    create: {
      code: 'logs',
      nomAffiche: 'Logs',
      description: 'Module de consultation des logs et événements système',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module logs OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'notifications' },
    update: {
      nomAffiche: 'Notifications',
      description: 'Module de gestion des notifications : création, lecture, suppression',
      prixParMois: prixZero,
    },
    create: {
      code: 'notifications',
      nomAffiche: 'Notifications',
      description: 'Module de gestion des notifications : création, lecture, suppression',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module notifications OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'agent_telephonique' },
    update: {
      nomAffiche: 'Agent Téléphonique IA',
      description: 'Module Agent IA : appels entrants/sortants, SMS, questionnaires, configuration Twilio',
      prixParMois: prixZero,
    },
    create: {
      code: 'agent_telephonique',
      nomAffiche: 'Agent Téléphonique IA',
      description: 'Module Agent IA : appels entrants/sortants, SMS, questionnaires, configuration Twilio',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module agent_telephonique OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'clients' },
    update: {
      nomAffiche: 'Clients',
      description: 'Module de gestion des clients : création, consultation, modification, suppression',
      prixParMois: prixZero,
    },
    create: {
      code: 'clients',
      nomAffiche: 'Clients',
      description: 'Module de gestion des clients : création, consultation, modification, suppression',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module clients OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'leads' },
    update: {
      nomAffiche: 'Leads',
      description: 'Module de gestion des leads : création, suivi, qualification, conversion',
      prixParMois: prixZero,
    },
    create: {
      code: 'leads',
      nomAffiche: 'Leads',
      description: 'Module de gestion des leads : création, suivi, qualification, conversion',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module leads OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'comptabilite' },
    update: {
      nomAffiche: 'Comptabilité PCG',
      description: 'Module comptabilité complète : écritures, grand livre, balance, bilan, TVA, agent IA comptable',
      prixParMois: prixZero,
    },
    create: {
      code: 'comptabilite',
      nomAffiche: 'Comptabilité PCG',
      description: 'Module comptabilité complète : écritures, grand livre, balance, bilan, TVA, agent IA comptable',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module comptabilite OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'partenaire' },
    update: {
      nomAffiche: 'Partenaires',
      description: 'Module partenaires : gestion des revendeurs, apporteurs d\'affaires, commissions N1/N2',
      prixParMois: prixZero,
    },
    create: {
      code: 'partenaire',
      nomAffiche: 'Partenaires',
      description: 'Module partenaires : gestion des revendeurs, apporteurs d\'affaires, commissions N1/N2',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module partenaire OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'revenus' },
    update: {
      nomAffiche: 'Revenus & Commissions',
      description: 'Module revenus : suivi MRR, commissions, paiements partenaires',
      prixParMois: prixZero,
    },
    create: {
      code: 'revenus',
      nomAffiche: 'Revenus & Commissions',
      description: 'Module revenus : suivi MRR, commissions, paiements partenaires',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module revenus OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'gestion_projet' },
    update: {
      nomAffiche: 'Gestion de Projet',
      description: 'Module projets : création, tâches, suivi avancement, dashboard',
      prixParMois: prixZero,
    },
    create: {
      code: 'gestion_projet',
      nomAffiche: 'Gestion de Projet',
      description: 'Module projets : création, tâches, suivi avancement, dashboard',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module gestion_projet OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'gestion_equipe' },
    update: {
      nomAffiche: 'Gestion d\'Équipe',
      description: 'Module équipe : membres, pointages, absences, dashboard',
      prixParMois: prixZero,
    },
    create: {
      code: 'gestion_equipe',
      nomAffiche: 'Gestion d\'Équipe',
      description: 'Module équipe : membres, pointages, absences, dashboard',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module gestion_equipe OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'gestion_rh' },
    update: {
      nomAffiche: 'Ressources Humaines',
      description: 'Module RH : contrats, congés, paie, formations, évaluations, entretiens',
      prixParMois: prixZero,
    },
    create: {
      code: 'gestion_rh',
      nomAffiche: 'Ressources Humaines',
      description: 'Module RH : contrats, congés, paie, formations, évaluations, entretiens',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module gestion_rh OK');

  await prisma.moduleMetier.upsert({
    where: { code: 'btp' },
    update: {
      nomAffiche: 'BTP',
      description: 'Module BTP : chantiers, situations de travaux, validation, dashboard',
      prixParMois: prixZero,
    },
    create: {
      code: 'btp',
      nomAffiche: 'BTP',
      description: 'Module BTP : chantiers, situations de travaux, validation, dashboard',
      prixParMois: prixZero,
    },
  });

  console.log('✅ Module btp OK');
}
