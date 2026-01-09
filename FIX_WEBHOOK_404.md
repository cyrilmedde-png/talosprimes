# Fix : Erreur 404 - Webhook non enregistré

## 🔍 Problème

L'erreur `"The requested webhook "POST 9ZaxcH8h2wttEe0r" is not registered"` signifie que :
- Le workflow n'est pas actif dans n8n, OU
- L'ID du workflow dans la base de données ne correspond pas à l'ID réel du workflow dans n8n

## ✅ Solutions

### Solution 1 : Vérifier que le workflow est actif dans n8n

1. **Ouvrir n8n** : `https://n8n.talosprimes.com`
2. **Aller dans Workflows**
3. **Trouver le workflow** "Onboarding Client - Créer espace et abonnement"
4. **Vérifier que le toggle "Active" est activé** (en haut à droite)
   - S'il est "Inactive", cliquer dessus pour l'activer
5. **Si le workflow n'existe pas**, l'importer :
   - Workflows → Import from File
   - Sélectionner `n8n_workflows/clients/client-onboarding.json`
   - Activer le workflow

### Solution 2 : Récupérer l'ID correct du workflow dans n8n

1. **Ouvrir le workflow** dans n8n
2. **Cliquer sur le node "Webhook - Onboarding Client"**
3. **Dans les paramètres du webhook**, vous verrez :
   - **Production URL** : `https://n8n.talosprimes.com/webhook/client-onboarding`
   - **Test URL** : `https://n8n.talosprimes.com/webhook-test/client-onboarding`
4. **L'ID du webhook** est la partie après `/webhook/` : `client-onboarding`
   - **OU** regarder l'URL dans le navigateur : `https://n8n.talosprimes.com/workflow/XXXXX`
   - L'ID du workflow est la partie `XXXXX` dans l'URL

### Solution 3 : Mettre à jour l'ID dans la base de données

Une fois que vous avez l'ID correct depuis n8n, mettez à jour la base de données :

**Option A : Via SQL direct**

```bash
# Se connecter à la base de données
psql "postgresql://postgres:[MOT_DE_PASSE]@db.prspvpaaeuxxhombqeuc.supabase.co:5432/postgres"

# Vérifier l'ID actuel
SELECT type_evenement, workflow_n8n_id, workflow_n8n_nom, statut 
FROM workflow_links 
WHERE type_evenement = 'client.onboarding';

# Mettre à jour avec le bon ID (remplacez VOTRE_ID_N8N par l'ID réel)
UPDATE workflow_links 
SET workflow_n8n_id = 'VOTRE_ID_N8N' 
WHERE type_evenement = 'client.onboarding';

# Vérifier la mise à jour
SELECT type_evenement, workflow_n8n_id, workflow_n8n_nom, statut 
FROM workflow_links 
WHERE type_evenement = 'client.onboarding';
```

**Option B : Modifier le script et réexécuter**

1. **Éditer** `packages/platform/scripts/setup-clients-workflows.ts`
2. **Modifier la ligne 55** :
   ```typescript
   workflowId: 'VOTRE_ID_N8N_ICI', // Remplacez par l'ID réel depuis n8n
   ```
3. **Exécuter** :
   ```bash
   cd packages/platform
   pnpm workflow:setup-clients
   ```

### Solution 4 : Utiliser le webhook ID au lieu du workflow ID

Si l'ID `9ZaxcH8h2wttEe0r` est en fait l'ID du webhook et non du workflow :

1. **Dans n8n**, ouvrir le workflow
2. **Cliquer sur le node Webhook**
3. **Copier l'ID du webhook** (différent de l'ID du workflow)
4. **Mettre à jour la base de données** avec cet ID

## 🔧 Vérification rapide

Pour vérifier rapidement si le problème vient de l'ID ou de l'activation :

1. **Aller dans n8n** → Workflows
2. **Chercher un workflow actif** qui fonctionne (par exemple `lead-inscription`)
3. **Noter son ID** depuis l'URL
4. **Comparer avec l'ID dans la base de données** :
   ```sql
   SELECT workflow_n8n_id FROM workflow_links WHERE type_evenement = 'lead_inscription';
   ```

## 📝 Checklist de vérification

- [ ] Le workflow existe dans n8n
- [ ] Le workflow est **activé** (toggle Active en haut à droite)
- [ ] L'ID dans `workflow_links.workflow_n8n_id` correspond à l'ID du workflow dans n8n
- [ ] Les credentials sont assignés (Postgres, API TalosPrimes, Stripe si utilisé)
- [ ] Le webhook URL est correct : `https://n8n.talosprimes.com/webhook/client-onboarding`

## 🐛 Dépannage supplémentaire

Si le problème persiste après avoir vérifié tout ci-dessus :

1. **Vérifier les logs n8n** :
   - Aller dans n8n → Executions
   - Chercher les exécutions récentes pour voir les erreurs détaillées

2. **Tester le webhook directement** :
   ```bash
   curl -X POST "https://n8n.talosprimes.com/webhook/client-onboarding" \
     -H "Content-Type: application/json" \
     -d '{
       "event": "client.onboarding",
       "tenantId": "00000000-0000-0000-0000-000000000001",
       "data": {
         "client": {
           "id": "test-id",
           "email": "test@example.com"
         }
       }
     }'
   ```

3. **Vérifier que le workflow est bien importé** :
   - Le workflow doit avoir exactement le nom : "Onboarding Client - Créer espace et abonnement"
   - Le webhook ID doit être : `client-onboarding`

