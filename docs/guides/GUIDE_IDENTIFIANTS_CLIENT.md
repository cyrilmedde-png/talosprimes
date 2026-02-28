# 🔐 Guide : Création d'identifiants client avec mot de passe temporaire

## 📋 Vue d'ensemble

Quand un espace client est créé (onboarding), le système :
1. **Génère automatiquement** un mot de passe sécurisé
2. **Crée un Tenant** pour le client final
3. **Crée un User** avec ce mot de passe (flag `mustChangePassword = true`)
4. **Stocke le mot de passe temporaire** dans l'abonnement pour l'envoyer par email
5. **Envoie un email** avec les identifiants après validation du paiement Stripe

## 🔄 Flux complet

### 1. Workflow `client-onboarding.json`

1. **01. Préparer données onboarding** : Extrait les données du client
2. **02. Validation données** : Vérifie `clientId` et `tenantId`
3. **03. IF - Stripe activé ?** : Branche selon si Stripe est activé
4. **Si Stripe activé** :
   - **04-06. Stripe** : Crée Customer, Produit, Prix
   - **06b. Préparer URLs Checkout** : Prépare les URLs de redirection
   - **07. Stripe - Créer Session Checkout** : Crée la session Checkout
   - **08. Préparer avec IDs Stripe** : Combine les données
5. **09. Préparer requête SQL** : Prépare l'insertion de l'abonnement (inclut `temporary_password`)
6. **10. Créer abonnement client** : Insère l'abonnement dans la base
7. **10a. Générer mot de passe** : Génère un mot de passe aléatoire (12 caractères)
8. **10b. Préparer création Tenant et User** : Prépare les données
9. **10c. Créer Tenant et User** : Appelle l'API pour créer le Tenant et le User
10. **11. Formater réponse** : Retourne la réponse finale

### 2. Endpoint API `/api/clients/create-credentials`

- **Méthode** : `POST`
- **Authentification** : Header `X-TalosPrimes-N8N-Secret` (requête interne n8n)
- **Fonctionnalités** :
  - Crée un Tenant pour le client final (ou réutilise s'il existe)
  - Crée un User avec :
    - Email du client
    - Mot de passe hashé (bcrypt)
    - `mustChangePassword = true`
    - Role = `admin`
  - Stocke le mot de passe en clair dans l'abonnement (`temporary_password`)

### 3. Workflow `stripe-checkout-completed.json` (Webhook Stripe)

1. **01. Webhook Stripe** : Reçoit l'événement `checkout.session.completed`
2. **02. Extraire données** : Extrait `clientId`, `tenantId`, `subscriptionId`
3. **03. Validation données** : Vérifie que les données sont présentes
4. **04. Récupérer identifiants** : Appelle `/api/clients/get-credentials`
5. **05. Préparer email** : Prépare l'email avec les identifiants
6. **06. Envoyer email** : Envoie l'email via Resend
7. **07. Répondre au webhook** : Confirme la réception

### 4. Endpoint API `/api/clients/get-credentials`

- **Méthode** : `POST`
- **Authentification** : Header `X-TalosPrimes-N8N-Secret` (requête interne n8n)
- **Fonctionnalités** :
  - Récupère l'abonnement du client
  - Récupère le Tenant et le User associés
  - Retourne les identifiants (email + mot de passe temporaire)

## 🔑 Mot de passe temporaire

- **Longueur** : 12 caractères
- **Caractères** : `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*`
- **Stockage** :
  - **Hashé** : Dans la table `users.password_hash` (bcrypt)
  - **En clair** : Temporairement dans `client_subscriptions.temporary_password`
  - **Suppression** : Le mot de passe en clair devrait être supprimé après l'envoi de l'email (à implémenter)

## 📧 Email envoyé

L'email contient :
- **Email de connexion** : Email du client
- **Mot de passe temporaire** : Le mot de passe généré
- **Avertissement** : L'utilisateur devra changer le mot de passe à la première connexion
- **Bouton de connexion** : Lien vers `https://talosprimes.com/login`

## 🔐 Sécurité

- Le mot de passe est **hashé avec bcrypt** avant stockage dans la table `users`
- Le flag `mustChangePassword = true` force le changement de mot de passe
- Le mot de passe en clair n'est stocké que temporairement dans `temporary_password`

## 🔧 Configuration requise

### Dans n8n :

1. **Workflow `client-onboarding.json`** :
   - Credential "API TalosPrimes - Header Auth"
   - Credential "Postgres Supabase"

2. **Workflow `stripe-checkout-completed.json`** :
   - Credential "API TalosPrimes - Header Auth"
   - Credential "Resend API"
   - Webhook configuré dans Stripe Dashboard

### Dans Stripe Dashboard :

1. Aller dans **Developers > Webhooks**
2. Ajouter un endpoint : `https://n8n.talosprimes.com/webhook/stripe-checkout-completed`
3. Sélectionner l'événement : `checkout.session.completed`
4. Copier le **Signing Secret** et l'ajouter dans n8n si besoin

## 📝 Modifications du schéma Prisma

### User
- Ajout de `mustChangePassword Boolean @default(false)`

### ClientSubscription
- Ajout de `temporaryPassword String?` (stockage temporaire du mot de passe en clair)

## ⚠️ Important

- Le mot de passe en clair dans `temporary_password` devrait être **supprimé après l'envoi de l'email** pour des raisons de sécurité
- Pour implémenter cela, ajouter un node dans `stripe-checkout-completed.json` après l'envoi de l'email pour mettre `temporary_password = NULL`

## 🚀 Actions à faire

1. **Réimporter les workflows** dans n8n :
   - `client-onboarding.json`
   - `stripe-checkout-completed.json`

2. **Configurer le webhook Stripe** :
   - Ajouter l'endpoint dans Stripe Dashboard
   - Configurer l'événement `checkout.session.completed`

3. **Appliquer la migration Prisma** :
   ```bash
   cd packages/platform
   pnpm prisma db push
   pnpm prisma generate
   ```

4. **Tester le flux complet** :
   - Créer un espace client avec Stripe
   - Compléter le paiement
   - Vérifier que l'email est reçu avec les identifiants

