import { Prisma, PrismaClient } from '@prisma/client';

type ModuleDef = {
  code: string;
  nomAffiche: string;
  description: string;
  categorie: string;
  icone: string;
  ordreAffichage: number;
};

/**
 * Catalogue complet des modules métiers TalosPrimes.
 * Chaque module est classé dans une catégorie pour l'affichage front.
 */
const ALL_MODULES: ModuleDef[] = [
  // ─── Commercial ───────────────────────────────
  {
    code: 'clients',
    nomAffiche: 'Clients',
    description: 'Gestion des clients : création, consultation, modification, suppression',
    categorie: 'Commercial',
    icone: 'UsersIcon',
    ordreAffichage: 10,
  },
  {
    code: 'leads',
    nomAffiche: 'Leads',
    description: 'Gestion des leads : création, suivi, qualification, conversion',
    categorie: 'Commercial',
    icone: 'UserPlusIcon',
    ordreAffichage: 11,
  },
  {
    code: 'prospects',
    nomAffiche: 'Prospects',
    description: 'Pipeline de prospection : scoring, relances, suivi du tunnel de conversion',
    categorie: 'Commercial',
    icone: 'FunnelIcon',
    ordreAffichage: 12,
  },
  {
    code: 'partenaire',
    nomAffiche: 'Partenaires',
    description: 'Gestion des revendeurs, apporteurs d\'affaires, commissions N1/N2',
    categorie: 'Commercial',
    icone: 'HandshakeIcon',
    ordreAffichage: 13,
  },

  // ─── Facturation & Finance ────────────────────
  {
    code: 'facturation',
    nomAffiche: 'Facturation',
    description: 'Gestion des factures : création, suivi, paiement, relance',
    categorie: 'Facturation & Finance',
    icone: 'DocumentTextIcon',
    ordreAffichage: 20,
  },
  {
    code: 'devis',
    nomAffiche: 'Devis',
    description: 'Gestion des devis : création, envoi, acceptation, conversion en facture',
    categorie: 'Facturation & Finance',
    icone: 'DocumentDuplicateIcon',
    ordreAffichage: 21,
  },
  {
    code: 'bons_commande',
    nomAffiche: 'Bons de Commande',
    description: 'Gestion des bons de commande : création, validation, conversion en facture',
    categorie: 'Facturation & Finance',
    icone: 'ClipboardDocumentListIcon',
    ordreAffichage: 22,
  },
  {
    code: 'avoirs',
    nomAffiche: 'Avoirs',
    description: 'Gestion des avoirs : création, validation, annulation',
    categorie: 'Facturation & Finance',
    icone: 'ReceiptRefundIcon',
    ordreAffichage: 23,
  },
  {
    code: 'proformas',
    nomAffiche: 'Proformas',
    description: 'Gestion des factures proforma : création, envoi, acceptation, conversion',
    categorie: 'Facturation & Finance',
    icone: 'DocumentCheckIcon',
    ordreAffichage: 24,
  },
  {
    code: 'articles',
    nomAffiche: 'Codes Articles',
    description: 'Catalogue articles : création, modification, suppression',
    categorie: 'Facturation & Finance',
    icone: 'TagIcon',
    ordreAffichage: 25,
  },
  {
    code: 'revenus',
    nomAffiche: 'Revenus & Commissions',
    description: 'Suivi MRR, commissions partenaires, paiements',
    categorie: 'Facturation & Finance',
    icone: 'BanknotesIcon',
    ordreAffichage: 26,
  },
  {
    code: 'comptabilite',
    nomAffiche: 'Comptabilité PCG',
    description: 'Comptabilité complète : écritures, grand livre, balance, bilan, TVA, agent IA comptable',
    categorie: 'Facturation & Finance',
    icone: 'CalculatorIcon',
    ordreAffichage: 27,
  },

  // ─── Gestion d'entreprise ─────────────────────
  {
    code: 'gestion_projet',
    nomAffiche: 'Gestion de Projet',
    description: 'Projets : création, tâches, suivi avancement, dashboard',
    categorie: 'Gestion d\'entreprise',
    icone: 'RectangleStackIcon',
    ordreAffichage: 30,
  },
  {
    code: 'gestion_equipe',
    nomAffiche: 'Gestion d\'Équipe',
    description: 'Équipe : membres, pointages, absences, dashboard',
    categorie: 'Gestion d\'entreprise',
    icone: 'UserGroupIcon',
    ordreAffichage: 31,
  },
  {
    code: 'gestion_rh',
    nomAffiche: 'Ressources Humaines',
    description: 'RH : contrats, congés, paie, formations, évaluations, entretiens',
    categorie: 'Gestion d\'entreprise',
    icone: 'BriefcaseIcon',
    ordreAffichage: 32,
  },
  {
    code: 'btp',
    nomAffiche: 'BTP',
    description: 'BTP : chantiers, situations de travaux, validation, dashboard',
    categorie: 'Gestion d\'entreprise',
    icone: 'WrenchScrewdriverIcon',
    ordreAffichage: 33,
  },

  // ─── IA & Communication ───────────────────────
  {
    code: 'agent_telephonique',
    nomAffiche: 'Agent Téléphonique IA',
    description: 'Agent IA : appels entrants/sortants, SMS, questionnaires, configuration Twilio',
    categorie: 'IA & Communication',
    icone: 'PhoneIcon',
    ordreAffichage: 40,
  },
  {
    code: 'notifications',
    nomAffiche: 'Notifications',
    description: 'Gestion des notifications : création, lecture, suppression',
    categorie: 'IA & Communication',
    icone: 'BellIcon',
    ordreAffichage: 41,
  },

  // ─── Système ──────────────────────────────────
  {
    code: 'logs',
    nomAffiche: 'Logs',
    description: 'Consultation des logs et événements système',
    categorie: 'Système',
    icone: 'CommandLineIcon',
    ordreAffichage: 90,
  },
];

/**
 * Crée ou met à jour tous les modules métiers.
 * Utilisé par le seed principal pour que les workflow_links aient un module.
 */
export async function seedModules(prisma: PrismaClient): Promise<void> {
  console.log('📦 Modules métiers...');

  const prixZero = new Prisma.Decimal(0);

  for (const m of ALL_MODULES) {
    await prisma.moduleMetier.upsert({
      where: { code: m.code },
      update: {
        nomAffiche: m.nomAffiche,
        description: m.description,
        categorie: m.categorie,
        icone: m.icone,
        ordreAffichage: m.ordreAffichage,
        prixParMois: prixZero,
      },
      create: {
        code: m.code,
        nomAffiche: m.nomAffiche,
        description: m.description,
        categorie: m.categorie,
        icone: m.icone,
        ordreAffichage: m.ordreAffichage,
        prixParMois: prixZero,
      },
    });
  }

  console.log(`✅ ${ALL_MODULES.length} modules métiers OK`);
}
