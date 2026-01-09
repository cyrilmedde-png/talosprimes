# Guide Complet - Configuration client-onboarding

Ce guide vous explique étape par étape comment configurer le workflow `client-onboarding` pour créer automatiquement l'espace client, l'abonnement et activer les modules lorsqu'un client est créé.

## 📋 Prérequis

- Accès à n8n : `https://n8n.talosprimes.com`
- Accès SSH au VPS
- Fichier `client-onboarding.json` disponible dans `n8n_workflows/clients/`

## 🔧 Étapes de configuration

### Étape 1 : Importer le workflow dans n8n

1. **Ouvrir n8n** :
   - Allez sur `https://n8n.talosprimes.com`
   - Connectez-vous avec vos identifiants

2. **Importer le workflow** :
   - Cliquez sur **Workflows** dans le menu de gauche
   - Cliquez sur le bouton **Import from File** (ou utilisez le menu ⋮ → Import)
   - Sélectionnez le fichier : `n8n_workflows/clients/client-onboarding.json`
   - Le workflow sera importé avec le nom **"Onboarding Client - Créer espace et abonnement"**

3. **Vérifier l'import** :
   - Le workflow devrait apparaître dans votre liste de workflows
   - Ouvrez-le pour vérifier qu'il contient bien tous les nodes

### Étape 2 : Configurer les credentials dans n8n

#### 2.1 Credential Postgres Supabase

1. Dans n8n, allez dans **Settings** → **Credentials**
2. Cliquez sur **Add Credential**
3. Recherchez et sélectionnez **Postgres**
4. Configurez avec les informations suivantes :

   ```
   Type: Postgres
   Host: db.prspvpaaeuxxhombqeuc.supabase.co
   Port: 5432
   Database: postgres
   User: postgres
   Password: [Votre mot de passe Supabase]
   SSL: require
   ```

5. Donnez un nom à ce credential : **"Postgres Supabase"**
6. Cliquez sur **Save**

#### 2.2 Credential API TalosPrimes

1. Toujours dans **Settings** → **Credentials**
2. Cliquez sur **Add Credential**
3. Recherchez et sélectionnez **Header Auth**
4. Configurez avec les informations suivantes :

   ```
   Type: Header Auth
   Name: X-TalosPrimes-N8N-Secret
   Value: [Votre N8N_WEBHOOK_SECRET depuis .env]
   ```

   > 💡 **Où trouver le secret ?**
   > 
   > Sur le VPS, dans `/var/www/talosprimes/packages/platform/.env`, cherchez la ligne :
   > ```
   > N8N_WEBHOOK_SECRET=votre_secret_ici
   > ```

5. Donnez un nom à ce credential : **"API TalosPrimes - Header Auth"**
6. Cliquez sur **Save**

### Étape 3 : Assigner les credentials au workflow

1. **Ouvrir le workflow** "Onboarding Client - Créer espace et abonnement"
2. **Node "03. Créer abonnement client"** (Postgres) :
   - Cliquez sur le node
   - Dans les paramètres, sélectionnez le credential **"Postgres Supabase"**
   - Sauvegardez

3. **Node "05. Créer notification"** (HTTP Request) :
   - Cliquez sur le node
   - Dans les paramètres d'authentification, sélectionnez **"Header Auth"**
   - Choisissez le credential **"API TalosPrimes - Header Auth"**
   - Sauvegardez

### Étape 4 : Activer le workflow et récupérer l'ID

1. **Activer le workflow** :
   - En haut à droite du workflow, cliquez sur le bouton **Inactive** pour le passer en **Active**
   - Le workflow est maintenant actif et écoute les webhooks

2. **Récupérer l'ID du workflow** :
   - Regardez l'URL dans votre navigateur : `https://n8n.talosprimes.com/workflow/XXXXX`
   - L'ID du workflow est la partie **XXXXX** dans l'URL
   - **Copiez cet ID**, vous en aurez besoin à l'étape suivante

3. **Vérifier l'URL du webhook** :
   - Cliquez sur le node **"Webhook - Onboarding Client"**
   - L'URL du webhook devrait être : `https://n8n.talosprimes.com/webhook/client-onboarding`
   - Si ce n'est pas le cas, notez l'URL exacte

### Étape 5 : Configurer le WorkflowLink dans la base de données

Sur le VPS, exécutez le script de configuration :

```bash
cd /var/www/talosprimes/packages/platform
pnpm workflow:setup-clients
```

