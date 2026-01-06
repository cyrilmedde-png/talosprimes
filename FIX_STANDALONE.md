# Correction : Utiliser le serveur standalone Next.js

## 🔍 Problème

Avec `output: 'standalone'` dans `next.config.js`, on ne peut **pas** utiliser `next start` ou `pnpm start`.

Il faut utiliser directement le serveur standalone généré.

## ✅ Solution

### Arrêter le processus actuel

```bash
pm2 stop talosprimes-client
pm2 delete talosprimes-client
```

### Démarrer avec le serveur standalone

```bash
cd /var/www/talosprimes/packages/client

# Option 1 : Avec node directement
pm2 start .next/standalone/server.js --name "talosprimes-client" --node-args="--port 3000"

# Option 2 : Avec le chemin complet
pm2 start node --name "talosprimes-client" -- .next/standalone/server.js
```

### Vérifier

```bash
pm2 list
pm2 logs talosprimes-client
```

Vous devriez voir :
```
ready - started server on 0.0.0.0:3000
```

## 🔧 Alternative : Modifier next.config.js

Si vous préférez utiliser `pnpm start`, vous pouvez retirer `output: 'standalone'` :

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', // Retirer cette ligne
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};
```

Puis rebuild :
```bash
pnpm build
pm2 start "pnpm start" --name "talosprimes-client"
```

**⚠️ Note :** `standalone` est recommandé pour la production (taille réduite, déploiement Docker), donc mieux vaut utiliser le serveur standalone.

