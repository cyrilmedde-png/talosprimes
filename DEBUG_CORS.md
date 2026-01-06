# Debug Erreur CORS

## 🔍 Diagnostic

L'erreur CORS persiste. Vérifions étape par étape :

## ✅ Checklist de vérification

### 1. Vérifier que le frontend utilise HTTPS

Dans la console du navigateur (F12 → Network), vérifiez l'URL de la requête `login` :
- ❌ `http://localhost:3001/api/auth/login` → Mauvaise URL
- ✅ `https://api.talosprimes.com/api/auth/login` → Bonne URL

### 2. Vérifier le fichier .env.local du frontend

```bash
cd /var/www/talosprimes/packages/client
cat .env.local
```

Doit contenir :
```env
NEXT_PUBLIC_API_URL="https://api.talosprimes.com"
```

**⚠️ Important :** Utilisez `https://` (pas `http://`)

### 3. Rebuild le frontend (OBLIGATOIRE après modification .env.local)

```bash
cd /var/www/talosprimes/packages/client
pnpm build
pm2 restart talosprimes-client
```

### 4. Vérifier CORS_ORIGIN dans le backend

```bash
cd /var/www/talosprimes/packages/platform
cat .env | grep CORS_ORIGIN
```

Doit contenir :
```env
CORS_ORIGIN="https://talosprimes.com"
```

**⚠️ Important :** 
- Utilisez `https://` (pas `http://`)
- Pas de slash à la fin (`https://talosprimes.com` et non `https://talosprimes.com/`)

### 5. Redémarrer le backend

```bash
pm2 restart talosprimes-api
pm2 logs talosprimes-api
```

### 6. Vérifier que le backend répond en HTTPS

```bash
curl -v https://api.talosprimes.com/health
```

Vous devriez voir les headers CORS dans la réponse.

### 7. Tester depuis le navigateur

Ouvrez la console (F12) et testez :

```javascript
fetch('https://api.talosprimes.com/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

Si ça fonctionne, le problème vient du frontend qui n'utilise pas la bonne URL.

## 🐛 Problèmes courants

### Problème 1 : Frontend utilise encore localhost

**Symptôme :** Requête vers `http://localhost:3001`

**Solution :**
1. Vérifier `.env.local` contient `NEXT_PUBLIC_API_URL="https://api.talosprimes.com"`
2. Rebuild : `pnpm build && pm2 restart talosprimes-client`
3. Vider le cache du navigateur (Ctrl+Shift+R)

### Problème 2 : CORS_ORIGIN mal configuré

**Symptôme :** Erreur CORS même avec la bonne URL

**Solution :**
1. Vérifier `.env` backend : `CORS_ORIGIN="https://talosprimes.com"`
2. Redémarrer : `pm2 restart talosprimes-api`
3. Vérifier les logs : `pm2 logs talosprimes-api`

### Problème 3 : Certificat SSL non valide pour api.talosprimes.com

**Symptôme :** Erreur de certificat dans la console

**Solution :**
```bash
# Vérifier le certificat
openssl s_client -connect api.talosprimes.com:443 -servername api.talosprimes.com

# Si le certificat ne contient pas api.talosprimes.com, le régénérer
sudo certbot --nginx -d talosprimes.com -d www.talosprimes.com -d api.talosprimes.com --expand
```

## 🔧 Commandes de diagnostic rapide

```bash
# 1. Vérifier les variables d'environnement
echo "=== FRONTEND ==="
cat /var/www/talosprimes/packages/client/.env.local
echo ""
echo "=== BACKEND ==="
cat /var/www/talosprimes/packages/platform/.env | grep CORS

# 2. Vérifier que les services tournent
pm2 list

# 3. Tester le backend
curl -v https://api.talosprimes.com/health

# 4. Vérifier les logs
pm2 logs talosprimes-api --lines 20
pm2 logs talosprimes-client --lines 20
```

