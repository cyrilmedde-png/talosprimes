# 🔧 Fix : Erreur n8n API 403 - Authorization data is wrong!

Guide pour corriger l'erreur d'authentification n8n.

---

## 🔴 Problème

**Erreur affichée :** `n8n API error: 403 - Authorization data is wrong!`

**Cause :** Les credentials d'authentification entre votre application et n8n sont incorrects.

---

## ✅ Solution Rapide (5 minutes)

### Étape 1 : Vérifier la Configuration Backend

Sur votre VPS :

```bash
cd /var/www/talosprimes/packages/platform
cat .env | grep N8N
```

**Vérifiez que vous avez :**

```env
N8N_API_URL=https://n8n.talosprimes.com
# OU pour dev local
# N8N_API_URL=http://localhost:5678

# ET UNE de ces deux options :
# Option A: API Key
N8N_API_KEY=votre-api-key-correcte

# Option B: Username/Password
N8N_USERNAME=votre-email@example.com
N8N_PASSWORD=votre-mot-de-passe-correct
```

### Étape 2 : Vérifier/Créer l'API Key dans n8n

**Si vous utilisez N8N_API_KEY :**

1. Connectez-vous à n8n : `https://n8n.talosprimes.com`
2. Allez dans **Settings** → **API**
3. Si vous n'avez pas d'API Key, créez-en une :
   - Cliquez sur **Create API Key**
   - Notez la clé générée
4. Copiez cette clé dans votre `.env` :

```bash
# Sur le VPS
cd /var/www/talosprimes/packages/platform
nano .env

# Ajoutez/modifiez :
N8N_API_KEY=la-clé-copiée-depuis-n8n
```

### Étape 3 : Vérifier Username/Password (si vous utilisez cette méthode)

**Si vous utilisez N8N_USERNAME/PASSWORD :**

1. Vérifiez que vous pouvez vous connecter à n8n avec ces identifiants
2. Vérifiez dans `.env` que les valeurs sont correctes :

```bash
cd /var/www/talosprimes/packages/platform
nano .env

# Vérifiez :
N8N_USERNAME=votre-email-exact@example.com
N8N_PASSWORD=votre-mot-de-passe-exact
```

**⚠️ Important :** Pas d'espaces avant/après les valeurs !

### Étape 4 : Redémarrer le Backend

```bash
pm2 restart talosprimes-api

# Vérifier les logs
pm2 logs talosprimes-api --lines 20
```

### Étape 5 : Tester la Connexion

```bash
# Obtenir un token admin (remplacer email/password)
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"votre-password"}' \
  | jq -r '.data.accessToken')

# Tester la connexion n8n
curl -X GET http://localhost:3001/api/n8n/test \
  -H "Authorization: Bearer $TOKEN"
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "Connexion à n8n réussie"
}
```

**Si toujours en erreur :** Passez à la section "Diagnostic Détaillé" ci-dessous.

---

## 🔍 Diagnostic Détaillé

### Vérification 1 : n8n est-il accessible ?

```bash
# Tester depuis le VPS
curl -I https://n8n.talosprimes.com/healthz

# OU si local
curl -I http://localhost:5678/healthz
```

**Si erreur :** n8n n'est pas accessible → Vérifiez que n8n est démarré.

### Vérification 2 : Les credentials sont-ils corrects ?

**Pour API Key :**

1. Dans n8n, allez dans **Settings** → **API**
2. Vérifiez que l'API Key dans `.env` correspond exactement
3. **Testez manuellement :**

```bash
# Remplacer YOUR_API_KEY par votre vraie clé
curl -X GET https://n8n.talosprimes.com/api/v1/workflows \
  -H "X-N8N-API-KEY: YOUR_API_KEY"
```

**Si erreur 403 :** L'API Key est incorrecte → Créez-en une nouvelle.

**Pour Username/Password :**

1. Testez la connexion manuellement :

```bash
# Remplacer username et password
curl -X GET https://n8n.talosprimes.com/api/v1/workflows \
  -u "username:password"
```

**Si erreur 401/403 :** Les identifiants sont incorrects → Vérifiez dans n8n.

