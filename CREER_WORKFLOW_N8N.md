# Guide : Créer un workflow n8n pour TalosPrimes

## 🎯 Objectif

Créer un workflow simple dans n8n qui recevra les événements émis par l'application TalosPrimes.

## 📋 Prérequis

- ✅ n8n accessible sur https://n8n.talosprimes.com
- ✅ WorkflowLink créé dans la base de données (déjà fait : workflow ID 123)
- ✅ Vous êtes connecté à n8n

## 🚀 Étape 1 : Créer un nouveau workflow

1. Allez sur https://n8n.talosprimes.com
2. Cliquez sur **"New Workflow"** (ou **"Nouveau workflow"**)
3. Vous verrez un canvas vide avec un message "Add first step..."

## 🔧 Étape 2 : Ajouter un nœud Webhook

1. Cliquez sur le **"+"** au centre du canvas
2. Dans la barre de recherche, tapez **"Webhook"**
3. Sélectionnez **"Webhook"** (icône avec un crochet)
4. Le nœud Webhook apparaît sur le canvas

## ⚙️ Étape 3 : Configurer le Webhook

1. Cliquez sur le nœud **Webhook** pour l'ouvrir
2. Dans les paramètres :
   - **HTTP Method** : Sélectionnez `POST`
   - **Path** : Entrez `/webhook/123` (remplacez `123` par votre Workflow ID n8n)
   - **Response Mode** : Sélectionnez `"When Last Node Finishes"`
   - **Response Code** : `200`
3. Cliquez sur **"Execute Node"** (ou **"Exécuter le nœud"**) pour tester
4. Vous verrez une URL comme : `https://n8n.talosprimes.com/webhook/123`
5. **Copiez cette URL** - c'est l'URL que l'application utilisera

## 📝 Étape 4 : Ajouter un nœud pour logger les données

1. Cliquez sur le **"+"** à droite du nœud Webhook
2. Tapez **"Set"** dans la recherche
3. Sélectionnez **"Set"** (icône avec des accolades)
4. Configurez le nœud Set :
   - **Keep Only Set Fields** : Désactivé (pour voir toutes les données)
   - **Values to Set** : Laissez vide pour l'instant (on va juste logger)

## 📊 Étape 5 : Ajouter un nœud pour voir les données

1. Cliquez sur le **"+"** à droite du nœud Set
2. Tapez **"Respond to Webhook"** dans la recherche
3. Sélectionnez **"Respond to Webhook"**
4. Configurez :
   - **Response Code** : `200`
   - **Response Body** : `={{ $json }}` (retourne toutes les données reçues)

## ✅ Étape 6 : Activer le workflow

1. En haut à droite, cliquez sur le bouton **"Inactive"** (ou **"Inactif"**)
2. Il devient **"Active"** (ou **"Actif"**)
3. Le workflow est maintenant prêt à recevoir des événements

## 🧪 Étape 7 : Tester le workflow

### Option A : Test depuis l'application

```bash
cd /var/www/talosprimes/scripts
./test-n8n-sync.sh
```

Le script va créer un client de test, ce qui déclenchera automatiquement le workflow.

### Option B : Test manuel avec curl

```bash
curl -X POST https://n8n.talosprimes.com/webhook/123 \
  -H "Content-Type: application/json" \
  -d '{
    "event": "client.created",
    "tenantId": "00000000-0000-0000-0000-000000000001",
    "timestamp": "2026-01-06T16:00:00Z",
    "data": {
      "clientId": "test-123",
      "type": "b2b",
      "email": "test@example.com"
    }
  }'
```

## 📋 Structure des données reçues

Quand l'application envoie un événement, le workflow reçoit un JSON avec cette structure :

```json
{
  "event": "client.created",
  "tenantId": "00000000-0000-0000-0000-000000000001",
  "timestamp": "2026-01-06T16:00:00Z",
  "data": {
    "clientId": "uuid-du-client",
    "tenantId": "uuid-du-tenant",
    "type": "b2b",
    "email": "client@example.com",
    "nom": "Entreprise Test"
  },
  "metadata": {
    "workflowId": "123",
    "workflowName": "leads",
    "module": "crm_base"
  }
}
```

## 🔍 Vérifier que ça fonctionne

1. **Dans n8n** :
   - Allez dans **"Executions"** (menu de gauche)
   - Vous devriez voir une nouvelle exécution avec le statut **"Success"** (vert)
   - Cliquez dessus pour voir les données reçues

2. **Dans les logs du backend** :
   ```bash
   pm2 logs talosprimes-platform --lines 50 | grep -i n8n
   ```
   Vous devriez voir : `[n8n] Workflow déclenché avec succès: leads (client.created)`

## 🎨 Exemple de workflow avancé

Une fois que le workflow de base fonctionne, vous pouvez ajouter d'autres nœuds :

1. **Condition** : Vérifier le type de client (B2B/B2C)
2. **HTTP Request** : Envoyer les données à un CRM externe (HubSpot, Pipedrive)
3. **Email** : Envoyer un email de bienvenue
4. **Google Sheets** : Enregistrer dans une feuille de calcul
5. **Slack/Discord** : Envoyer une notification

## 🐛 Troubleshooting

### Le workflow ne se déclenche pas

1. ✅ Vérifiez que le workflow est **actif** (bouton "Active" en haut à droite)
2. ✅ Vérifiez que le **Path** du webhook est correct : `/webhook/123` (remplacez par votre ID)
3. ✅ Vérifiez que le **Workflow ID** dans la base de données correspond à l'ID dans n8n
4. ✅ Vérifiez les logs du backend pour voir les erreurs

### Erreur "Connection refused"

1. ✅ Vérifiez que n8n est accessible : `curl https://n8n.talosprimes.com/healthz`
2. ✅ Vérifiez les variables d'environnement dans `packages/platform/.env` :
   ```env
   N8N_API_URL="https://n8n.talosprimes.com"
   N8N_USERNAME="votre_email"
   N8N_PASSWORD="votre_mot_de_passe"
   ```

### Le workflow reçoit les données mais ne fait rien

1. ✅ Vérifiez que tous les nœuds sont connectés (flèches entre les nœuds)
2. ✅ Vérifiez que le nœud "Respond to Webhook" est le dernier nœud
3. ✅ Testez chaque nœud individuellement avec "Execute Node"

## 📚 Prochaines étapes

Une fois le workflow de base fonctionnel :

1. **Créer des workflows pour chaque événement** :
   - `client.created` → Onboarding client
   - `client.updated` → Mise à jour CRM
   - `client.deleted` → Archivage

2. **Automatiser des tâches** :
   - Créer des contacts dans un CRM
   - Envoyer des emails de bienvenue
   - Créer des tâches dans un outil de gestion de projet

3. **Synchroniser avec des outils externes** :
   - HubSpot, Pipedrive, Salesforce
   - Google Sheets, Airtable
   - Slack, Discord, Teams

