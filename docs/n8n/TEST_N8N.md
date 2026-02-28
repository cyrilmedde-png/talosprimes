# Guide de test et configuration n8n

## 📋 Prérequis

1. ✅ n8n installé et accessible sur votre VPS
2. ✅ Variables d'environnement n8n configurées dans `packages/platform/.env`
3. ✅ Backend démarré et accessible
4. ✅ Token JWT valide pour les tests API

## 🔍 Étape 1 : Vérifier la configuration n8n

### 1.1 Vérifier les variables d'environnement

Sur votre VPS, vérifiez que le fichier `.env` contient bien les variables n8n :

```bash
cd /var/www/talosprimes/packages/platform
cat .env | grep N8N
```

Vous devriez voir :
```env
N8N_API_URL="http://localhost:5678"
# OU pour production avec domaine
N8N_API_URL="https://n8n.talosprimes.com"

# Option 1 : API Key
N8N_API_KEY="votre_api_key"

# Option 2 : Basic Auth
N8N_USERNAME="votre_email@example.com"
N8N_PASSWORD="votre_mot_de_passe"
```

### 1.2 Vérifier que n8n est accessible

```bash
# Test simple de connexion
curl http://localhost:5678/healthz
# OU si n8n est sur un domaine
curl https://n8n.talosprimes.com/healthz
```

Si vous obtenez une réponse (même une erreur 401), n8n est accessible.

## 🧪 Étape 2 : Tester la connexion via l'API TalosPrimes

### 2.1 Obtenir un token JWT

```bash
# Se connecter pour obtenir un token
curl -X POST https://api.talosprimes.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "groupemclem@gmail.com",
    "password": "21052024_Aa!"
  }'
```

Copiez le `accessToken` de la réponse.

### 2.2 Tester la connexion n8n

```bash
# Remplacer YOUR_TOKEN par le token obtenu
curl -X GET https://api.talosprimes.com/api/n8n/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse attendue si tout est OK :**
```json
{
  "success": true,
  "message": "Connexion à n8n réussie"
}
```

**Réponse si erreur :**
```json
{
  "success": false,
  "message": "Impossible de se connecter à n8n: Connection refused"
}
```

## 🔧 Étape 3 : Configurer un workflow n8n de test

### 3.1 Créer un workflow simple dans n8n

1. Connectez-vous à n8n (http://localhost:5678 ou votre domaine)
2. Cliquez sur **"New Workflow"**
3. Ajoutez un nœud **"Webhook"** comme premier nœud
4. Configurez le webhook :
   - **HTTP Method** : `POST`
   - **Path** : `/webhook/test-client-created`
   - **Response Mode** : "When Last Node Finishes"
5. Ajoutez un nœud **"Set"** pour logger les données reçues
6. Ajoutez un nœud **"Respond to Webhook"** pour renvoyer une réponse
7. **Activez le workflow** (bouton "Active" en haut à droite)

### 3.2 Récupérer le Workflow ID

Le Workflow ID est visible dans l'URL de n8n :
- Exemple : `https://n8n.talosprimes.com/workflow/123` → ID = `123`

Ou dans les paramètres du workflow (icône ⚙️) → **"Workflow ID"**

### 3.3 Enregistrer le workflow dans la base de données

Vous devez créer un `WorkflowLink` pour lier le workflow à un événement.

**Option A : Via SQL direct**

```sql
-- D'abord, récupérer votre tenant_id
SELECT id, nom FROM tenants WHERE nom = 'TalosPrimes Admin';

-- Ensuite, récupérer un module_metier_id (ou créer un module si nécessaire)
SELECT id, code FROM modules_metier LIMIT 1;

-- Créer le WorkflowLink
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
  'VOTRE_TENANT_ID',  -- Remplacez par l'ID de votre tenant
  'VOTRE_MODULE_ID',  -- Remplacez par l'ID d'un module
  'client.created',
  '123',  -- Remplacez par votre Workflow ID n8n
  'Test Client Created',
  'actif',
  NOW(),
  NOW()
);
```

**Option B : Via Prisma Studio (plus simple)**

```bash
cd /var/www/talosprimes/packages/platform
pnpm db:studio
```

