-- Migration: Gestion de Stock Multi-Sites
-- Date: 2026-03-10

-- ===========================================
-- ENUMS
-- ===========================================

DO $$ BEGIN
  CREATE TYPE "StockTransferStatut" AS ENUM ('en_cours', 'confirme', 'recu', 'annule');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InventoryStatut" AS ENUM ('en_cours', 'finalisee', 'validee');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- TABLE: stock_sites (Entrepôts / Sites)
-- ===========================================

CREATE TABLE IF NOT EXISTS "stock_sites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "designation" VARCHAR(255) NOT NULL,
  "adresse" TEXT,
  "telephone" VARCHAR(50),
  "email" VARCHAR(255),
  "responsable" VARCHAR(255),
  "statut" VARCHAR(20) NOT NULL DEFAULT 'actif',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "stock_sites_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_sites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "stock_sites_tenant_id_code_key" ON "stock_sites"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "stock_sites_tenant_id_idx" ON "stock_sites"("tenant_id");
CREATE INDEX IF NOT EXISTS "stock_sites_statut_idx" ON "stock_sites"("statut");

-- ===========================================
-- TABLE: stock_levels (Niveaux de stock)
-- ===========================================

CREATE TABLE IF NOT EXISTS "stock_levels" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "article_id" UUID NOT NULL,
  "site_id" UUID NOT NULL,
  "quantite" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "quantite_reservee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "seuil_minimum" DECIMAL(12,2),
  "seuil_maximum" DECIMAL(12,2),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_levels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_levels_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_levels_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "stock_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "stock_levels_tenant_article_site_key" ON "stock_levels"("tenant_id", "article_id", "site_id");
CREATE INDEX IF NOT EXISTS "stock_levels_tenant_id_idx" ON "stock_levels"("tenant_id");
CREATE INDEX IF NOT EXISTS "stock_levels_site_id_idx" ON "stock_levels"("site_id");
CREATE INDEX IF NOT EXISTS "stock_levels_article_id_idx" ON "stock_levels"("article_id");

-- ===========================================
-- TABLE: stock_movements (Journal mouvements)
-- ===========================================

CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "article_id" UUID NOT NULL,
  "site_id" UUID NOT NULL,
  "type_operation" VARCHAR(30) NOT NULL,
  "quantite" DECIMAL(12,2) NOT NULL,
  "quantite_avant" DECIMAL(12,2) NOT NULL,
  "quantite_apres" DECIMAL(12,2) NOT NULL,
  "reference_type" VARCHAR(50),
  "reference_id" UUID,
  "motif" TEXT,
  "utilisateur_nom" VARCHAR(255),
  "date_operation" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_movements_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_movements_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "stock_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "stock_movements_tenant_id_idx" ON "stock_movements"("tenant_id");
CREATE INDEX IF NOT EXISTS "stock_movements_article_id_idx" ON "stock_movements"("article_id");
CREATE INDEX IF NOT EXISTS "stock_movements_site_id_idx" ON "stock_movements"("site_id");
CREATE INDEX IF NOT EXISTS "stock_movements_type_operation_idx" ON "stock_movements"("type_operation");
CREATE INDEX IF NOT EXISTS "stock_movements_date_operation_idx" ON "stock_movements"("date_operation");

-- ===========================================
-- TABLE: stock_transfers (Transferts inter-sites)
-- ===========================================

CREATE TABLE IF NOT EXISTS "stock_transfers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "numero" VARCHAR(50) NOT NULL,
  "site_from_id" UUID NOT NULL,
  "site_to_id" UUID NOT NULL,
  "statut" "StockTransferStatut" NOT NULL DEFAULT 'en_cours',
  "date_creation" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "date_envoi" TIMESTAMPTZ(6),
  "date_reception" TIMESTAMPTZ(6),
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_transfers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_transfers_site_from_fkey" FOREIGN KEY ("site_from_id") REFERENCES "stock_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_transfers_site_to_fkey" FOREIGN KEY ("site_to_id") REFERENCES "stock_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "stock_transfers_tenant_numero_key" ON "stock_transfers"("tenant_id", "numero");
CREATE INDEX IF NOT EXISTS "stock_transfers_tenant_id_idx" ON "stock_transfers"("tenant_id");
CREATE INDEX IF NOT EXISTS "stock_transfers_statut_idx" ON "stock_transfers"("statut");

