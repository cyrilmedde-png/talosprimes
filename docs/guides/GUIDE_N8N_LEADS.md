# Guide complet : Configuration n8n pour les Leads

Ce guide explique comment configurer complètement l'intégration n8n pour la gestion des leads.

---

## 🎯 Vue d'ensemble

L'application TalosPrimes peut déléguer **toutes les opérations sur les leads** à n8n :
- **Vues (GET)** : Liste des leads, détail d'un lead
- **Commandes (POST/PATCH/DELETE)** : Création, mise à jour du statut, suppression

Cela permet une **logique métier 100% no-code** dans n8n.

---

## 📋 Prérequis

1. **n8n installé et accessible** : `https://n8n.talosprimes.com`
2. **Backend configuré** avec les variables d'environnement n8n
3. **Base de données** initialisée avec `pnpm db:seed`

---

## 🔧 Étape 1 : Configuration Backend

### 1.1 Variables d'environnement

Dans `/var/www/talosprimes/packages/platform/.env` :

```env
# n8n Configuration
N8N_API_URL=https://n8n.talosprimes.com
N8N_USERNAME=votre_username_n8n
N8N_PASSWORD=votre_password_n8n

# Secret pour les appels n8n → API (sans JWT)
N8N_WEBHOOK_SECRET=votre_secret_long_et_complexe

# Activer la délégation à n8n
USE_N8N_VIEWS=true      # Déléguer les GET (liste, détail)
USE_N8N_COMMANDS=true   # Déléguer les POST/PATCH/DELETE
```

### 1.2 Créer les WorkflowLinks

Sur le VPS :

```bash
cd /var/www/talosprimes/packages/platform
pnpm workflow:setup-leads
```

Ce script crée automatiquement les 5 WorkflowLinks nécessaires :
- `lead_create` → Création d'un lead
- `leads_list` → Liste des leads
- `lead_get` → Détail d'un lead
- `lead_update_status` → Mise à jour du statut
- `lead_delete` → Suppression d'un lead

### 1.3 Redémarrer le backend

```bash
pm2 restart talosprimes-api
```

---

## 🎨 Étape 2 : Configuration n8n

### 2.1 Créer le credential "TalosPrimes API Auth"

Dans n8n, créer un credential **Header Auth** :

**Nom du credential** : `TalosPrimes API Auth`

**Configuration** :
- **Name (Header Name)** : `X-TalosPrimes-N8N-Secret`
- **Value (Password)** : `votre_secret_long_et_complexe` *(le même que `N8N_WEBHOOK_SECRET`)*

⚠️ **Important** : Pas de "Bearer", juste le secret.

### 2.2 Importer les workflows

Les fichiers JSON sont dans `n8n_workflows/leads/` :

1. **lead-create.json** → Création d'un lead
2. **leads-list.json** → Liste des leads
3. **lead-get.json** → Détail d'un lead
4. **lead-update-status.json** → Mise à jour du statut
5. **lead-delete.json** → Suppression d'un lead

**Pour chaque fichier** :
1. Dans n8n : **Workflows** → **Import from File**
2. Sélectionner le fichier JSON
3. Cliquer sur **Import**

### 2.3 Configurer chaque workflow

Pour **chaque workflow importé** :

#### A) Vérifier le nœud "Webhook"

- **Path** : doit correspondre au `workflowN8nId` (ex: `lead_create`, `leads_list`, etc.)
- **HTTP Method** : `POST` pour tous
- **Response Mode** : `Last Node` (pour renvoyer la réponse au backend)

#### B) Configurer le nœud "Sauvegarder Lead" (ou équivalent)

Ce nœud fait un appel HTTP vers l'API TalosPrimes.

**Configuration** :
- **Method** : `POST` (pour create), `GET` (pour list/get), `PATCH` (pour update), `DELETE` (pour delete)
- **URL** : 
  - Create: `https://api.talosprimes.com/api/leads`
  - List: `https://api.talosprimes.com/api/leads`
  - Get: `https://api.talosprimes.com/api/leads/{{ $json.id }}`
  - Update: `https://api.talosprimes.com/api/leads/{{ $json.id }}/statut`
  - Delete: `https://api.talosprimes.com/api/leads/{{ $json.id }}`
- **Authentication** : Sélectionner `TalosPrimes API Auth` (le credential créé en 2.1)
- **Send Body** : `ON` (sauf pour GET/DELETE)
- **Body Content Type** : `JSON`
- **JSON** : `{{ $json }}` (pour passer les données du webhook)

#### C) Configurer les nœuds optionnels (Email, SMS, Notifications)

Si tu veux envoyer des emails/SMS/notifications :

**Pour Resend (Email)** :
- Credential : **Header Auth**
- Name : `Authorization`
- Value : `Bearer re_VotreCléResend`

**Pour Twilio (SMS)** :
- Credential : **Twilio API**
- Account SID : `ACxxxx`
- Auth Token : `votre_token`

#### D) Activer le workflow

En haut à droite : **Inactive** → cliquer pour passer à **Active**

