import { PrismaClient } from '@prisma/client';

/**
 * Seed du Plan Comptable Général (PCG) français
 * Couvre toutes les classes 1 à 7 avec les comptes principaux
 */
export async function seedPlanComptable(prisma: PrismaClient, tenantId: string): Promise<void> {
  console.log('📊 Plan Comptable Général...');

  const comptes: {
    numeroCompte: string;
    libelle: string;
    classe: number;
    nature: 'actif' | 'passif' | 'charge' | 'produit';
    type: 'general' | 'auxiliaire';
  }[] = [
    // ══════════════════════════════════════════════
    // CLASSE 1 — COMPTES DE CAPITAUX
    // ══════════════════════════════════════════════
    { numeroCompte: '101000', libelle: 'Capital social', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '104000', libelle: 'Primes liées au capital', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '106000', libelle: 'Réserves', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '106100', libelle: 'Réserve légale', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '106800', libelle: 'Autres réserves', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '108000', libelle: 'Compte de l\'exploitant', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '110000', libelle: 'Report à nouveau (solde créditeur)', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '119000', libelle: 'Report à nouveau (solde débiteur)', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '120000', libelle: 'Résultat de l\'exercice (bénéfice)', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '129000', libelle: 'Résultat de l\'exercice (perte)', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '131000', libelle: 'Subventions d\'équipement', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '140000', libelle: 'Provisions réglementées', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '145000', libelle: 'Amortissements dérogatoires', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '151000', libelle: 'Provisions pour risques', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '155000', libelle: 'Provisions pour impôts', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '157000', libelle: 'Provisions pour charges à répartir', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '160000', libelle: 'Emprunts et dettes assimilées', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '164000', libelle: 'Emprunts auprès des établissements de crédit', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '165000', libelle: 'Dépôts et cautionnements reçus', classe: 1, nature: 'passif', type: 'general' },
    { numeroCompte: '168000', libelle: 'Autres emprunts et dettes assimilées', classe: 1, nature: 'passif', type: 'general' },

    // ══════════════════════════════════════════════
    // CLASSE 2 — COMPTES D'IMMOBILISATIONS
    // ══════════════════════════════════════════════
    { numeroCompte: '201000', libelle: 'Frais d\'établissement', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '205000', libelle: 'Concessions, brevets, licences', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '206000', libelle: 'Droit au bail', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '207000', libelle: 'Fonds commercial', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '208000', libelle: 'Autres immobilisations incorporelles', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '211000', libelle: 'Terrains', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '213000', libelle: 'Constructions', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '215000', libelle: 'Installations techniques, matériel et outillage', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '218100', libelle: 'Installations générales, agencements', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '218200', libelle: 'Matériel de transport', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '218300', libelle: 'Matériel de bureau et informatique', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '218400', libelle: 'Mobilier', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '231000', libelle: 'Immobilisations corporelles en cours', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '237000', libelle: 'Avances et acomptes sur immobilisations', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '261000', libelle: 'Titres de participation', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '271000', libelle: 'Titres immobilisés', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '275000', libelle: 'Dépôts et cautionnements versés', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '280000', libelle: 'Amortissements des immobilisations incorporelles', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '281000', libelle: 'Amortissements des immobilisations corporelles', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '281300', libelle: 'Amortissements des constructions', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '281500', libelle: 'Amortissements installations techniques', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '281800', libelle: 'Amortissements autres immobilisations corporelles', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '290000', libelle: 'Dépréciation des immobilisations incorporelles', classe: 2, nature: 'actif', type: 'general' },
    { numeroCompte: '291000', libelle: 'Dépréciation des immobilisations corporelles', classe: 2, nature: 'actif', type: 'general' },

    // ══════════════════════════════════════════════
    // CLASSE 3 — COMPTES DE STOCKS
    // ══════════════════════════════════════════════
    { numeroCompte: '310000', libelle: 'Matières premières', classe: 3, nature: 'actif', type: 'general' },
    { numeroCompte: '320000', libelle: 'Autres approvisionnements', classe: 3, nature: 'actif', type: 'general' },
    { numeroCompte: '330000', libelle: 'En-cours de production de biens', classe: 3, nature: 'actif', type: 'general' },
    { numeroCompte: '340000', libelle: 'En-cours de production de services', classe: 3, nature: 'actif', type: 'general' },
    { numeroCompte: '350000', libelle: 'Stocks de produits', classe: 3, nature: 'actif', type: 'general' },
    { numeroCompte: '355000', libelle: 'Produits finis', classe: 3, nature: 'actif', type: 'general' },
    { numeroCompte: '370000', libelle: 'Stocks de marchandises', classe: 3, nature: 'actif', type: 'general' },
    { numeroCompte: '390000', libelle: 'Dépréciation des stocks et en-cours', classe: 3, nature: 'actif', type: 'general' },
    { numeroCompte: '391000', libelle: 'Provision dépréciation matières premières', classe: 3, nature: 'actif', type: 'general' },
    { numeroCompte: '397000', libelle: 'Provision dépréciation marchandises', classe: 3, nature: 'actif', type: 'general' },

    // ══════════════════════════════════════════════
    // CLASSE 4 — COMPTES DE TIERS
    // ══════════════════════════════════════════════
    { numeroCompte: '401000', libelle: 'Fournisseurs', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '401100', libelle: 'Fournisseurs — Effets à payer', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '403000', libelle: 'Fournisseurs — Effets à payer', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '404000', libelle: 'Fournisseurs d\'immobilisations', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '408000', libelle: 'Fournisseurs — Factures non parvenues', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '409000', libelle: 'Fournisseurs — Avances et acomptes versés', classe: 4, nature: 'actif', type: 'general' },
    { numeroCompte: '411000', libelle: 'Clients', classe: 4, nature: 'actif', type: 'general' },
    { numeroCompte: '411100', libelle: 'Clients — Effets à recevoir', classe: 4, nature: 'actif', type: 'general' },
    { numeroCompte: '413000', libelle: 'Clients — Effets à recevoir', classe: 4, nature: 'actif', type: 'general' },
    { numeroCompte: '416000', libelle: 'Clients douteux ou litigieux', classe: 4, nature: 'actif', type: 'general' },
    { numeroCompte: '418000', libelle: 'Clients — Produits non encore facturés', classe: 4, nature: 'actif', type: 'general' },
    { numeroCompte: '419000', libelle: 'Clients — Avances et acomptes reçus', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '421000', libelle: 'Personnel — Rémunérations dues', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '425000', libelle: 'Personnel — Avances et acomptes', classe: 4, nature: 'actif', type: 'general' },
    { numeroCompte: '427000', libelle: 'Personnel — Oppositions', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '428000', libelle: 'Personnel — Charges à payer', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '431000', libelle: 'Sécurité sociale', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '437000', libelle: 'Autres organismes sociaux', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '441000', libelle: 'État — Subventions à recevoir', classe: 4, nature: 'actif', type: 'general' },
    { numeroCompte: '442000', libelle: 'État — Impôts et taxes recouvrables sur des tiers', classe: 4, nature: 'actif', type: 'general' },
    { numeroCompte: '443000', libelle: 'Opérations particulières avec l\'État', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '444000', libelle: 'État — Impôt sur les bénéfices', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '445000', libelle: 'État — Taxes sur le chiffre d\'affaires', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '445100', libelle: 'TVA à payer', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '445200', libelle: 'TVA due intracommunautaire', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '445500', libelle: 'TVA à décaisser', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '445620', libelle: 'TVA sur immobilisations', classe: 4, nature: 'actif', type: 'general' },
    { numeroCompte: '445660', libelle: 'TVA déductible sur autres biens et services', classe: 4, nature: 'actif', type: 'general' },
    { numeroCompte: '445670', libelle: 'Crédit de TVA à reporter', classe: 4, nature: 'actif', type: 'general' },
    { numeroCompte: '445710', libelle: 'TVA collectée', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '445800', libelle: 'TVA à régulariser', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '447000', libelle: 'Autres impôts, taxes et versements assimilés', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '450000', libelle: 'Groupe et associés', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '455000', libelle: 'Associés — Comptes courants', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '456000', libelle: 'Associés — Opérations sur le capital', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '467000', libelle: 'Autres comptes débiteurs ou créditeurs', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '471000', libelle: 'Comptes d\'attente', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '476000', libelle: 'Différences de conversion — Actif', classe: 4, nature: 'actif', type: 'general' },
    { numeroCompte: '477000', libelle: 'Différences de conversion — Passif', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '486000', libelle: 'Charges constatées d\'avance', classe: 4, nature: 'actif', type: 'general' },
    { numeroCompte: '487000', libelle: 'Produits constatés d\'avance', classe: 4, nature: 'passif', type: 'general' },
    { numeroCompte: '491000', libelle: 'Dépréciation comptes clients', classe: 4, nature: 'actif', type: 'general' },

    // ══════════════════════════════════════════════
    // CLASSE 5 — COMPTES FINANCIERS
    // ══════════════════════════════════════════════
    { numeroCompte: '500000', libelle: 'Valeurs mobilières de placement', classe: 5, nature: 'actif', type: 'general' },
    { numeroCompte: '503000', libelle: 'Actions', classe: 5, nature: 'actif', type: 'general' },
    { numeroCompte: '506000', libelle: 'Obligations', classe: 5, nature: 'actif', type: 'general' },
    { numeroCompte: '508000', libelle: 'Autres VMP', classe: 5, nature: 'actif', type: 'general' },
    { numeroCompte: '511000', libelle: 'Valeurs à l\'encaissement', classe: 5, nature: 'actif', type: 'general' },
    { numeroCompte: '512000', libelle: 'Banques', classe: 5, nature: 'actif', type: 'general' },
    { numeroCompte: '512100', libelle: 'Banque — Compte courant', classe: 5, nature: 'actif', type: 'general' },
    { numeroCompte: '512200', libelle: 'Banque — Compte épargne', classe: 5, nature: 'actif', type: 'general' },
    { numeroCompte: '514000', libelle: 'Chèques postaux', classe: 5, nature: 'actif', type: 'general' },
    { numeroCompte: '517000', libelle: 'Autres organismes financiers', classe: 5, nature: 'actif', type: 'general' },
    { numeroCompte: '530000', libelle: 'Caisse', classe: 5, nature: 'actif', type: 'general' },
    { numeroCompte: '531000', libelle: 'Caisse en monnaie nationale', classe: 5, nature: 'actif', type: 'general' },
    { numeroCompte: '532000', libelle: 'Caisse en devises', classe: 5, nature: 'actif', type: 'general' },
    { numeroCompte: '580000', libelle: 'Virements internes', classe: 5, nature: 'actif', type: 'general' },
    { numeroCompte: '590000', libelle: 'Dépréciation des comptes financiers', classe: 5, nature: 'actif', type: 'general' },

    // ══════════════════════════════════════════════
    // CLASSE 6 — COMPTES DE CHARGES
    // ══════════════════════════════════════════════
    { numeroCompte: '601000', libelle: 'Achats stockés — Matières premières', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '602000', libelle: 'Achats stockés — Autres approvisionnements', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '604000', libelle: 'Achats d\'études et prestations de services', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '606000', libelle: 'Achats non stockés de matières et fournitures', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '606100', libelle: 'Fournitures non stockables (eau, énergie)', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '606300', libelle: 'Fournitures d\'entretien et petit équipement', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '606400', libelle: 'Fournitures administratives', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '607000', libelle: 'Achats de marchandises', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '609000', libelle: 'Rabais, remises, ristournes obtenus sur achats', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '611000', libelle: 'Sous-traitance générale', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '612000', libelle: 'Redevances de crédit-bail', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '613000', libelle: 'Locations', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '614000', libelle: 'Charges locatives et de copropriété', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '615000', libelle: 'Entretien et réparations', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '616000', libelle: 'Primes d\'assurance', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '617000', libelle: 'Études et recherches', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '618000', libelle: 'Divers services extérieurs', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '621000', libelle: 'Personnel extérieur à l\'entreprise', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '622000', libelle: 'Rémunérations d\'intermédiaires et honoraires', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '623000', libelle: 'Publicité, publications, relations publiques', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '624000', libelle: 'Transports de biens et transports collectifs', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '625000', libelle: 'Déplacements, missions et réceptions', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '626000', libelle: 'Frais postaux et de télécommunications', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '627000', libelle: 'Services bancaires et assimilés', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '628000', libelle: 'Divers charges externes', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '631000', libelle: 'Impôts, taxes sur rémunérations (taxe salaires)', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '633000', libelle: 'Impôts, taxes sur rémunérations (formation continue)', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '635000', libelle: 'Autres impôts, taxes (CFE, CVAE)', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '637000', libelle: 'Autres impôts, taxes et versements (AGEFIPH)', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '641000', libelle: 'Rémunérations du personnel', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '644000', libelle: 'Rémunération du travail de l\'exploitant', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '645000', libelle: 'Charges de sécurité sociale et prévoyance', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '646000', libelle: 'Cotisations sociales personnelles de l\'exploitant', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '647000', libelle: 'Autres charges sociales', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '648000', libelle: 'Autres charges de personnel', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '651000', libelle: 'Redevances pour concessions, brevets', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '654000', libelle: 'Pertes sur créances irrécouvrables', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '658000', libelle: 'Charges diverses de gestion courante', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '661000', libelle: 'Charges d\'intérêts', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '665000', libelle: 'Escomptes accordés', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '666000', libelle: 'Pertes de change', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '668000', libelle: 'Autres charges financières', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '671000', libelle: 'Charges exceptionnelles sur opérations de gestion', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '675000', libelle: 'Valeurs comptables des éléments d\'actif cédés', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '678000', libelle: 'Autres charges exceptionnelles', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '681000', libelle: 'Dotations aux amortissements et provisions — Charges d\'exploitation', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '681100', libelle: 'Dotations aux amortissements des immobilisations', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '681500', libelle: 'Dotations aux provisions d\'exploitation', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '686000', libelle: 'Dotations aux amortissements et provisions — Charges financières', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '687000', libelle: 'Dotations aux amortissements et provisions — Charges exceptionnelles', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '695000', libelle: 'Impôts sur les bénéfices', classe: 6, nature: 'charge', type: 'general' },
    { numeroCompte: '699000', libelle: 'Produits — Report en arrière des déficits', classe: 6, nature: 'charge', type: 'general' },

    // ══════════════════════════════════════════════
    // CLASSE 7 — COMPTES DE PRODUITS
    // ══════════════════════════════════════════════
    { numeroCompte: '701000', libelle: 'Ventes de produits finis', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '702000', libelle: 'Ventes de produits intermédiaires', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '703000', libelle: 'Ventes de produits résiduels', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '704000', libelle: 'Travaux', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '705000', libelle: 'Études', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '706000', libelle: 'Prestations de services', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '707000', libelle: 'Ventes de marchandises', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '708000', libelle: 'Produits des activités annexes', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '709000', libelle: 'Rabais, remises, ristournes accordés', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '713000', libelle: 'Variation des stocks', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '721000', libelle: 'Production immobilisée — Immobilisations incorporelles', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '722000', libelle: 'Production immobilisée — Immobilisations corporelles', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '740000', libelle: 'Subventions d\'exploitation', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '751000', libelle: 'Redevances pour concessions, brevets', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '754000', libelle: 'Ristournes perçues des coopératives', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '758000', libelle: 'Produits divers de gestion courante', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '761000', libelle: 'Produits de participations', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '762000', libelle: 'Produits des autres immobilisations financières', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '764000', libelle: 'Revenus des VMP', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '765000', libelle: 'Escomptes obtenus', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '766000', libelle: 'Gains de change', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '768000', libelle: 'Autres produits financiers', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '771000', libelle: 'Produits exceptionnels sur opérations de gestion', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '775000', libelle: 'Produits des cessions d\'éléments d\'actif', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '778000', libelle: 'Autres produits exceptionnels', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '781000', libelle: 'Reprises sur amortissements et provisions — Exploitation', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '786000', libelle: 'Reprises sur amortissements et provisions — Financier', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '787000', libelle: 'Reprises sur amortissements et provisions — Exceptionnel', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '791000', libelle: 'Transferts de charges d\'exploitation', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '796000', libelle: 'Transferts de charges financières', classe: 7, nature: 'produit', type: 'general' },
    { numeroCompte: '797000', libelle: 'Transferts de charges exceptionnelles', classe: 7, nature: 'produit', type: 'general' },
  ];

  let created = 0;
  let skipped = 0;

  for (const c of comptes) {
    try {
      await prisma.planComptable.upsert({
        where: {
          tenantId_numeroCompte: {
            tenantId,
            numeroCompte: c.numeroCompte,
          },
        },
        update: {
          libelle: c.libelle,
          classe: c.classe,
          nature: c.nature,
          type: c.type,
        },
        create: {
          tenantId,
          numeroCompte: c.numeroCompte,
          libelle: c.libelle,
          classe: c.classe,
          nature: c.nature,
          type: c.type,
        },
      });
      created++;
    } catch (e) {
      skipped++;
    }
  }

  console.log(`✅ Plan Comptable Général : ${created} comptes créés/mis à jour, ${skipped} ignorés`);
}

