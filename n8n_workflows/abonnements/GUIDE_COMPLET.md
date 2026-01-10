# Guide Complet - Gestion des Abonnements

## Vue d'ensemble

Le système de gestion des abonnements TalosPrimes permet de gérer le cycle de vie complet des abonnements clients : renouvellement, annulation, changement de plan, et suspension.

## Architecture

### Workflows n8n disponibles

1. **subscription-renewal** - Renouvellement automatique
2. **subscription-cancelled** - Annulation d'abonnement
3. **subscription-upgrade** - Changement de plan (upgrade/downgrade)
4. **subscription-suspended** - Suspension pour impayé

### Routes API backend

- `POST /api/subscriptions/renew` - Renouveler un abonnement
- `POST /api/subscriptions/cancel` - Annuler un abonnement
- `POST /api/subscriptions/upgrade` - Changer de plan
- `POST /api/subscriptions/suspend` - Suspendre un abonnement
- `POST /api/subscriptions/reactivate` - Réactiver un abonnement suspendu
- `GET /api/subscriptions/:id` - Récupérer un abonnement
- `GET /api/subscriptions` - Liste des abonnements

---

## 1. Renouvellement automatique

### Workflow : `subscription-renewal.json`

**Déclenchement** : Automatique ou manuel via API

**Actions** :
1. ✅ Récupère l'abonnement actif
2. ✅ Vérifie le statut Stripe (si configuré)
3. ✅ Calcule la nouvelle date de renouvellement (+1 mois)
4. ✅ Met à jour l'abonnement en base
5. ✅ Crée une facture pour la période
6. ✅ Retourne le résultat

### Appel API

```bash
POST /api/subscriptions/renew
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "subscriptionId": "uuid-de-l-abonnement"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Abonnement renouvelé avec succès",
  "data": {
    "subscription": { ... },
    "invoice": { ... }
  }
}
```

### Configuration d'un CRON pour renouvellement automatique

Dans n8n, ajoutez un workflow avec un trigger CRON :
```javascript
// Tous les jours à 2h du matin
0 2 * * *
```

Le workflow interroge la base pour trouver les abonnements à renouveler :
```sql
SELECT id, tenant_id 
FROM client_subscriptions 
WHERE statut = 'actif' 
  AND date_prochain_renouvellement <= CURRENT_DATE;
```

Puis appelle `/api/subscriptions/renew` pour chaque abonnement.

---

## 2. Annulation d'abonnement

### Workflow : `subscription-cancelled.json`

**Déclenchement** : Manuel via API

**Actions** :
1. ✅ Récupère l'abonnement
2. ✅ Annule dans Stripe (si configuré)
3. ✅ Met à jour le statut à "annulé"
4. ✅ Envoie un email de confirmation
5. ✅ Retourne le résultat

### Appel API

```bash
POST /api/subscriptions/cancel
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "subscriptionId": "uuid-de-l-abonnement",
  "reason": "Client ne souhaite plus utiliser le service",
  "cancelAtPeriodEnd": false  // true = annuler à la fin de la période
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Abonnement annulé avec succès",
  "data": {
    "subscription": { ... }
  }
}
```

### Email envoyé

Le client reçoit un email de confirmation avec :
- Détails de l'abonnement annulé
- Date d'annulation
- Raison de l'annulation
- Possibilité de réactivation

---

## 3. Changement de plan (Upgrade/Downgrade)

### Workflow : `subscription-upgrade.json`

**Déclenchement** : Manuel via API

**Actions** :
1. ✅ Récupère l'abonnement actuel
2. ✅ Calcule la différence de prix
3. ✅ Calcule le prorata pour les jours restants
4. ✅ Met à jour dans Stripe (si configuré)
5. ✅ Met à jour en base de données
6. ✅ Envoie un email de confirmation
7. ✅ Retourne le résultat avec le prorata

### Appel API

