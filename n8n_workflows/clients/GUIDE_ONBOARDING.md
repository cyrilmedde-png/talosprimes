# Guide - Onboarding Client Automatique

Ce workflow automatise la création de l'espace client, de l'abonnement et l'activation des modules lorsqu'un client est créé.

## 📋 Fonctionnalités

1. **Création de l'abonnement client** : Crée un `ClientSubscription` avec un plan par défaut
2. **Activation des modules** : Active automatiquement les modules inclus dans le plan
3. **Notification** : Envoie une notification dans la plateforme pour confirmer la création

## 🔧 Configuration

### 1. Importer le workflow dans n8n

1. Ouvrez n8n : `https://n8n.talosprimes.com`
2. Allez dans **Workflows** → **Import from File**
3. Sélectionnez `n8n_workflows/clients/client-onboarding.json`
4. Le workflow sera importé avec le nom "Onboarding Client - Créer espace et abonnement"

### 2. Configurer les credentials

#### Postgres Supabase
- **Type** : Postgres
- **Host** : `db.prspvpaaeuxxhombqeuc.supabase.co`
- **Port** : `5432`
- **Database** : `postgres`
- **User** : `postgres`
- **Password** : Votre mot de passe Supabase
- **SSL** : `require`

#### API TalosPrimes - Header Auth
- **Type** : Header Auth
- **Name** : `X-TalosPrimes-N8N-Secret`
- **Value** : Votre `N8N_WEBHOOK_SECRET` (depuis `.env`)

### 3. Activer le workflow

1. Cliquez sur **Active** en haut à droite du workflow
2. Copiez l'URL du webhook (ex: `https://n8n.talosprimes.com/webhook/client-onboarding`)

### 4. Configurer le WorkflowLink

Exécutez le script de configuration :

```bash
cd packages/platform
pnpm workflow:setup-clients
```

Ce script créera automatiquement le `WorkflowLink` pour `client.onboarding`.

## 📊 Plan par défaut

Le workflow utilise un plan par défaut configuré dans le node "01. Préparer données onboarding" :

```javascript
{
  nomPlan: "Plan Starter",
  montantMensuel: 29.99,
  modulesInclus: ["gestion_clients", "facturation", "suivi"],
  dureeMois: 1
}
```

### Personnaliser le plan

Pour modifier le plan par défaut, éditez le node "01. Préparer données onboarding" et modifiez l'objet `planParDefaut` :

```javascript
const planParDefaut = {
  nomPlan: "Votre Plan",
  montantMensuel: 49.99,
  modulesInclus: ["module1", "module2", "module3"],
  dureeMois: 1
};
```

## 🔄 Flux d'exécution

1. **Webhook** : Reçoit les données du client créé
2. **Préparer données** : Extrait les informations et prépare le plan par défaut
3. **Validation** : Vérifie que `clientId` et `tenantId` sont présents
4. **Préparer requête SQL** : Construit la requête SQL pour créer l'abonnement
5. **Créer abonnement** : Insère l'abonnement dans la base de données
6. **Formater réponse** : Prépare la réponse de succès
7. **Créer notification** : Envoie une notification dans la plateforme
8. **Répondre** : Retourne la réponse au webhook

## 📝 Structure de l'abonnement créé

L'abonnement créé contient :

- `id` : UUID généré automatiquement
- `client_final_id` : ID du client
- `nom_plan` : Nom du plan (ex: "Plan Starter")
- `date_debut` : Date de début (maintenant)
- `date_prochain_renouvellement` : Date de renouvellement (dans 1 mois par défaut)
- `montant_mensuel` : Montant mensuel (29.99€ par défaut)
- `modules_inclus` : Tableau des modules activés
- `statut` : "actif"

## 🧪 Test

Pour tester le workflow :

1. Créez un client depuis l'interface (`/clients`)
2. Le workflow `client.onboarding` sera automatiquement déclenché
3. Vérifiez dans n8n que l'exécution a réussi
4. Vérifiez dans la base de données que l'abonnement a été créé :
   ```sql
   SELECT * FROM client_subscriptions 
   WHERE client_final_id = 'ID_DU_CLIENT';
   ```
5. Vérifiez qu'une notification a été créée dans la plateforme

## ⚠️ Dépannage

### Erreur : "Données invalides: clientId ou tenantId manquant"
- Vérifiez que le payload contient bien `clientId` et `tenantId`
- Vérifiez que l'événement `client.onboarding` est bien émis depuis le backend

### Erreur : "Violation de contrainte unique"
- Un abonnement existe déjà pour ce client
- Le workflow ne doit être déclenché qu'une seule fois par client

### Erreur : "Authorization failed" dans la notification
- Vérifiez que le credential "API TalosPrimes - Header Auth" est correctement configuré
- Vérifiez que `N8N_WEBHOOK_SECRET` correspond à la valeur dans `.env`

## 📚 Ressources

- [Documentation n8n - Postgres](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/)
- [Documentation n8n - HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)

