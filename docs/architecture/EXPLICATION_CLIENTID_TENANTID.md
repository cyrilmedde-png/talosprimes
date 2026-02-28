# 🔍 Différence entre clientId et tenantId

## 📚 Explication simple

### **tenantId** (ID de l'organisation cliente)
- **Qui** : L'entreprise qui **utilise** TalosPrimes pour gérer ses clients
- **Exemple** : Une entreprise "ABC Corp" s'inscrit sur TalosPrimes → elle obtient un `tenantId` unique
- **Utilité** : Permet d'isoler les données de chaque entreprise (multi-tenant)
- **Dans notre cas** : L'entreprise qui crée un espace client pour un de ses clients finaux

### **clientId** (ID du client final)
- **Qui** : Un **client final** de l'entreprise cliente (B2B ou B2C)
- **Exemple** : Si "ABC Corp" gère ses clients via TalosPrimes, chaque client de "ABC Corp" a un `clientId`
- **Utilité** : Identifier un client spécifique dans la base de données
- **Dans notre cas** : Le client pour lequel on crée un abonnement/espace

## 🔄 Flux de données

```
[Entreprise ABC Corp]
    └─ tenantId: "uuid-abc-corp"
         └─ Clients finaux :
              ├─ Client 1 → clientId: "uuid-client-1"
              ├─ Client 2 → clientId: "uuid-client-2"
              └─ Client 3 → clientId: "uuid-client-3"
```

## 📊 Dans le workflow onboarding

Quand on crée un espace client :
- **tenantId** : L'entreprise qui fait l'action (extrait du JWT de l'utilisateur connecté)
- **clientId** : Le client final pour qui on crée l'abonnement (ID dans la table `client_finals`)

## 🔧 Structure du payload envoyé par le backend

```json
{
  "event": "client.onboarding",
  "tenantId": "uuid-de-l-entreprise",        // ← Au root
  "timestamp": "2026-01-09T...",
  "data": {
    "client": {
      "id": "uuid-du-client-final",           // ← C'est le clientId !
      "tenantId": "uuid-de-l-entreprise",
      "email": "client@example.com",
      ...
    },
    "plan": {
      "nomPlan": "Plan Starter",
      ...
    },
    "avecStripe": false
  }
}
```

## ⚠️ Problème identifié

Le node "01. Préparer données onboarding" cherche :
- ✅ `payload.tenantId` → OK (au root)
- ❌ `clientData.clientId` → N'existe pas ! C'est `clientData.id` qu'il faut utiliser
- ❌ `clientData.id` → Cherche dans `payload.data?.client?.id` mais le code peut être confus

## ✅ Solution

Le node doit extraire :
- `tenantId = payload.tenantId` (directement au root)
- `clientId = payload.data.client.id` (dans le client object)

