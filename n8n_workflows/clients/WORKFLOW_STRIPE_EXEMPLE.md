# Exemple de workflow n8n avec Stripe

Ce document montre comment intégrer Stripe dans le workflow `client-onboarding.json`.

## Structure du workflow avec Stripe

```
Webhook → Préparer données → Validation → IF (avecStripe?) 
  ├─ OUI → Créer Customer Stripe → Créer Produit → Créer Prix → Créer Abonnement Stripe → Mettre à jour SQL avec IDs Stripe
  └─ NON → Aller directement à SQL (sans IDs Stripe)
→ Formater réponse → Notification → Répondre
```

## Nodes à ajouter dans le workflow

### 1. Node IF - Vérifier si Stripe est activé

Après "02. Validation données", ajouter un node IF :

```json
{
  "parameters": {
    "conditions": {
      "boolean": [
        {
          "value1": "={{ $json.avecStripe }}",
          "value2": true
        }
      ]
    }
  },
  "name": "03. IF - Stripe activé ?",
  "type": "n8n-nodes-base.if"
}
```

### 2. Node HTTP Request - Créer Customer Stripe

**Si avecStripe = true**, branche "true" :

```json
{
  "parameters": {
    "url": "https://api.stripe.com/v1/customers",
    "method": "POST",
    "authentication": "headerAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/x-www-form-urlencoded"
        }
      ]
    },
    "sendBody": true,
    "specifyBody": "keypair",
    "bodyParameters": {
      "parameters": [
        {
          "name": "email",
          "value": "={{ $('01. Préparer données onboarding').item.json.clientData.email }}"
        },
        {
          "name": "name",
          "value": "={{ $('01. Préparer données onboarding').item.json.clientData.nom || $('01. Préparer données onboarding').item.json.clientData.raisonSociale }}"
        },
        {
          "name": "metadata[clientId]",
          "value": "={{ $('01. Préparer données onboarding').item.json.clientId }}"
        },
        {
          "name": "metadata[tenantId]",
          "value": "={{ $('01. Préparer données onboarding').item.json.tenantId }}"
        }
      ]
    }
  },
  "name": "04. Stripe - Créer Customer",
  "type": "n8n-nodes-base.httpRequest",
  "credentials": {
    "headerAuth": {
      "name": "Stripe API"
    }
  }
}
```

**Credential Stripe API :**
- Type: Header Auth
- Name: `Authorization`
- Value: `Bearer sk_test_...` (votre clé secrète Stripe)

### 3. Node HTTP Request - Créer Produit Stripe

```json
{
  "parameters": {
    "url": "https://api.stripe.com/v1/products",
    "method": "POST",
    "authentication": "headerAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/x-www-form-urlencoded"
        }
      ]
    },
    "sendBody": true,
    "specifyBody": "keypair",
    "bodyParameters": {
      "parameters": [
        {
          "name": "name",
          "value": "={{ $('01. Préparer données onboarding').item.json.plan.nomPlan }}"
        },
        {
          "name": "metadata[modules]",
          "value": "={{ $('01. Préparer données onboarding').item.json.plan.modulesInclus.join(',') }}"
        }
      ]
    }
  },
  "name": "05. Stripe - Créer Produit",
  "type": "n8n-nodes-base.httpRequest",
  "credentials": {
    "headerAuth": {
      "name": "Stripe API"
    }
  }
}
```

### 4. Node HTTP Request - Créer Prix Stripe

```json
{
  "parameters": {
    "url": "https://api.stripe.com/v1/prices",
    "method": "POST",
    "authentication": "headerAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/x-www-form-urlencoded"
        }
      ]
    },
    "sendBody": true,
    "specifyBody": "keypair",
    "bodyParameters": {
      "parameters": [
        {
          "name": "product",
          "value": "={{ $json.id }}"
        },
        {
          "name": "unit_amount",
          "value": "={{ Math.round($('01. Préparer données onboarding').item.json.plan.montantMensuel * 100) }}"
        },
        {
          "name": "currency",
          "value": "eur"
        },
        {
          "name": "recurring[interval]",
          "value": "month"
        },
        {
          "name": "recurring[interval_count]",
          "value": "={{ $('01. Préparer données onboarding').item.json.plan.dureeMois }}"
        }
      ]
    }
  },
  "name": "06. Stripe - Créer Prix",
  "type": "n8n-nodes-base.httpRequest",
  "credentials": {
    "headerAuth": {
      "name": "Stripe API"
    }
  }
}
```