### 2.4 Vérifier les webhook URLs

Pour chaque workflow actif, copier l'URL du webhook (clic sur le nœud Webhook → onglet "Production URL").

Elle doit être de la forme :
```
https://n8n.talosprimes.com/webhook/lead_create
```

⚠️ Si tu vois `localhost`, revoir la configuration Docker de n8n (voir `FIX_N8N_WEBHOOK_URL.md`).

---

## 🧪 Étape 3 : Tests

### 3.1 Test de connexion n8n

```bash
cd /var/www/talosprimes
./scripts/test-n8n-connection.sh
```

Résultat attendu : `"Connexion à n8n réussie"`

### 3.2 Test de création d'un lead (via frontend)

1. Ouvrir `https://talosprimes.com/onboarding`
2. Cliquer sur **"Créer un lead"**
3. Remplir le formulaire (nom, prénom, email, téléphone)
4. Cliquer sur **"Créer"**

**Résultat attendu** :
- ✅ Le lead apparaît dans la liste
- ✅ Un email de confirmation est envoyé (si Resend configuré)
- ✅ Une notification est envoyée (si Slack/Discord configuré)

### 3.3 Test de liste des leads

1. Recharger la page `/onboarding`
2. Les leads doivent s'afficher dans les sections "Leads Inscrits" ou "Créés par admin"

### 3.4 Vérifier les logs n8n

Dans n8n :
1. Aller dans **Executions** (menu de gauche)
2. Vérifier que les workflows ont bien été exécutés
3. Cliquer sur une exécution pour voir les détails

---

## 🐛 Dépannage

### Erreur : "Workflow non trouvé pour lead_create"

**Cause** : Le WorkflowLink n'existe pas en base de données.

**Solution** :
```bash
cd /var/www/talosprimes/packages/platform
pnpm workflow:setup-leads
pm2 restart talosprimes-api
```

### Erreur : "Authorization failed - please check your credentials"

**Cause** : Le secret n8n n'est pas configuré ou ne correspond pas.

**Solution** :
1. Vérifier `N8N_WEBHOOK_SECRET` dans `/var/www/talosprimes/packages/platform/.env`
2. Vérifier le credential "TalosPrimes API Auth" dans n8n (header `X-TalosPrimes-N8N-Secret`)
3. Les deux valeurs doivent être **identiques**
4. Redémarrer : `pm2 restart talosprimes-api`

### Erreur : "Non authentifié"

**Cause** : Le header `X-TalosPrimes-N8N-Secret` n'est pas envoyé.

**Solution** :
1. Dans n8n, vérifier que le nœud HTTP Request utilise le credential "TalosPrimes API Auth"
2. Vérifier que **Authentication** est bien sélectionné (pas "None")

### Workflow n8n ne se déclenche pas

**Causes possibles** :
1. Le workflow n'est pas **activé** dans n8n
2. L'URL du webhook est incorrecte (localhost au lieu du domaine)
3. Le WorkflowLink en base pointe vers un mauvais `workflowN8nId`

**Solutions** :
1. Activer le workflow dans n8n
2. Vérifier la "Production URL" du webhook
3. Vérifier en base :
   ```sql
   SELECT * FROM workflow_links WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
   ```

### Les leads ne s'affichent pas

**Cause** : `USE_N8N_VIEWS=true` mais le workflow `leads_list` n'est pas configuré.

**Solutions** :
1. Importer `leads-list.json` dans n8n
2. Activer le workflow
3. Ou désactiver temporairement : `USE_N8N_VIEWS=false` dans `.env`

---

## 🎯 Résumé des commandes

```bash
# 1. Configurer les WorkflowLinks
cd /var/www/talosprimes/packages/platform
pnpm workflow:setup-leads

# 2. Redémarrer le backend
pm2 restart talosprimes-api

# 3. Tester la connexion n8n
cd /var/www/talosprimes
./scripts/test-n8n-connection.sh

# 4. Voir les logs
pm2 logs talosprimes-api
```

---

## 📚 Fichiers de référence

- **Workflows JSON** : `n8n_workflows/leads/*.json`
- **Configuration n8n** : `n8n_workflows/CONFIGURATION_RESEND_TWILIO.md`
- **Variables d'environnement** : `CONFIGURATION_COMPLETE.md`
- **Script de setup** : `packages/platform/scripts/setup-leads-workflows.ts`

---

## ✅ Checklist finale

- [ ] Variables d'environnement backend configurées (`N8N_WEBHOOK_SECRET`, `USE_N8N_VIEWS`, `USE_N8N_COMMANDS`)
- [ ] WorkflowLinks créés en base (`pnpm workflow:setup-leads`)
- [ ] Credential "TalosPrimes API Auth" créé dans n8n
- [ ] 5 workflows importés et activés dans n8n
- [ ] Webhook URLs vérifiées (pas de localhost)
- [ ] Test de création d'un lead réussi
- [ ] Test de liste des leads réussi

---

**🎉 Une fois tout configuré, tu as un système 100% no-code pour gérer les leads !**

