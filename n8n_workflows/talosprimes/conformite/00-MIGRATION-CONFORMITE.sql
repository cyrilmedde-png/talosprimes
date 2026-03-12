-- ============================================================
-- MIGRATION CONFORMITÉ COMPLÈTE - TalosPrimes
-- Tables réglementaires françaises : FEC, Factur-X, E-Reporting,
-- EDI-TVA, DAS2, Sirene, Piste d'Audit, Archives, Périodes
-- ============================================================

-- -------------------------------------------------------
-- 0. ENUMS
-- -------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE fec_statut AS ENUM ('genere', 'valide', 'exporte');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE piste_audit_etape AS ENUM ('devis', 'bon_commande', 'bon_livraison', 'facture', 'ecriture_comptable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE archive_statut AS ENUM ('actif', 'verrouille', 'archive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE facturx_profil AS ENUM ('minimum', 'basic', 'en16931');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE e_reporting_type AS ENUM ('b2c_france', 'b2b_international', 'b2c_international');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE e_reporting_statut AS ENUM ('brouillon', 'valide', 'transmis', 'rejete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE das2_statut AS ENUM ('brouillon', 'valide', 'transmis');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -------------------------------------------------------
-- 1. PERIODES COMPTABLES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS periodes_comptables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exercice_id UUID NOT NULL REFERENCES exercices_comptables(id),
  code VARCHAR(20) NOT NULL,
  mois INTEGER NOT NULL,
  annee INTEGER NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  cloture BOOLEAN DEFAULT false,
  date_cloture TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, exercice_id, mois)
);
CREATE INDEX IF NOT EXISTS idx_periodes_comptables_tenant ON periodes_comptables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_periodes_comptables_exercice ON periodes_comptables(exercice_id);
CREATE INDEX IF NOT EXISTS idx_periodes_comptables_cloture ON periodes_comptables(cloture);

