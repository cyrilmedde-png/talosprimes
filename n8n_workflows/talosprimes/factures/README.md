# Workflows Facturation (n8n)

Workflows n8n pour le module facturation TalosPrimes. Création, liste, paiement et relance des factures.

## Créer le workflow « Liste des factures » (invoices-list)

Si la page Factures affiche « Workflow non trouvé pour invoices_list » :

1. **Importer le workflow dans n8n**
   - Dans n8n : Menu (⋮) → **Import from File** (ou Workflows → Import).
   - Choisir le fichier `invoices-list.json` de ce dossier.
   - Vérifier que le nœud **01. Webhook** a bien le path **`invoices_list`** (avec underscore).
   - Configurer la credential **Postgres** sur les nœuds « 03. Liste factures » et « 04. Total » (même BDD que la plateforme).
   - **Activer** le workflow (toggle ON) et sauvegarder.

2. **Créer le lien en base (plateforme)**
   - À la racine du monorepo :  
     `cd packages/platform && pnpm workflow:ensure-invoices-list`  
   - Ou pour configurer tous les workflows factures :  
     `pnpm workflow:setup-invoices`

3. **Vérifier**
   - `USE_N8N_VIEWS=true` dans l’env de la plateforme si vous voulez que la liste passe par n8n.
   - Recharger la page Factures : la liste doit s’afficher (via n8n ou en fallback BDD).

## Fichiers

| Fichier | Webhook path | Rôle |
|---------|--------------|------|
| `invoice-created.json` | `invoice-created` | Après création d'une facture : appel API, récupération BDD, email client, réponse |
| `invoice-paid.json` | `invoice-paid` | Paiement enregistré (accusé de réception) |
| `invoice-overdue.json` | `invoice-overdue` | Liste des factures en retard (statut `envoyee`, échéance dépassée) |
| `invoices-list.json` | `invoices_list` | Liste paginée des factures (pour `USE_N8N_VIEWS`) |

## Prérequis

1. **n8n** installé et accessible (ex. `N8N_API_URL`).
2. **Base de données** : credentials Postgres (même BDD que la plateforme Prisma).
3. **API plateforme** : pour `invoice-created`, le nœud « 03. API Creer facture » doit envoyer le header **`X-TalosPrimes-N8N-Secret`** avec la valeur de `N8N_WEBHOOK_SECRET` (env de la plateforme), sinon l’API rejettera l’appel.
4. **Resend** (optionnel pour invoice-created) : credential « Resend API » (Header Auth, `Authorization: Bearer re_xxx`) pour l’envoi d’emails.

## Configuration

1. Importer les 4 JSON dans n8n (Import from File).
2. Sur chaque workflow, configurer :
   - **Postgres** : credential pointant vers la BDD TalosPrimes.
   - **invoice-created** : sur le nœud « 03. API Creer facture », activer **Send Headers** et ajouter `X-TalosPrimes-N8N-Secret` = valeur de `N8N_WEBHOOK_SECRET`.
   - **invoice-created** : sur « 11. Envoyer email », attacher le credential Resend si vous voulez l’envoi d’emails.
3. Activer les workflows (toggle ON).
4. Côté plateforme : `cd packages/platform && pnpm workflow:setup-invoices` pour lier les événements aux workflows.

## Payload envoyé par la plateforme

Tous les webhooks reçoivent un POST JSON de la forme :

```json
{
  "event": "invoice_create",
  "tenantId": "uuid-tenant",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "data": { ... }
}
```

- **invoice-created** : `data` contient `clientFinalId`, `montantHt`, `type`, `tvaTaux`, et optionnellement `dateFacture`, `dateEcheance`, `numeroFacture`, `description`, `lienPdf`.
- **invoice-paid** : `data` contient `invoiceId`, `tenantId`, `numeroFacture`, `referencePayment`, `datePaiement`.
- **invoice-overdue** : `data` contient au minimum `tenantId`.
- **invoices-list** : `data` contient `tenantId`, `page`, `limit`, et optionnellement `statut`, `clientFinalId`, `dateFrom`, `dateTo`.

Les parsers (nœuds « 02. Parser ») lisent `body` ou `body.data` selon la sortie du nœud Webhook n8n.

## Schéma BDD (référence)

- **invoices** : `id`, `tenant_id`, `client_final_id`, `numero_facture`, `date_facture`, `date_echeance`, `montant_ht`, `montant_ttc`, `tva_taux`, `statut`, `lien_pdf`, etc.
- **client_finals** : `id`, `tenant_id`, `raison_sociale`, `nom`, `prenom`, `email`, `telephone`, `adresse`.

Les nœuds Postgres utilisent **Execute Query** avec une expression qui construit la requête SQL (sans paramètres `$1`/`$2`, pour compatibilité n8n).

## Dépannage

- **404 webhook** : Vérifier que le workflow est activé dans n8n et que le path (ex. `invoice-created`) correspond à celui configuré dans les WorkflowLinks.
- **401 / Non authentifié** sur l’API : Ajouter le header `X-TalosPrimes-N8N-Secret` sur le nœud « 03. API Creer facture » (invoice-created).
- **clientFinalId requis** : Le déclencheur doit envoyer un body avec `data.clientFinalId` (création depuis le front ou POST complet vers le webhook).
- **Validation échouée** (API) : Vérifier que le body envoyé à l’API contient uniquement les champs attendus (tenantId, clientFinalId, type, montantHt, tvaTaux, optionnels sans null inutiles).
