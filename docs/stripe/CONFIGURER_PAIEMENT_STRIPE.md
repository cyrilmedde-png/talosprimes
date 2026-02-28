# 💳 Configurer le paiement Stripe réel pour les clients

## 🎯 Objectif

Actuellement, le workflow crée un abonnement Stripe avec `payment_behavior: default_incomplete`, ce qui signifie que le client n'est **pas facturé immédiatement**. Il faut configurer Stripe pour facturer réellement le client.

## 📋 Options disponibles

### Option 1 : Stripe Checkout (RECOMMANDÉ pour SaaS)

**Comment ça marche :**
1. Créer une Session Stripe Checkout avec l'abonnement
2. Rediriger le client vers la page de paiement Stripe
3. Le client saisit ses informations de carte
4. Stripe facture automatiquement et active l'abonnement

**Avantages :**
- ✅ Pas besoin de gérer les formulaires de carte (PCI compliance)
- ✅ Stripe gère tout le processus
- ✅ Interface professionnelle
- ✅ Support de multiples méthodes de paiement

**Modifications nécessaires :**
- Ajouter un node "Stripe - Créer Session Checkout" après la création du prix
- Rediriger vers l'URL de checkout
- Gérer le webhook Stripe pour confirmer le paiement

### Option 2 : Payment Method attachée (Pour clients existants)

**Comment ça marche :**
1. Le client a déjà une méthode de paiement enregistrée
2. Créer l'abonnement avec `payment_behavior: error_if_incomplete`
3. Stripe facture immédiatement la méthode de paiement

**Avantages :**
- ✅ Facturation automatique immédiate
- ✅ Pas de redirection

**Inconvénients :**
- ❌ Nécessite que le client ait déjà une méthode de paiement

### Option 3 : PaymentIntent séparé (Pour paiements uniques)

**Comment ça marche :**
1. Créer un PaymentIntent pour le premier paiement
2. Rediriger vers Stripe Checkout pour ce paiement
3. Une fois payé, créer l'abonnement

**Avantages :**
- ✅ Contrôle total sur le flux de paiement

**Inconvénients :**
- ❌ Plus complexe à gérer

## 🔧 Solution recommandée : Stripe Checkout

### Étape 1 : Modifier le workflow n8n

Ajouter un node "Stripe - Créer Session Checkout" après "06. Stripe - Créer Prix" :

```javascript
// Node: "06b. Stripe - Créer Session Checkout"
POST https://api.stripe.com/v1/checkout/sessions

Body (form-urlencoded):
- success_url: https://talosprimes.com/clients?session_id={CHECKOUT_SESSION_ID}
- cancel_url: https://talosprimes.com/clients
- mode: subscription
- line_items[0][price]: {{ $('06. Stripe - Créer Prix').item.json.id }}
- line_items[0][quantity]: 1
- customer: {{ $('04. Stripe - Créer Customer').item.json.id }}
- metadata[clientId]: {{ $('01. Préparer données onboarding').item.json.clientId }}
- metadata[subscriptionId]: {{ $json.id }} (depuis l'abonnement)
```

### Étape 2 : Retourner l'URL de checkout

Modifier le node "13. Répondre au webhook" pour retourner l'URL de checkout :

```json
{
  "success": true,
  "requiresPayment": true,
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_xxxxx",
  "client": { ... },
  "subscription": { ... }
}
```

### Étape 3 : Rediriger le client

Dans le frontend, si `requiresPayment === true`, rediriger vers `checkoutUrl`.

### Étape 4 : Gérer le webhook Stripe

Créer un workflow n8n pour gérer `checkout.session.completed` :
- Vérifier que le paiement est réussi
- Activer l'abonnement dans la base de données
- Envoyer une confirmation au client

## 📝 Modifications actuelles

Le workflow a été modifié pour :
1. ✅ Corriger l'erreur JSON dans les notifications
2. ⚠️ Le paramètre `payment_behavior: default_incomplete` reste pour l'instant

**Pour activer le paiement réel :**
- Choisir une des options ci-dessus
- Implémenter selon le choix
- Tester en mode test Stripe d'abord

## 🔗 Ressources

- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

## ⚠️ Important

**Avant de passer en production :**
1. Tester en mode test Stripe
2. Configurer les webhooks Stripe
3. Gérer les cas d'échec de paiement
4. Implémenter la gestion des abonnements (annulation, renouvellement, etc.)

