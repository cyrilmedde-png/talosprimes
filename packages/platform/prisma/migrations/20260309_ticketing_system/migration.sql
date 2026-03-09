-- CreateTable: tickets
CREATE TABLE "tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "numero" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "entreprise" TEXT,
    "sujet" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "categorie" TEXT NOT NULL DEFAULT 'general',
    "priorite" TEXT NOT NULL DEFAULT 'normale',
    "statut" TEXT NOT NULL DEFAULT 'ouvert',
    "assigne_a" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ticket_replies
CREATE TABLE "ticket_replies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "auteur" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "interne" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_numero_key" ON "tickets"("numero");
CREATE INDEX "tickets_statut_idx" ON "tickets"("statut");
CREATE INDEX "tickets_priorite_idx" ON "tickets"("priorite");
CREATE INDEX "tickets_categorie_idx" ON "tickets"("categorie");
CREATE INDEX "tickets_email_idx" ON "tickets"("email");
CREATE INDEX "tickets_created_at_idx" ON "tickets"("created_at");
CREATE INDEX "ticket_replies_ticket_id_idx" ON "ticket_replies"("ticket_id");

-- AddForeignKey
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS
ALTER TABLE "tickets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "tickets" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "ticket_replies" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "ticket_replies" FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Sequence function for ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number() RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM tickets;
    RETURN 'TKT-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