Ce script va :
- Créer le module métier "Clients" s'il n'existe pas
- Créer ou mettre à jour le `WorkflowLink` pour `client.onboarding`
- Utiliser l'ID `client-onboarding` par défaut

### Étape 6 : Mettre à jour l'ID du workflow n8n (si nécessaire)

Si l'ID du workflow dans n8n est différent de `client-onboarding`, vous devez le mettre à jour :

1. **Option 1 : Via SQL direct** (recommandé)
   ```bash
   # Se connecter à la base de données
   psql "postgresql://postgres:[MOT_DE_PASSE]@db.prspvpaaeuxxhombqeuc.supabase.co:5432/postgres"
   
   # Mettre à jour l'ID
   UPDATE workflow_links 
   SET workflow_n8n_id = 'VOTRE_ID_N8N_ICI' 
   WHERE type_evenement = 'client.onboarding';
   
   # Vérifier
   SELECT type_evenement, workflow_n8n_id, workflow_n8n_nom, statut 
   FROM workflow_links 
   WHERE type_evenement = 'client.onboarding';
   ```

2. **Option 2 : Modifier le script** (si vous préférez)
   - Éditez `packages/platform/scripts/setup-clients-workflows.ts`
   - Changez la ligne 55 : `workflowId: 'client-onboarding'` → `workflowId: 'VOTRE_ID_N8N'`
   - Réexécutez le script

### Étape 7 : Tester le workflow

1. **Créer un client depuis l'interface** :
   - Allez sur `/clients` dans l'application
   - Cliquez sur **"Nouveau client"**
   - Remplissez le formulaire (B2C ou B2B)
   - Cliquez sur **"Créer le client"**

2. **Vérifier dans n8n** :
   - Allez dans n8n → **Executions**
   - Vous devriez voir une nouvelle exécution pour "Onboarding Client"
   - Vérifiez qu'elle s'est terminée avec succès (statut vert)

3. **Vérifier dans la base de données** :
   ```sql
   -- Vérifier que l'abonnement a été créé
   SELECT * FROM client_subscriptions 
   ORDER BY date_debut DESC 
   LIMIT 5;
   ```

4. **Vérifier dans l'application** :
   - Allez dans **Notifications** (icône cloche en haut)
   - Vous devriez voir une notification "Espace client créé"

## ✅ Vérification finale

Pour vérifier que tout fonctionne correctement :

1. ✅ Le workflow est importé et actif dans n8n
2. ✅ Les credentials sont configurés et assignés
3. ✅ Le `WorkflowLink` existe dans la base de données avec le bon ID
4. ✅ La création d'un client déclenche bien le workflow
5. ✅ L'abonnement est créé dans `client_subscriptions`
6. ✅ Une notification apparaît dans l'application

## 🐛 Dépannage

### Le workflow ne se déclenche pas

1. **Vérifier que le WorkflowLink existe** :
   ```sql
   SELECT * FROM workflow_links WHERE type_evenement = 'client.onboarding';
   ```
   - Si aucun résultat, exécutez `pnpm workflow:setup-clients`

2. **Vérifier que l'ID est correct** :
   - L'ID dans `workflow_links.workflow_n8n_id` doit correspondre à l'ID du workflow dans n8n
   - Vérifiez l'URL du workflow dans n8n

3. **Vérifier les logs** :
   - Allez dans **Logs** dans l'application
   - Cherchez les événements `client.onboarding`
   - Si vous voyez "Workflow non trouvé", l'ID est incorrect

### Erreur "Authorization failed" dans n8n

- Vérifiez que le credential "API TalosPrimes - Header Auth" est correctement configuré
- Vérifiez que `N8N_WEBHOOK_SECRET` dans `.env` correspond à la valeur dans n8n

### Erreur de connexion Postgres dans n8n

- Vérifiez que le credential "Postgres Supabase" est correctement configuré
- Vérifiez que le mot de passe est correct
- Vérifiez que SSL est bien activé (`require`)

### L'abonnement n'est pas créé

- Vérifiez les exécutions dans n8n pour voir l'erreur exacte
- Vérifiez que le node "03. Créer abonnement client" a bien le credential Postgres assigné
- Vérifiez que la requête SQL est correcte dans le node "02b. Préparer requête SQL"

## 📚 Ressources

- [Guide Onboarding détaillé](./GUIDE_ONBOARDING.md)
- [Documentation n8n - Postgres](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/)
- [Documentation n8n - HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)

