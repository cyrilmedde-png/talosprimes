-- ============================================================
-- MIGRATION COMPTABILITÉ COMPLÈTE - TalosPrimes
-- Plan Comptable Général (PCG) français
-- De l'écriture au bilan annuel
-- ============================================================

-- 1. EXERCICES COMPTABLES
CREATE TABLE IF NOT EXISTS exercices_comptables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,            -- ex: "2025", "2025-2026"
  libelle VARCHAR(255) NOT NULL,        -- ex: "Exercice 2025"
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  cloture BOOLEAN DEFAULT false,
  date_cloture TIMESTAMPTZ,
  resultat_net NUMERIC(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- 2. PLAN COMPTABLE (PCG)
CREATE TABLE IF NOT EXISTS plan_comptable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  numero_compte VARCHAR(20) NOT NULL,   -- ex: "411000", "601000"
  libelle VARCHAR(255) NOT NULL,        -- ex: "Clients", "Achats de matières"
  classe INTEGER NOT NULL,              -- 1 à 7
  type VARCHAR(20) NOT NULL DEFAULT 'detail', -- 'racine', 'intermediaire', 'detail'
  nature VARCHAR(20) NOT NULL,          -- 'actif', 'passif', 'charge', 'produit'
  compte_parent VARCHAR(20),            -- numéro du compte parent
  actif BOOLEAN DEFAULT true,
  solde_debit NUMERIC(15,2) DEFAULT 0,
  solde_credit NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, numero_compte)
);

-- 3. JOURNAUX COMPTABLES
CREATE TABLE IF NOT EXISTS journaux_comptables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL,            -- 'VE', 'AC', 'BQ', 'OD', 'AN'
  libelle VARCHAR(255) NOT NULL,        -- 'Journal des ventes', etc.
  type VARCHAR(30) NOT NULL,            -- 'ventes', 'achats', 'banque', 'operations_diverses', 'a_nouveaux'
  compte_contrepartie VARCHAR(20),      -- compte par défaut
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- 4. ÉCRITURES COMPTABLES (en-tête)
CREATE TABLE IF NOT EXISTS ecritures_comptables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exercice_id UUID NOT NULL REFERENCES exercices_comptables(id),
  journal_code VARCHAR(10) NOT NULL,
  numero_piece VARCHAR(30) NOT NULL,    -- numéro séquentiel unique
  date_ecriture DATE NOT NULL,
  date_echeance DATE,
  libelle VARCHAR(500) NOT NULL,
  reference VARCHAR(255),               -- ref document (n° facture, etc.)
  type_piece VARCHAR(30),               -- 'facture', 'avoir', 'paiement', 'od', 'a_nouveau'
  entite_type VARCHAR(30),              -- 'invoice', 'avoir', 'bon_commande', etc.
  entite_id UUID,                       -- ID du document source
  montant_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  statut VARCHAR(20) DEFAULT 'brouillon', -- 'brouillon', 'validee', 'lettree'
  validee_par VARCHAR(255),
  validee_le TIMESTAMPTZ,
  source VARCHAR(20) DEFAULT 'manuelle', -- 'manuelle', 'automatique', 'ia'
  ia_classification JSONB,              -- résultat classification IA
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, numero_piece)
);

-- 5. LIGNES D'ÉCRITURES (débit/crédit)
CREATE TABLE IF NOT EXISTS lignes_ecritures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecriture_id UUID NOT NULL REFERENCES ecritures_comptables(id) ON DELETE CASCADE,
  numero_compte VARCHAR(20) NOT NULL,
  libelle VARCHAR(500),
  debit NUMERIC(15,2) DEFAULT 0,
  credit NUMERIC(15,2) DEFAULT 0,
  lettrage VARCHAR(10),                 -- code lettrage ex: "AA", "AB"
  date_lettrage DATE,
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. LETTRAGE (rapprochement comptes tiers)
CREATE TABLE IF NOT EXISTS lettrages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code_lettrage VARCHAR(10) NOT NULL,
  numero_compte VARCHAR(20) NOT NULL,
  date_lettrage DATE NOT NULL,
  montant NUMERIC(15,2) NOT NULL,
  ecart NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code_lettrage, numero_compte)
);

-- 7. RAPPROCHEMENT BANCAIRE
CREATE TABLE IF NOT EXISTS rapprochements_bancaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exercice_id UUID REFERENCES exercices_comptables(id),
  compte_banque VARCHAR(20) NOT NULL,   -- ex: "512000"
  date_rapprochement DATE NOT NULL,
  solde_releve NUMERIC(15,2) NOT NULL,  -- solde du relevé bancaire
  solde_comptable NUMERIC(15,2) NOT NULL,
  ecart NUMERIC(15,2) DEFAULT 0,
  statut VARCHAR(20) DEFAULT 'en_cours', -- 'en_cours', 'valide', 'ecart'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lignes_rapprochement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rapprochement_id UUID NOT NULL REFERENCES rapprochements_bancaires(id) ON DELETE CASCADE,
  ligne_ecriture_id UUID REFERENCES lignes_ecritures(id),
  date_operation DATE NOT NULL,
  libelle VARCHAR(500),
  montant NUMERIC(15,2) NOT NULL,
  sens VARCHAR(10) NOT NULL,            -- 'debit', 'credit'
  rapproche BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. DÉCLARATIONS TVA