### 5. Node HTTP Request - Créer Abonnement Stripe

```json
{
  "parameters": {
    "url": "https://api.stripe.com/v1/subscriptions",
    "method": "POST",
    "authentication": "headerAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/x-www-form-urlencoded"
        }
      ]
    },
    "sendBody": true,
    "specifyBody": "keypair",
    "bodyParameters": {
      "parameters": [
        {
          "name": "customer",
          "value": "={{ $('04. Stripe - Créer Customer').item.json.id }}"
        },
        {
          "name": "items[0][price]",
          "value": "={{ $json.id }}"
        },
        {
          "name": "payment_behavior",
          "value": "default_incomplete"
        },
        {
          "name": "payment_settings[save_default_payment_method]",
          "value": "on_subscription"
        },
        {
          "name": "metadata[clientId]",
          "value": "={{ $('01. Préparer données onboarding').item.json.clientId }}"
        },
        {
          "name": "metadata[planName]",
          "value": "={{ $('01. Préparer données onboarding').item.json.plan.nomPlan }}"
        }
      ]
    }
  },
  "name": "07. Stripe - Créer Abonnement",
  "type": "n8n-nodes-base.httpRequest",
  "credentials": {
    "headerAuth": {
      "name": "Stripe API"
    }
  }
}
```

### 6. Node Code - Préparer données avec IDs Stripe

Après la création de l'abonnement Stripe, ajouter un node Code pour préparer les données :

```javascript
// Préparer les données avec les IDs Stripe
const customerId = $('04. Stripe - Créer Customer').item.json.id;
const subscriptionId = $('07. Stripe - Créer Abonnement').item.json.id;

return {
  json: {
    ...$('01. Préparer données onboarding').item.json,
    idClientStripe: customerId,
    idAbonnementStripe: subscriptionId,
  }
};
```

### 7. Mettre à jour le node "02b. Préparer requête SQL"

Modifier le code pour inclure les IDs Stripe si présents :

```javascript
// Préparer les modules inclus pour la requête SQL
const modules = $json.plan.modulesInclus || [];
const modulesArray = modules.map(m => `'${m.replace(/'/g, "''")}'`).join(', ');

// IDs Stripe (optionnels)
const idClientStripe = $json.idClientStripe ? `'${$json.idClientStripe}'` : 'NULL';
const idAbonnementStripe = $json.idAbonnementStripe ? `'${$json.idAbonnementStripe}'` : 'NULL';

// Construire la requête SQL avec les valeurs
const query = `INSERT INTO client_subscriptions (
  id,
  client_final_id,
  nom_plan,
  date_debut,
  date_prochain_renouvellement,
  montant_mensuel,
  modules_inclus,
  statut,
  id_client_stripe,
  id_abonnement_stripe,
  updated_at
) VALUES (
  gen_random_uuid(),
  '${$json.clientId}'::uuid,
  '${String($json.plan.nomPlan).replace(/'/g, "''")}',
  '${$json.dateDebut}'::timestamptz,
  '${$json.dateProchainRenouvellement}'::timestamptz,
  ${$json.plan.montantMensuel},
  ARRAY[${modulesArray}]::text[],
  'actif'::subscription_status,
  ${idClientStripe},
  ${idAbonnementStripe},
  NOW()
)
RETURNING *;`;

return {
  json: {
    ...$json,
    sqlQuery: query
  }
};
```

## Connection du workflow

```
Webhook → Préparer données → Validation 
  → IF (avecStripe?) 
    ├─ TRUE → Créer Customer → Créer Produit → Créer Prix → Créer Abonnement → Préparer avec IDs Stripe → SQL
    └─ FALSE → Préparer SQL (sans IDs) → SQL
→ Formater réponse → Notification → Répondre
```

## Notes importantes

1. **Format Stripe API** : Stripe utilise `application/x-www-form-urlencoded`, pas JSON
2. **Montant** : Stripe attend les montants en centimes (multiplier par 100)
3. **Payment Behavior** : `default_incomplete` permet de créer l'abonnement même sans méthode de paiement
4. **Gestion d'erreur** : Ajouter des nodes IF pour gérer les erreurs Stripe et faire un fallback

