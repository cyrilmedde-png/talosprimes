# 💳 Implémentation Stripe Checkout - Facturation des clients

## ✅ Ce qui a été implémenté

### 1. Workflow n8n modifié

Le workflow `client-onboarding.json` a été modifié pour utiliser **Stripe Checkout** au lieu de créer directement un abonnement :

#### Nouveaux nodes :
1. **"06b. Préparer URLs Checkout"** : Prépare les URLs de redirection (success/cancel)
2. **"07. Stripe - Créer Session Checkout"** : Crée une Session Checkout Stripe pour l'abonnement
3. **"08. Préparer avec IDs Stripe"** : Inclut maintenant l'URL de checkout dans les données

#### Flux modifié :
```
Si Stripe activé :
  04. Stripe - Créer Customer
  → 05. Stripe - Créer Produit
  → 06. Stripe - Créer Prix
  → 06b. Préparer URLs Checkout (NOUVEAU)
  → 07. Stripe - Créer Session Checkout (NOUVEAU - remplace "Créer Abonnement")
  → 08. Préparer avec IDs Stripe (inclut checkoutUrl)
  → Merge avec branche sans Stripe
  → 09. Préparer requête SQL
  → 10. Créer abonnement client (dans la base)
  → 11. Formater réponse (inclut checkoutUrl)
  → 12. Créer notification
  → 13. Répondre au webhook
```

### 2. Frontend modifié

Le frontend (`clients/page.tsx`) a été mis à jour pour :
- **Rediriger vers Stripe Checkout** quand `response.data.stripe.checkoutUrl` est présent
- **Gérer le retour de Stripe** :
  - Si `?checkout=success` → Recharge les clients
  - Si `?checkout=cancelled` → Affiche un message d'erreur

## 🔄 Fonctionnement

### 1. Création de l'espace client avec Stripe

1. L'utilisateur clique sur "Créer espace client" avec `avecStripe: true`
2. Le workflow n8n :
   - Crée le Customer Stripe
   - Crée le Produit
   - Crée le Prix
   - **Crée une Session Checkout Stripe** (au lieu de l'abonnement directement)
   - Enregistre l'abonnement dans la base (statut: "actif" mais pas encore payé)
   - Retourne l'URL de checkout

3. Le frontend :
   - Reçoit l'URL de checkout
   - **Redirige automatiquement** vers Stripe Checkout

### 2. Processus de paiement

1. Le client arrive sur la page Stripe Checkout
2. Il saisit ses informations de carte
3. Stripe traite le paiement
4. **Stripe crée automatiquement l'abonnement** après paiement réussi
5. Stripe redirige vers `success_url` avec `session_id`

### 3. Après le paiement

- Le client est redirigé vers `/clients?checkout=success&clientId=xxx&session_id=xxx`
- Le frontend recharge les clients
- L'abonnement est actif dans Stripe et dans la base de données

## ⚠️ Important : Webhook Stripe

**Actuellement, le workflow n8n crée l'abonnement dans la base AVANT le paiement.**

Pour une solution complète, il faudra créer un **workflow n8n pour gérer le webhook Stripe** `checkout.session.completed` :

1. Vérifier que le paiement est réussi
2. Mettre à jour l'abonnement dans la base avec :
   - `idAbonnementStripe` : L'ID de l'abonnement créé par Stripe
   - `statut` : "actif"
3. Envoyer une confirmation au client

**Note :** Pour l'instant, c'est fonctionnel car l'abonnement est créé dans la base et Stripe créera l'abonnement après paiement. Le webhook permettra de synchroniser les statuts si le paiement échoue.

## 📝 URLs de redirection

- **Success** : `https://talosprimes.com/clients?checkout=success&clientId={ID}&session_id={CHECKOUT_SESSION_ID}`
- **Cancel** : `https://talosprimes.com/clients?checkout=cancelled&clientId={ID}`

## 🔍 Métadonnées Stripe

Les métadonnées suivantes sont ajoutées à la Session Checkout :
- `clientId` : ID du client dans notre base
- `tenantId` : ID du tenant
- `planName` : Nom du plan

Ces métadonnées sont également ajoutées à l'abonnement Stripe créé automatiquement, ce qui facilite la gestion du webhook.

## ✅ Tests à faire

1. **Créer un espace client avec Stripe activé**
   - Vérifier que la redirection vers Stripe Checkout fonctionne
   - Utiliser une carte de test Stripe : `4242 4242 4242 4242`

2. **Compléter le paiement**
   - Vérifier que la redirection après succès fonctionne
   - Vérifier que l'abonnement apparaît dans Stripe Dashboard

3. **Annuler le paiement**
   - Vérifier que le message d'erreur s'affiche correctement

## 🚀 Prochaines étapes

1. Créer le workflow n8n pour gérer `checkout.session.completed`
2. Gérer les cas d'échec de paiement
3. Implémenter la gestion des renouvellements automatiques
4. Créer le workflow Factures (comme demandé par l'utilisateur)

