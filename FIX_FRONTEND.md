# Correction : Démarrer le Frontend Next.js

## 🔍 Problème identifié

Le backend tourne mais **le frontend Next.js n'est pas démarré**.

## ✅ Solution

### 1. Vérifier l'état actuel

```bash
pm2 list
```

Vous devriez voir seulement `talosprimes-api` et `n8n`, mais **pas** `talosprimes-client`.

### 2. Aller dans le dossier client

```bash
cd /var/www/talosprimes/packages/client
```

### 3. Vérifier que le build est à jour

```bash
# Si le dossier .next n'existe pas ou est ancien, rebuild
pnpm build
```

### 4. Démarrer le frontend avec PM2

```bash
# Option 1 : Avec pnpm start (recommandé)
pm2 start "pnpm start" --name "talosprimes-client" --cwd /var/www/talosprimes/packages/client

# Option 2 : Avec le serveur standalone directement
pm2 start .next/standalone/server.js --name "talosprimes-client" --node-args="--port 3000"
```

### 5. Vérifier que tout tourne

```bash
pm2 list
```

Vous devriez maintenant voir :
- ✅ `talosprimes-api` (port 3001)
- ✅ `talosprimes-client` (port 3000)
- ✅ `n8n` (port 5678)

### 6. Vérifier les logs

```bash
pm2 logs talosprimes-client
```

Vous devriez voir quelque chose comme :
```
ready - started server on 0.0.0.0:3000
```

### 7. Tester localement

```bash
# Tester le frontend
curl http://localhost:3000

# Tester le backend
curl http://localhost:3001/health
```

## 🔧 Si ça ne fonctionne pas

### Vérifier les variables d'environnement

```bash
cd /var/www/talosprimes/packages/client
cat .env.local
```

Doit contenir :
```env
NEXT_PUBLIC_API_URL=https://api.talosprimes.com
```

**⚠️ Important :** Utilisez le domaine complet de votre backend, pas `localhost`.

### Vérifier que le port 3000 est libre

```bash
sudo netstat -tlnp | grep 3000
```

Si un autre processus utilise le port, tuez-le :
```bash
sudo kill -9 <PID>
```

### Rebuild complet

```bash
cd /var/www/talosprimes

# Rebuild shared
cd packages/shared && pnpm build

# Rebuild client
cd ../client && pnpm build

# Redémarrer
pm2 restart talosprimes-client
```

## 📋 Configuration PM2 pour auto-start

Pour que le frontend démarre automatiquement au reboot :

```bash
pm2 save
pm2 startup
```

Suivez les instructions affichées.

