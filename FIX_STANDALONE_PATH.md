# Correction : Chemin serveur standalone Next.js

## 🔍 Problème

Le fichier `.next/standalone/server.js` n'existe pas. Il faut vérifier la structure du dossier standalone.

## ✅ Solution

### 1. Vérifier la structure du dossier standalone

```bash
cd /var/www/talosprimes/packages/client
ls -la .next/standalone/
```

### 2. Options possibles

Le serveur peut être dans différents emplacements selon la version de Next.js :

**Option A :** Dans le dossier standalone directement
```bash
pm2 start node --name "talosprimes-client" -- .next/standalone/server.js
```

**Option B :** Dans un sous-dossier (structure monorepo)
```bash
# Vérifier la structure
find .next/standalone -name "server.js" -o -name "server.mjs"

# Puis utiliser le bon chemin, par exemple :
pm2 start node --name "talosprimes-client" -- .next/standalone/packages/client/server.js
```

**Option C :** Utiliser le fichier dans le dossier server
```bash
pm2 start node --name "talosprimes-client" -- .next/server.js
```

### 3. Alternative : Modifier next.config.js

Si le standalone pose problème, retirer `output: 'standalone'` :

```bash
cd /var/www/talosprimes/packages/client
nano next.config.js
```

Modifier :
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', // Commenter ou retirer cette ligne
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  images: {
    domains: [],
  },
};

module.exports = nextConfig;
```

Puis rebuild et utiliser `pnpm start` :
```bash
pnpm build
pm2 start "pnpm start" --name "talosprimes-client" --cwd /var/www/talosprimes/packages/client
```