### Vérification 3 : L'URL est-elle correcte ?

```bash
# Vérifier l'URL dans .env
cat /var/www/talosprimes/packages/platform/.env | grep N8N_API_URL

# Tester l'URL
curl -I $(cat /var/www/talosprimes/packages/platform/.env | grep N8N_API_URL | cut -d'=' -f2 | tr -d '"')
```

**Si erreur :** L'URL est incorrecte → Corrigez dans `.env`.

---

## 🔧 Solutions par Scénario

### Scénario A : Vous n'avez pas d'API Key

**Solution :** Créer une API Key dans n8n

1. Connectez-vous à n8n
2. **Settings** → **API**
3. **Create API Key**
4. Copiez la clé
5. Ajoutez dans `.env` :

```bash
cd /var/www/talosprimes/packages/platform
echo "N8N_API_KEY=votre-nouvelle-clé" >> .env
pm2 restart talosprimes-api
```

### Scénario B : L'API Key est expirée ou invalide

**Solution :** Créer une nouvelle API Key

1. Dans n8n, supprimez l'ancienne API Key
2. Créez-en une nouvelle
3. Mettez à jour `.env`
4. Redémarrez le backend

### Scénario C : Vous utilisez Username/Password mais ça ne fonctionne pas

**Solution :** Passer à l'API Key (recommandé)

1. Créez une API Key dans n8n
2. Remplacez dans `.env` :

```env
# Supprimez ces lignes :
# N8N_USERNAME=...
# N8N_PASSWORD=...

# Ajoutez :
N8N_API_KEY=votre-api-key
```

3. Redémarrez le backend

### Scénario D : n8n n'est pas accessible depuis le VPS

**Solution :** Vérifier la configuration réseau

```bash
# Tester depuis le VPS
ping n8n.talosprimes.com

# Vérifier le DNS
nslookup n8n.talosprimes.com

# Si local, vérifier que n8n écoute
netstat -tlnp | grep 5678
```

**Si n8n est sur un autre serveur :**
- Vérifiez le firewall
- Vérifiez que n8n accepte les connexions depuis votre VPS

---

## ✅ Checklist de Vérification

- [ ] `N8N_API_URL` est correct et accessible
- [ ] `N8N_API_KEY` existe et est valide (OU `N8N_USERNAME`/`PASSWORD` corrects)
- [ ] Pas d'espaces dans les valeurs du `.env`
- [ ] Backend redémarré après modification
- [ ] Test de connexion réussi (`/api/n8n/test`)
- [ ] n8n est démarré et accessible

---

## 🧪 Test Final

Après avoir corrigé, testez :

1. **Via l'API :**

```bash
# Obtenir un token
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"votre-password"}' \
  | jq -r '.data.accessToken')

# Tester n8n
curl -X GET http://localhost:3001/api/n8n/test \
  -H "Authorization: Bearer $TOKEN"
```

2. **Via l'interface :**

- Rafraîchissez la page `/onboarding`
- L'erreur devrait disparaître
- Les leads devraient s'afficher

---

## 🆘 Si l'erreur persiste

1. **Vérifiez les logs backend :**

```bash
pm2 logs talosprimes-api --lines 100 | grep -i n8n
```

2. **Vérifiez les logs n8n :**

Dans n8n, allez dans **Executions** et vérifiez les erreurs.

3. **Désactivez temporairement n8n :**

Si vous voulez continuer sans n8n :

```bash
cd /var/www/talosprimes/packages/platform
nano .env

# Ajoutez :
USE_N8N_VIEWS=false
USE_N8N_COMMANDS=false

pm2 restart talosprimes-api
```

Cela désactivera la délégation à n8n et utilisera directement la base de données.

---

## 📚 Documentation Complémentaire

- [GUIDE_COMPLET_N8N.md](./GUIDE_COMPLET_N8N.md) - Guide complet de configuration n8n
- [CONFIG_N8N.md](./packages/platform/CONFIG_N8N.md) - Configuration détaillée

---

**✅ Une fois corrigé, l'erreur 403 devrait disparaître et les leads s'afficheront correctement !**
