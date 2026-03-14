/**
 * ============================================================
 * MOTEUR DE CALCUL DE PAIE FRANÇAIS — TalosPrimes
 * ============================================================
 * Taux 2025/2026 officiels — cotisations sociales françaises
 * Conforme aux barèmes URSSAF / DSN
 * ============================================================
 */

// ============================================================
// TYPES
// ============================================================

export type StatutEmploye = 'non_cadre' | 'cadre' | 'apprenti' | 'stagiaire' | 'dirigeant';

export type TypeContrat = 'cdi' | 'cdd' | 'interim' | 'stage' | 'alternance' | 'freelance';

export interface DonneesEmploye {
  salaireBase: number;          // Salaire brut mensuel de base
  primes: number;               // Primes et indemnités
  heuresSupp: number;           // Heures supplémentaires (montant)
  avantagesNature: number;      // Avantages en nature
  statut: StatutEmploye;
  typeContrat: TypeContrat;
  tempsPartiel: number;         // 1 = temps plein, 0.8 = 80%, etc.
  tauxAT: number;               // Taux AT/MP spécifique à l'entreprise (ex: 0.0113)
  mutuelleEmployeur: number;    // Part employeur mutuelle
  mutuelleSalarie: number;      // Part salarié mutuelle
  transportEmployeur: number;   // Remboursement transport (50% Navigo etc.)
  ticketsRestaurant: number;    // Part employeur tickets restaurant
  prevoyanceEmployeur: number;  // Part employeur prévoyance
  prevoyanceSalarie: number;    // Part salarié prévoyance
}

export interface LigneCotisation {
  code: string;
  libelle: string;
  base: number;
  tauxSalarial: number;
  tauxPatronal: number;
  montantSalarial: number;
  montantPatronal: number;
  categorie: 'sante' | 'retraite' | 'chomage' | 'famille' | 'csg_crds' | 'autre';
}

export interface ResultatPaie {
  // Brut
  salaireBrut: number;
  salaireBase: number;
  primes: number;
  heuresSupp: number;
  avantagesNature: number;

  // Cotisations détaillées
  lignesCotisations: LigneCotisation[];

  // Totaux cotisations
  totalChargesSalariales: number;
  totalChargesPatronales: number;
  coutTotalEmployeur: number;

  // Net
  netAvantImpot: number;       // Net à payer avant PAS
  netImposable: number;        // Base pour l'impôt sur le revenu
  netAPayer: number;           // Net à payer (= netAvantImpot car PAS calculé séparément)

  // Remboursements / avantages
  transportEmployeur: number;
  ticketsRestaurant: number;

  // Résumé
  tauxChargesSalariales: number;  // % du brut
  tauxChargesPatronales: number;  // % du brut
}

// ============================================================
// CONSTANTES OFFICIELLES 2025-2026
// ============================================================

/** Plafond mensuel de la Sécurité Sociale (PMSS) 2025 */
export const PMSS_2025 = 3925;

/** SMIC mensuel brut 2025 (35h) */
export const SMIC_MENSUEL_2025 = 1802.00;

/** Plafonds */
export const PLAFONDS = {
  tranche1: PMSS_2025,                  // 0 → 1 PMSS
  tranche2: PMSS_2025 * 4,              // 1 → 4 PMSS
  tranche2Agirc: PMSS_2025 * 8,         // 1 → 8 PMSS (Agirc-Arrco)
};

// ============================================================
// BARÈMES DE COTISATIONS
// ============================================================

interface BaremeCotisation {
  code: string;
  libelle: string;
  categorie: LigneCotisation['categorie'];
  basePlafonnee: boolean;
  plafond?: number;
  tauxSalarial: number;
  tauxPatronal: number;
  appliqueA: StatutEmploye[];
  deductibleIR: boolean;       // Déductible du revenu imposable
}

