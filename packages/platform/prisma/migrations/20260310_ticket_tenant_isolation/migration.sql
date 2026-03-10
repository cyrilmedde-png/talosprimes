-- Isolation multi-tenant des tickets
-- Ajouter la colonne tenant_id à la table tickets

-- 1. Ajouter la colonne (nullable d'abord pour les tickets existants)
ALTER TABLE "tickets" ADD COLUMN "tenant_id" UUID;

-- 2. Assigner les tickets existants au tenant admin TalosPrimes
UPDATE "tickets" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;

-- 3. Rendre la colonne NOT NULL
ALTER TABLE "tickets" ALTER COLUMN "tenant_id" SET NOT NULL;

-- 4. Ajouter la foreign key
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Ajouter l'index pour les performances
CREATE INDEX "tickets_tenant_id_idx" ON "tickets"("tenant_id");