```bash
POST /api/subscriptions/upgrade
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "subscriptionId": "uuid-de-l-abonnement",
  "nouveauPlan": {
    "nomPlan": "Plan Premium",
    "montantMensuel": 49.99,
    "modulesInclus": ["gestion_clients", "facturation", "suivi", "analytics"],
    "dureeMois": 1
  }
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Abonnement mis à jour avec succès",
  "data": {
    "subscription": { ... },
    "prorata": {
      "daysRemaining": 15,
      "ratio": 0.5,
      "amount": 10.00
    }
  }
}
```

### Calcul du prorata

**Formule** :
```
Différence de prix = Nouveau prix - Ancien prix
Jours restants = Date de renouvellement - Aujourd'hui
Ratio = Jours restants / 30
Prorata = Différence × Ratio
```

**Exemple** :
- Ancien plan : 29,99€
- Nouveau plan : 49,99€
- Différence : 20€
- Jours restants : 15 jours
- Prorata : 20€ × (15/30) = 10€

---

## 4. Suspension d'abonnement

### Workflow : `subscription-suspended.json`

**Déclenchement** : Manuel via API ou automatique (impayé)

**Actions** :
1. ✅ Récupère l'abonnement
2. ✅ Change le statut à "suspendu"
3. ✅ Désactive l'accès du client
4. ✅ Envoie un email d'avertissement
5. ✅ Crée une notification pour l'admin
6. ✅ Retourne le résultat

### Appel API

```bash
POST /api/subscriptions/suspend
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "subscriptionId": "uuid-de-l-abonnement",
  "reason": "Paiement en retard de 30 jours"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Abonnement suspendu avec succès",
  "data": {
    "subscription": { ... },
    "client": { ... }
  }
}
```

### Réactivation

```bash
POST /api/subscriptions/reactivate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "subscriptionId": "uuid-de-l-abonnement"
}
```

---

## Installation et Configuration

### 1. Déployer le code

```bash
# Sur votre machine locale
cd /path/to/talosprimes
git add -A
git commit -m "Add: Système complet de gestion des abonnements"
git push

# Sur le serveur VPS
cd /var/www/talosprimes
git pull
pm2 restart platform
```

### 2. Configurer les WorkflowLinks

```bash
cd /var/www/talosprimes/packages/platform
pnpm tsx scripts/setup-subscriptions-workflows.ts
```

### 3. Importer les workflows dans n8n

1. Allez sur `https://n8n.talosprimes.com`
2. Pour chaque fichier JSON dans `n8n_workflows/abonnements/` :
   - Cliquez sur **"Import Workflow"**
   - Sélectionnez le fichier
   - Sauvegardez
   - **Activez** le workflow

Workflows à importer :
- ✅ `subscription-renewal.json`
- ✅ `subscription-cancelled.json`
- ✅ `subscription-upgrade.json`
- ✅ `subscription-suspended.json`

### 4. Configurer les credentials dans n8n

Assurez-vous que ces credentials sont configurés :
- **Postgres Supabase** - Connexion à la base de données
- **Stripe API** - Clé API Stripe (si utilisé)
- **Resend API** - Pour l'envoi d'emails
- **TalosPrimes API Auth** - Header secret pour les appels internes

---

## Tests

### Test 1 : Renouvellement

```bash
# 1. Créer un abonnement test
POST /api/clients/:id/onboarding
{
  "nomPlan": "Plan Test",
  "montantMensuel": 1.00,
  "avecStripe": false
}

# 2. Renouveler l'abonnement
POST /api/subscriptions/renew
{
  "subscriptionId": "uuid-retourné"
}

# 3. Vérifier
GET /api/subscriptions/:id
```

### Test 2 : Changement de plan

```bash
POST /api/subscriptions/upgrade
{
  "subscriptionId": "uuid",
  "nouveauPlan": {
    "nomPlan": "Plan Premium",
    "montantMensuel": 49.99,
    "modulesInclus": ["gestion_clients", "facturation", "analytics"]
  }
}
```

