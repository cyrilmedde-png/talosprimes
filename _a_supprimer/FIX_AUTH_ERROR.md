# 🔐 Résoudre l'erreur "Authorization failed" dans les workflows Clients

## ❌ Erreur rencontrée

```
Authorization failed - please check your credentials
Non authentifié
Tenant ID manquant
```

Cette erreur apparaît dans les nœuds "API TalosPrimes - Create Client" car le `tenantId` n'est pas transmis lors de l'appel depuis n8n.

## ✅ Solution : Le tenantId doit être inclus dans le body de la requête

**Le problème n'est PAS le credential d'authentification**, mais le fait que le backend nécessite un `tenantId` pour créer un client, et quand l'appel vient de n8n (sans JWT), le `tenantId` n'est pas disponible via `request.tenantId`.

### Comment ça fonctionne maintenant

Le backend envoie le `tenantId` dans le payload webhook à n8n :
```json
{
  "event": "client_create_from_lead",
  "tenantId": "uuid-du-tenant",
  "timestamp": "...",
  "data": {
    "leadId": "..."
  }
}
```

Les workflows n8n doivent **extraire ce tenantId** et **l'inclure dans le body** de la requête POST vers `/api/clients`.

### ✅ Corrections appliquées

Les workflows suivants ont été corrigés pour inclure automatiquement le `tenantId` :

1. ✅ **`client-create-from-lead.json`** :
   - Le nœud "Parser payload" extrait maintenant `tenantId` du payload webhook
   - Le nœud "Préparer données client" inclut `tenantId` dans les données
   - Le nœud "API TalosPrimes - Create Client" envoie `tenantId` dans le body JSON

2. ✅ **`client-create.json`** :
   - Le nœud "Valider données" extrait maintenant `tenantId` du payload webhook
   - Le nœud "API TalosPrimes - Create Client" envoie `tenantId` dans le body JSON

3. ✅ **Backend (`clients.routes.ts`)** :
   - Le schéma `createClientSchema` accepte maintenant `tenantId` optionnel dans le body
   - La route `POST /api/clients` récupère le `tenantId` depuis le body si l'appel vient de n8n

### 📋 Vérification du credential (si nécessaire)

Si tu as toujours une erreur d'authentification, vérifie que le credential **"TalosPrimes API Auth"** est bien configuré :

1. **Récupérer le secret** :
   ```bash
   cd /var/www/talosprimes/packages/platform
   cat .env | grep N8N_WEBHOOK_SECRET
   ```

2. **Créer le credential dans n8n** :
   - Aller dans **Credentials** (icône en bas à gauche)
   - Créer un credential de type **"Header Auth"**
   - **Name** : `TalosPrimes API Auth`
   - **Header Name** : `X-TalosPrimes-N8N-Secret`
   - **Header Value** : la valeur de `N8N_WEBHOOK_SECRET`

3. **Assigner le credential aux nœuds HTTP Request** :
   - Ouvrir chaque workflow client
   - Cliquer sur le nœud "API TalosPrimes - Create Client"
   - Dans **Parameters** → **Authentication** → **Header Auth**
   - Sélectionner **"TalosPrimes API Auth"**
   - Sauvegarder et réactiver le workflow

### ✅ Après correction

Une fois les workflows mis à jour et le credential configuré, réessayer de créer un client. Tu devrais voir dans n8n :
- ✅ Tous les nœuds avec des checkmarks verts
- ✅ L'exécution réussie dans l'historique
- ✅ Le client créé dans l'application

### 🔄 Mise à jour des workflows

**Important** : Si tu as déjà importé ces workflows dans n8n, tu dois les réimporter ou les mettre à jour manuellement :

1. **Réimporter les workflows JSON** depuis le dossier `n8n_workflows/clients/`
2. **OU** mettre à jour manuellement les nœuds "Parser payload" / "Valider données" pour extraire `tenantId`
3. **OU** mettre à jour manuellement le nœud "API TalosPrimes - Create Client" pour inclure `tenantId` dans le body JSON
