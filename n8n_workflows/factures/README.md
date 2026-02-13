# Workflows Factures

Workflows n8n pour la facturation. La **plateforme TalosPrimes** crée les factures via l’API puis émet des événements ; ces workflows réagissent aux événements.

## Lien plateforme → n8n

Les WorkflowLinks doivent utiliser les **chemins webhook** (avec tirets) :

| Événement         | workflowN8nId     | Déclencheur plateforme                    |
|-------------------|-------------------|-------------------------------------------|
| `invoice_create`  | `invoice-created` | Après `POST /api/invoices` (création)     |
| `invoice_paid`    | `invoice-paid`    | Après marquage « payée »                  |
| `invoice_overdue` | `invoice-overdue` | Relance factures en retard                |

Configurer les liens :

```bash
cd packages/platform && pnpm workflow:setup-invoices
```

## Format du payload envoyé par la plateforme

Le body POST vers n8n est :

```json
{
  "event": "invoice_create",
  "tenantId": "uuid-tenant",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "data": {
    "invoiceId": "uuid-invoice",
    "clientId": "uuid-client",
    "tenantId": "uuid-tenant",
    "numeroFacture": "INV-2024-000001",
    "montantHt": 100,
    "montantTtc": 120
  },
  "metadata": { "workflowId": "invoice-created", ... }
}
```

Pour `invoice_paid`, `data` contient en plus : `referencePayment`, `datePaiement`.

## Workflows

### 1. invoice-created

- **Rôle** : Après création d’une facture par l’API, récupère la facture et le client en BDD, génère un HTML de facture, marque la facture comme « envoyée », envoie un email au client (Resend).
- **Schéma BDD** : `invoices` (id, numero_facture, date_facture, date_echeance, montant_ht, montant_ttc, tva_taux, client_final_id, tenant_id, statut). `client_finals` (id, nom, prenom, raison_sociale, email, adresse, tenant_id). Pas de `subscription_id`, `montant_tva`, `code_postal`, `ville`, `pays` sur client_finals.

### 2. invoice-paid

- Reçoit `invoiceId`, `tenantId` (dans `data`), met à jour la facture en « payée », envoie un email de confirmation (reçu).

### 3. invoice-overdue

- Reçoit `tenantId` et optionnellement `invoiceId`. Liste les factures en retard (statut `envoyee`, `date_echeance < NOW()`), met le statut à `en_retard`, envoie des emails de relance.

## Prérequis n8n

- Credentials : **Postgres** (Supabase), **Resend** (envoi d’emails), éventuellement **TalosPrimes API** pour les notifications.
- Workflows importés et **activés**, chemins webhook : `invoice-created`, `invoice-paid`, `invoice-overdue`.

## Dépannage

- **Workflow non déclenché** : Vérifier que `pnpm workflow:setup-invoices` a été exécuté et que `workflowN8nId` est bien `invoice-created` (avec tiret), pas `invoice_create`.
- **Erreur SQL** : Vérifier que les colonnes utilisées existent dans le schéma Prisma (`invoices`, `client_finals`) — pas de `subscription_id` ni `montant_tva` sur `invoices`.
- **Client non trouvé** : Vérifier que le `client_final_id` de la facture correspond à un enregistrement dans `client_finals` pour le même `tenant_id`.
