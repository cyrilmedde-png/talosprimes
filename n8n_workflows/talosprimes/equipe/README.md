# Gestion d'Équipe - n8n Workflows

This directory contains 14 n8n workflow JSON files for the Team Management ("Gestion d'Équipe") module.

## Workflows

### Members Management (Gestion des Membres)
1. **equipe-membres-list.json** - List all team members with optional filters (department, active status, search)
2. **equipe-membre-get.json** - Retrieve a single member by ID
3. **equipe-membre-create.json** - Create a new team member
4. **equipe-membre-update.json** - Update member information
5. **equipe-membre-delete.json** - Delete a member

### Absences Management (Gestion des Absences)
6. **equipe-absences-list.json** - List all absences with optional filters (member, type, status, date range)
7. **equipe-absence-create.json** - Create a new absence record
8. **equipe-absence-update.json** - Update absence details (including status for approve/reject)
9. **equipe-absence-delete.json** - Delete an absence record

### Time Tracking (Pointages)
10. **equipe-pointages-list.json** - List all time entries with optional filters (member, date range)
11. **equipe-pointage-create.json** - Create a new time entry
12. **equipe-pointage-update.json** - Update time entry details
13. **equipe-pointage-delete.json** - Delete a time entry

### Dashboard
14. **equipe-dashboard.json** - Get aggregated statistics (total members, active members, absences this month, average hours worked)

## Database Schema

### equipe_members
- id (UUID)
- tenant_id (UUID)
- nom (text)
- prenom (text)
- email (text)
- poste (text)
- departement (text)
- contrat_type (enum: cdi/cdd/interim/stage/alternance/freelance)
- date_embauche (date)
- salaire_base (numeric)
- manager (text)
- actif (boolean)
- user_id (UUID)
- created_at (timestamp)
- updated_at (timestamp)

### equipe_absences
- id (UUID)
- tenant_id (UUID)
- member_id (UUID)
- type (enum: conge_paye/rtt/maladie/sans_solde/maternite/paternite/formation/autre)
- date_debut (date)
- date_fin (date)
- motif (text)
- statut (enum: en_attente/approuvee/refusee)
- created_at (timestamp)
- updated_at (timestamp)

### equipe_pointages
- id (UUID)
- tenant_id (UUID)
- member_id (UUID)
- date (date)
- heure_arrivee (time)
- heure_depart (time)
- heures_pause (numeric)
- heures_travaillees (numeric)
- note (text)
- created_at (timestamp)
- updated_at (timestamp)

## Workflow Architecture

Each workflow follows the same pattern:
1. **Webhook** - Receives POST requests at specific paths
2. **Parser** - Extracts tenantId and data, validates UUIDs, builds SQL query
3. **Postgres** - Executes the query against Supabase database
4. **Format** - Transforms results to camelCase and structures response
5. **Respond** - Returns JSON response to the client

## Authentication & Security

- All workflows validate tenantId using UUID regex
- Database credentials use Supabase Postgres connection
- SQL injection protection via string escaping function
- All responses include success flag and appropriate data structure

## Request Format

All webhooks expect POST requests with this structure:
```json
{
  "tenantId": "uuid-string",
  "data": {
    // operation-specific fields
  }
}
```

## Response Format

### List operations
```json
{
  "success": true,
  "data": {
    "items": [...]
  }
}
```

### Single item operations (get/create/update)
```json
{
  "success": true,
  "data": {
    "item": {...}
  }
}
```

### Delete operations
```json
{
  "success": true,
  "message": "Supprimé"
}
```

### Dashboard
```json
{
  "success": true,
  "data": {
    "totalMembers": 25,
    "activeMembers": 23,
    "absencesThisMonth": 5,
    "avgHoursWorked": 7.8
  }
}
```