-- -------------------------------------------------------
-- 2. FICHIERS FEC (Fichier des Écritures Comptables)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS fichiers_fec (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exercice_id UUID NOT NULL REFERENCES exercices_comptables(id),
  nom_fichier VARCHAR(255) NOT NULL,
  siren VARCHAR(9) NOT NULL,
  date_generation TIMESTAMPTZ NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  nb_ecritures INTEGER NOT NULL,
  nb_lignes INTEGER NOT NULL,
  hash_sha256 VARCHAR(64) NOT NULL,
  taille_fichier INTEGER NOT NULL,
  statut fec_statut DEFAULT 'genere',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fichiers_fec_tenant ON fichiers_fec(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fichiers_fec_exercice ON fichiers_fec(exercice_id);
CREATE INDEX IF NOT EXISTS idx_fichiers_fec_statut ON fichiers_fec(statut);

-- -------------------------------------------------------
-- 3. PISTE D'AUDIT FIABLE (PAF)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS piste_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  chaine_fluide VARCHAR(50) NOT NULL,
  etape piste_audit_etape NOT NULL,
  document_type VARCHAR(30) NOT NULL,
  document_id UUID NOT NULL,
  document_ref VARCHAR(50) NOT NULL,
  date_document DATE NOT NULL,
  montant_ht NUMERIC(15,2) NOT NULL,
  montant_ttc NUMERIC(15,2) NOT NULL,
  hash_document VARCHAR(64) NOT NULL,
  etape_precedente_id UUID,
  metadata TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_piste_audit_tenant ON piste_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_piste_audit_chaine ON piste_audit(chaine_fluide);
CREATE INDEX IF NOT EXISTS idx_piste_audit_doc ON piste_audit(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_piste_audit_etape ON piste_audit(etape);

-- -------------------------------------------------------
-- 4. ARCHIVES COMPTABLES (conservation 6-10 ans)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS archives_comptables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exercice_id UUID NOT NULL REFERENCES exercices_comptables(id),
  type_archive VARCHAR(30) NOT NULL,
  nom_fichier VARCHAR(255) NOT NULL,
  hash_sha256 VARCHAR(64) NOT NULL,
  taille_fichier INTEGER NOT NULL,
  horodatage TIMESTAMPTZ NOT NULL,
  date_expiration_min DATE NOT NULL,
  date_expiration_max DATE NOT NULL,
  statut archive_statut DEFAULT 'actif',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_archives_comptables_tenant ON archives_comptables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_archives_comptables_exercice ON archives_comptables(exercice_id);
CREATE INDEX IF NOT EXISTS idx_archives_comptables_type ON archives_comptables(type_archive);
CREATE INDEX IF NOT EXISTS idx_archives_comptables_statut ON archives_comptables(statut);
CREATE INDEX IF NOT EXISTS idx_archives_comptables_expiration ON archives_comptables(date_expiration_min);

-- -------------------------------------------------------
-- 5. FACTURES ELECTRONIQUES (Factur-X / Chorus Pro)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS factures_electroniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL,
  profil facturx_profil DEFAULT 'minimum',
  format_xml VARCHAR(10) DEFAULT 'CII',
  xml_content TEXT,
  pdf_facturx_path VARCHAR(500),
  hash_pdf VARCHAR(64),
  plateforme_id VARCHAR(100),
  plateforme_type VARCHAR(20),
  statut_transmission VARCHAR(20) DEFAULT 'non_transmis',
  date_transmission TIMESTAMPTZ,
  identifiant_flux VARCHAR(100),
  code_retour VARCHAR(20),
  message_retour TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, invoice_id)
);
CREATE INDEX IF NOT EXISTS idx_factures_electroniques_tenant ON factures_electroniques(tenant_id);
CREATE INDEX IF NOT EXISTS idx_factures_electroniques_statut ON factures_electroniques(statut_transmission);
CREATE INDEX IF NOT EXISTS idx_factures_electroniques_plateforme ON factures_electroniques(plateforme_type);

-- -------------------------------------------------------
-- 6. E-REPORTING (transactions B2C/international)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS e_reportings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  periode_debut DATE NOT NULL,
  periode_fin DATE NOT NULL,
  type_transaction e_reporting_type NOT NULL,
  nb_transactions INTEGER NOT NULL,
  montant_ht_total NUMERIC(15,2) NOT NULL,
  montant_tva_total NUMERIC(15,2) NOT NULL,
  montant_ttc_total NUMERIC(15,2) NOT NULL,
  statut e_reporting_statut DEFAULT 'brouillon',
  date_transmission TIMESTAMPTZ,
  identifiant_flux VARCHAR(100),
  plateforme_type VARCHAR(20),
  code_retour VARCHAR(20),
  message_retour TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_e_reportings_tenant ON e_reportings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_e_reportings_periode ON e_reportings(periode_fin);
CREATE INDEX IF NOT EXISTS idx_e_reportings_statut ON e_reportings(statut);
CREATE INDEX IF NOT EXISTS idx_e_reportings_type ON e_reportings(type_transaction);

-- -------------------------------------------------------
-- 7. EDI-TVA (télédéclaration CERFA CA3/CA12)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS edi_tva (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  declaration_tva_id UUID NOT NULL,
  periode_debut DATE NOT NULL,
  periode_fin DATE NOT NULL,
  regime_tva VARCHAR(30) NOT NULL,
  formulaire_cerfa VARCHAR(10) NOT NULL,
  -- Lignes CERFA CA3
  ligne_ca NUMERIC(15,2) DEFAULT 0,
  ligne_base_ht_20 NUMERIC(15,2) DEFAULT 0,
  ligne_base_ht_10 NUMERIC(15,2) DEFAULT 0,
  ligne_base_ht_5_5 NUMERIC(15,2) DEFAULT 0,
  ligne_base_ht_2_1 NUMERIC(15,2) DEFAULT 0,
  ligne_tva_collectee_20 NUMERIC(15,2) DEFAULT 0,
  ligne_tva_collectee_10 NUMERIC(15,2) DEFAULT 0,
  ligne_tva_collectee_5_5 NUMERIC(15,2) DEFAULT 0,
  ligne_tva_collectee_2_1 NUMERIC(15,2) DEFAULT 0,
  ligne_tva_deductible_immo NUMERIC(15,2) DEFAULT 0,
  ligne_tva_deductible_bs NUMERIC(15,2) DEFAULT 0,
  ligne_credit_tva_anterior NUMERIC(15,2) DEFAULT 0,
  ligne_tva_due NUMERIC(15,2) DEFAULT 0,
  ligne_credit_tva NUMERIC(15,2) DEFAULT 0,
  -- Transmission
  format_edi VARCHAR(20) DEFAULT 'EDIFACT',
  statut_transmission VARCHAR(20) DEFAULT 'brouillon',
  date_transmission TIMESTAMPTZ,
  identifiant_depot VARCHAR(100),
  code_retour VARCHAR(20),
  message_retour TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_edi_tva_tenant ON edi_tva(tenant_id);
CREATE INDEX IF NOT EXISTS idx_edi_tva_periode ON edi_tva(periode_fin);
CREATE INDEX IF NOT EXISTS idx_edi_tva_statut ON edi_tva(statut_transmission);

-- -------------------------------------------------------
-- 8. DECLARATIONS DAS2 (honoraires > 1200€)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS declarations_das2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exercice_id UUID NOT NULL REFERENCES exercices_comptables(id),
  annee INTEGER NOT NULL,
  seuil_minimum NUMERIC(15,2) DEFAULT 1200,
  statut das2_statut DEFAULT 'brouillon',
  date_transmission TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, annee)
);
CREATE INDEX IF NOT EXISTS idx_declarations_das2_tenant ON declarations_das2(tenant_id);
CREATE INDEX IF NOT EXISTS idx_declarations_das2_statut ON declarations_das2(statut);

