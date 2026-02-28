# 🔧 Guide Complet : Configuration et Vérification des Workflows n8n

Guide étape par étape pour configurer et vérifier que tous les workflows n8n sont opérationnels.

---

## 📋 Vue d'Ensemble

Ce guide vous permet de :
1. ✅ Vérifier la configuration backend
2. ✅ Configurer les credentials dans n8n
3. ✅ Importer les workflows existants
4. ✅ Créer les WorkflowLinks en base de données
5. ✅ Tester les connexions
6. ✅ Vérifier que tout fonctionne

**Temps estimé :** 30-45 minutes

---

## 🔍 ÉTAPE 1 : Vérifier la Configuration Backend

### 1.1 Vérifier les Variables d'Environnement

Sur votre VPS, vérifiez le fichier `.env` :

```bash
cd /var/www/talosprimes/packages/platform
cat .env | grep N8N
```

**Configuration minimale requise :**

```env
# URL de votre instance n8n (OBLIGATOIRE)
N8N_API_URL=https://n8n.talosprimes.com
# OU pour dev local
# N8N_API_URL=http://localhost:5678

# Authentification (choisir UNE méthode)
# Option A: API Key (recommandé)
N8N_API_KEY=votre-api-key-n8n

# Option B: Username/Password
N8N_USERNAME=votre-email@example.com
N8N_PASSWORD=votre-mot-de-passe-n8n

# Secret pour permettre à n8n d'appeler l'API (OBLIGATOIRE si vous utilisez n8n)
N8N_WEBHOOK_SECRET=votre-secret-long-et-complexe-minimum-32-caracteres

# Activer la délégation à n8n (optionnel, false par défaut)
USE_N8N_VIEWS=false      # Déléguer les GET (liste, détail)
USE_N8N_COMMANDS=false   # Déléguer les POST/PATCH/DELETE
```

### 1.2 Tester la Connexion Backend → n8n

```bash
# Sur le VPS, tester la connexion
curl -X GET http://localhost:3001/api/n8n/test \
  -H "Authorization: Bearer VOTRE_TOKEN_ADMIN"
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "Connexion à n8n réussie"
}
```

**Si erreur :**
- Vérifier que `N8N_API_URL` est correct
- Vérifier les credentials (API_KEY ou USERNAME/PASSWORD)
- Vérifier que n8n est accessible depuis le VPS

---

## 🔐 ÉTAPE 2 : Configurer les Credentials dans n8n

### 2.1 Accéder à n8n

1. Ouvrez votre instance n8n : `https://n8n.talosprimes.com`
2. Connectez-vous avec vos identifiants

### 2.2 Créer le Credential "TalosPrimes API Auth"

Ce credential permet à n8n d'appeler votre API backend.

**Dans n8n :**

1. Allez dans **Settings** → **Credentials**
2. Cliquez sur **Add Credential**
3. Recherchez **Header Auth** ou **Custom Header Auth**
4. Configurez :

   **Nom du credential :** `TalosPrimes API Auth`

   **Configuration :**
   - **Name (Header Name)** : `X-TalosPrimes-N8N-Secret`
   - **Value (Password)** : `votre-secret-long-et-complexe` *(le même que `N8N_WEBHOOK_SECRET` dans `.env`)*

5. Cliquez sur **Save**

**⚠️ Important :** Le secret doit être **exactement le même** que `N8N_WEBHOOK_SECRET` dans votre `.env` backend.

### 2.3 Vérifier les Autres Credentials (si nécessaire)

Selon vos workflows, vous pourriez avoir besoin de :

- **PostgreSQL** : Pour accéder à la base de données
- **SMTP** : Pour envoyer des emails
- **Stripe** : Pour les paiements
- **Twilio** : Pour les SMS
- **Resend** : Pour les emails (alternative à SMTP)

**Vérifiez que tous les credentials nécessaires sont configurés.**

---

## 📥 ÉTAPE 3 : Importer les Workflows

### 3.1 Lister les Workflows Disponibles

Les workflows sont dans le dossier `n8n_workflows/` :

```bash
cd /var/www/talosprimes
ls -R n8n_workflows/
```

**Workflows disponibles :**

#### Leads
- `lead-create.json` - Création d'un lead
- `leads-list.json` - Liste des leads
- `lead-get.json` - Détail d'un lead
- `lead-update-status.json` - Mise à jour du statut
- `lead-delete.json` - Suppression
- `lead-questionnaire.json` - Envoi questionnaire
- `lead-entretien.json` - Planification entretien
- `lead-confirmation.json` - Confirmation conversion

#### Clients
- `client-create.json` - Création client
- `client-create-from-lead.json` - Création depuis lead
- `client-onboarding.json` - Onboarding client
- `clients-list.json` - Liste clients
- `client-get.json` - Détail client
- `client-update.json` - Mise à jour
- `client-delete.json` - Suppression
- `stripe-checkout-completed.json` - Après paiement Stripe