CREATE TABLE IF NOT EXISTS declarations_tva (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exercice_id UUID REFERENCES exercices_comptables(id),
  periode VARCHAR(20) NOT NULL,         -- '2025-01', '2025-T1', '2025'
  type_declaration VARCHAR(20) NOT NULL, -- 'mensuelle', 'trimestrielle', 'annuelle'
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  tva_collectee NUMERIC(15,2) DEFAULT 0,
  tva_deductible NUMERIC(15,2) DEFAULT 0,
  tva_due NUMERIC(15,2) DEFAULT 0,     -- collectée - déductible
  credit_tva NUMERIC(15,2) DEFAULT 0,  -- si déductible > collectée
  base_ht_ventes NUMERIC(15,2) DEFAULT 0,
  base_ht_achats NUMERIC(15,2) DEFAULT 0,
  statut VARCHAR(20) DEFAULT 'brouillon', -- 'brouillon', 'validee', 'declaree', 'payee'
  date_declaration DATE,
  date_paiement DATE,
  reference_declaration VARCHAR(100),
  notes TEXT,
  detail JSONB,                         -- détail par taux de TVA
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, periode, type_declaration)
);

-- 9. IMMOBILISATIONS
CREATE TABLE IF NOT EXISTS immobilisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(30) NOT NULL,
  designation VARCHAR(500) NOT NULL,
  compte_immobilisation VARCHAR(20) NOT NULL,  -- ex: "2154" matériel
  compte_amortissement VARCHAR(20) NOT NULL,   -- ex: "28154"
  compte_dotation VARCHAR(20) NOT NULL,        -- ex: "68112"
  date_acquisition DATE NOT NULL,
  date_mise_en_service DATE NOT NULL,
  valeur_acquisition NUMERIC(15,2) NOT NULL,
  valeur_residuelle NUMERIC(15,2) DEFAULT 0,
  duree_amortissement INTEGER NOT NULL,        -- en mois
  mode_amortissement VARCHAR(20) DEFAULT 'lineaire', -- 'lineaire', 'degressif'
  taux_amortissement NUMERIC(8,4),
  cumul_amortissement NUMERIC(15,2) DEFAULT 0,
  valeur_nette_comptable NUMERIC(15,2),
  date_cession DATE,
  prix_cession NUMERIC(15,2),
  statut VARCHAR(20) DEFAULT 'actif',          -- 'actif', 'cede', 'rebute'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- 10. DOTATIONS AUX AMORTISSEMENTS
CREATE TABLE IF NOT EXISTS amortissements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  immobilisation_id UUID NOT NULL REFERENCES immobilisations(id) ON DELETE CASCADE,
  exercice_id UUID REFERENCES exercices_comptables(id),
  annee INTEGER NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  base_amortissable NUMERIC(15,2) NOT NULL,
  dotation NUMERIC(15,2) NOT NULL,
  cumul NUMERIC(15,2) NOT NULL,
  vnc NUMERIC(15,2) NOT NULL,           -- valeur nette comptable
  ecriture_id UUID REFERENCES ecritures_comptables(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. BALANCE DES COMPTES (table cache pour performance)
CREATE TABLE IF NOT EXISTS balance_comptes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exercice_id UUID NOT NULL REFERENCES exercices_comptables(id),
  numero_compte VARCHAR(20) NOT NULL,
  libelle_compte VARCHAR(255),
  total_debit NUMERIC(15,2) DEFAULT 0,
  total_credit NUMERIC(15,2) DEFAULT 0,
  solde_debit NUMERIC(15,2) DEFAULT 0,
  solde_credit NUMERIC(15,2) DEFAULT 0,
  date_calcul TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, exercice_id, numero_compte)
);

