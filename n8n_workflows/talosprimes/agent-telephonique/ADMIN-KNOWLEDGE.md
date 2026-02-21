# Base de Connaissances Administrateur - Agent Vocal TalosPrimes

## ARCHITECTURE TECHNIQUE

### Stack Technique
- Backend : Fastify + TypeScript + Prisma ORM
- Base de données : PostgreSQL (Supabase)
- Frontend : Next.js (React)
- Automatisation : n8n (100+ workflows)
- IA : OpenAI GPT-4o-mini
- Téléphonie : Twilio (voix + SMS)
- Paiements : Stripe
- Banque : Qonto API
- Email : IMAP/SMTP
- Hébergement : VPS + Docker

### URLs Clés
- Application : https://app.talosprimes.com
- API : https://api.talosprimes.com
- n8n : https://n8n.talosprimes.com
- Site vitrine : https://talosprimes.com

### Numéro Twilio
- Numéro : +33 9 78 46 75 08
- Type : Agent vocal IA entrant

---

## OUTILS AGENT IA (17 OUTILS)

L'agent IA en mode administrateur dispose de 17 outils exécutables :

### Leads & CRM
1. **list_leads** - Lister les prospects (filtre par statut : nouveau, contacte, converti, abandonne)
2. **get_lead** - Détails d'un lead spécifique par ID

### Clients
3. **list_clients** - Lister les clients (filtre par statut : actif, inactif, suspendu)
4. **get_client** - Détails client complet avec abonnement et factures récentes

### Facturation
5. **list_invoices** - Lister les factures (filtre : brouillon, envoyee, payee, en_retard, annulee)
6. **list_subscriptions** - Lister les abonnements (filtre : actif, suspendu, annule, en_retard)

### Entreprise
7. **get_tenant** - Profil de l'entreprise (nom, SIRET, coordonnées)

### Communication
8. **list_notifications** - Notifications (filtre lu/non lu)
9. **list_emails** - Lire les emails IMAP (limite configurable)
10. **get_email** - Contenu complet d'un email par UID
11. **send_email** - Envoyer un email (to, subject, text/HTML)

### Agenda
12. **list_calendar_events** - Événements calendrier (filtre par dates)
13. **create_calendar_event** - Créer un événement (titre, dates, lieu, rappel)
14. **update_calendar_event** - Modifier un événement
15. **delete_calendar_event** - Supprimer un événement

### Banque
16. **qonto_transactions** - Transactions Qonto (crédit/débit, filtre par dates)

### Logs
17. **list_logs** - Logs d'événements n8n (filtre : succes, erreur, en_attente)

---

## COMMANDES VOCALES ADMIN

### Gestion des Leads
- "Combien de leads ce mois-ci ?" → list_leads
- "Détails du lead 42" → get_lead(42)
- "Les nouveaux prospects" → list_leads(statut=nouveau)

### Gestion des Clients
- "Liste des clients actifs" → list_clients(statut=actif)
- "Infos sur le client Dupont" → recherche client par nom

### Facturation
- "Factures en retard" → list_invoices(statut=en_retard)
- "Combien de factures impayées ?" → list_invoices(statut=envoyee)
- "Factures du mois" → list_invoices avec filtre date

### Email
- "Lis mes derniers emails" → list_emails
- "Envoie un email à client@example.com" → send_email

### Agenda
- "Mes rendez-vous de demain" → list_calendar_events
- "Crée un rendez-vous lundi à 14h" → create_calendar_event

### Banque
- "Solde du compte" → qonto_transactions
- "Dernières transactions" → qonto_transactions

### Système
- "Les erreurs récentes" → list_logs(statut=erreur)
- "Statut des workflows" → list_logs

---

## RÔLES UTILISATEUR

1. **super_admin** - Accès total, gestion multi-tenant
2. **admin** - Gestion complète de son entreprise
3. **collaborateur** - Accès aux modules autorisés
4. **lecture_seule** - Consultation uniquement

---

## TABLES PRINCIPALES BASE DE DONNÉES

### Métier
- tenants (entreprises)
- users (utilisateurs)
- client_finals (clients finaux)
- leads (prospects)
- invoices + invoice_lines (factures)
- devis + devis_lines (devis)
- bon_commandes + bon_commande_lines (bons de commande)
- avoirs + avoir_lines (avoirs)
- proformas + proforma_lines (proformas)
- article_codes (catalogue articles)
- subscriptions (abonnements tenant)
- client_subscriptions (abonnements clients)

### Comptabilité
- exercice_comptables (exercices fiscaux)
- plan_comptables (plan comptable)
- journal_comptables (journaux)
- ecriture_comptables (écritures)
- ligne_ecritures (lignes d'écriture)
- declaration_tvas (déclarations TVA)
- immobilisations (immobilisations)
- amortissements (amortissements)

### Communication
- call_logs (journal appels)
- sms_logs (journal SMS)
- twilio_configs (configuration téléphonie)
- notifications (notifications)

### Workflow
- workflow_links (liens n8n)
- event_logs (journal événements)

---

## WORKFLOWS N8N PAR CATÉGORIE

### Facturation (10 workflows)
facture-create, facture-send, facture-paid, facture-overdue, facture-get, facture-update, facture-delete, facture-generate-pdf, facture-list

### Devis (8 workflows)
devis-create, devis-send, devis-accept, devis-refuse, devis-convert-facture, devis-convert-bdc, devis-get, devis-list

### Comptabilité (13 workflows)
compta-init, compta-dashboard, compta-ecriture-create, compta-ecriture-list, compta-grand-livre, compta-balance, compta-bilan, compta-compte-resultat, compta-tva, compta-ia-agent, compta-cloture, compta-lettrage, compta-plan

### Clients (7 workflows)
client-create, client-update, client-delete, client-get, client-list, client-subscription-create, client-convert-lead

### Leads (6 workflows)
lead-create, lead-list, lead-get, lead-update-statut, lead-delete, lead-questionnaire

### Agent Téléphonique (20 workflows)
twilio-inbound-voice, twilio-outbound-call, twilio-test-call, twilio-config-get, twilio-config-update, call-log-*, sms-*, questionnaire-*
