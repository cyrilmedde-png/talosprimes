# Fix : Abonnement créé automatiquement lors de la création d'un client

## Problème

Lors de la création d'un client (directement ou depuis un lead), un abonnement est créé automatiquement. Ce comportement n'est pas souhaité.

## Cause

Le système d'événements déclenche automatiquement des workflows n8n lorsque des événements métiers sont émis. Le problème vient de deux sources :

1. **Émission automatique de `client.onboarding`** (corrigé dans le code)
   - Le backend émettait automatiquement l'événement `client.onboarding` lors de la création d'un client
   - ✅ **CORRIGÉ** : L'émission automatique a été supprimée

2. **WorkflowLink qui écoute `client.created`** (à vérifier dans la base de données)
   - Si un `WorkflowLink` existe dans la base avec `typeEvenement = 'client.created'`
   - Et qu'il pointe vers le workflow `client-onboarding`
   - Alors l'onboarding sera déclenché automatiquement

## Solution

### Étape 1 : Exécuter le script de nettoyage

Exécutez le script pour supprimer les `WorkflowLink` problématiques :

```bash
# Option 1 : Script shell
./scripts/fix-client-created-workflow.sh

# Option 2 : Script TypeScript
cd packages/platform
pnpm tsx scripts/fix-client-created-workflow.ts
```

Ce script va :
- Rechercher tous les `WorkflowLink` avec `typeEvenement = 'client.created'`
- Les supprimer de la base de données
- Vérifier que les `WorkflowLink` pour `client.onboarding` sont corrects

### Étape 2 : Vérifier dans n8n

Dans l'interface n8n, vérifiez qu'aucun workflow n'écoute directement l'événement `client.created` :

1. Ouvrez chaque workflow lié aux clients
2. Vérifiez les triggers/webhooks
3. Assurez-vous qu'aucun webhook n'écoute `client.created`

### Étape 3 : Vérifier la configuration correcte

Le workflow `client-onboarding` doit être déclenché uniquement via :
- L'endpoint `/api/clients/:id/onboarding` (onboarding explicite)
- L'événement `client.onboarding` (pas `client.created`)

Le `WorkflowLink` correct doit avoir :
```sql
type_evenement = 'client.onboarding'  -- ✅ Correct
workflow_n8n_id = 'client-onboarding'
```

**Pas** :
```sql
type_evenement = 'client.created'  -- ❌ Incorrect (déclenche automatiquement)
```

### Étape 4 : Tester

1. Créer un nouveau lead
2. Convertir le lead en client
3. **Vérifier** : Le client ne doit **PAS** avoir d'abonnement automatique
4. Faire l'onboarding manuel via l'interface
5. **Vérifier** : L'abonnement doit être créé uniquement après l'onboarding explicite

## Comportement attendu

### ✅ Avant la correction
- Création d'un client → Émission de `client.created` → Déclenchement automatique de l'onboarding → Abonnement créé

### ✅ Après la correction
- Création d'un client → Émission de `client.created` → **Aucun workflow déclenché**
- Onboarding manuel → Émission de `client.onboarding` → Déclenchement du workflow → Abonnement créé

## Code modifié

### `clients.routes.ts`

**Avant** :
```typescript
// Émettre événement pour onboarding (client.onboarding)
await eventService.emit(
  tenantId,
  'client.onboarding',  // ❌ Émis automatiquement
  'ClientFinal',
  client.id,
  { ... }
);
```

**Après** :
```typescript
// NOTE: L'événement client.onboarding ne doit PAS être émis automatiquement
// Il doit être émis uniquement lors d'un onboarding explicite via /api/clients/:id/onboarding
// Sinon, un abonnement serait créé automatiquement pour chaque nouveau client
```

## Vérification dans la base de données

Pour vérifier manuellement s'il existe des `WorkflowLink` problématiques :

```sql
-- Vérifier les WorkflowLinks pour client.created
SELECT * FROM workflow_links 
WHERE type_evenement = 'client.created';

-- Si des résultats apparaissent, les supprimer :
DELETE FROM workflow_links 
WHERE type_evenement = 'client.created';

-- Vérifier les WorkflowLinks pour client.onboarding (doivent exister)
SELECT * FROM workflow_links 
WHERE type_evenement = 'client.onboarding';
```

## Notes importantes

- L'événement `client.created` continuera d'être émis (utile pour d'autres workflows)
- Mais il ne déclenchera plus automatiquement l'onboarding
- L'onboarding doit être déclenché explicitement via `/api/clients/:id/onboarding`
- Le `WorkflowLink` pour `client.onboarding` doit rester actif (mais uniquement déclenché explicitement)

