# Fix : Erreur "n8n API error: 500" lors de la création d'un lead

## 🔴 Symptôme

Lors de la création d'un lead depuis `/onboarding`, l'erreur suivante apparaît :
```
n8n API error: 500 - {"message":"Error in workflow"}
```

## 🔍 Diagnostic

L'erreur signifie que :
- ✅ Le WorkflowLink existe en base de données
- ✅ n8n est accessible
- ❌ Le workflow n8n **plante à l'exécution**

---

## 🚀 Solution rapide : Désactiver temporairement n8n

Sur le VPS, éditer `/var/www/talosprimes/packages/platform/.env` :

```bash
nano /var/www/talosprimes/packages/platform/.env
```

Modifier :
```env
# Désactiver la délégation à n8n (créer les leads directement en base)
USE_N8N_VIEWS=false
USE_N8N_COMMANDS=false
```

Redémarrer :
```bash
pm2 restart talosprimes-api
```

**Résultat** : Les leads seront créés directement en base de données, sans passer par n8n.

---

## 🔧 Solution complète : Corriger le workflow n8n

### Étape 1 : Vérifier l'état du workflow dans n8n

1. Ouvrir `https://n8n.talosprimes.com`
2. Aller dans **Workflows**
3. Trouver le workflow **"Leads - Create (via Webhook)"** (ou `lead_create`)
4. Vérifier qu'il est **Actif** (toggle vert en haut à droite)

### Étape 2 : Vérifier les logs d'exécution

1. Dans n8n, cliquer sur **Executions** (menu de gauche)
2. Trouver les exécutions récentes du workflow `lead_create`
3. Cliquer sur une exécution **en erreur** (icône rouge)
4. Identifier le nœud qui a planté

**Erreurs courantes** :

#### A) Nœud "Sauvegarder Lead" : Authorization failed

**Cause** : Le credential "TalosPrimes API Auth" n'est pas configuré ou incorrect.

**Solution** :
1. Dans n8n, aller dans **Credentials**
2. Créer ou éditer le credential **"TalosPrimes API Auth"**
3. Type : **Header Auth**
4. Configuration :
   - **Name** : `X-TalosPrimes-N8N-Secret`
   - **Value** : `votre_secret` (le même que `N8N_WEBHOOK_SECRET` dans `.env` backend)
5. Sauvegarder
6. Dans le workflow, sélectionner ce credential pour le nœud HTTP Request

#### B) Nœud "Resend - Email Confirmation" : Invalid API Key

**Cause** : Le credential Resend n'est pas configuré.

**Solution** :
1. Dans n8n, créer un credential **Header Auth** pour Resend
2. Configuration :
   - **Name** : `Authorization`
   - **Value** : `Bearer re_VotreCléResend` ⚠️ **Avec "Bearer " + espace**
3. Appliquer ce credential au nœud Resend

#### C) Nœud "Twilio - SMS Notification" : Authentication Error

**Cause** : Le credential Twilio n'est pas configuré.

**Solution** :
1. Dans n8n, créer un credential **Twilio API**
2. Configuration :
   - **Account SID** : `ACxxxx`
   - **Auth Token** : `votre_token`
3. Appliquer ce credential au nœud Twilio

### Étape 3 : Simplifier le workflow (mode debug)

Si les erreurs persistent, **simplifier le workflow** pour isoler le problème :