-- 12. HISTORIQUE ACTIONS IA COMPTABLE
CREATE TABLE IF NOT EXISTS compta_ia_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,          -- 'classification', 'anomalie', 'suggestion', 'rapport'
  prompt TEXT,
  reponse TEXT,
  entite_type VARCHAR(30),
  entite_id UUID,
  tokens_utilises INTEGER,
  modele VARCHAR(50),
  duree_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEX POUR PERFORMANCES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_plan_comptable_tenant ON plan_comptable(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plan_comptable_classe ON plan_comptable(tenant_id, classe);
CREATE INDEX IF NOT EXISTS idx_plan_comptable_numero ON plan_comptable(tenant_id, numero_compte);

CREATE INDEX IF NOT EXISTS idx_ecritures_tenant ON ecritures_comptables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ecritures_exercice ON ecritures_comptables(exercice_id);
CREATE INDEX IF NOT EXISTS idx_ecritures_journal ON ecritures_comptables(tenant_id, journal_code);
CREATE INDEX IF NOT EXISTS idx_ecritures_date ON ecritures_comptables(tenant_id, date_ecriture);
CREATE INDEX IF NOT EXISTS idx_ecritures_entite ON ecritures_comptables(entite_type, entite_id);

CREATE INDEX IF NOT EXISTS idx_lignes_ecriture ON lignes_ecritures(ecriture_id);
CREATE INDEX IF NOT EXISTS idx_lignes_compte ON lignes_ecritures(numero_compte);
CREATE INDEX IF NOT EXISTS idx_lignes_lettrage ON lignes_ecritures(lettrage);

CREATE INDEX IF NOT EXISTS idx_declarations_tva_tenant ON declarations_tva(tenant_id);
CREATE INDEX IF NOT EXISTS idx_immobilisations_tenant ON immobilisations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_balance_tenant ON balance_comptes(tenant_id, exercice_id);

-- ============================================================
-- PLAN COMPTABLE GÉNÉRAL FRANÇAIS (PCG) - COMPTES DE BASE
-- Insérer pour chaque tenant via workflow d'initialisation
-- ============================================================
-- Ce INSERT est un template. Le workflow compta-init l'exécutera
-- en remplaçant {TENANT_ID} par le vrai tenant_id.

-- CLASSE 1 - COMPTES DE CAPITAUX
-- 101000 Capital social
-- 106000 Réserves
-- 108000 Compte de l'exploitant
-- 110000 Report à nouveau (créditeur)
-- 119000 Report à nouveau (débiteur)
-- 120000 Résultat de l'exercice (bénéfice)
-- 129000 Résultat de l'exercice (perte)
-- 164000 Emprunts
-- 168000 Autres emprunts

-- CLASSE 2 - IMMOBILISATIONS
-- 205000 Concessions, brevets, licences
-- 211000 Terrains
-- 213000 Constructions
-- 215400 Matériel industriel
-- 218200 Matériel de transport
-- 218300 Matériel de bureau / informatique
-- 280500 Amort. concessions
-- 281300 Amort. constructions
-- 281540 Amort. matériel industriel
-- 281820 Amort. matériel transport
-- 281830 Amort. matériel bureau/informatique

-- CLASSE 3 - STOCKS
-- 310000 Matières premières
-- 350000 Stocks de produits
-- 370000 Stocks de marchandises

-- CLASSE 4 - COMPTES DE TIERS
-- 401000 Fournisseurs
-- 404000 Fournisseurs d'immobilisations
-- 411000 Clients
-- 416000 Clients douteux
-- 421000 Personnel - rémunérations dues
-- 431000 Sécurité sociale
-- 437000 Autres organismes sociaux
-- 441000 État - subventions à recevoir
-- 445100 TVA à décaisser
-- 445620 TVA déductible sur immobilisations
-- 445660 TVA déductible sur ABS
-- 445710 TVA collectée
-- 445800 TVA à régulariser
-- 467000 Autres comptes débiteurs/créditeurs
-- 471000 Comptes d'attente

-- CLASSE 5 - COMPTES FINANCIERS
-- 512000 Banque
-- 514000 Chèques postaux
-- 530000 Caisse
-- 580000 Virements internes

-- CLASSE 6 - CHARGES
-- 601000 Achats matières premières
-- 602000 Achats autres approvisionnements
-- 604000 Achats études et prestations
-- 606000 Achats non stockés
-- 607000 Achats de marchandises
-- 611000 Sous-traitance
-- 613000 Locations
-- 615000 Entretien et réparations
-- 616000 Assurances
-- 622000 Rémunérations intermédiaires
-- 623000 Publicité
-- 625000 Déplacements
-- 626000 Frais postaux / télécommunications
-- 627000 Services bancaires
-- 631000 Impôts et taxes
-- 635000 Autres impôts
-- 641000 Rémunérations du personnel
-- 645000 Charges sociales
-- 651000 Redevances
-- 661000 Charges d'intérêts
-- 671000 Charges exceptionnelles
-- 681120 Dotations amort. immobilisations corp.
-- 681740 Dotations provisions charges

-- CLASSE 7 - PRODUITS
-- 701000 Ventes de produits finis
-- 706000 Prestations de services
-- 707000 Ventes de marchandises
-- 708000 Produits activités annexes
-- 741000 Subventions d'exploitation
-- 751000 Redevances perçues
-- 761000 Produits financiers
-- 771000 Produits exceptionnels
-- 781000 Reprises amortissements/provisions
