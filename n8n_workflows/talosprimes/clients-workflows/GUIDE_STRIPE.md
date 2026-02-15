# Guide - Intégration Stripe pour les abonnements clients

Ce guide explique comment intégrer Stripe pour gérer les paiements des abonnements clients.

## 📋 Prérequis

1. Compte Stripe créé
2. Clés API Stripe (Test ou Live)
3. Workflow n8n `client-onboarding` configuré

## 🔧 Configuration

### 1. Installer le node Stripe dans n8n

Le workflow utilise des requêtes HTTP vers l'API Stripe, donc pas besoin d'installer un node spécifique.

### 2. Configurer les credentials Stripe

1. Dans n8n, allez dans **Settings** → **Credentials**
2. Cliquez sur **Add Credential**
3. Recherchez et sélectionnez **Header Auth**
4. Configurez avec :
   ```
   Name: Stripe API Key
   Type: Header Auth
   Header Name: Authorization
   Header Value: Bearer sk_test_... (votre clé secrète Stripe)
   ```
5. Donnez un nom : **"Stripe API"**
6. Sauvegardez

### 3. Modifier le workflow client-onboarding

Le workflow doit être modifié pour ajouter les étapes Stripe après la validation et avant la création de l'abonnement en base.

**Étapes à ajouter :**

1. **Créer un Customer Stripe** (après "01. Préparer données onboarding")
   - URL : `https://api.stripe.com/v1/customers`
   - Méthode : POST
   - Headers : Authorization avec credential Stripe API
   - Body : 
     ```json
     {
       "email": "{{ $json.clientData.email }}",
       "name": "{{ $json.clientData.nom || $json.clientData.raisonSociale }}",
       "metadata": {
         "clientId": "{{ $json.clientId }}",
         "tenantId": "{{ $json.tenantId }}"
       }
     }
     ```

2. **Créer un Produit Stripe** (après création du customer)
   - URL : `https://api.stripe.com/v1/products`
   - Méthode : POST
   - Body :
     ```json
     {
       "name": "{{ $json.plan.nomPlan }}",
       "metadata": {
         "modules": "{{ $json.plan.modulesInclus.join(',') }}"
       }
     }
     ```

3. **Créer un Prix Stripe** (après création du produit)
   - URL : `https://api.stripe.com/v1/prices`
   - Méthode : POST
   - Body :
     ```json
     {
       "product": "{{ $json.product.id }}",
       "unit_amount": {{ Math.round($json.plan.montantMensuel * 100) }},
       "currency": "eur",
       "recurring": {
         "interval": "month",
         "interval_count": {{ $json.plan.dureeMois }}
       }
     }
     ```

4. **Créer un Abonnement Stripe** (après création du prix)
   - URL : `https://api.stripe.com/v1/subscriptions`
   - Méthode : POST
   - Body :
     ```json
     {
       "customer": "{{ $json.customer.id }}",
       "items": [{
         "price": "{{ $json.price.id }}"
       }],
       "payment_behavior": "default_incomplete",
       "payment_settings": {
         "save_default_payment_method": "on_subscription"
       },
       "metadata": {
         "clientId": "{{ $json.clientId }}",
         "planName": "{{ $json.plan.nomPlan }}"
       }
     }
     ```

5. **Modifier la requête SQL** pour inclure les IDs Stripe :
   - Ajouter `id_client_stripe` et `id_abonnement_stripe` dans la requête INSERT

### 4. Mettre à jour le schéma Prisma

Le schéma a déjà été mis à jour avec les champs :
- `idClientStripe` : ID du customer Stripe
- `idAbonnementStripe` : ID de l'abonnement Stripe

Exécutez la migration :
```bash
cd packages/platform
pnpm prisma db push
pnpm prisma generate
```

## 💳 Options de paiement

### Option 1 : Lien de paiement (Payment Link)

Après la création de l'abonnement Stripe, vous pouvez générer un lien de paiement :

```json
POST https://api.stripe.com/v1/payment_links
{
  "line_items": [{
    "price": "{{ $json.price.id }}",
    "quantity": 1
  }],
  "subscription_data": {
    "metadata": {
      "clientId": "{{ $json.clientId }}"
    }
  }
}
```

Ensuite, envoyez ce lien au client par email.

### Option 2 : Checkout Session

Créer une session de checkout Stripe qui redirige vers une page de paiement Stripe.

### Option 3 : Méthode de paiement par défaut

Demander au client d'ajouter une carte lors de la création de l'espace client, puis créer l'abonnement avec `payment_behavior: "default_incomplete"` et envoyer une facture.

## 📧 Envoi du lien de paiement

Après avoir créé l'abonnement Stripe, vous pouvez envoyer un email au client avec :
- Le lien de paiement
- Les détails de l'abonnement
- Les modules inclus

## 🔄 Gestion des webhooks Stripe

Pour gérer les événements Stripe (paiement réussi, échec, etc.), créez un workflow n8n qui écoute les webhooks Stripe :

1. Créer un webhook dans Stripe Dashboard
2. Pointer vers : `https://n8n.talosprimes.com/webhook/stripe-events`
3. Événements à écouter :
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

## 📚 Ressources

- [Documentation API Stripe - Customers](https://stripe.com/docs/api/customers)
- [Documentation API Stripe - Subscriptions](https://stripe.com/docs/api/subscriptions)
- [Documentation API Stripe - Products](https://stripe.com/docs/api/products)

