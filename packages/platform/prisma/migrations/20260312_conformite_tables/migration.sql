-- CreateEnum
CREATE TYPE "FecStatut" AS ENUM ('genere', 'valide', 'exporte');

-- CreateEnum
CREATE TYPE "PisteAuditEtape" AS ENUM ('devis', 'bon_commande', 'bon_livraison', 'facture', 'ecriture_comptable');

-- CreateEnum
CREATE TYPE "ArchiveStatut" AS ENUM ('actif', 'verrouille', 'archive');

-- CreateEnum
CREATE TYPE "FacturXProfil" AS ENUM ('minimum', 'basic', 'en16931');

-- CreateEnum
CREATE TYPE "EReportingType" AS ENUM ('b2c_france', 'b2b_international', 'b2c_international');

-- CreateEnum
CREATE TYPE "EReportingStatut" AS ENUM ('brouillon', 'valide', 'transmis', 'rejete');

-- CreateEnum
CREATE TYPE "Das2Statut" AS ENUM ('brouillon', 'valide', 'transmis');

-- CreateTable
CREATE TABLE "periodes_comptables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "exercice_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "date_debut" DATE NOT NULL,
    "date_fin" DATE NOT NULL,
    "cloture" BOOLEAN NOT NULL DEFAULT false,
    "date_cloture" TIMESTAMPTZ(6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "periodes_comptables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichiers_fec" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "exercice_id" UUID NOT NULL,
    "nom_fichier" TEXT NOT NULL,
    "siren" TEXT NOT NULL,
    "date_generation" TIMESTAMPTZ(6) NOT NULL,
    "date_debut" DATE NOT NULL,
    "date_fin" DATE NOT NULL,
    "nb_ecritures" INTEGER NOT NULL,
    "nb_lignes" INTEGER NOT NULL,
    "hash_sha256" TEXT NOT NULL,
    "taille_fichier" INTEGER NOT NULL,
    "statut" "FecStatut" NOT NULL DEFAULT 'genere',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fichiers_fec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "piste_audit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "chaine_fluide" TEXT NOT NULL,
    "etape" "PisteAuditEtape" NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_id" UUID NOT NULL,
    "document_ref" TEXT NOT NULL,
    "date_document" DATE NOT NULL,
    "montant_ht" DECIMAL(15,2) NOT NULL,
    "montant_ttc" DECIMAL(15,2) NOT NULL,
    "hash_document" TEXT NOT NULL,
    "etape_precedente_id" UUID,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "piste_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archives_comptables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "exercice_id" UUID NOT NULL,
    "type_archive" TEXT NOT NULL,
    "nom_fichier" TEXT NOT NULL,
    "hash_sha256" TEXT NOT NULL,
    "taille_fichier" INTEGER NOT NULL,
    "horodatage" TIMESTAMPTZ(6) NOT NULL,
    "date_expiration_min" DATE NOT NULL,
    "date_expiration_max" DATE NOT NULL,
    "statut" "ArchiveStatut" NOT NULL DEFAULT 'actif',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archives_comptables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factures_electroniques" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "profil" "FacturXProfil" NOT NULL DEFAULT 'minimum',
    "format_xml" TEXT NOT NULL DEFAULT 'CII',
    "xml_content" TEXT,
    "pdf_facturx_path" TEXT,
    "hash_pdf" TEXT,
    "plateforme_id" TEXT,
    "plateforme_type" TEXT,
    "statut_transmission" TEXT NOT NULL DEFAULT 'non_transmis',
    "date_transmission" TIMESTAMPTZ(6),
    "identifiant_flux" TEXT,
    "code_retour" TEXT,
    "message_retour" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factures_electroniques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_reportings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "periode_debut" DATE NOT NULL,
    "periode_fin" DATE NOT NULL,
    "type_transaction" "EReportingType" NOT NULL,
    "nb_transactions" INTEGER NOT NULL,
    "montant_ht_total" DECIMAL(15,2) NOT NULL,
    "montant_tva_total" DECIMAL(15,2) NOT NULL,
    "montant_ttc_total" DECIMAL(15,2) NOT NULL,
    "statut" "EReportingStatut" NOT NULL DEFAULT 'brouillon',
    "date_transmission" TIMESTAMPTZ(6),
    "identifiant_flux" TEXT,
    "plateforme_type" TEXT,
    "code_retour" TEXT,
    "message_retour" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "e_reportings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edi_tva" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "declaration_tva_id" UUID NOT NULL,
    "periode_debut" DATE NOT NULL,
    "periode_fin" DATE NOT NULL,
    "regime_tva" TEXT NOT NULL,
    "formulaire_cerfa" TEXT NOT NULL,
    "ligne_ca" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ligne_base_ht_20" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ligne_base_ht_10" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ligne_base_ht_5_5" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ligne_base_ht_2_1" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ligne_tva_collectee_20" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ligne_tva_collectee_10" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ligne_tva_collectee_5_5" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ligne_tva_collectee_2_1" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ligne_tva_deductible_immo" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ligne_tva_deductible_bs" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ligne_credit_tva_anterior" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ligne_tva_due" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ligne_credit_tva" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "format_edi" TEXT NOT NULL DEFAULT 'EDIFACT',
    "statut_transmission" TEXT NOT NULL DEFAULT 'brouillon',
    "date_transmission" TIMESTAMPTZ(6),
    "identifiant_depot" TEXT,
    "code_retour" TEXT,
    "message_retour" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edi_tva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "declarations_das2" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "exercice_id" UUID NOT NULL,
    "annee" INTEGER NOT NULL,
    "seuil_minimum" DECIMAL(15,2) NOT NULL DEFAULT 1200,
    "statut" "Das2Statut" NOT NULL DEFAULT 'brouillon',
    "date_transmission" TIMESTAMPTZ(6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "declarations_das2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "das2_beneficiaires" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "declaration_id" UUID NOT NULL,
    "denomination_rs" TEXT NOT NULL,
    "siret" TEXT,
    "adresse" TEXT,
    "montant_honoraires" DECIMAL(15,2) NOT NULL,
    "montant_tva" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "nature_prestation" TEXT NOT NULL,
    "avantages_nature" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "indemnites" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "das2_beneficiaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications_sirene" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "siret" TEXT NOT NULL,
    "siren" TEXT NOT NULL,
    "denomination_rs" TEXT,
    "adresse_siege" TEXT,
    "code_postal" TEXT,
    "ville" TEXT,
    "code_ape" TEXT,
    "forme_juridique" TEXT,
    "tva_intracom" TEXT,
    "effectif" TEXT,
    "date_creation" TEXT,
    "est_actif" BOOLEAN NOT NULL DEFAULT true,
    "source_api" TEXT NOT NULL,
    "date_verification" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_sirene_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "periodes_comptables_tenant_id_exercice_id_mois_key" ON "periodes_comptables"("tenant_id", "exercice_id", "mois");
CREATE INDEX "periodes_comptables_tenant_id_idx" ON "periodes_comptables"("tenant_id");
CREATE INDEX "periodes_comptables_exercice_id_idx" ON "periodes_comptables"("exercice_id");
CREATE INDEX "periodes_comptables_cloture_idx" ON "periodes_comptables"("cloture");

CREATE INDEX "fichiers_fec_tenant_id_idx" ON "fichiers_fec"("tenant_id");
CREATE INDEX "fichiers_fec_exercice_id_idx" ON "fichiers_fec"("exercice_id");
CREATE INDEX "fichiers_fec_statut_idx" ON "fichiers_fec"("statut");

CREATE INDEX "piste_audit_tenant_id_idx" ON "piste_audit"("tenant_id");
CREATE INDEX "piste_audit_chaine_fluide_idx" ON "piste_audit"("chaine_fluide");
CREATE INDEX "piste_audit_document_type_document_id_idx" ON "piste_audit"("document_type", "document_id");
CREATE INDEX "piste_audit_etape_idx" ON "piste_audit"("etape");

CREATE INDEX "archives_comptables_tenant_id_idx" ON "archives_comptables"("tenant_id");
CREATE INDEX "archives_comptables_exercice_id_idx" ON "archives_comptables"("exercice_id");
CREATE INDEX "archives_comptables_type_archive_idx" ON "archives_comptables"("type_archive");
CREATE INDEX "archives_comptables_statut_idx" ON "archives_comptables"("statut");
CREATE INDEX "archives_comptables_date_expiration_min_idx" ON "archives_comptables"("date_expiration_min");

CREATE UNIQUE INDEX "factures_electroniques_tenant_id_invoice_id_key" ON "factures_electroniques"("tenant_id", "invoice_id");
CREATE INDEX "factures_electroniques_tenant_id_idx" ON "factures_electroniques"("tenant_id");
CREATE INDEX "factures_electroniques_statut_transmission_idx" ON "factures_electroniques"("statut_transmission");
CREATE INDEX "factures_electroniques_plateforme_type_idx" ON "factures_electroniques"("plateforme_type");

CREATE INDEX "e_reportings_tenant_id_idx" ON "e_reportings"("tenant_id");
CREATE INDEX "e_reportings_periode_fin_idx" ON "e_reportings"("periode_fin");
CREATE INDEX "e_reportings_statut_idx" ON "e_reportings"("statut");
CREATE INDEX "e_reportings_type_transaction_idx" ON "e_reportings"("type_transaction");

CREATE INDEX "edi_tva_tenant_id_idx" ON "edi_tva"("tenant_id");
CREATE INDEX "edi_tva_periode_fin_idx" ON "edi_tva"("periode_fin");
CREATE INDEX "edi_tva_statut_transmission_idx" ON "edi_tva"("statut_transmission");

CREATE UNIQUE INDEX "declarations_das2_tenant_id_annee_key" ON "declarations_das2"("tenant_id", "annee");
CREATE INDEX "declarations_das2_tenant_id_idx" ON "declarations_das2"("tenant_id");
CREATE INDEX "declarations_das2_statut_idx" ON "declarations_das2"("statut");

CREATE INDEX "das2_beneficiaires_declaration_id_idx" ON "das2_beneficiaires"("declaration_id");
CREATE INDEX "das2_beneficiaires_montant_honoraires_idx" ON "das2_beneficiaires"("montant_honoraires");

CREATE INDEX "verifications_sirene_tenant_id_idx" ON "verifications_sirene"("tenant_id");
CREATE INDEX "verifications_sirene_siret_idx" ON "verifications_sirene"("siret");
CREATE INDEX "verifications_sirene_siren_idx" ON "verifications_sirene"("siren");

-- AddForeignKey
ALTER TABLE "periodes_comptables" ADD CONSTRAINT "periodes_comptables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fichiers_fec" ADD CONSTRAINT "fichiers_fec_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "piste_audit" ADD CONSTRAINT "piste_audit_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "archives_comptables" ADD CONSTRAINT "archives_comptables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "factures_electroniques" ADD CONSTRAINT "factures_electroniques_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "e_reportings" ADD CONSTRAINT "e_reportings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "edi_tva" ADD CONSTRAINT "edi_tva_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "declarations_das2" ADD CONSTRAINT "declarations_das2_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "das2_beneficiaires" ADD CONSTRAINT "das2_beneficiaires_declaration_id_fkey" FOREIGN KEY ("declaration_id") REFERENCES "declarations_das2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "verifications_sirene" ADD CONSTRAINT "verifications_sirene_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