### Test 3 : Annulation

```bash
POST /api/subscriptions/cancel
{
  "subscriptionId": "uuid",
  "reason": "Test d'annulation"
}
```

### Test 4 : Suspension et réactivation

```bash
# Suspendre
POST /api/subscriptions/suspend
{
  "subscriptionId": "uuid",
  "reason": "Test de suspension"
}

# Réactiver
POST /api/subscriptions/reactivate
{
  "subscriptionId": "uuid"
}
```

---

## Statuts des abonnements

| Statut | Description | Actions possibles |
|--------|-------------|-------------------|
| `actif` | Abonnement actif et fonctionnel | Renouveler, Upgrader, Annuler, Suspendre |
| `suspendu` | Temporairement désactivé | Réactiver, Annuler |
| `annule` | Définitivement annulé | Créer un nouvel abonnement |
| `expire` | Période terminée sans renouvellement | Réactiver, Créer nouveau |

---

## Intégration avec Stripe

### Événements Stripe à gérer

Pour une intégration complète avec Stripe, ajoutez ces webhooks :

1. **`checkout.session.completed`** ✅ (déjà configuré)
   - Envoie les identifiants après paiement initial

2. **`customer.subscription.updated`** 
   - Synchronise les changements de plan Stripe → Base de données

3. **`customer.subscription.deleted`**
   - Synchronise l'annulation Stripe → Base de données

4. **`invoice.payment_succeeded`**
   - Marque la facture comme payée
   - Prolonge l'abonnement

5. **`invoice.payment_failed`**
   - Suspend l'abonnement
   - Envoie une relance au client

### Configuration recommandée

Dans Stripe Dashboard → Webhooks, créez un endpoint pour chaque événement :
- URL : `https://n8n.talosprimes.com/webhook/stripe-<event-name>`
- Créez des workflows n8n dédiés pour chaque type d'événement

---

## Automatisation du renouvellement

### Option 1 : CRON Job dans n8n

Créez un workflow avec un trigger Schedule :
- **Fréquence** : Tous les jours à 2h du matin
- **Action** : Recherche les abonnements à renouveler et les traite

### Option 2 : Stripe Billing automatique

Si vous utilisez Stripe, les renouvellements sont gérés automatiquement :
- Stripe charge le client automatiquement
- Stripe envoie un webhook `invoice.payment_succeeded`
- Le workflow met à jour la base de données

---

## Gestion des impayés

### Processus de relance

1. **J+0** : Échec du paiement
   - Email automatique de relance
   - Notification à l'admin

2. **J+7** : Deuxième relance
   - Email de rappel
   - Avertissement de suspension

3. **J+14** : Suspension
   - Workflow `subscription-suspended` déclenché
   - Accès désactivé
   - Email d'avertissement

4. **J+30** : Annulation définitive
   - Workflow `subscription-cancelled` déclenché
   - Archivage des données

### Implémentation

Créez un workflow CRON qui vérifie quotidiennement :
```sql
SELECT * FROM client_subscriptions
WHERE statut = 'actif'
  AND date_prochain_renouvellement < CURRENT_DATE - INTERVAL '14 days';
```

---

## Emails envoyés

### Renouvellement réussi
- ✅ Confirmation du renouvellement
- ✅ Nouvelle date de renouvellement
- ✅ Facture attachée

### Annulation
- ✅ Confirmation de l'annulation
- ✅ Détails du plan annulé
- ✅ Option de réactivation

### Changement de plan
- ✅ Détails de l'ancien et nouveau plan
- ✅ Calcul du prorata (si upgrade)
- ✅ Nouvelles fonctionnalités disponibles

### Suspension
- ⚠️ Avertissement de suspension
- ⚠️ Raison de la suspension
- ⚠️ Instructions pour réactivation
- ⚠️ Lien vers le support

---

## Notifications admin

