# Différence entre Webhook ID et Workflow ID dans n8n

## 🔍 Important : Comprendre les IDs n8n

Dans n8n, il y a **deux IDs différents** :

### 1. **Workflow ID** (ID du workflow)
- C'est l'ID du workflow lui-même
- Visible dans l'URL : `https://n8n.talosprimes.com/workflow/XXXXX`
- Utilisé pour éditer, activer/désactiver le workflow

### 2. **Webhook ID** (ID du webhook)
- C'est l'ID configuré dans le **node Webhook**
- Visible dans les paramètres du node Webhook
- Utilisé dans l'URL : `https://n8n.talosprimes.com/webhook/WEBHOOK_ID`
- **C'est celui-ci qu'il faut mettre dans `workflow_n8n_id` !**

## ✅ Comment trouver le bon ID

### Méthode 1 : Depuis le node Webhook (RECOMMANDÉ)

1. **Ouvrir le workflow** dans n8n
2. **Cliquer sur le node "Webhook - Onboarding Client"**
3. **Dans les paramètres**, vous verrez :
   - **Production URL** : `https://n8n.talosprimes.com/webhook/client-onboarding`
   - **Test URL** : `https://n8n.talosprimes.com/webhook-test/client-onboarding`
4. **L'ID du webhook** est `client-onboarding` (la partie après `/webhook/`)

### Méthode 2 : Vérifier dans le JSON du workflow

Le webhook ID est défini dans le workflow JSON :

```json
{
  "parameters": {},
  "name": "Webhook - Onboarding Client",
  "type": "n8n-nodes-base.webhook",
  "webhookId": "client-onboarding"  <-- C'est cet ID qu'il faut utiliser
}
```

Dans notre workflow, c'est : **`client-onboarding`**

## 🔧 Correction

Si vous avez mis l'ID du workflow au lieu de l'ID du webhook, corrigez avec :

```sql
UPDATE workflow_links 
SET workflow_n8n_id = 'client-onboarding'  -- ID du webhook, pas du workflow
WHERE type_evenement = 'client.onboarding';
```

## ⚠️ Erreur courante

**❌ Mauvais** : Utiliser l'ID du workflow (ex: `9ZaxcH8h2wttEe0r`)
**✅ Bon** : Utiliser l'ID du webhook (ex: `client-onboarding`)

## 📝 Vérification

Pour vérifier que c'est correct :

1. **Dans n8n**, ouvrir le workflow
2. **Cliquer sur le node Webhook**
3. **Copier l'ID** depuis la Production URL
4. **Vérifier dans la base de données** :
   ```sql
   SELECT workflow_n8n_id FROM workflow_links WHERE type_evenement = 'client.onboarding';
   ```
5. **Les deux doivent être identiques** !

## 🎯 Résultat attendu

L'URL finale appelée sera :
```
https://n8n.talosprimes.com/webhook/client-onboarding
```

Et dans la base de données :
```sql
workflow_n8n_id = 'client-onboarding'
```

