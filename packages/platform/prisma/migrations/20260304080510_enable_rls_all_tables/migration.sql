-- ============================================================================
-- Migration: Activer Row Level Security (RLS) sur toutes les tables
-- ============================================================================
-- Objectif : Bloquer l'accès via la clé anon Supabase tout en laissant
-- le backend Fastify (rôle postgres) fonctionner normalement.
--
-- Stratégie :
--   1. ALTER TABLE ... ENABLE ROW LEVEL SECURITY
--   2. CREATE POLICY allow_postgres → accès total pour le rôle "postgres"
--   3. Le rôle "anon" et "authenticated" Supabase n'ont plus accès
--
-- Impact : ZERO sur le backend (Prisma utilise le rôle postgres)
-- Rollback : ALTER TABLE ... DISABLE ROW LEVEL SECURITY
-- ============================================================================

-- Tenants & Auth
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "tenants" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "users" FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Clients & Espaces
ALTER TABLE "client_finals" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "client_finals" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "client_spaces" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "client_spaces" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "client_modules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "client_modules" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "client_subscriptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "client_subscriptions" FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Plans & Abonnements
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "plans" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "plan_modules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "plan_modules" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "module_metiers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "module_metiers" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "subscriptions" FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Facturation
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "invoices" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "invoice_lines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "invoice_lines" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "devis" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "devis" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "devis_lines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "devis_lines" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "avoirs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "avoirs" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "avoir_lines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "avoir_lines" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "proformas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "proformas" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "proforma_lines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "proforma_lines" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "bons_commande" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "bons_commande" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "bon_commande_lines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "bon_commande_lines" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "article_codes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "article_codes" FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Comptabilité
ALTER TABLE "exercices_comptables" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "exercices_comptables" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "plan_comptable" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "plan_comptable" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "journaux_comptables" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "journaux_comptables" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "ecritures_comptables" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "ecritures_comptables" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "lignes_ecritures" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "lignes_ecritures" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "lettrages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "lettrages" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "rapprochements_bancaires" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "rapprochements_bancaires" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "lignes_rapprochement" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "lignes_rapprochement" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "declarations_tva" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "declarations_tva" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "immobilisations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "immobilisations" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "amortissements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "amortissements" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "balance_comptes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "balance_comptes" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "compta_ia_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "compta_ia_logs" FOR ALL TO postgres USING (true) WITH CHECK (true);

-- CRM & Leads
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "leads" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "notifications" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "contact_messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "contact_messages" FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Agent IA & Téléphonie
ALTER TABLE "tenant_agent_configs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "tenant_agent_configs" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "twilio_configs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "twilio_configs" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "call_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "call_logs" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "sms_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "sms_logs" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "questionnaires" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "questionnaires" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "agent_knowledge_entries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "agent_knowledge_entries" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "agent_calendar_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "agent_calendar_events" FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Équipe
ALTER TABLE "equipe_members" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "equipe_members" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "equipe_absences" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "equipe_absences" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "equipe_pointages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "equipe_pointages" FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Projets
ALTER TABLE "projets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "projets" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "projet_taches" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "projet_taches" FOR ALL TO postgres USING (true) WITH CHECK (true);

-- BTP
ALTER TABLE "btp_chantiers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "btp_chantiers" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "btp_situations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "btp_situations" FOR ALL TO postgres USING (true) WITH CHECK (true);

-- RH
ALTER TABLE "rh_contrats" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "rh_contrats" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "rh_bulletins_paie" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "rh_bulletins_paie" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "rh_conges" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "rh_conges" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "rh_documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "rh_documents" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "rh_entretiens" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "rh_entretiens" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "rh_formations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "rh_formations" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "rh_inscriptions_formations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "rh_inscriptions_formations" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "rh_evaluations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "rh_evaluations" FOR ALL TO postgres USING (true) WITH CHECK (true);

-- RGPD
ALTER TABLE "consent_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "consent_logs" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "rgpd_requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "rgpd_requests" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "data_processors" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "data_processors" FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Logs & Workflows
ALTER TABLE "event_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "event_logs" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "workflow_links" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "workflow_links" FOR ALL TO postgres USING (true) WITH CHECK (true);

-- CMS & Landing
ALTER TABLE "testimonials" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "testimonials" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "landing_content" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "landing_content" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "cms_pages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_postgres" ON "cms_pages" FOR ALL TO postgres USING (true) WITH CHECK (true);
