# 🔍 Diagnostic Complet : Erreur n8n 403 - Authorization data is wrong!

Guide complet pour identifier et corriger l'erreur 403 avec n8n.

---

## 🎯 Problème Identifié

**Erreur :** `n8n API error: 403 - Authorization data is wrong!`

**Cause probable :** Votre instance n8n a une authentification activée qui protège les webhooks, OU l'URL/configuration est incorrecte.

---

## ✅ Vérification 1 : Le Code est Déjà Corrigé

Le code a été corrigé pour **ne PAS envoyer d'authentification** aux webhooks (car les webhooks n8n sont publics par défaut).

**Fichier :** `packages/platform/src/services/n8n.service.ts`
- ✅ Ligne 64-66 : Headers sans authentification pour les webhooks
- ✅ Ligne 175-177 : Même chose pour `triggerWorkflow`

**Si l'erreur persiste, le problème vient de la configuration n8n elle-même.**

---

## 🔍 Diagnostic Étape par Étape

### Étape 1 : Vérifier l'URL n8n

Sur votre VPS :

```bash
cd /var/www/talosprimes/packages/platform
cat .env | grep N8N_API_URL
```

**Vérifiez :**
- ✅ L'URL est correcte (pas de typo)
- ✅ Le protocole est correct (`http://` ou `https://`)
- ✅ Pas de slash final (`https://n8n.talosprimes.com` et non `https://n8n.talosprimes.com/`)

**Test manuel :**

```bash
# Tester si n8n est accessible
curl -I https://n8n.talosprimes.com/healthz

# OU si local
curl -I http://localhost:5678/healthz
```

**Si erreur :** n8n n'est pas accessible → Vérifiez que n8n est démarré.

---

### Étape 2 : Vérifier la Configuration n8n

**Le problème le plus probable :** Votre instance n8n a une authentification activée qui protège TOUS les endpoints, y compris les webhooks.

**Dans n8n :**

1. Allez dans **Settings** → **Security**
2. Vérifiez les paramètres d'authentification :
   - **Basic Auth** : Si activé, cela peut bloquer les webhooks
   - **JWT** : Si activé, cela peut bloquer les webhooks
   - **Webhook Authentication** : Si activé, les webhooks nécessitent une authentification

**Solution :**

#### Option A : Désactiver l'authentification pour les webhooks (RECOMMANDÉ)

Dans n8n, configurez pour que les webhooks soient publics :

1. **Settings** → **Security**
2. Désactivez l'authentification pour les webhooks (si option disponible)
3. OU configurez une exception pour les webhooks

#### Option B : Utiliser l'API REST au lieu des webhooks

Si vous ne pouvez pas désactiver l'authentification, utilisez l'API REST de n8n :

**Modifier le code pour utiliser l'API REST :**

```typescript
// Au lieu de /webhook/{id}, utiliser /api/v1/workflows/{id}/execute
const response = await fetch(`${this.apiUrl}/api/v1/workflows/${workflowLink.workflowN8nId}/execute`, {
  method: 'POST',
  headers: this.getAuthHeaders(), // Avec authentification pour l'API REST
  body: JSON.stringify(n8nPayload),
});
```

**⚠️ Note :** Cela nécessite de modifier le code et de récupérer le vrai Workflow ID (pas le webhook ID).

---

### Étape 3 : Vérifier les WorkflowLinks en Base de Données

Le `workflowN8nId` dans la base de données doit correspondre au **Webhook Path** dans n8n, pas au Workflow ID.

**Sur le VPS :**

```bash
cd /var/www/talosprimes/packages/platform
pnpm prisma studio
```

**Vérifiez :**
- Le `workflow_n8n_id` dans la table `workflow_links`
- Il doit correspondre au **Path** du webhook dans n8n (ex: `lead_create`, `leads_list`)

**Dans n8n :**
1. Ouvrez un workflow
2. Cliquez sur le nœud **Webhook**
3. Notez le **Path** (ex: `lead_create`)
4. Vérifiez que c'est le même que dans la base de données

**Si différent :** Mettez à jour la base de données :

```sql
UPDATE workflow_links 
SET workflow_n8n_id = 'le-bon-path' 
WHERE type_evenement = 'leads_list';
```

---

### Étape 4 : Tester un Webhook Directement

**Test manuel depuis le VPS :**

```bash
# Tester un webhook directement (sans authentification)
curl -X POST https://n8n.talosprimes.com/webhook/lead_create \
  -H "Content-Type: application/json" \
  -d '{
    "event": "lead_create",
    "tenantId": "00000000-0000-0000-0000-000000000001",
    "timestamp": "2026-01-15T10:30:00Z",
    "data": {
      "nom": "Test",
      "prenom": "User",
      "email": "test@example.com",
      "telephone": "+33612345678"
    }
  }'
```

**Résultats possibles :**

1. **200 OK** → Le webhook fonctionne, le problème vient du code backend
2. **403 Forbidden** → n8n bloque les webhooks (authentification activée)
3. **404 Not Found** → Le webhook n'existe pas ou le path est incorrect
4. **500 Internal Server Error** → Le workflow plante à l'exécution

---

### Étape 5 : Vérifier les Logs n8n

**Dans n8n :**

