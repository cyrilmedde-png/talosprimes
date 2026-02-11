# Déploiement des workflows n8n sur TalosPrimes

Ce document explique **comment les workflows sont déployés** et reliés à l’application.

---

## Vue d’ensemble

Les workflows ne sont **pas déployés automatiquement**. Le processus est en deux parties :

1. **Côté n8n** : importer les workflows (fichiers JSON) et les activer.
2. **Côté application** : enregistrer les liens **événement → webhook** en base (WorkflowLink).

L’application appelle ensuite n8n via des **webhooks** :  
`POST https://n8n.talosprimes.com/webhook/{path}`  
où `{path}` est le **Path** du nœud Webhook dans n8n (ex. `lead_create`).

---

## 1. Où sont les définitions des workflows

Les workflows sont stockés en **fichiers JSON** dans le dépôt :

| Dossier | Contenu |
|--------|---------|
| `n8n_workflows/leads/` | lead-create.json, leads-list.json, lead-get.json, lead-update-status.json, lead-delete.json, etc. |
| `n8n_workflows/clients/` | client-create.json, client-onboarding.json, clients-list.json, etc. |
| `n8n_workflows/factures/` | invoice-created.json, invoice-paid.json, invoice-overdue.json |
| `n8n_workflows/abonnements/` | subscription-renewal.json, subscription-cancelled.json, etc. |

Chaque JSON contient notamment le **nœud Webhook** avec un **path** (ex. `"path": "lead_create"`). Ce path est celui utilisé dans l’URL : `/webhook/lead_create`.

---

## 2. Déploiement côté n8n (import manuel)

Les workflows sont **importés à la main** dans l’interface n8n. Il n’y a pas de script qui pousse les JSON vers n8n.

**Étapes :**

1. Ouvrir n8n : **https://n8n.talosprimes.com**
2. **Workflows** → **Import from File** (ou glisser-déposer le JSON).
3. Choisir le fichier (ex. `n8n_workflows/leads/lead-create.json`).
4. Vérifier dans le nœud **Webhook** que le **Path** est bien celui attendu (ex. `lead_create`). Ne pas le modifier si vous voulez garder la même URL que l’app.
5. **Activer** le workflow (toggle “Active” en haut à droite).

À répéter pour chaque workflow que vous voulez utiliser (leads, clients, factures, abonnements).

---

## 3. Déploiement côté application (WorkflowLink)

L’application doit savoir **quel événement métier appelle quel path webhook**. C’est enregistré en base dans la table **WorkflowLink**.

### Scripts de configuration

Depuis le VPS (ou en local) :

```bash
cd /var/www/talosprimes/packages/platform
```

| Commande | Rôle |
|----------|------|
| `pnpm workflow:setup-leads` | Crée/met à jour les WorkflowLinks pour les leads (lead_create, leads_list, lead_get, etc.) |
| `pnpm workflow:setup-clients` | WorkflowLinks pour les clients |
| `pnpm workflow:setup-subscriptions` | WorkflowLinks pour les abonnements |
| `pnpm workflow:setup-invoices` | WorkflowLinks pour les factures |

Ces scripts :

- utilisent un **tenantId** fixe (ex. TalosPrimes Admin) ;
- pour chaque événement (ex. `lead_create`), créent ou mettent à jour une ligne **WorkflowLink** avec :
  - `typeEvenement` = `lead_create`
  - `workflowN8nId` = **path du webhook** (ex. `lead_create`) → utilisé dans l’URL `/webhook/lead_create`
  - `workflowN8nNom` = nom affiché
  - `statut` = `actif`

Ils **ne modifient pas n8n** : ils ne font qu’écrire en base.

### Correspondance événement ↔ URL

Quand l’app émet un événement (ex. création de lead), le **EventService** appelle le **N8nService**, qui :

1. cherche un **WorkflowLink** actif pour `tenantId` + `typeEvenement` (ex. `lead_create`) ;
2. envoie une requête :  
   `POST {N8N_API_URL}/webhook/{workflowN8nId}`  
   avec un body JSON (event, tenantId, data, etc.).

Donc **WorkflowLink.workflowN8nId** doit être **exactement** le **Path** du nœud Webhook dans n8n.

---

## 4. Résumé du flux

```
[App] Création lead → EventService.emit("lead_create", …)
       → N8nService.triggerWorkflow(tenantId, "lead_create", payload)
       → Prisma: WorkflowLink où typeEvenement = "lead_create" → workflowN8nId = "lead_create"
       → POST https://n8n.talosprimes.com/webhook/lead_create
       → n8n exécute le workflow dont le Webhook a Path = "lead_create"
```

---

## 5. Checklist déploiement

- [ ] **n8n** : importer les JSON depuis `n8n_workflows/` (leads, clients, factures, abonnements selon besoin).
- [ ] **n8n** : activer chaque workflow importé.
- [ ] **n8n** : vérifier que le **Path** du nœud Webhook correspond à ce que l’app attend (ex. `lead_create`, `lead_get`, etc.).
- [ ] **App** : exécuter les scripts `pnpm workflow:setup-leads` (et autres) pour créer les WorkflowLinks.
- [ ] **App** : `N8N_API_URL` dans `.env` pointe vers l’instance n8n (ex. `https://n8n.talosprimes.com`).
- [ ] **Réseau** : les webhooks n8n doivent être accessibles depuis le serveur de l’app (pas de 403 ; si auth Nginx/auth n8n, les désactiver pour `/webhook/*` ou configurer en conséquence).

---

## 6. Références dans le code

- **Déclenchement** : `packages/platform/src/services/event.service.ts` (emit) → `n8n.service.ts` (triggerWorkflow, callWorkflowReturn).
- **URL appelée** : `n8n.service.ts` → `fetch(\`${this.apiUrl}/webhook/${workflowLink.workflowN8nId}\`, …)`.
- **Scripts setup** : `packages/platform/scripts/setup-leads-workflows.ts`, `setup-clients-workflows.ts`, etc.
- **Modèle** : `packages/platform/prisma/schema.prisma` → modèle `WorkflowLink`.