/**
 * Seed des journaux comptables par défaut
 */
export async function seedJournauxComptables(prisma: PrismaClient, tenantId: string): Promise<void> {
  console.log('📓 Journaux comptables...');

  const journaux = [
    { code: 'VE', libelle: 'Journal des Ventes', type: 'VE' as const },
    { code: 'AC', libelle: 'Journal des Achats', type: 'AC' as const },
    { code: 'BQ', libelle: 'Journal de Banque', type: 'BQ' as const },
    { code: 'OD', libelle: 'Journal des Opérations Diverses', type: 'OD' as const },
    { code: 'AN', libelle: 'Journal des À Nouveaux', type: 'AN' as const },
  ];

  for (const j of journaux) {
    await prisma.journalComptable.upsert({
      where: { tenantId_code: { tenantId, code: j.code } },
      update: { libelle: j.libelle },
      create: { tenantId, code: j.code, libelle: j.libelle, type: j.type },
    });
  }

  console.log('✅ Journaux comptables OK');
}

/**
 * Seed de l'exercice comptable en cours
 */
export async function seedExerciceComptable(prisma: PrismaClient, tenantId: string): Promise<void> {
  console.log('📅 Exercice comptable...');

  const year = new Date().getFullYear();
  const dateDebut = new Date(`${year}-01-01`);
  const dateFin = new Date(`${year}-12-31`);

  const existing = await prisma.exerciceComptable.findFirst({
    where: { tenantId, cloture: false },
  });

  if (!existing) {
    await prisma.exerciceComptable.create({
      data: {
        tenantId,
        code: `${year}`,
        dateDebut,
        dateFin,
        cloture: false,
      },
    });
    console.log(`✅ Exercice ${year} créé`);
  } else {
    console.log(`✅ Exercice déjà existant : ${existing.code}`);
  }
}
