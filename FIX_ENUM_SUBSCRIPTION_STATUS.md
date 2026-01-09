# 🔧 Fix : Erreur "type 'subscription_status' does not exist"

## ❌ Erreur rencontrée

```
Problem in node '10. Créer abonnement client'
type 'subscription_status' does not exist
```

## 🔍 Cause

Dans la requête SQL du node "09. Préparer requête SQL", on utilisait :
```sql
'actif'::subscription_status
```

Mais le type PostgreSQL n'existe pas avec ce nom exact. Prisma crée les enums avec le nom exact du schéma (`SubscriptionStatus`), et PostgreSQL peut être sensible à la casse pour les identifiants.

## ✅ Solution

**Supprimer le cast de type** et laisser PostgreSQL inférer automatiquement le type grâce au schéma de la colonne :

```sql
'actif'  -- Au lieu de 'actif'::subscription_status
```

PostgreSQL reconnaîtra automatiquement que `'actif'` correspond à une valeur de l'enum `SubscriptionStatus` défini sur la colonne `statut` de la table `client_subscriptions`.

## 📝 Modification appliquée

Le node "09. Préparer requête SQL" a été corrigé pour utiliser simplement `'actif'` sans cast de type.

## 🔄 Action à faire

1. **Réimporter le workflow** dans n8n :
   - Ouvrir n8n : `https://n8n.talosprimes.com`
   - Supprimer l'ancien workflow "Onboarding Client - Créer espace et abonnement"
   - Importer le nouveau depuis `n8n_workflows/clients/client-onboarding.json`
   - Activer le workflow

2. **Tester à nouveau** :
   - Aller dans l'application : `https://talosprimes.com/clients`
   - Cliquer sur l'icône étoile d'un client
   - Créer l'espace client
   - L'erreur ne devrait plus apparaître

## 💡 Note technique

Dans Prisma :
- Le schéma définit : `statut SubscriptionStatus @default(actif)`
- Prisma crée l'enum PostgreSQL avec le nom exact : `SubscriptionStatus`
- PostgreSQL peut nécessiter des guillemets pour préserver la casse : `"SubscriptionStatus"`

Mais la **meilleure pratique** est de ne pas caster et laisser PostgreSQL inférer le type automatiquement, ce qui évite les problèmes de nommage.

