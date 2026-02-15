# Génération PDF des factures

## Vue d’ensemble

- **Plateforme** : génération du PDF via `pdf-lib` et exposition sous `GET /api/invoices/:id/pdf`.
- **n8n** : workflow `invoice-generate-pdf` qui enregistre le lien PDF sur la facture (`lienPdf`).

Aucun stockage de fichier : le PDF est généré à la volée quand on ouvre l’URL.

---

## 1. Côté plateforme

- **GET /api/invoices/:id/pdf**  
  Retourne le PDF de la facture (auth JWT ou header n8n).  
  Utilisé par le front (bouton « Voir ») et pour remplir `lienPdf`.

- **Service** `src/services/pdf.service.ts`  
  Construit un PDF A4 (en-tête, client, tableau HT/TVA/TTC).

- **Dépendance** : `pdf-lib`. Après ajout dans `package.json`, lancer `pnpm install` (ou `npm install`) à la racine du monorepo.

---

## 2. Workflow n8n `invoice-generate-pdf`

**Rôle** : après création (ou à la demande), mettre à jour la facture avec l’URL du PDF.

1. **01. Webhook** – POST `invoice-generate-pdf`
2. **02. Parser** – Extrait `invoiceId`, `tenantId`, `baseUrl` (défaut : `https://api.talosprimes.com`)
3. **03. Valide ?** – Si `invoiceId` manquant → répondre erreur
4. **05. API mettre à jour lienPdf** – PUT `{{baseUrl}}/api/invoices/{{invoiceId}}` avec body `{ lienPdf, tenantId }`
5. **06–07** – Formater la réponse et répondre au webhook

**Corps webhook attendu** (JSON) :

```json
{
  "invoiceId": "uuid-de-la-facture",
  "tenantId": "uuid-du-tenant",
  "baseUrl": "https://api.talosprimes.com"
}
```

`baseUrl` est optionnel (sinon valeur par défaut ci-dessus).

---

## 3. Credential n8n pour l’API

Le nœud **05. API mettre à jour lienPdf** utilise une authentification de type **Header Auth** :

- **Nom** : `TalosPrimes API` (ou le nom configuré dans le workflow)
- **Header** : `X-TalosPrimes-N8N-Secret`
- **Valeur** : la même que la variable d’environnement `N8N_WEBHOOK_SECRET` de la plateforme

Sans ce secret, le PUT sera refusé (401).

---

## 4. Déclencher le workflow

**Option A – Depuis le workflow « invoice-created »**  
Après la création réussie de la facture, ajouter un nœud **HTTP Request** qui appelle le webhook de `invoice-generate-pdf` :

- URL : `https://<ton-n8n>/webhook/invoice-generate-pdf` (ou l’URL fournie par le nœud Webhook)
- Method : POST
- Body (JSON) : `{ "invoiceId": "{{ $json.invoiceId }}", "tenantId": "{{ $json.tenantId }}" }`

**Option B – Depuis la plateforme**  
Le service n8n expose `invoice_generate_pdf` ; tu peux appeler ce workflow après création de facture si tu branches l’appel dans le code (ex. après `invoice.create`).

**Option C – Manuel / cron**  
Déclencher le webhook à la main ou via un cron avec une liste de `invoiceId` + `tenantId`.

---

## 5. Lien dans la base (workflow_links)

Le script `INSERT_WORKFLOW_LINKS.sql` inclut désormais :

- `type_evenement` : `invoice_generate_pdf`
- `workflow_n8n_id` : `invoice_generate_pdf`
- `workflow_n8n_nom` : `invoice-generate-pdf`

Réexécuter le script (ou la partie concernée) après import du workflow dans n8n pour enregistrer le lien pour chaque tenant.
