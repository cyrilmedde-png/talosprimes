# Fix : "Workflow non trouvé" pour client.onboarding

## 🔍 Problème

Lors de la création d'un client, vous voyez l'erreur "Workflow non trouvé" dans les logs pour l'événement `client.onboarding`.

## ✅ Solution

Le `WorkflowLink` pour `client.onboarding` n'existe pas encore dans la base de données. Il faut l'ajouter en exécutant le script de configuration.

### Étapes

1. **Exécuter le script de configuration** :
   ```bash
   cd packages/platform
   pnpm workflow:setup-clients
   ```

   Ce script créera automatiquement le `WorkflowLink` pour `client.onboarding`.

2. **Importer le workflow dans n8n** :
   - Ouvrez n8n : `https://n8n.talosprimes.com`
   - Allez dans **Workflows** → **Import from File**
   - Sélectionnez `n8n_workflows/clients/client-onboarding.json`
   - Activez le workflow dans n8n

3. **Vérifier l'URL du webhook** :
   - Dans n8n, ouvrez le workflow "Onboarding Client - Créer espace et abonnement"
   - Vérifiez que l'URL du webhook est : `https://n8n.talosprimes.com/webhook/client-onboarding`
   - Si ce n'est pas le cas, copiez l'URL correcte

4. **Mettre à jour le WorkflowLink avec l'ID correct** :
   - Dans n8n, l'ID du workflow se trouve dans l'URL : `https://n8n.talosprimes.com/workflow/XXXXX`
   - Copiez cet ID (XXXXX)
   - Exécutez dans la base de données :
     ```sql
     UPDATE workflow_links 
     SET workflow_n8n_id = 'XXXXX' 
     WHERE type_evenement = 'client.onboarding';
     ```

   Ou réexécutez le script `pnpm workflow:setup-clients` après avoir importé le workflow dans n8n.

## 📝 Vérification

Après avoir configuré le workflow, créez un nouveau client depuis l'interface. L'événement `client.onboarding` devrait maintenant être déclenché avec succès, et vous devriez voir :

- ✅ Un abonnement créé dans `client_subscriptions`
- ✅ Une notification dans la plateforme
- ✅ Un log avec le statut "succes" au lieu de "erreur"

## 🔗 Ressources

- [Guide Onboarding Client](./n8n_workflows/clients/GUIDE_ONBOARDING.md)
- [Script setup-clients-workflows](./packages/platform/scripts/setup-clients-workflows.ts)