1. Allez dans **Executions**
2. Vérifiez les exécutions récentes
3. Si vous voyez des erreurs 403, c'est que n8n bloque les requêtes

**Sur le VPS (si n8n est en Docker) :**

```bash
# Voir les logs n8n
docker logs n8n --tail 100

# OU si PM2
pm2 logs n8n --lines 100
```

**Cherchez :**
- Messages d'erreur d'authentification
- Messages indiquant que les webhooks sont protégés

---

## 🔧 Solutions par Scénario

### Scénario A : n8n a Basic Auth activé

**Symptôme :** Tous les endpoints nécessitent une authentification

**Solution 1 :** Désactiver Basic Auth pour les webhooks (si possible dans n8n)

**Solution 2 :** Configurer n8n pour accepter les webhooks sans authentification

**Solution 3 :** Utiliser l'API REST avec authentification (nécessite modification du code)

---

### Scénario B : Le Webhook Path est Incorrect

**Symptôme :** Erreur 404 ou 403

**Solution :**

1. Dans n8n, ouvrez le workflow
2. Cliquez sur le nœud Webhook
3. Notez le **Path** exact (ex: `lead_create`)
4. Vérifiez dans la base de données que `workflow_n8n_id` correspond

**Mettre à jour :**

```bash
cd /var/www/talosprimes/packages/platform
pnpm workflow:setup-leads
# Répondez aux questions avec les bons paths
```

---

### Scénario C : Le Workflow n'est pas Actif

**Symptôme :** Erreur 404

**Solution :**

1. Dans n8n, ouvrez le workflow
2. Vérifiez que le toggle en haut à droite est **VERT** (actif)
3. Si gris, cliquez pour l'activer

---

### Scénario D : n8n Nécessite une Authentification Spéciale pour les Webhooks

**Symptôme :** Erreur 403 persistante même sans headers d'auth

**Solution :** Configurer n8n pour accepter les webhooks publics

**Dans n8n (configuration avancée) :**

1. Vérifiez les variables d'environnement n8n :
   ```bash
   # Si n8n est en Docker
   docker exec n8n env | grep -i auth
   ```

2. Désactivez l'authentification pour les webhooks :
   - Variable : `N8N_BASIC_AUTH_ACTIVE=false` (pour les webhooks)
   - OU configurez une exception

---

## 🧪 Test Complet

### Test 1 : Vérifier que le Code est Correct

```bash
# Sur le VPS
cd /var/www/talosprimes/packages/platform
grep -A 10 "callWorkflowReturn" src/services/n8n.service.ts | head -20
```

**Vérifiez :** Les headers ne contiennent PAS `X-N8N-API-KEY` ni `Authorization` pour les webhooks.

### Test 2 : Tester un Webhook Directement

```bash
# Test depuis le VPS
curl -v -X POST https://n8n.talosprimes.com/webhook/lead_create \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**Regardez la réponse :**
- Si `403` → n8n bloque les webhooks
- Si `404` → Le webhook n'existe pas
- Si `200` → Le webhook fonctionne

### Test 3 : Vérifier les Logs Backend

```bash
# Sur le VPS
pm2 logs talosprimes-api --lines 50 | grep -i n8n
```

**Cherchez :**
- `[n8n] Erreur lors du déclenchement`
- Le message d'erreur exact

---

## 🎯 Solution Rapide (Si Urgent)

Si vous voulez que ça fonctionne IMMÉDIATEMENT :

### Option 1 : Désactiver temporairement USE_N8N_VIEWS

```bash
cd /var/www/talosprimes/packages/platform
nano .env

# Ajoutez :
USE_N8N_VIEWS=false
USE_N8N_COMMANDS=false

pm2 restart talosprimes-api
```

**⚠️ ATTENTION :** Cela désactive n8n, mais vous avez dit que c'est hors de question.

### Option 2 : Configurer n8n pour Accepter les Webhooks Publics

**Dans n8n :**

1. **Settings** → **Security**
2. Désactivez l'authentification pour les webhooks
3. OU créez une exception pour `/webhook/*`

---

## 📋 Checklist de Diagnostic

- [ ] Code vérifié (pas d'auth sur webhooks) ✅
- [ ] URL n8n correcte et accessible
- [ ] Webhook path correspond à la base de données
- [ ] Workflow actif dans n8n
- [ ] Test direct du webhook (curl) fonctionne
- [ ] Logs n8n vérifiés
- [ ] Configuration sécurité n8n vérifiée

---

## 🔧 Action Immédiate Recommandée

**Sur votre VPS, exécutez :**

```bash
# 1. Tester le webhook directement
curl -v -X POST https://n8n.talosprimes.com/webhook/lead_create \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# 2. Voir la réponse exacte
# Si 403 → n8n bloque les webhooks
# Si 404 → Le webhook n'existe pas
# Si 200 → Le webhook fonctionne
```

**Partagez-moi le résultat** et je vous dirai exactement quoi corriger.

---

## 📚 Documentation

- [GUIDE_COMPLET_N8N.md](./GUIDE_COMPLET_N8N.md) - Guide complet de configuration
- [FIX_N8N_403_ERROR.md](./FIX_N8N_403_ERROR.md) - Guide de correction 403

---

**✅ Le code est correct. Le problème vient de la configuration n8n. Testez le webhook directement et partagez-moi le résultat !**
