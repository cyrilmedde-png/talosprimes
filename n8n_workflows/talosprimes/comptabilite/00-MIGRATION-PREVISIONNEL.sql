-- ============================================================
-- MIGRATION : Table previsionnels
-- Module Prévisionnel financier — lié optionnellement à un client
-- ============================================================

CREATE TYPE previsionnel_statut AS ENUM ('brouillon', 'valide', 'archive');

CREATE TABLE IF NOT EXISTS previsionnels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_final_id UUID REFERENCES client_finals(id) ON DELETE SET NULL,

  -- Métadonnées
  nom             VARCHAR(255) NOT NULL DEFAULT 'Prévisionnel',
  description     TEXT,
  annee           INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  statut          previsionnel_statut NOT NULL DEFAULT 'brouillon',

  -- Données complètes stockées en JSONB
  -- Structure :
  -- {
  --   lignesCA: [{ id, libelle, montantsMensuels: [12 valeurs] }],
  --   lignesCharges: [{ id, libelle, categorie: fixe|variable|personnel, montantsMensuels: [12] }],
  --   investissements: [{ id, libelle, montantHT, tva, dureeAmortissement, moisAcquisition }],
  --   financements: [{ id, libelle, type: apport|emprunt|subvention|autre, montant, tauxInteret, dureeMois }],
  --   parametres: { tauxTVA, ... }
  -- }
  donnees         JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Résultats calculés (dénormalisés pour le listing rapide)
  ca_annuel             DECIMAL(12,2) DEFAULT 0,
  charges_annuelles     DECIMAL(12,2) DEFAULT 0,
  resultat_exploitation DECIMAL(12,2) DEFAULT 0,
  seuil_rentabilite     DECIMAL(12,2) DEFAULT 0,
  tresorerie_finale     DECIMAL(12,2) DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_previsionnels_tenant ON previsionnels(tenant_id);
CREATE INDEX idx_previsionnels_client ON previsionnels(client_final_id);
CREATE INDEX idx_previsionnels_annee ON previsionnels(annee);
CREATE INDEX idx_previsionnels_statut ON previsionnels(statut);

-- Trigger auto-update updated_at
CREATE OR REPLACE FUNCTION update_previsionnels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_previsionnels_updated_at
  BEFORE UPDATE ON previsionnels
  FOR EACH ROW
  EXECUTE FUNCTION update_previsionnels_updated_at();