Chaque action importante génère une notification visible dans le tableau de bord :
- 🔔 Renouvellement réussi
- 🔔 Échec de renouvellement
- 🔔 Annulation d'abonnement
- 🔔 Changement de plan
- ⚠️ Suspension d'abonnement

---

## Exemples d'utilisation

### Scénario 1 : Client veut upgrader son plan

```javascript
// Frontend : Bouton "Upgrader vers Premium"
const response = await fetch('/api/subscriptions/upgrade', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    subscriptionId: currentSubscription.id,
    nouveauPlan: {
      nomPlan: "Plan Premium",
      montantMensuel: 49.99,
      modulesInclus: ["gestion_clients", "facturation", "suivi", "analytics", "reporting"]
    }
  })
});

// Backend déclenche le workflow n8n
// n8n calcule le prorata, met à jour Stripe et la base
// Email envoyé au client avec les détails
// Nouvelles fonctionnalités immédiatement disponibles
```

### Scénario 2 : Paiement échoué (suspension automatique)

```javascript
// Webhook Stripe : invoice.payment_failed
// 1. Stripe envoie le webhook à n8n
// 2. n8n appelle /api/subscriptions/suspend
// 3. Backend suspend l'abonnement et l'accès
// 4. Email d'avertissement envoyé au client
// 5. Notification créée pour l'admin
```

### Scénario 3 : Client paie et réactive

```javascript
// Frontend : Bouton "Payer maintenant"
// Après paiement réussi :
const response = await fetch('/api/subscriptions/reactivate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    subscriptionId: subscription.id
  })
});

// Backend réactive l'abonnement et l'accès
// Email de confirmation envoyé
```

---

## Sécurité et bonnes pratiques

### 1. Isolation des tenants
Toutes les routes vérifient que l'abonnement appartient bien au tenant authentifié.

### 2. Vérification des droits
Seuls les admins et super_admins peuvent gérer les abonnements.

### 3. Synchronisation Stripe
Les workflows vérifient systématiquement le statut Stripe avant toute action.

### 4. Historique complet
Tous les événements sont loggés dans `event_logs` pour audit.

### 5. Emails transactionnels
Tous les emails utilisent des templates professionnels et sont envoyés via Resend.

---

## Troubleshooting

### Le renouvellement ne se déclenche pas automatiquement

**Cause** : Pas de CRON configuré

**Solution** : Créez un workflow n8n avec un trigger Schedule qui appelle `/api/subscriptions/renew` pour chaque abonnement à renouveler.

### L'annulation Stripe échoue

**Cause** : L'abonnement n'existe pas dans Stripe ou ID incorrect

**Solution** : Vérifiez que `idAbonnementStripe` est correctement stocké dans la base.

### Le client ne reçoit pas l'email

**Causes possibles** :
- Resend non configuré
- Email dans les spams
- Credentials Resend manquants dans n8n

**Solution** : Vérifiez les logs n8n du nœud "Envoyer email".

### Le prorata est incorrect

**Cause** : Calcul basé sur 30 jours au lieu du nombre réel de jours dans le mois

**Solution** : Modifier le workflow pour utiliser le nombre réel de jours.

---

## Roadmap

### Phase 1 : ✅ Workflows de base (Terminé)
- Renouvellement
- Annulation
- Changement de plan
- Suspension

### Phase 2 : 🚧 Automatisation
- CRON de renouvellement automatique
- Gestion des impayés avec relances
- Webhooks Stripe supplémentaires

### Phase 3 : 📅 Fonctionnalités avancées
- Essai gratuit (trial)
- Codes promo et réductions
- Plans personnalisés par client
- Facturation au prorata précise

---

## Support

Pour toute question ou problème :
1. Consultez les logs n8n de chaque workflow
2. Vérifiez les logs backend (`pm2 logs platform`)
3. Consultez `event_logs` dans la base de données
4. Vérifiez les événements Stripe dans le Dashboard

---

**Le système de gestion des abonnements est maintenant complet et prêt à l'emploi ! 🎉**

