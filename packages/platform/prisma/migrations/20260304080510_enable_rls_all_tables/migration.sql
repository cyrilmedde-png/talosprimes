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

-- Utilise DO $$ pour ignorer les tables qui n'existent pas encore
-- (la migration 0_init est un baseline sans SQL)

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'tenants', 'users',
      'client_finals', 'client_spaces', 'client_subscriptions',
      'plans', 'plan_modules', 'module_metiers', 'subscriptions',
      'invoices', 'invoice_lines', 'devis', 'devis_lines',
      'avoirs', 'avoir_lines', 'proformas', 'proforma_lines',
      'bons_commande', 'bon_commande_lines', 'article_codes',
      'exercices_comptables', 'plan_comptable', 'journaux_comptables',
      'ecritures_comptables', 'lignes_ecritures', 'lettrages',
      'rapprochements_bancaires', 'lignes_rapprochement',
      'declarations_tva', 'immobilisations', 'amortissements',
      'balance_comptes', 'compta_ia_logs',
      'leads', 'notifications', 'contact_messages',
      'tenant_agent_configs', 'twilio_configs', 'call_logs', 'sms_logs',
      'questionnaires', 'agent_knowledge_entries', 'agent_calendar_events',
      'equipe_members', 'equipe_absences', 'equipe_pointages',
      'projets', 'projet_taches',
      'btp_chantiers', 'btp_situations',
      'rh_contrats', 'rh_bulletins_paie', 'rh_conges', 'rh_documents',
      'rh_entretiens', 'rh_formations', 'rh_inscriptions_formations', 'rh_evaluations',
      'consent_logs', 'rgpd_requests', 'data_processors',
      'event_logs', 'workflow_links',
      'testimonials', 'landing_content', 'cms_pages'
    ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('CREATE POLICY "allow_postgres" ON %I FOR ALL TO postgres USING (true) WITH CHECK (true)', t);
    END IF;
  END LOOP;
END
$$;
