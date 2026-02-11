# Créer un client depuis le tunnel (lead converti) – 100 % n8n

Quand vous cliquez sur « Créer le client » dans le modal du tunnel et que le client ne se crée pas, vérifier les points suivants.

## 1. Workflow n8n **client_create_from_lead**

- **Importer** le fichier `n8n_workflows/clients/client-create-from-lead.json` dans n8n.
- **Activer** le workflow (toggle vert en haut à droite).
- **Webhook** : path = `client_create_from_lead`, **Authentication = None**.

## 2. Credential sur tous les nœuds HTTP

Les 3 nœuds qui appellent l’API TalosPrimes doivent utiliser le credential **TalosPrimes API Auth** (Header Auth) :

- **API TalosPrimes - Get Lead** (GET /api/leads/:id)
- **API TalosPrimes - Update Lead Status** (PATCH /api/leads/:id/statut)
- **API TalosPrimes - Create Client** (POST /api/clients)

Configuration du credential :

- **Header Name** : `X-TalosPrimes-N8N-Secret`
- **Value** : exactement la même valeur que `N8N_WEBHOOK_SECRET` dans `.env` du backend (packages/platform).

Sans ce header, l’API renverra 401 et le workflow échouera.

## 3. WorkflowLink en base

Sur le VPS :

```bash
cd /var/www/talosprimes/packages/platform
pnpm workflow:setup-clients
```

Cela crée/met à jour le lien `client_create_from_lead` → webhook `client_create_from_lead`.

## 4. Variables d’environnement backend (VPS)

Dans `packages/platform/.env` :

- `N8N_API_URL=https://n8n.talosprimes.com`
- `USE_N8N_COMMANDS=true`
- `N8N_WEBHOOK_SECRET=<votre_secret>` (identique à la valeur du credential dans n8n)

Puis redémarrer l’API : `pm2 restart talosprimes-api`.

## 5. Voir l’erreur côté frontend

Si ça échoue, une bannière rouge s’affiche avec le message d’erreur (ex. « n8n API error: 404 » ou « Workflow non trouvé »). En cas de 502, vérifier les logs n8n (Executions) et les logs du backend.

## Résumé du flux

1. Clic « Créer le client » → frontend appelle `POST /api/clients/create-from-lead` avec JWT et `{ leadId }`.
2. Backend appelle le webhook n8n `POST .../webhook/client_create_from_lead` avec `{ event, tenantId, data: { leadId } }`.
3. Le workflow n8n : récupère le lead (GET), met le statut à converti (PATCH), crée le client (POST /api/clients avec tenantId + données). Tous ces appels doivent envoyer le header `X-TalosPrimes-N8N-Secret`.
