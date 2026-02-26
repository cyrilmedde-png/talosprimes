RH MODULE N8N WORKFLOWS
Created: 2026-02-26

TOTAL WORKFLOWS: 17 files

SECTION 1: ENTRETIENS (5 workflows)
- rh-entretiens-list.json      : List entretiens with filters (member_id, type, date range), JOINs with equipe_members
- rh-entretien-get.json        : Get single entretien by ID with member name
- rh-entretien-create.json     : Create new entretien
- rh-entretien-update.json     : Update entretien dynamic fields
- rh-entretien-delete.json     : Delete entretien

SECTION 2: FORMATIONS (6 workflows)
- rh-formations-list.json      : List formations with filters (statut, date range), includes participant count subquery
- rh-formation-get.json        : Get single formation with participant count
- rh-formation-create.json     : Create new formation
- rh-formation-update.json     : Update formation dynamic fields
- rh-formation-delete.json     : Delete formation
- rh-formation-inscrire.json   : Register member for formation (INSERT into rh_inscriptions_formations)

SECTION 3: EVALUATIONS (5 workflows)
- rh-evaluations-list.json     : List evaluations with filters (member_id, periode, annee), JOINs with equipe_members for names
- rh-evaluation-get.json       : Get single evaluation with member and evaluator names
- rh-evaluation-create.json    : Create new evaluation
- rh-evaluation-update.json    : Update evaluation dynamic fields
- rh-evaluation-delete.json    : Delete evaluation

SECTION 4: DASHBOARD (1 workflow)
- rh-dashboard.json            : Aggregated HR metrics via subqueries:
                                 - effectifTotal: active members count
                                 - contratsActifs: active contracts count
                                 - congesEnAttente: pending leave requests
                                 - formationsEnCours: ongoing trainings
                                 - evaluationsCeMois: evaluations this month
                                 - masseSalariale: total active salary
                                 - tauxAbsenteisme: absence rate percentage

ARCHITECTURE PATTERN (All 17 workflows):
1. Webhook node      : Receives POST request on specified path
2. Parser node       : Extracts tenantId, validates UUID, builds SQL query
3. Postgres node     : Executes query against Supabase Postgres
4. Format node       : Transforms database rows to camelCase response
5. Respond node      : Sends JSON response to webhook

DATABASE CONNECTIONS:
- All Postgres nodes connect to: Supabase Postgres (ID: OGqj65ZoFRileCck)

TABLES USED:
- rh_entretiens
- rh_formations
- rh_inscriptions_formations
- rh_evaluations
- rh_contrats
- rh_conges
- equipe_members

SECURITY:
- All workflows validate tenantId with UUID regex
- SQL injection protection via string escaping (quote doubling)
- tenant_id filtering on all queries for multi-tenancy