1. Ouvrez `http://localhost:5555` dans votre navigateur
2. Allez dans la table `WorkflowLink`
3. Cliquez sur **"Add record"**
4. Remplissez :
   - `tenantId` : Sélectionnez votre tenant
   - `moduleMetierId` : Sélectionnez un module (ou créez-en un d'abord)
   - `typeEvenement` : `client.created`
   - `workflowN8nId` : Votre Workflow ID (ex: `123`)
   - `workflowN8nNom` : `Test Client Created`
   - `statut` : `actif`
5. Cliquez sur **"Save"**

## 🚀 Étape 4 : Tester le déclenchement d'un workflow

### 4.1 Créer un client via l'API

Cela devrait automatiquement déclencher le workflow n8n :

```bash
# Remplacer YOUR_TOKEN par votre token JWT
curl -X POST https://api.talosprimes.com/api/clients \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "b2b",
    "raisonSociale": "Entreprise Test n8n",
    "email": "test-n8n@example.com",
    "telephone": "+33123456789"
  }'
```

### 4.2 Vérifier les logs

**Logs du backend :**
```bash
pm2 logs talosprimes-platform
```

Vous devriez voir :
```
[n8n] Workflow déclenché avec succès: Test Client Created (client.created)
```

**Logs de n8n :**
Dans l'interface n8n, allez dans **"Executions"** pour voir les exécutions du workflow.

### 4.3 Vérifier les événements dans la base de données

```sql
SELECT 
  id,
  type_evenement,
  statut_execution,
  workflow_n8n_declenche,
  created_at
FROM event_logs
ORDER BY created_at DESC
LIMIT 10;
```

Vous devriez voir un événement `client.created` avec `statut_execution = 'succes'`.

## 📊 Étape 5 : Lister les workflows configurés

```bash
curl -X GET https://api.talosprimes.com/api/n8n/workflows \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse attendue :**
```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "123",
        "name": "Test Client Created"
      }
    ]
  }
}
```

## 🔍 Événements disponibles

Les événements suivants sont automatiquement émis par l'application :

### Clients Finaux
- `client.created` - Lors de la création d'un client
- `client.updated` - Lors de la mise à jour d'un client
- `client.deleted` - Lors de la suppression d'un client

### Format du payload envoyé à n8n

```json
{
  "event": "client.created",
  "tenantId": "uuid-du-tenant",
  "timestamp": "2026-01-15T10:30:00Z",
  "data": {
    "clientId": "uuid",
    "tenantId": "uuid",
    "type": "b2b",
    "email": "test@example.com",
    "nom": "Entreprise Test"
  },
  "metadata": {
    "workflowId": "123",
    "workflowName": "Test Client Created",
    "module": "crm_base"
  }
}
```

## 🐛 Troubleshooting

### Erreur "Connection refused"

**Problème :** n8n n'est pas accessible à l'URL configurée.

**Solutions :**
1. Vérifiez que n8n est démarré :
   ```bash
   pm2 list
   # OU
   systemctl status n8n
   ```

2. Vérifiez l'URL dans `.env` :
   ```bash
   cat /var/www/talosprimes/packages/platform/.env | grep N8N_API_URL
   ```

3. Testez la connexion manuellement :
   ```bash
   curl http://localhost:5678/healthz
   ```

### Erreur "Workflow non trouvé"

**Problème :** Aucun `WorkflowLink` actif trouvé pour cet événement.

**Solutions :**
1. Vérifiez que le workflow est enregistré dans `workflow_links` :
   ```sql
   SELECT * FROM workflow_links 
   WHERE tenant_id = 'VOTRE_TENANT_ID' 
   AND type_evenement = 'client.created' 
   AND statut = 'actif';
   ```

2. Vérifiez que le `workflow_n8n_id` correspond au Workflow ID dans n8n.

3. Vérifiez que le workflow est **actif** dans n8n (bouton "Active" en haut à droite).

### Erreur "401 Unauthorized"

**Problème :** L'authentification n8n échoue.

**Solutions :**
1. Vérifiez vos credentials dans `.env` :
   ```bash
   cat /var/www/talosprimes/packages/platform/.env | grep N8N
   ```

2. Testez l'authentification manuellement :
   ```bash
   # Avec API Key
   curl -X GET http://localhost:5678/api/v1/workflows \
     -H "X-N8N-API-KEY: votre_api_key"
   
   # Avec Basic Auth
   curl -X GET http://localhost:5678/api/v1/workflows \
     -u "votre_username:votre_password"
   ```

### Le workflow ne se déclenche pas

**Vérifications :**
1. ✅ Le workflow est actif dans n8n
2. ✅ Le `WorkflowLink` existe avec `statut = 'actif'`
3. ✅ Le `type_evenement` correspond (ex: `client.created`)
4. ✅ Le `workflow_n8n_id` correspond au Workflow ID dans n8n
5. ✅ Le webhook dans n8n est configuré avec le bon path : `/webhook/{workflow_id}`
6. ✅ Les logs du backend ne montrent pas d'erreur

**Test manuel du webhook :**
```bash
curl -X POST http://localhost:5678/webhook/123 \
  -H "Content-Type: application/json" \
  -d '{
    "event": "client.created",
    "tenantId": "test",
    "data": {"clientId": "test"}
  }'
```

## ✅ Checklist de configuration complète

- [ ] n8n installé et accessible
- [ ] Variables `N8N_API_URL`, `N8N_API_KEY` (ou `N8N_USERNAME`/`N8N_PASSWORD`) configurées
- [ ] Test de connexion `/api/n8n/test` réussit
- [ ] Workflow créé dans n8n avec webhook
- [ ] Workflow ID récupéré
- [ ] `WorkflowLink` créé dans la base de données
- [ ] Workflow activé dans n8n
- [ ] Test de création de client déclenche le workflow
- [ ] Logs montrent "Workflow déclenché avec succès"

## 🎯 Prochaines étapes

Une fois la configuration validée :

1. **Créer des workflows métier** pour chaque événement important
2. **Automatiser l'onboarding** des nouveaux clients
3. **Synchroniser avec des outils externes** (CRM, email, etc.)
4. **Créer une interface admin** pour gérer les workflows depuis l'application

