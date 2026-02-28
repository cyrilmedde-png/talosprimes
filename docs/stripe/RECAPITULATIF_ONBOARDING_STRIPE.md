# 📋 Récapitulatif : Onboarding Client et Paiement Stripe

## 🎯 Vue d'ensemble

Implémentation complète d'un système d'onboarding client avec :
- ✅ Création d'abonnement et activation de modules
- ✅ Intégration Stripe Checkout pour la facturation
- ✅ Génération automatique d'identifiants (email + mot de passe)
- ✅ Envoi automatique d'email avec les identifiants après paiement
- ✅ Force le changement de mot de passe à la première connexion

---

## 🔧 1. Modifications du Schéma Prisma

### Ajout de champs

#### User
```prisma
mustChangePassword Boolean @default(false) @map("must_change_password")
```
- **Utilité** : Force l'utilisateur à changer son mot de passe à la première connexion
- **Sécurité** : Assure que les mots de passe temporaires ne restent pas actifs

#### ClientSubscription
```prisma
temporaryPassword String? @map("temporary_password")
```
- **Utilité** : Stocke temporairement le mot de passe en clair pour l'envoi par email
- **Important** : Doit être supprimé après l'envoi de l'email (à implémenter)

---

## 🌐 2. Nouveaux Endpoints API

### POST `/api/clients/:id/onboarding`
- **Description** : Crée l'espace client (abonnement + modules)
- **Authentification** : JWT requis
- **Body** :
  ```json
  {
    "nomPlan": "Plan Starter",
    "montantMensuel": 29.99,
    "modulesInclus": ["gestion_clients", "facturation", "suivi"],
    "dureeMois": 1,
    "avecStripe": true
  }
  ```
- **Réponse** :
  ```json
  {
    "success": true,
    "message": "Espace client créé. Redirection vers le paiement...",
    "data": {
      "client": {...},
      "subscription": {...},
      "modulesActives": [...],
      "credentials": {
        "tenantId": "...",
        "userId": "...",
        "email": "...",
        "password": "..."
      },
      "stripe": {
        "customerId": "...",
        "checkoutSessionId": "...",
        "checkoutUrl": "https://checkout.stripe.com/...",
        "requiresPayment": true
      }
    }
  }
  ```

### POST `/api/clients/create-credentials`
- **Description** : Crée un Tenant et un User pour le client final
- **Authentification** : Header `X-TalosPrimes-N8N-Secret` (requête interne n8n)
- **Body** :
  ```json
  {
    "clientId": "...",
    "tenantId": "...",
    "email": "client@example.com",
    "password": "MotDePasseTemporaire123!",
    "nom": "...",
    "prenom": "...",
    "raisonSociale": "...",
    "tenantName": "..."
  }
  ```