const BAREMES: BaremeCotisation[] = [
  // ========== SANTÉ ==========
  {
    code: 'MALADIE',
    libelle: 'Assurance maladie, maternité, invalidité, décès',
    categorie: 'sante',
    basePlafonnee: false,
    tauxSalarial: 0,
    tauxPatronal: 0.1300,    // 13% (7% + 6% complémentaire)
    appliqueA: ['non_cadre', 'cadre', 'dirigeant'],
    deductibleIR: true,
  },
  {
    code: 'COMPLEMENT_MALADIE',
    libelle: 'Contribution solidarité autonomie (CSA)',
    categorie: 'sante',
    basePlafonnee: false,
    tauxSalarial: 0,
    tauxPatronal: 0.0030,    // 0.30%
    appliqueA: ['non_cadre', 'cadre', 'dirigeant'],
    deductibleIR: true,
  },

  // ========== RETRAITE ==========
  {
    code: 'VIEILLESSE_PLAF',
    libelle: 'Assurance vieillesse plafonnée',
    categorie: 'retraite',
    basePlafonnee: true,
    plafond: PLAFONDS.tranche1,
    tauxSalarial: 0.0690,    // 6.90%
    tauxPatronal: 0.0855,    // 8.55%
    appliqueA: ['non_cadre', 'cadre', 'dirigeant'],
    deductibleIR: true,
  },
  {
    code: 'VIEILLESSE_DEPLAF',
    libelle: 'Assurance vieillesse déplafonnée',
    categorie: 'retraite',
    basePlafonnee: false,
    tauxSalarial: 0.0040,    // 0.40%
    tauxPatronal: 0.0200,    // 2.00% (1.90% + 0.10% solidarité)
    appliqueA: ['non_cadre', 'cadre', 'dirigeant'],
    deductibleIR: true,
  },
  {
    code: 'AGIRC_ARRCO_T1',
    libelle: 'Retraite complémentaire Agirc-Arrco T1',
    categorie: 'retraite',
    basePlafonnee: true,
    plafond: PLAFONDS.tranche1,
    tauxSalarial: 0.0386,    // 3.86%
    tauxPatronal: 0.0601,    // 6.01%
    appliqueA: ['non_cadre', 'cadre', 'dirigeant'],
    deductibleIR: true,
  },
  {
    code: 'AGIRC_ARRCO_T2',
    libelle: 'Retraite complémentaire Agirc-Arrco T2',
    categorie: 'retraite',
    basePlafonnee: true,
    plafond: PLAFONDS.tranche2Agirc,
    tauxSalarial: 0.1057,    // 10.57% (sur tranche 2)
    tauxPatronal: 0.1471,    // 14.71% (sur tranche 2)
    appliqueA: ['cadre', 'dirigeant'],
    deductibleIR: true,
  },
  {
    code: 'CEG_T1',
    libelle: 'Contribution d\'équilibre général T1',
    categorie: 'retraite',
    basePlafonnee: true,
    plafond: PLAFONDS.tranche1,
    tauxSalarial: 0.0086,    // 0.86%
    tauxPatronal: 0.0129,    // 1.29%
    appliqueA: ['non_cadre', 'cadre', 'dirigeant'],
    deductibleIR: true,
  },
  {
    code: 'CEG_T2',
    libelle: 'Contribution d\'équilibre général T2',
    categorie: 'retraite',
    basePlafonnee: true,
    plafond: PLAFONDS.tranche2Agirc,
    tauxSalarial: 0.0108,    // 1.08% (sur tranche 2)
    tauxPatronal: 0.0162,    // 1.62% (sur tranche 2)
    appliqueA: ['cadre', 'dirigeant'],
    deductibleIR: true,
  },
  {
    code: 'CET',
    libelle: 'Contribution d\'équilibre technique',
    categorie: 'retraite',
    basePlafonnee: false,
    tauxSalarial: 0.0014,    // 0.14%
    tauxPatronal: 0.0021,    // 0.21%
    appliqueA: ['cadre', 'dirigeant'],  // Uniquement si salaire > PMSS
    deductibleIR: true,
  },

  // ========== CHÔMAGE ==========
  {
    code: 'CHOMAGE',
    libelle: 'Assurance chômage',
    categorie: 'chomage',
    basePlafonnee: true,
    plafond: PLAFONDS.tranche2,
    tauxSalarial: 0,          // 0% côté salarié depuis 2018
    tauxPatronal: 0.0405,    // 4.05%
    appliqueA: ['non_cadre', 'cadre', 'dirigeant'],
    deductibleIR: true,
  },
  {
    code: 'AGS',
    libelle: 'Assurance garantie des salaires (AGS)',
    categorie: 'chomage',
    basePlafonnee: true,
    plafond: PLAFONDS.tranche2,
    tauxSalarial: 0,
    tauxPatronal: 0.0015,    // 0.15%
    appliqueA: ['non_cadre', 'cadre', 'dirigeant'],
    deductibleIR: true,
  },

  // ========== FAMILLE ==========
  {
    code: 'ALLOCATIONS_FAM',
    libelle: 'Allocations familiales',
    categorie: 'famille',
    basePlafonnee: false,
    tauxSalarial: 0,
    tauxPatronal: 0.0525,    // 5.25% (3.45% taux réduit si <3.5 SMIC)
    appliqueA: ['non_cadre', 'cadre', 'dirigeant'],
    deductibleIR: true,
  },

  // ========== CSG / CRDS ==========
  {
    code: 'CSG_DEDUCTIBLE',
    libelle: 'CSG déductible',
    categorie: 'csg_crds',
    basePlafonnee: false,
    tauxSalarial: 0.0680,    // 6.80% (sur 98.25% du brut)
    tauxPatronal: 0,
    appliqueA: ['non_cadre', 'cadre', 'dirigeant'],
    deductibleIR: true,
  },
  {
    code: 'CSG_NON_DEDUCTIBLE',
    libelle: 'CSG non déductible + CRDS',
    categorie: 'csg_crds',
    basePlafonnee: false,
    tauxSalarial: 0.0290,    // 2.40% CSG + 0.50% CRDS = 2.90% (sur 98.25% du brut)
    tauxPatronal: 0,
    appliqueA: ['non_cadre', 'cadre', 'dirigeant'],
    deductibleIR: false,
  },

  // ========== AUTRES ==========
  {
    code: 'AT_MP',
    libelle: 'Accidents du travail / Maladies professionnelles',
    categorie: 'autre',
    basePlafonnee: false,
    tauxSalarial: 0,
    tauxPatronal: 0,          // Variable selon entreprise (sera overridé)
    appliqueA: ['non_cadre', 'cadre', 'dirigeant'],
    deductibleIR: true,
  },
  {
    code: 'FNAL',
    libelle: 'FNAL (Fonds National d\'Aide au Logement)',
    categorie: 'autre',
    basePlafonnee: false,
    tauxSalarial: 0,
    tauxPatronal: 0.0050,    // 0.50% (entreprise ≥50 salariés) ou 0.10% (plafonnée)
    appliqueA: ['non_cadre', 'cadre', 'dirigeant'],
    deductibleIR: true,
  },
  {
    code: 'CONTRIB_DIALOGUE',
    libelle: 'Contribution au dialogue social',
    categorie: 'autre',
    basePlafonnee: false,
    tauxSalarial: 0,
    tauxPatronal: 0.0016,    // 0.016%
    appliqueA: ['non_cadre', 'cadre', 'dirigeant'],
    deductibleIR: true,
  },
  {
    code: 'FORMATION_PRO',
    libelle: 'Contribution formation professionnelle',
    categorie: 'autre',
    basePlafonnee: false,
    tauxSalarial: 0,
    tauxPatronal: 0.0100,    // 1.00% (entreprise ≥11 salariés)
    appliqueA: ['non_cadre', 'cadre', 'dirigeant'],
    deductibleIR: true,
  },
  {
    code: 'TAXE_APPRENTISSAGE',
    libelle: 'Taxe d\'apprentissage',
    categorie: 'autre',
    basePlafonnee: false,
    tauxSalarial: 0,
    tauxPatronal: 0.0068,    // 0.68%
    appliqueA: ['non_cadre', 'cadre', 'dirigeant'],
    deductibleIR: true,
  },
  {
    code: 'PREVOYANCE_CADRE',
    libelle: 'Prévoyance cadres (décès)',
    categorie: 'sante',
    basePlafonnee: true,
    plafond: PLAFONDS.tranche1,
    tauxSalarial: 0,
    tauxPatronal: 0.0150,    // 1.50% minimum obligatoire
    appliqueA: ['cadre'],
    deductibleIR: true,
  },
  {
    code: 'APEC',
    libelle: 'APEC (cadres)',
    categorie: 'autre',
    basePlafonnee: true,
    plafond: PLAFONDS.tranche2,
    tauxSalarial: 0.0024,    // 0.024%
    tauxPatronal: 0.0036,    // 0.036%
    appliqueA: ['cadre', 'dirigeant'],
    deductibleIR: true,
  },
];

