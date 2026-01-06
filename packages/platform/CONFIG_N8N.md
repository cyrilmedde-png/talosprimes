# Configuration n8n avec TalosPrimes

## Prérequis

- ✅ n8n installé sur votre VPS
- ✅ n8n accessible via URL (ex: `https://n8n.votredomaine.com` ou `http://VPS_IP:5678`)
- ✅ API n8n activée (si disponible)

## Configuration dans l'application

### 1. Variables d'environnement

Dans `packages/platform/.env` :

**Option A : Authentification par Login/Mot de passe (recommandé)**
```env
# URL de votre instance n8n
N8N_API_URL=http://localhost:5678
# OU pour production
N8N_API_URL=https://n8n.votredomaine.com

# Authentification Basic Auth
N8N_USERNAME=votre-email@example.com
N8N_PASSWORD=votre-mot-de-passe-n8n
```

**Option B : Authentification par API Key**
```env
N8N_API_URL=http://localhost:5678
N8N_API_KEY=votre-api-key-n8n
```

**Option C : Sans authentification (dev local uniquement)**
```env
N8N_API_URL=http://localhost:5678
# Pas besoin de credentials
```

> 📝 Voir [N8N_ENV_EXAMPLE.md](./N8N_ENV_EXAMPLE.md) pour plus de détails

### 2. Format des webhooks n8n

L'application envoie des requêtes POST à n8n avec ce format :

**URL :** `{N8N_API_URL}/webhook/{workflow_id}`

**Méthode :** POST

**Headers :**
```
Content-Type: application/json
X-N8N-API-KEY: {N8N_API_KEY} (si configuré)
```

**Body :**
```json
{
  "event": "client.created",
  "tenantId": "uuid-du-tenant",
  "timestamp": "2026-01-15T10:30:00Z",
  "data": {
    "clientId": "uuid",
    "type": "b2b",
    "email": "contact@example.com",
    "nom": "Entreprise XYZ"
  },
  "metadata": {
    "workflowId": "workflow-n8n-id",
    "workflowName": "Onboarding Client",
    "module": "crm_base"
  }
}
```

## Configuration des workflows n8n

### 1. Créer un workflow dans n8n

1. Connectez-vous à n8n
2. Créez un nouveau workflow
3. Ajoutez un nœud **Webhook** comme premier nœud
4. Configurez le webhook :
   - **Method** : POST
   - **Path** : `/webhook/{votre-workflow-id}`
   - **Response Mode** : "When Last Node Finishes"

### 2. Récupérer le Workflow ID

Le Workflow ID est visible dans l'URL de n8n ou dans les paramètres du workflow.

Exemple : `https://n8n.votredomaine.com/workflow/123` → Workflow ID = `123`

### 3. Enregistrer le workflow dans la base de données

Pour lier un workflow n8n à un événement, vous devez créer un `WorkflowLink` :

```sql
INSERT INTO workflow_links (
  id,
  tenant_id,
  module_metier_id,
  type_evenement,
  workflow_n8n_id,
  workflow_n8n_nom,
  statut,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'tenant-uuid',
  'module-uuid',
  'client.created',
  '123', -- Workflow ID de n8n
  'Onboarding Client',
  'actif',
  NOW(),
  NOW()
);
```

Ou via Prisma Studio :
```bash
pnpm db:studio
```

## Événements disponibles

Les événements suivants sont émis par l'application :

### Clients Finaux
- `client.created` - Lors de la création d'un client
- `client.updated` - Lors de la mise à jour d'un client
- `client.deleted` - Lors de la suppression d'un client

### Factures (à venir)
- `facture.created` - Lors de la création d'une facture
- `facture.en_retard` - Lorsqu'une facture est en retard

### Abonnements (à venir)
- `abonnement.renouvellement` - Lors du renouvellement d'un abonnement
- `abonnement.cancelled` - Lors de l'annulation d'un abonnement

## Exemple de workflow n8n

### Workflow "Onboarding Client"

1. **Webhook** (réception de l'événement)
2. **Condition** : Vérifier le type de client (B2B/B2C)
3. **HTTP Request** : Créer le contact dans un CRM externe (HubSpot, Pipedrive)
4. **Email** : Envoyer un email de bienvenue
5. **Google Drive** : Créer un dossier client
6. **Notion/Trello** : Créer une tâche "Onboarding nouveau client"

## Tester la connexion

### Via l'API

```bash
# Tester la connexion n8n
curl -X GET http://localhost:3001/api/n8n/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Via les logs

Quand un événement est émis, vérifiez les logs de l'application :

```
[n8n] Workflow déclenché avec succès: Onboarding Client (client.created)
```

Ou en cas d'erreur :

```
[n8n] Erreur lors du déclenchement du workflow (client.created): Connection refused
```

## Troubleshooting

### Erreur "Connection refused"

- Vérifiez que n8n est bien démarré sur le VPS
- Vérifiez l'URL dans `N8N_API_URL`
- Vérifiez que le port est accessible (5678 par défaut)

### Erreur "Workflow non trouvé"

- Vérifiez que le workflow est enregistré dans `workflow_links`
- Vérifiez que le `type_evenement` correspond
- Vérifiez que le `statut` est `actif`

### Le workflow ne se déclenche pas

1. Vérifiez les logs de l'application
2. Vérifiez les logs de n8n
3. Vérifiez que le webhook est bien configuré dans n8n
4. Testez manuellement le webhook avec curl :

```bash
curl -X POST https://n8n.votredomaine.com/webhook/123 \
  -H "Content-Type: application/json" \
  -d '{
    "event": "client.created",
    "tenantId": "test",
    "data": {"clientId": "test"}
  }'
```

## Sécurité

- ✅ L'application vérifie que le workflow appartient au tenant
- ✅ Isolation stricte : un tenant ne peut déclencher que ses propres workflows
- ✅ Les événements sont loggés dans `event_logs` pour audit

## Prochaines étapes

1. Créer les workflows templates dans n8n
2. Créer un script pour déployer automatiquement les workflows lors de la création d'un tenant
3. Ajouter une interface admin pour gérer les workflows

