# 🔧 Fix : Erreur "This webhook is not registered for POST requests"

## ❌ Erreur rencontrée

```
n8n API error: 404 - {"code":404,"message":"This webhook is not registered for POST requests. Did you mean to make a GET request?"}
```

## 🔍 Cause

Le node **Webhook** dans le workflow `client-onboarding.json` n'avait pas les paramètres nécessaires pour accepter les requêtes POST. Il était configuré avec `"parameters": {}` (vide), ce qui fait que n8n ne savait pas quelle méthode HTTP accepter.

## ✅ Solution appliquée

Le workflow `client-onboarding.json` a été mis à jour pour inclure les paramètres nécessaires :

```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "client-onboarding",
    "responseMode": "responseNode",
    "options": {}
  },
  "id": "webhook-onboarding",
  "name": "Webhook - Onboarding Client",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 1,
  "position": [240, 400],
  "webhookId": "client-onboarding"
}
```

## 📝 Actions à faire

### Étape 1 : Réimporter le workflow dans n8n

1. **Ouvrir n8n** : `https://n8n.talosprimes.com`
2. **Supprimer l'ancien workflow** "Onboarding Client - Créer espace et abonnement" (si existant)
3. **Importer le nouveau workflow** :
   - Cliquer sur "Import" dans n8n
   - Sélectionner le fichier `n8n_workflows/clients/client-onboarding.json`
   - Cliquer sur "Import"

### Étape 2 : Vérifier la configuration du webhook

1. **Ouvrir le workflow importé**
2. **Cliquer sur le node "Webhook - Onboarding Client"**
3. **Vérifier que les paramètres sont** :
   - **HTTP Method** : `POST` ✅
   - **Path** : `client-onboarding`
   - **Response Mode** : `Using 'Respond to Webhook' Node`
   - **Production URL** : `https://n8n.talosprimes.com/webhook/client-onboarding`

### Étape 3 : Activer le workflow

1. **Toggle "Active"** en haut à droite du workflow
2. Le workflow doit être **vert** (activé)

### Étape 4 : Vérifier le node de réponse

Assurez-vous qu'il y a un **"Respond to Webhook"** node à la fin du workflow qui renvoie une réponse au client HTTP.

### Étape 5 : Mettre à jour la base de données (si nécessaire)

Vérifier que l'ID du webhook est correct dans la base de données :

```sql
SELECT workflow_n8n_id, workflow_n8n_nom, statut 
FROM workflow_links 
WHERE type_evenement = 'client.onboarding';
```

L'ID doit être : `client-onboarding`

Si ce n'est pas le cas :

```sql
UPDATE workflow_links 
SET workflow_n8n_id = 'client-onboarding'
WHERE type_evenement = 'client.onboarding';
```

### Étape 6 : Tester

1. Retourner dans l'application : `https://talosprimes.com/clients`
2. Cliquer sur le bouton **"Créer espace client"** (icône étoile) sur un client
3. Remplir le formulaire et cliquer sur "Créer"
4. L'erreur 404 ne devrait plus apparaître

## 🔍 Vérifications supplémentaires

Si l'erreur persiste :

1. **Vérifier que le workflow est actif** dans n8n (toggle vert)
2. **Vérifier les exécutions** dans n8n (onglet "Exécutions")
3. **Vérifier les logs** dans l'application (page "Logs")
4. **Vérifier que le webhook ID dans la base** correspond à celui dans n8n

## 📚 Références

- Workflow corrigé : `n8n_workflows/clients/client-onboarding.json`
- Guide Stripe : `n8n_workflows/clients/GUIDE_STRIPE.md`
- Guide Setup : `n8n_workflows/clients/GUIDE_SETUP_ONBOARDING.md`

