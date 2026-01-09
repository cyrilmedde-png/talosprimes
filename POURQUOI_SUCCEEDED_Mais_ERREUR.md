# ❓ Pourquoi "Succeeded" mais erreur dans n8n ?

## 🔍 Explication

Dans n8n, un workflow est marqué **"Succeeded"** quand il :
- ✅ **S'est exécuté jusqu'au bout** sans crash technique
- ✅ **A renvoyé une réponse** (même si c'est une erreur métier)

Un workflow est marqué **"Failed"** quand il :
- ❌ **S'est planté** (exception non gérée, node qui crash)
- ❌ **N'a pas pu renvoyer de réponse** (timeout, connexion perdue)

## 📊 Dans votre cas

```
Workflow "Onboarding Client"
  ├─ ✅ Webhook reçu
  ├─ ✅ Node "01. Préparer données" exécuté
  ├─ ❌ Node "02. Validation" → ÉCHEC (clientId/tenantId manquant)
  ├─ ✅ Node "Répondre erreur" → Réponse envoyée avec erreur
  └─ ✅ Status : "Succeeded" (car réponse envoyée !)
```

**Même si la validation échoue, le workflow "réussit" techniquement car il a renvoyé une réponse d'erreur.**

## 🔧 Solution

Le vrai problème est que **le parsing des données du webhook est incorrect**. Le webhook reçoit le payload dans `body`, mais le code cherchait directement dans `$json`.

## ✅ Correction appliquée

Le node "01. Préparer données onboarding" a été corrigé pour :
1. **Vérifier `body` d'abord** : `raw?.body || raw?.json || raw`
2. **Extraire correctement** `tenantId` et `clientId`
3. **Lancer une erreur explicite** si les données manquent (ce qui fera échouer le workflow)

Avec cette correction, si les données sont vraiment manquantes, le workflow **échouera** au lieu de "réussir avec erreur".

