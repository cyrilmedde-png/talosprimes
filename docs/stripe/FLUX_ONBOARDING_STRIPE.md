# Flux d'onboarding complet avec Stripe

## Vue d'ensemble

Le flux d'onboarding avec Stripe est maintenant entièrement fonctionnel et corrigé.

## Flux complet

### 1. Déclenchement de l'onboarding (Frontend)
```javascript
// L'utilisateur clique sur "Créer espace client" pour un client
POST /api/clients/:id/onboarding
{
  "nomPlan": "Plan Starter",
  "montantMensuel": 29.99,
  "modulesInclus": ["gestion_clients", "facturation", "suivi"],
  "dureeMois": 1,
  "avecStripe": true  // ← Important : active le flux Stripe
}
```

### 2. Workflow `client-onboarding` (n8n)
**Déclenché par** : `/api/clients/:id/onboarding`

**Actions** :
1. ✅ Génère un mot de passe temporaire
2. ✅ Crée l'abonnement en base de données (avec `temporaryPassword`)
3. ✅ Crée le Tenant pour le client
4. ✅ Crée l'User avec le mot de passe hashé
5. ✅ Crée le Customer Stripe
6. ✅ Crée le Product et Price Stripe
7. ✅ Crée la Session Checkout Stripe
8. ✅ Retourne l'URL de paiement Stripe

**Résultat** :
```json
{
  "success": true,
  "message": "Espace client créé. Redirection vers le paiement...",
  "stripe": {
    "customerId": "cus_xxx",
    "checkoutSessionId": "cs_xxx",
    "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_xxx",
    "requiresPayment": true
  },
  "credentials": {
    "tenantId": "xxx",
    "userId": "xxx",
    "email": "client@example.com",
    "password": "motdepasse123"  // Mot de passe temporaire
  }
}
```

### 3. Redirection vers Stripe (Frontend)
```javascript
// Le frontend redirige le client vers Stripe pour payer
window.location.href = response.stripe.checkoutUrl;
```

### 4. Paiement sur Stripe
- Le client saisit ses informations de carte bancaire
- Le paiement est traité par Stripe
- Stripe redirige vers : `https://talosprimes.com/clients?checkout=success&clientId=xxx&session_id=cs_xxx`

### 5. Webhook Stripe → n8n
**Stripe envoie** : `checkout.session.completed` → `https://n8n.talosprimes.com/webhook/stripe-checkout-completed`

### 6. Workflow `stripe-checkout-completed` (n8n)
**Déclenché par** : Webhook Stripe

**Actions** :
1. ✅ Reçoit l'événement `checkout.session.completed`
2. ✅ Extrait `clientId`, `tenantId`, `subscriptionId` des metadata
3. ✅ Appelle `/api/clients/get-credentials` pour récupérer le mot de passe temporaire
4. ✅ Prépare l'email avec un template HTML professionnel
5. ✅ Envoie l'email via Resend avec :
   - Email du client
   - Mot de passe temporaire
   - Lien de connexion : `https://talosprimes.com/login`

**Email envoyé** :
```
Objet : Bienvenue sur TalosPrimes - Vos identifiants de connexion

Contenu :
- Confirmation du paiement
- Email de connexion
- Mot de passe temporaire
- Bouton "Se connecter maintenant"
- Avertissement de changer le mot de passe
```

## Configuration requise

### 1. Sur le serveur (déploiement)
```bash
cd /var/www/talosprimes
git pull
pm2 restart platform
```

### 2. Dans n8n

#### A. Importer les workflows
1. Allez sur `https://n8n.talosprimes.com`
2. Importez `client-onboarding.json` (si pas déjà fait)
3. **Importez `stripe-checkout-completed.json`**
4. Activez les deux workflows

#### B. Configurer les credentials dans n8n
- **Stripe API** : Clé API Stripe (`sk_test_...` ou `sk_live_...`)
- **Resend API** : Clé API Resend pour l'envoi d'emails
- **TalosPrimes API Auth** : Header `x-talosprimes-n8n-secret` avec votre secret

### 3. Dans Stripe Dashboard

1. Allez dans **Developers** → **Webhooks**
2. Cliquez sur **Add endpoint**
3. URL : `https://n8n.talosprimes.com/webhook/stripe-checkout-completed`
4. Événements à écouter : `checkout.session.completed`
5. Copiez le **Signing secret** (pour vérifier les webhooks - optionnel)

### 4. Configurer Resend

1. Créez un compte sur [resend.com](https://resend.com)
2. Ajoutez et vérifiez votre domaine : `talosprimes.com`
3. Créez une clé API
4. Configurez l'email d'envoi : `onboarding@talosprimes.com`

## URLs de redirection après paiement

Le workflow `client-onboarding` configure :
- **Success** : `https://talosprimes.com/clients?checkout=success&clientId={id}&session_id={CHECKOUT_SESSION_ID}`
- **Cancel** : `https://talosprimes.com/clients?checkout=cancelled&clientId={id}`

Le frontend doit gérer ces URLs pour :
- Afficher un message de succès
- Informer le client qu'il va recevoir un email avec ses identifiants
- Proposer un bouton pour retourner à la liste des clients

## Test complet

### 1. Créer un lead
```bash
# Via l'interface ou API
POST /api/leads
{
  "nom": "Test",
  "prenom": "Client",
  "email": "test@example.com",
  "telephone": "+33600000000"
}
```

### 2. Convertir en client
```bash
POST /api/clients/create-from-lead
{
  "leadId": "xxx"
}
```

### 3. Déclencher l'onboarding avec Stripe
```bash
POST /api/clients/:id/onboarding
{
  "avecStripe": true,
  "nomPlan": "Plan Test",
  "montantMensuel": 1.00  # Montant test
}
```

### 4. Vérifier
- ✅ Recevoir l'URL Stripe Checkout
- ✅ Payer avec une carte test Stripe : `4242 4242 4242 4242`
- ✅ Être redirigé vers l'application
- ✅ Recevoir l'email avec les identifiants
- ✅ Se connecter avec les identifiants reçus

## Cartes de test Stripe

```
Succès : 4242 4242 4242 4242
Échec :  4000 0000 0000 0002
3D Secure : 4000 0027 6000 3184

CVV : n'importe quel 3 chiffres
Date : n'importe quelle date future
```

## Troubleshooting

### Email non reçu
1. Vérifier que Resend est configuré
2. Vérifier que le domaine est vérifié
3. Checker les logs n8n du workflow `stripe-checkout-completed`
4. Vérifier la boîte spam

### Webhook Stripe non reçu
1. Vérifier que le webhook est configuré dans Stripe Dashboard
2. Vérifier que l'URL est correcte
3. Tester le webhook avec "Send test webhook" dans Stripe
4. Checker les logs n8n

### Mot de passe temporaire non trouvé
1. Vérifier que l'abonnement a été créé avec `temporaryPassword`
2. Checker les logs de `/api/clients/get-credentials`
3. Vérifier que le clientId et tenantId sont corrects

## Résumé des changements effectués

✅ Correction du workflow `client-onboarding` (flux parallèle pour conserver les données)
✅ Correction du workflow `stripe-checkout-completed` (utilisation de `$node`)
✅ Suppression de l'émission automatique de `client.onboarding` lors de la création
✅ Correction du service d'événements (pas d'erreur si aucun workflow configuré)

Le flux est maintenant **complet et fonctionnel** !