1. Désactiver temporairement les nœuds optionnels (Email, SMS, Notifications)
2. Ne garder que :
   - **Webhook - lead_create** (entrée)
   - **Sauvegarder Lead** (HTTP Request vers l'API)
   - **Respond to Webhook** (sortie)

3. Tester la création d'un lead
4. Si ça fonctionne, réactiver les nœuds un par un pour identifier le coupable

### Étape 4 : Workflow minimal fonctionnel

Voici un workflow **ultra-simple** qui fonctionne à coup sûr :

```json
{
  "name": "Leads - Create (Minimal)",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "lead_create",
        "responseMode": "lastNode"
      },
      "name": "Webhook - lead_create",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.talosprimes.com/api/leads",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth",
        "sendBody": true,
        "bodyContentType": "json",
        "jsonParameters": true,
        "bodyParametersJson": "={{ $json }}"
      },
      "name": "Sauvegarder Lead",
      "type": "n8n-nodes-base.httpRequest",
      "position": [500, 300],
      "credentials": {
        "httpHeaderAuth": {
          "id": "ID_DU_CREDENTIAL",
          "name": "TalosPrimes API Auth"
        }
      }
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ $json }}"
      },
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "position": [750, 300]
    }
  ],
  "connections": {
    "Webhook - lead_create": {
      "main": [[{"node": "Sauvegarder Lead", "type": "main", "index": 0}]]
    },
    "Sauvegarder Lead": {
      "main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]
    }
  }
}
```

**Pour l'importer** :
1. Copier ce JSON dans un fichier `lead-create-minimal.json`
2. Dans n8n : **Workflows** → **Import from File**
3. Sélectionner le fichier
4. Configurer le credential "TalosPrimes API Auth" sur le nœud "Sauvegarder Lead"
5. Activer le workflow

---

## 🧪 Test manuel du workflow

### Dans n8n (mode Test)

1. Ouvrir le workflow `lead_create`
2. Cliquer sur le nœud **Webhook**
3. Cliquer sur **"Listen for Test Event"** ou **"Execute Workflow"**
4. Dans un terminal, envoyer une requête de test :

```bash
curl -X POST https://n8n.talosprimes.com/webhook/lead_create \
  -H "Content-Type: application/json" \
  -d '{
    "event": "lead_create",
    "tenantId": "00000000-0000-0000-0000-000000000001",
    "data": {
      "nom": "Test",
      "prenom": "Debug",
      "email": "test@example.com",
      "telephone": "+33123456789",
      "source": "admin"
    }
  }'
```

5. Observer l'exécution dans n8n
6. Si un nœud plante, lire le message d'erreur détaillé

---

## 📋 Checklist de vérification

- [ ] Le workflow `lead_create` est **activé** dans n8n
- [ ] Le credential "TalosPrimes API Auth" est créé et configuré correctement
- [ ] Le nœud "Sauvegarder Lead" utilise ce credential
- [ ] La variable `N8N_WEBHOOK_SECRET` dans `.env` backend correspond au credential n8n
- [ ] Le backend a été redémarré après modification du `.env`
- [ ] La webhook URL est `https://n8n.talosprimes.com/webhook/lead_create` (pas `localhost`)
- [ ] Les credentials Resend/Twilio sont configurés (si ces nœuds sont présents)

---

## 🎯 Commandes de diagnostic

### Voir les logs backend (pour voir l'erreur exacte de n8n)

```bash
pm2 logs talosprimes-api --lines 50
```

### Tester la connexion n8n depuis le backend

```bash
cd /var/www/talosprimes
./scripts/test-n8n-connection.sh
```

### Lister les WorkflowLinks actifs

```bash
cd /var/www/talosprimes/packages/platform
pnpm workflow:setup-leads
```

---

## 🔄 Si rien ne fonctionne : Reset complet

```bash
# 1. Supprimer les WorkflowLinks existants
cd /var/www/talosprimes/packages/platform
psql $DATABASE_URL -c "DELETE FROM workflow_links WHERE type_evenement LIKE 'lead%';"

# 2. Recréer les WorkflowLinks
pnpm workflow:setup-leads

# 3. Désactiver n8n temporairement
nano /var/www/talosprimes/packages/platform/.env
# Mettre USE_N8N_COMMANDS=false

# 4. Redémarrer
pm2 restart talosprimes-api

# 5. Tester la création directe (sans n8n)
# → Doit fonctionner

# 6. Réimporter le workflow minimal dans n8n
# 7. Réactiver USE_N8N_COMMANDS=true
# 8. Redémarrer et retester
```

---

## ✅ Résultat attendu

Après correction, lors de la création d'un lead :
1. Le formulaire se soumet
2. Le backend appelle n8n via le webhook `lead_create`
3. n8n exécute le workflow (sauvegarde en base, envoie email/SMS, etc.)
4. n8n renvoie la réponse au backend
5. Le backend renvoie le résultat au frontend
6. Le lead apparaît dans la liste

**Aucune erreur 500 ne doit apparaître.**