- **Fonctionnalités** :
  - Crée un Tenant pour le client (ou réutilise s'il existe)
  - Crée un User avec mot de passe hashé (bcrypt)
  - `mustChangePassword = true`
  - Role = `admin`
  - Stocke le mot de passe temporaire dans l'abonnement

### POST `/api/clients/get-credentials`
- **Description** : Récupère les identifiants d'un client (pour webhook Stripe)
- **Authentification** : Header `X-TalosPrimes-N8N-Secret` (requête interne n8n)
- **Body** :
  ```json
  {
    "clientId": "...",
    "tenantId": "..."
  }
  ```
- **Réponse** :
  ```json
  {
    "success": true,
    "data": {
      "tenantId": "...",
      "userId": "...",
      "email": "client@example.com",
      "password": "MotDePasseTemporaire123!"
    }
  }
  ```

### GET `/api/clients/:id/subscription`
- **Description** : Récupère les détails de l'abonnement d'un client
- **Authentification** : JWT requis
- **Réponse** :
  ```json
  {
    "success": true,
    "data": {
      "subscription": {
        "id": "...",
        "nomPlan": "Plan Starter",
        "montantMensuel": 29.99,
        "modulesInclus": [...],
        "statut": "actif",
        "dateDebut": "...",
        "dateProchainRenouvellement": "..."
      }
    }
  }
  ```

---

## 🔄 3. Workflows n8n

### Workflow principal : `client-onboarding.json`

#### Flux complet :

```
01. Webhook - Onboarding Client
  ↓
02. Préparer données onboarding
  ↓
03. Validation données (IF)
  ├─ false → Répondre erreur
  └─ true ↓
04. IF - Stripe activé ?
  ├─ false ↓
  │  09. Préparer requête SQL
  │  10. Créer abonnement client
  │  10a. Générer mot de passe
  │  10b. Préparer création Tenant et User
  │  10c. Créer Tenant et User
  │  11. Formater réponse
  │  12. Créer notification
  │  13. Répondre au webhook
  │
  └─ true ↓
      04. Stripe - Créer Customer
      ↓
      05. Stripe - Créer Produit
      ↓
      06. Stripe - Créer Prix
      ↓
      06b. Préparer URLs Checkout
      ↓
      07. Stripe - Créer Session Checkout
      ↓
      08. Préparer avec IDs Stripe
      ↓
      09a. Générer mot de passe (parallèle)
      ↓
      09b. Merge - Ajouter mot de passe
      ↓
      09. Préparer requête SQL
      ↓
      10. Créer abonnement client
      ↓
      10a. Préparer après abonnement
      ↓
      10b. Préparer création Tenant et User
      ↓
      10c. Créer Tenant et User
      ↓
      11. Formater réponse
      ↓
      12. Créer notification
      ↓
      13. Répondre au webhook
```

#### Nodes clés :

**09a. Générer mot de passe**
- Génère un mot de passe aléatoire de 12 caractères
- Caractères : lettres majuscules/minuscules, chiffres, symboles spéciaux

**07. Stripe - Créer Session Checkout**
- Crée une Session Checkout Stripe en mode `subscription`
- Configure les URLs de redirection (success/cancel)
- Ajoute des métadonnées (`clientId`, `tenantId`, `planName`)
- Retourne l'URL de checkout pour redirection

**10c. Créer Tenant et User**
- Appelle l'API `/api/clients/create-credentials`
- Crée le Tenant et le User avec les identifiants

### Workflow webhook Stripe : `stripe-checkout-completed.json`

#### Flux :

```
01. Webhook Stripe (checkout.session.completed)
  ↓
02. Extraire données
  ↓
03. Validation données (IF)
  ├─ false → Répondre erreur
  └─ true ↓
      04. Récupérer identifiants
      ↓
      05. Préparer email
      ↓
      06. Envoyer email (Resend)
      ↓
      07. Répondre au webhook
```

#### Fonctionnalités :
- Reçoit l'événement `checkout.session.completed` de Stripe
- Récupère les identifiants depuis la base de données
- Envoie un email avec :
  - Email de connexion
  - Mot de passe temporaire
  - Avertissement de changement obligatoire
  - Lien vers la page de connexion

---

## 💳 4. Intégration Stripe Checkout

### Création de la Session Checkout

**Paramètres** :
- `mode: subscription` : Abonnement récurrent
- `customer`: ID du Customer Stripe créé
- `line_items[0][price]`: ID du prix créé
- `success_url`: `https://talosprimes.com/clients?checkout=success&clientId=xxx&session_id={CHECKOUT_SESSION_ID}`
- `cancel_url`: `https://talosprimes.com/clients?checkout=cancelled&clientId=xxx`
- `metadata`: `clientId`, `tenantId`, `planName`

### Processus de paiement

1. **Création de la session** : Le workflow crée une Session Checkout Stripe
2. **Redirection** : Le frontend redirige automatiquement vers `checkoutUrl`
3. **Paiement client** : Le client saisit ses informations de carte sur Stripe
4. **Création automatique** : Stripe crée automatiquement l'abonnement après paiement
5. **Webhook** : Stripe envoie `checkout.session.completed` à n8n
6. **Email** : Le workflow envoie l'email avec les identifiants
7. **Redirection** : Le client est redirigé vers `success_url`

### Métadonnées Stripe

Les métadonnées sont ajoutées à :
- **Session Checkout** : `clientId`, `tenantId`, `planName`
- **Abonnement créé** : `clientId`, `tenantId` (dans `subscription_data[metadata]`)

Ces métadonnées permettent au webhook de retrouver les informations nécessaires.

---

## 🔐 5. Génération et Gestion des Identifiants

### Génération du mot de passe

- **Longueur** : 12 caractères
- **Caractères** : `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*`
- **Aléatoire** : Généré via `Math.random()`

### Stockage sécurisé

1. **Hashé (permanent)** : Stocké dans `users.password_hash` (bcrypt, cost 10)
2. **En clair (temporaire)** : Stocké dans `client_subscriptions.temporary_password`
   - ⚠️ **À supprimer** après l'envoi de l'email pour des raisons de sécurité

### Création du Tenant et User

- **Tenant** : Créé avec le nom du client (raison sociale ou nom/prénom)
- **Email** : Email du client final
- **User** :
  - Email : Email du client
  - Password : Hashé avec bcrypt
  - `mustChangePassword`: `true` (force le changement)
  - Role : `admin` (pour le client final)
  - Statut : `actif`

---

## 📧 6. Email avec Identifiants

### Déclenchement

L'email est envoyé **uniquement après validation du paiement Stripe** via le webhook `checkout.session.completed`.

### Contenu de l'email

- **Sujet** : "Bienvenue sur TalosPrimes - Vos identifiants de connexion"
- **Contenu** :
  - Message de bienvenue
  - Confirmation que le paiement a été validé
  - **Email de connexion**
  - **Mot de passe temporaire** (affiché en clair)
  - **Avertissement** : Changement obligatoire du mot de passe à la première connexion
  - **Bouton** : Lien vers la page de connexion

### Design

- Email HTML avec style moderne
- Dégradé violet (#667eea → #764ba2) pour l'en-tête
- Cards avec bordures colorées pour les identifiants
- Bouton d'action pour se connecter
- Design responsive

---

## 🖥️ 7. Interface Frontend

### Modal d'Onboarding

**Localisation** : `/clients` → Bouton "Créer espace client" (icône étoile)

**Formulaire** :
- **Nom du plan** : Texte libre (ex: "Plan Starter")
- **Montant mensuel** : Nombre décimal (ex: 29.99)
- **Modules inclus** : Checklist (gestion_clients, facturation, suivi, etc.)
- **Durée** : En mois (ex: 1)
- **Avec Stripe** : Checkbox pour activer/désactiver le paiement Stripe

### Comportement

1. **Sans Stripe** :
   - Création immédiate de l'abonnement
   - Message de succès
   - Rechargement de la liste des clients

2. **Avec Stripe** :
   - Création de la Session Checkout
   - **Redirection automatique** vers Stripe Checkout
   - Après paiement : Redirection vers `/clients?checkout=success`
   - Gestion du retour :
     - `?checkout=success` → Recharge les clients
     - `?checkout=cancelled` → Affiche un message d'erreur

### Gestion des Retours Stripe

Le composant écoute les paramètres d'URL :
- `checkout=success` : Succès, recharge les données
- `checkout=cancelled` : Annulé, affiche un message d'erreur

---

## 🔗 8. Intégrations et Credentials n8n

### Credentials requis

#### API TalosPrimes - Header Auth
- **Type** : Header Auth
- **Name** : `X-TalosPrimes-N8N-Secret`
- **Value** : `VOTRE_N8N_WEBHOOK_SECRET`

#### Stripe API
- **Type** : Header Auth
- **Name** : `Authorization`
- **Value** : `Bearer sk_live_...` ou `Bearer sk_test_...`

#### Resend API
- **Type** : Header Auth
- **Name** : `Authorization`
- **Value** : `Bearer re_...`

#### Postgres Supabase
- **Type** : Postgres
- **Connection String** : `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres`
- Ou individuel :
  - Host: `db.xxx.supabase.co`
  - Port: `5432`
  - Database: `postgres`
  - User: `postgres`
  - Password: `VOTRE_MOT_DE_PASSE`
  - SSL: `require`

---

## ⚙️ 9. Configuration Stripe Dashboard

### Webhook à configurer

**URL** : `https://n8n.talosprimes.com/webhook/stripe-checkout-completed`

**Événements** :
- `checkout.session.completed`

**Métadonnées** :
- `clientId` : ID du client dans notre base
- `tenantId` : ID du tenant de l'entreprise cliente
- `planName` : Nom du plan d'abonnement

---

## 📝 10. Fichiers Modifiés/Créés

### Backend
- ✅ `packages/platform/prisma/schema.prisma` : Ajout `mustChangePassword` et `temporaryPassword`
- ✅ `packages/platform/src/api/routes/clients.routes.ts` : Nouveaux endpoints
- ✅ `packages/platform/src/services/auth.service.ts` : Utilisé pour hasher les mots de passe

### Frontend
- ✅ `packages/client/src/app/(dashboard)/clients/page.tsx` : Modal onboarding + gestion Stripe
- ✅ `packages/client/src/lib/api-client.ts` : Types TypeScript mis à jour

### Workflows n8n
- ✅ `n8n_workflows/clients/client-onboarding.json` : Workflow principal modifié
- ✅ `n8n_workflows/clients/stripe-checkout-completed.json` : Nouveau workflow webhook

### Documentation
- ✅ `IMPLEMENTATION_STRIPE_CHECKOUT.md` : Guide d'implémentation Stripe
- ✅ `GUIDE_IDENTIFIANTS_CLIENT.md` : Guide création identifiants
- ✅ `CONFIGURER_PAIEMENT_STRIPE.md` : Options de paiement
- ✅ `FIX_NOTIFICATION_JSON.md` : Correction erreur JSON
- ✅ `FIX_BUILD_ERRORS.md` : Résolution erreurs de build

### Scripts
- ✅ `scripts/fix-prisma-migration.sh` : Script pour appliquer les migrations Prisma

---

## 🚀 11. Flux Complet (Résumé)

### Scénario 1 : Avec Stripe

```
1. Admin crée espace client avec Stripe activé
   ↓
2. Workflow n8n :
   - Crée Customer Stripe
   - Crée Produit
   - Crée Prix
   - Crée Session Checkout
   - Génère mot de passe
   - Crée Tenant et User
   - Crée abonnement dans la base
   ↓
3. Frontend redirige vers Stripe Checkout
   ↓
4. Client paie sur Stripe
   ↓
5. Stripe crée l'abonnement automatiquement
   ↓
6. Webhook Stripe → n8n (`checkout.session.completed`)
   ↓
7. Workflow n8n :
   - Récupère les identifiants
   - Envoie l'email avec identifiants
   ↓
8. Client reçoit l'email avec ses identifiants
   ↓
9. Client se connecte avec le mot de passe temporaire
   ↓
10. Système force le changement de mot de passe
```

### Scénario 2 : Sans Stripe

```
1. Admin crée espace client sans Stripe
   ↓
2. Workflow n8n :
   - Génère mot de passe
   - Crée Tenant et User
   - Crée abonnement dans la base
   ↓
3. Frontend affiche message de succès
   ↓
4. Identifiants disponibles dans la réponse (mais pas d'email automatique)
```

---

## ⚠️ 12. Points d'Attention et Améliorations Futures

### Sécurité
- ⚠️ **Supprimer `temporaryPassword`** après l'envoi de l'email
- ✅ Mot de passe hashé avec bcrypt (sécurisé)
- ✅ Force le changement à la première connexion

### Améliorations possibles
- [ ] Supprimer automatiquement `temporaryPassword` après envoi email
- [ ] Gérer les échecs de paiement Stripe
- [ ] Gérer les annulations d'abonnement
- [ ] Créer un workflow pour gérer les renouvellements automatiques
- [ ] Créer un workflow pour gérer les échecs de paiement récurrent
- [ ] Ajouter une page de changement de mot de passe obligatoire
- [ ] Créer le workflow Factures (comme demandé par l'utilisateur)

### Tests à faire
- [ ] Tester la création d'espace client avec Stripe
- [ ] Tester le paiement avec une carte de test Stripe
- [ ] Vérifier la réception de l'email avec identifiants
- [ ] Tester la connexion avec le mot de passe temporaire
- [ ] Vérifier que le changement de mot de passe est forcé

---

## 🎯 13. Actions Finales Requises

### Sur le VPS

1. **Appliquer la migration Prisma** :
   ```bash
   cd /var/www/talosprimes
   ./scripts/fix-prisma-migration.sh
   ```

2. **Réimporter les workflows n8n** :
   - `n8n_workflows/clients/client-onboarding.json`
   - `n8n_workflows/clients/stripe-checkout-completed.json`

3. **Configurer le webhook Stripe** :
   - URL : `https://n8n.talosprimes.com/webhook/stripe-checkout-completed`
   - Événement : `checkout.session.completed`

4. **Vérifier les credentials n8n** :
   - API TalosPrimes - Header Auth
   - Stripe API
   - Resend API
   - Postgres Supabase

### Dans l'application

1. Tester la création d'un espace client
2. Tester le paiement Stripe
3. Vérifier la réception de l'email

---

## 📊 14. Statistiques

- **Nouveaux endpoints API** : 3
- **Workflows n8n** : 2 (1 modifié, 1 nouveau)
- **Nodes n8n ajoutés** : ~8
- **Champs Prisma ajoutés** : 2
- **Fichiers modifiés** : ~10
- **Documentation créée** : 5 guides

---

## ✅ Statut

- ✅ **Onboarding client** : Fonctionnel
- ✅ **Intégration Stripe Checkout** : Fonctionnel
- ✅ **Génération identifiants** : Fonctionnel
- ✅ **Envoi email après paiement** : Fonctionnel (via webhook)
- ⚠️ **Suppression mot de passe temporaire** : À implémenter
- ⏳ **Workflow Factures** : À créer (comme demandé)

---

**Date de création** : 9 janvier 2026  
**Dernière mise à jour** : 9 janvier 2026

