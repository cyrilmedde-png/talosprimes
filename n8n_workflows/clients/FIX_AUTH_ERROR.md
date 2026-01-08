# 🔐 Résoudre l'erreur "Authorization failed" dans les workflows Clients

## ❌ Erreur rencontrée

```
Authorization failed - please check your credentials
Non authentifié
```

Cette erreur apparaît dans les nœuds "API TalosPrimes - Create Client" car le credential d'authentification n'est pas configuré correctement.

## ✅ Solution : Configurer le Credential "TalosPrimes API Auth"

### Étape 1 : Récupérer le secret

Le secret se trouve dans le fichier `.env` du backend :

```bash
cd /var/www/talosprimes/packages/platform
cat .env | grep N8N_WEBHOOK_SECRET
```

Tu devrais voir quelque chose comme :
```
N8N_WEBHOOK_SECRET=ton_secret_long_et_securise
```

**⚠️ Important** : Copie cette valeur exactement, elle sera utilisée dans n8n.

### Étape 2 : Créer le Credential dans n8n

1. **Ouvrir n8n** : Aller sur `https://n8n.talosprimes.com`
2. **Aller dans Credentials** : Cliquer sur l'icône "Credentials" en bas à gauche de l'interface
3. **Créer un nouveau credential** :
   - Cliquer sur **"+ Add Credential"** ou **"New"**
   - Chercher **"Header Auth"** dans la liste
   - Sélectionner **"Header Auth"**
4. **Configurer le credential** :
   - **Name** : `TalosPrimes API Auth` (exactement comme ça, avec les majuscules)
   - **Header Name** : `X-TalosPrimes-N8N-Secret` (exactement comme ça)
   - **Header Value** : `ton_secret_long_et_securise` (la valeur de `N8N_WEBHOOK_SECRET`)
5. **Sauvegarder** : Cliquer sur "Save" ou "Create"

### Étape 3 : Assigner le Credential aux workflows

Pour chaque workflow client qui échoue :

1. **Ouvrir le workflow** (ex: `client-create-from-lead` ou `client-create`)
2. **Cliquer sur le nœud qui échoue** (ex: "API TalosPrimes - Create Client")
3. **Aller dans l'onglet "Parameters"**
4. **Vérifier la section "Authentication"** :
   - **Authentication** : Doit être sur `Generic Credential Type` ou `Header Auth`
   - **Generic Auth Type** : Doit être sur `Header Auth`
   - **Header Auth** : Cliquer sur le dropdown et sélectionner **"TalosPrimes API Auth"**
5. **Sauvegarder le workflow** : Cliquer sur "Save"
6. **Réactiver le workflow** : S'assurer que le workflow est activé (bouton vert en haut)

### Étape 4 : Vérifier dans tous les workflows clients

Répéter l'étape 3 pour tous les nœuds HTTP Request dans les workflows clients :

#### Workflow `client-create-from-lead` :
- ✅ "API TalosPrimes - Get Lead" → doit utiliser "TalosPrimes API Auth"
- ✅ "API TalosPrimes - Create Client" → doit utiliser "TalosPrimes API Auth"

#### Workflow `client-create` :
- ✅ "API TalosPrimes - Create Client" → doit utiliser "TalosPrimes API Auth"

#### Workflow `client-update` :
- ✅ "API TalosPrimes - Update Client" → doit utiliser "TalosPrimes API Auth"

#### Workflow `client-delete` :
- ✅ "API TalosPrimes - Delete Client" → doit utiliser "TalosPrimes API Auth"

## 🔍 Vérification rapide

Pour vérifier que tout est bien configuré :

1. **Ouvrir un workflow client**
2. **Cliquer sur un nœud "API TalosPrimes - ..."**
3. **Aller dans "Parameters"**
4. **Vérifier** :
   ```
   Authentication: Generic Credential Type
   Generic Auth Type: Header Auth
   Header Auth: TalosPrimes API Auth ← Doit être sélectionné
   ```

## ⚠️ Erreur courante

**"Header Auth" montre "Connexion TalosPrimes" ou un autre nom**

➡️ **Solution** : Changer pour "TalosPrimes API Auth" dans le dropdown. Si le credential n'apparaît pas, créer-le d'abord (Étape 2).

## ✅ Après configuration

Une fois le credential configuré et assigné, réessayer de créer un client. Tu devrais voir dans n8n :
- ✅ Tous les nœuds avec des checkmarks verts
- ✅ L'exécution réussie dans l'historique
- ✅ Le client créé dans l'application