// ============================================================
// MOTEUR DE CALCUL
// ============================================================

export function calculerPaie(donnees: DonneesEmploye): ResultatPaie {
  const {
    salaireBase,
    primes,
    heuresSupp,
    avantagesNature,
    statut,
    tauxAT,
    mutuelleEmployeur,
    mutuelleSalarie,
    transportEmployeur,
    ticketsRestaurant,
    prevoyanceEmployeur,
    prevoyanceSalarie,
  } = donnees;

  const salaireBrut = salaireBase + primes + heuresSupp + avantagesNature;
  const lignesCotisations: LigneCotisation[] = [];

  let totalChargesSalariales = 0;
  let totalChargesPatronales = 0;
  let totalDeductibleIR = 0;

  for (const bareme of BAREMES) {
    // Vérifier si applicable au statut
    if (!bareme.appliqueA.includes(statut)) continue;

    // CET uniquement si salaire > PMSS
    if (bareme.code === 'CET' && salaireBrut <= PMSS_2025) continue;

    // Calcul de la base
    let base = salaireBrut;

    // CSG/CRDS : assiette = 98.25% du brut
    if (bareme.code === 'CSG_DEDUCTIBLE' || bareme.code === 'CSG_NON_DEDUCTIBLE') {
      base = salaireBrut * 0.9825;
    }

    // Base plafonnée
    if (bareme.basePlafonnee && bareme.plafond) {
      // Pour Agirc-Arrco T2 et CEG T2 : base = portion entre T1 et T2
      if (bareme.code === 'AGIRC_ARRCO_T2' || bareme.code === 'CEG_T2') {
        if (salaireBrut <= PLAFONDS.tranche1) {
          continue; // Pas de cotisation T2 si salaire ≤ PMSS
        }
        base = Math.min(salaireBrut, bareme.plafond) - PLAFONDS.tranche1;
      } else {
        base = Math.min(base, bareme.plafond);
      }
    }

    // Taux AT/MP variable
    let tauxPatronal = bareme.tauxPatronal;
    if (bareme.code === 'AT_MP') {
      tauxPatronal = tauxAT;
    }

    // Allocations familiales : taux réduit si salaire < 3.5 SMIC
    if (bareme.code === 'ALLOCATIONS_FAM' && salaireBrut <= SMIC_MENSUEL_2025 * 3.5) {
      tauxPatronal = 0.0345; // 3.45% au lieu de 5.25%
    }

    const montantSalarial = Math.round(base * bareme.tauxSalarial * 100) / 100;
    const montantPatronal = Math.round(base * tauxPatronal * 100) / 100;

    totalChargesSalariales += montantSalarial;
    totalChargesPatronales += montantPatronal;

    if (bareme.deductibleIR) {
      totalDeductibleIR += montantSalarial;
    }

    lignesCotisations.push({
      code: bareme.code,
      libelle: bareme.libelle,
      base: Math.round(base * 100) / 100,
      tauxSalarial: bareme.tauxSalarial,
      tauxPatronal: tauxPatronal,
      montantSalarial,
      montantPatronal,
      categorie: bareme.categorie,
    });
  }

  // Mutuelle complémentaire santé
  if (mutuelleSalarie > 0 || mutuelleEmployeur > 0) {
    lignesCotisations.push({
      code: 'MUTUELLE',
      libelle: 'Complémentaire santé (mutuelle)',
      base: salaireBrut,
      tauxSalarial: 0,
      tauxPatronal: 0,
      montantSalarial: mutuelleSalarie,
      montantPatronal: mutuelleEmployeur,
      categorie: 'sante',
    });
    totalChargesSalariales += mutuelleSalarie;
    totalChargesPatronales += mutuelleEmployeur;
    totalDeductibleIR += mutuelleSalarie;
  }

  // Prévoyance (hors cadres obligatoire déjà compté)
  if (prevoyanceSalarie > 0 || prevoyanceEmployeur > 0) {
    lignesCotisations.push({
      code: 'PREVOYANCE',
      libelle: 'Prévoyance complémentaire',
      base: salaireBrut,
      tauxSalarial: 0,
      tauxPatronal: 0,
      montantSalarial: prevoyanceSalarie,
      montantPatronal: prevoyanceEmployeur,
      categorie: 'sante',
    });
    totalChargesSalariales += prevoyanceSalarie;
    totalChargesPatronales += prevoyanceEmployeur;
    totalDeductibleIR += prevoyanceSalarie;
  }

  // Arrondis
  totalChargesSalariales = Math.round(totalChargesSalariales * 100) / 100;
  totalChargesPatronales = Math.round(totalChargesPatronales * 100) / 100;

  const netAvantImpot = Math.round((salaireBrut - totalChargesSalariales) * 100) / 100;

  // Net imposable = brut - cotisations déductibles + CSG non déductible (réintégrée)
  const csgNonDed = lignesCotisations.find(l => l.code === 'CSG_NON_DEDUCTIBLE');
  const netImposable = Math.round((salaireBrut - totalDeductibleIR + (csgNonDed?.montantSalarial || 0)) * 100) / 100;

  // Net à payer = net avant impôt + remboursements
  const netAPayer = Math.round((netAvantImpot + transportEmployeur + ticketsRestaurant - avantagesNature) * 100) / 100;

  const coutTotalEmployeur = Math.round((salaireBrut + totalChargesPatronales + mutuelleEmployeur + prevoyanceEmployeur + transportEmployeur + ticketsRestaurant) * 100) / 100;

  return {
    salaireBrut,
    salaireBase,
    primes,
    heuresSupp,
    avantagesNature,
    lignesCotisations,
    totalChargesSalariales,
    totalChargesPatronales,
    coutTotalEmployeur,
    netAvantImpot,
    netImposable,
    netAPayer,
    transportEmployeur,
    ticketsRestaurant,
    tauxChargesSalariales: Math.round((totalChargesSalariales / salaireBrut) * 10000) / 100,
    tauxChargesPatronales: Math.round((totalChargesPatronales / salaireBrut) * 10000) / 100,
  };
}

/**
 * Valeurs par défaut pour un nouveau calcul
 */
export function getDefaultDonnees(salaireBase: number = 2500, statut: StatutEmploye = 'non_cadre'): DonneesEmploye {
  return {
    salaireBase,
    primes: 0,
    heuresSupp: 0,
    avantagesNature: 0,
    statut,
    typeContrat: 'cdi',
    tempsPartiel: 1,
    tauxAT: 0.0113,            // Taux moyen AT/MP
    mutuelleEmployeur: 30,     // ~30€ part employeur
    mutuelleSalarie: 20,       // ~20€ part salarié
    transportEmployeur: 0,
    ticketsRestaurant: 0,
    prevoyanceEmployeur: 0,
    prevoyanceSalarie: 0,
  };
}

/**
 * Formater un montant en euros
 */
export function formatEUR(montant: number): string {
  return montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

/**
 * Formater un pourcentage
 */
export function formatPct(taux: number): string {
  return (taux * 100).toFixed(2) + ' %';
}