-- ===========================================
-- TABLE: stock_transfer_lines (Lignes transfert)
-- ===========================================

CREATE TABLE IF NOT EXISTS "stock_transfer_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transfer_id" UUID NOT NULL,
  "article_id" UUID NOT NULL,
  "quantite_envoyee" DECIMAL(12,2) NOT NULL,
  "quantite_recue" DECIMAL(12,2),

  CONSTRAINT "stock_transfer_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_transfer_lines_transfer_fkey" FOREIGN KEY ("transfer_id") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_transfer_lines_article_fkey" FOREIGN KEY ("article_id") REFERENCES "article_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "stock_transfer_lines_transfer_id_idx" ON "stock_transfer_lines"("transfer_id");
CREATE INDEX IF NOT EXISTS "stock_transfer_lines_article_id_idx" ON "stock_transfer_lines"("article_id");

-- ===========================================
-- TABLE: inventories (Sessions d'inventaire)
-- ===========================================

CREATE TABLE IF NOT EXISTS "inventories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "numero" VARCHAR(50) NOT NULL,
  "site_id" UUID NOT NULL,
  "date_debut" TIMESTAMPTZ(6) NOT NULL,
  "date_fin" TIMESTAMPTZ(6),
  "statut" "InventoryStatut" NOT NULL DEFAULT 'en_cours',
  "responsable" VARCHAR(255),
  "ecart_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "inventories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "inventories_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "stock_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventories_tenant_numero_key" ON "inventories"("tenant_id", "numero");
CREATE INDEX IF NOT EXISTS "inventories_tenant_id_idx" ON "inventories"("tenant_id");
CREATE INDEX IF NOT EXISTS "inventories_site_id_idx" ON "inventories"("site_id");
CREATE INDEX IF NOT EXISTS "inventories_statut_idx" ON "inventories"("statut");

-- ===========================================
-- TABLE: inventory_items (Lignes inventaire)
-- ===========================================

CREATE TABLE IF NOT EXISTS "inventory_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "inventory_id" UUID NOT NULL,
  "article_id" UUID NOT NULL,
  "quantite_systeme" DECIMAL(12,2) NOT NULL,
  "quantite_comptee" DECIMAL(12,2),
  "ecart" DECIMAL(12,2),
  "notes" TEXT,

  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_items_inventory_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventories"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "inventory_items_article_fkey" FOREIGN KEY ("article_id") REFERENCES "article_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "inventory_items_inventory_id_idx" ON "inventory_items"("inventory_id");
CREATE INDEX IF NOT EXISTS "inventory_items_article_id_idx" ON "inventory_items"("article_id");

-- ===========================================
-- TABLE: stock_alerts (Alertes)
-- ===========================================

CREATE TABLE IF NOT EXISTS "stock_alerts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "article_id" UUID NOT NULL,
  "site_id" UUID NOT NULL,
  "type_alerte" VARCHAR(30) NOT NULL,
  "statut" VARCHAR(20) NOT NULL DEFAULT 'active',
  "date_alerte" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "date_resolution" TIMESTAMPTZ(6),
  "notes" TEXT,

  CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_alerts_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_alerts_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "stock_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "stock_alerts_tenant_id_idx" ON "stock_alerts"("tenant_id");
CREATE INDEX IF NOT EXISTS "stock_alerts_article_id_idx" ON "stock_alerts"("article_id");
CREATE INDEX IF NOT EXISTS "stock_alerts_site_id_idx" ON "stock_alerts"("site_id");
CREATE INDEX IF NOT EXISTS "stock_alerts_statut_idx" ON "stock_alerts"("statut");

-- ===========================================
-- RLS (Row Level Security)
-- ===========================================

ALTER TABLE "stock_sites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_levels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_transfers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_transfer_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_alerts" ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- Module Registration
-- ===========================================

INSERT INTO "module_metiers" ("id", "code", "nom_affiche", "description", "metier_cible", "prix_par_mois", "categorie", "icone", "ordre_affichage", "actif", "created_at", "updated_at")
VALUES (
  gen_random_uuid(),
  'gestion_stock',
  'Gestion de Stock',
  'Gestion complète des stocks multi-sites avec transferts, inventaires et alertes',
  'commerce,logistique,distribution,btp',
  49.99,
  'logistics',
  'cube',
  10,
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;