-- -------------------------------------------------------
-- 9. BENEFICIAIRES DAS2
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS das2_beneficiaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES declarations_das2(id) ON DELETE CASCADE,
  denomination_rs VARCHAR(255) NOT NULL,
  siret VARCHAR(14),
  adresse TEXT,
  montant_honoraires NUMERIC(15,2) NOT NULL,
  montant_tva NUMERIC(15,2) DEFAULT 0,
  nature_prestation VARCHAR(30) NOT NULL,
  avantages_nature NUMERIC(15,2) DEFAULT 0,
  indemnites NUMERIC(15,2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_das2_beneficiaires_declaration ON das2_beneficiaires(declaration_id);
CREATE INDEX IF NOT EXISTS idx_das2_beneficiaires_montant ON das2_beneficiaires(montant_honoraires);

-- -------------------------------------------------------
-- 10. VERIFICATIONS SIRENE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS verifications_sirene (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  siret VARCHAR(14) NOT NULL,
  siren VARCHAR(9) NOT NULL,
  denomination_rs VARCHAR(255),
  adresse_siege TEXT,
  code_postal VARCHAR(10),
  ville VARCHAR(100),
  code_ape VARCHAR(10),
  forme_juridique VARCHAR(100),
  tva_intracom VARCHAR(20),
  effectif VARCHAR(30),
  date_creation VARCHAR(20),
  est_actif BOOLEAN DEFAULT true,
  source_api VARCHAR(30) NOT NULL,
  date_verification TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_verifications_sirene_tenant ON verifications_sirene(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verifications_sirene_siret ON verifications_sirene(siret);
CREATE INDEX IF NOT EXISTS idx_verifications_sirene_siren ON verifications_sirene(siren);

-- ============================================================
-- FIN MIGRATION CONFORMITÉ
-- ============================================================
