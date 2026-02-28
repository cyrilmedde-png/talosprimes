# Guide de Démarrage des Services

## 🚀 Démarrage Backend (Fastify)

```bash
cd /var/www/talosprimes/packages/platform

# Build
pnpm build

# Démarrer avec PM2
pm2 start dist/index.js --name "talosprimes-api" --env production

# Ou redémarrer si déjà créé
pm2 restart talosprimes-api

# Vérifier les logs
pm2 logs talosprimes-api
```

## 🎨 Démarrage Frontend (Next.js)

### Option 1 : Avec `next start` (Recommandé)

```bash
cd /var/www/talosprimes/packages/client

# Build
pnpm build

# Démarrer avec PM2
pm2 start "pnpm start" --name "talosprimes-client" --cwd /var/www/talosprimes/packages/client

# Ou redémarrer
pm2 restart talosprimes-client

# Vérifier les logs
pm2 logs talosprimes-client
```

### Option 2 : Avec le serveur standalone directement

```bash
cd /var/www/talosprimes/packages/client

# Build
pnpm build

# Démarrer le serveur standalone
pm2 start .next/standalone/server.js --name "talosprimes-client" --node-args="--port 3000"

# Ou redémarrer
pm2 restart talosprimes-client
```

## ⚙️ Configuration PM2 complète

### Créer un fichier `ecosystem.config.js` à la racine

```bash
cd /var/www/talosprimes
nano ecosystem.config.js
```

Contenu :

```javascript
module.exports = {
  apps: [
    {
      name: 'talosprimes-api',
      cwd: '/var/www/talosprimes/packages/platform',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/pm2/talosprimes-api-error.log',
      out_file: '/var/log/pm2/talosprimes-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'talosprimes-client',
      cwd: '/var/www/talosprimes/packages/client',
      script: 'pnpm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/talosprimes-client-error.log',
      out_file: '/var/log/pm2/talosprimes-client-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

### Utiliser le fichier ecosystem

```bash
cd /var/www/talosprimes

# Démarrer tout
pm2 start ecosystem.config.js

# Redémarrer tout
pm2 restart ecosystem.config.js

# Arrêter tout
pm2 stop ecosystem.config.js

# Supprimer tout
pm2 delete ecosystem.config.js
```

## 📋 Vérifications

```bash
# Vérifier que les services tournent
pm2 list

# Vérifier les logs en temps réel
pm2 logs

# Vérifier les ports
sudo netstat -tlnp | grep -E '3000|3001'

# Tester le backend
curl http://localhost:3001/health

# Tester le frontend
curl http://localhost:3000
```

## 🔧 Variables d'environnement

### Backend (`packages/platform/.env`)

```env
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
CORS_ORIGIN="https://talosprimes.com"
N8N_URL="http://localhost:5678"
N8N_API_KEY="..."
```

### Frontend (`packages/client/.env.local`)

```env
NEXT_PUBLIC_API_URL="https://api.talosprimes.com"
```

**⚠️ Important :** Pour le frontend, utilisez le domaine complet de votre backend API, pas `localhost`.

## 🐛 Problèmes courants

### "Port already in use"
```bash
# Trouver le processus qui utilise le port
sudo lsof -i :3000
sudo lsof -i :3001

# Tuer le processus
sudo kill -9 <PID>
```

### "Module not found"
```bash
# Réinstaller les dépendances
cd /var/www/talosprimes
pnpm install

# Rebuild
cd packages/shared && pnpm build
cd ../platform && pnpm build
cd ../client && pnpm build
```

### "Cannot connect to database"
```bash
# Tester la connexion
cd /var/www/talosprimes/packages/platform
pnpm prisma db pull
```