#### Abonnements
- `subscription-renewal.json` - Renouvellement
- `subscription-upgrade.json` - Upgrade
- `subscription-cancelled.json` - Annulation
- `subscription-suspended.json` - Suspension

#### Factures
- `invoice-created.json` - Création facture
- `invoice-paid.json` - Facture payée
- `invoice-overdue.json` - Facture en retard

### 3.2 Importer un Workflow dans n8n

**Pour chaque workflow :**

1. Dans n8n, cliquez sur **Workflows** → **Add Workflow**
2. Cliquez sur les **3 points** (menu) → **Import from File**
3. Sélectionnez le fichier JSON du workflow (ex: `n8n_workflows/leads/lead-create.json`)
4. Le workflow s'importe automatiquement

**⚠️ Important :** Après l'import, notez le **Workflow ID** :
- Il est visible dans l'URL : `https://n8n.talosprimes.com/workflow/123` → ID = `123`
- Ou dans les paramètres du workflow

### 3.3 Configurer le Webhook dans le Workflow

**Pour chaque workflow importé :**

1. Ouvrez le workflow dans n8n
2. Vérifiez que le premier nœud est un **Webhook**
3. Configurez le webhook :
   - **Method** : `POST`
   - **Path** : `/webhook/{WORKFLOW_ID}` (remplacer par l'ID réel)
   - **Response Mode** : "When Last Node Finishes"
4. **Activez le workflow** (toggle en haut à droite)

**⚠️ Important :** Le `WORKFLOW_ID` dans le path doit correspondre à l'ID réel du workflow dans n8n.

---

## 🔗 ÉTAPE 4 : Créer les WorkflowLinks en Base de Données

Les WorkflowLinks lient les événements de l'application aux workflows n8n.

### 4.1 Vérifier le Tenant ID

```bash
cd /var/www/talosprimes/packages/platform

# Vérifier que le tenant existe
pnpm prisma studio
# OU
psql $DATABASE_URL -c "SELECT id, nom_entreprise FROM tenants LIMIT 5;"
```

**Notez le Tenant ID** (généralement : `00000000-0000-0000-0000-000000000001`)

### 4.2 Créer les WorkflowLinks pour les Leads

```bash
cd /var/www/talosprimes/packages/platform
pnpm workflow:setup-leads
```

Ce script :
- ✅ Crée automatiquement tous les WorkflowLinks pour les leads
- ✅ Vous demande les Workflow IDs de n8n
- ✅ Les enregistre en base de données

**Vous devrez fournir :**
- Le Tenant ID (généralement celui par défaut)
- Les Workflow IDs de n8n pour chaque workflow

### 4.3 Créer les WorkflowLinks pour les Clients

```bash
pnpm workflow:setup-clients
```

### 4.4 Créer les WorkflowLinks pour les Abonnements

```bash
pnpm workflow:setup-subscriptions
```

### 4.5 Créer les WorkflowLinks pour les Factures

```bash
pnpm workflow:setup-invoices
```

### 4.6 Vérifier les WorkflowLinks Créés

```bash
# Via Prisma Studio
pnpm prisma studio

# OU via SQL
psql $DATABASE_URL -c "SELECT type_evenement, workflow_n8n_id, workflow_n8n_nom, statut FROM workflow_links WHERE tenant_id = 'VOTRE_TENANT_ID';"
```

---

## 🧪 ÉTAPE 5 : Tester les Connexions

### 5.1 Test Backend → n8n

```bash
# Sur le VPS
curl -X GET http://localhost:3001/api/n8n/test \
  -H "Authorization: Bearer VOTRE_TOKEN_ADMIN"
```

**Attendu :** `{"success": true, "message": "Connexion à n8n réussie"}`

### 5.2 Test n8n → Backend

**Dans n8n :**

1. Créez un workflow de test
2. Ajoutez un nœud **HTTP Request**
3. Configurez :
   - **Method** : `GET`
   - **URL** : `http://votre-vps-ip:3001/health`
   - **Authentication** : Sélectionnez le credential "TalosPrimes API Auth"
4. Exécutez le workflow

**Attendu :** Réponse `{"status":"ok","database":"connected"}`

### 5.3 Test d'un Workflow Complet

**Exemple : Test création de lead**

1. Dans n8n, ouvrez le workflow `lead-create`
2. Vérifiez qu'il est **actif** (toggle vert)
3. Dans l'application, créez un lead via l'API :

```bash
curl -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{
    "nom": "Test",
    "prenom": "Workflow",
    "email": "test@example.com",
    "telephone": "+33612345678"
  }'
```

4. Dans n8n, allez dans **Executions** et vérifiez que le workflow s'est exécuté

**Si le workflow ne s'exécute pas :**
- Vérifier que le WorkflowLink existe en DB
- Vérifier que le workflow est actif dans n8n
- Vérifier les logs backend : `pm2 logs talosprimes-api`

---

## ✅ ÉTAPE 6 : Vérification Complète

### 6.1 Checklist de Vérification

- [ ] Variables d'environnement configurées (`.env`)
- [ ] Credential "TalosPrimes API Auth" créé dans n8n
- [ ] Workflows importés dans n8n
- [ ] Workflows activés dans n8n
- [ ] WorkflowLinks créés en base de données
- [ ] Test Backend → n8n : ✅
- [ ] Test n8n → Backend : ✅
- [ ] Test workflow complet : ✅

### 6.2 Vérifier les Logs

```bash
# Logs backend
pm2 logs talosprimes-api --lines 50

# Chercher :
# ✅ "[n8n] Workflow déclenché avec succès"
# ❌ "[n8n] Erreur lors du déclenchement"
```

### 6.3 Vérifier les Exécutions dans n8n

Dans n8n :
1. Allez dans **Executions**
2. Vérifiez les exécutions récentes
3. Vérifiez qu'il n'y a pas d'erreurs (icônes rouges)

---

## 🔧 Problèmes Courants et Solutions

### Problème 1: "n8n non configuré"

**Symptôme :** `{"success": false, "message": "N8N_API_URL non configuré"}`

**Solution :**
```bash
# Vérifier .env
cat packages/platform/.env | grep N8N_API_URL

# Si manquant, ajouter :
echo "N8N_API_URL=https://n8n.talosprimes.com" >> packages/platform/.env

# Redémarrer
pm2 restart talosprimes-api
```

---

### Problème 2: "Workflow non trouvé"

**Symptôme :** `{"success": false, "error": "Workflow non trouvé pour lead_create"}`

**Solution :**
```bash
# Vérifier que le WorkflowLink existe
pnpm prisma studio
# OU
psql $DATABASE_URL -c "SELECT * FROM workflow_links WHERE type_evenement = 'lead_create';"

# Si manquant, créer :
pnpm workflow:setup-leads
```

---

### Problème 3: "n8n API error: 401"

**Symptôme :** Erreur d'authentification

**Solution :**
- Vérifier `N8N_API_KEY` ou `N8N_USERNAME`/`N8N_PASSWORD` dans `.env`
- Vérifier que les credentials sont corrects dans n8n

---

### Problème 4: "n8n API error: 404"

**Symptôme :** Webhook non trouvé

**Solution :**
- Vérifier que le workflow est **actif** dans n8n
- Vérifier que le `WORKFLOW_ID` dans le WorkflowLink correspond à l'ID réel dans n8n
- Vérifier le path du webhook : `/webhook/{WORKFLOW_ID}`

---

### Problème 5: "Authorization failed" dans n8n

**Symptôme :** n8n ne peut pas appeler l'API backend

**Solution :**
- Vérifier que le credential "TalosPrimes API Auth" est configuré
- Vérifier que le secret correspond à `N8N_WEBHOOK_SECRET`
- Vérifier que le header est bien `X-TalosPrimes-N8N-Secret`

---

## 📊 Commandes Utiles

### Vérifier la Configuration

```bash
# Vérifier les variables d'environnement
cd /var/www/talosprimes/packages/platform
cat .env | grep N8N

# Tester la connexion
curl -X GET http://localhost:3001/api/n8n/test \
  -H "Authorization: Bearer VOTRE_TOKEN"

# Lister les workflows d'un tenant
curl -X GET http://localhost:3001/api/n8n/workflows \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

### Gérer les WorkflowLinks

```bash
# Créer les WorkflowLinks pour leads
pnpm workflow:setup-leads

# Créer les WorkflowLinks pour clients
pnpm workflow:setup-clients

# Créer les WorkflowLinks pour abonnements
pnpm workflow:setup-subscriptions

# Créer les WorkflowLinks pour factures
pnpm workflow:setup-invoices
```

### Vérifier les Logs

```bash
# Logs backend en temps réel
pm2 logs talosprimes-api

# Logs avec filtrage n8n
pm2 logs talosprimes-api | grep n8n

# Dernières 100 lignes
pm2 logs talosprimes-api --lines 100 --nostream
```

---

## 🎯 Prochaines Étapes

Une fois que tout est configuré et testé :

1. **Personnaliser les workflows** selon vos besoins métier
2. **Ajouter des notifications** (emails, SMS)
3. **Configurer les intégrations** (Stripe, SMTP, etc.)
4. **Monitorer les exécutions** dans n8n

---

## 📚 Documentation Complémentaire

- [CONFIG_N8N.md](./packages/platform/CONFIG_N8N.md) - Configuration détaillée
- [GUIDE_N8N_LEADS.md](./GUIDE_N8N_LEADS.md) - Guide spécifique pour les leads
- [n8n_workflows/README.md](./n8n_workflows/README.md) - Documentation des workflows

---

**✅ Si toutes les étapes sont complétées, vos workflows n8n sont opérationnels !**
