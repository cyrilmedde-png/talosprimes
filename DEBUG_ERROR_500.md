# Diagnostic Erreur 500 - Internal Server Error

## 🔍 Vérifications à faire sur le VPS

### 1. Vérifier que les services sont démarrés

```bash
# Vérifier si le backend (Fastify) tourne
pm2 list

# Vérifier si le frontend (Next.js) tourne
pm2 list

# Si pas démarré, démarrer :
cd /var/www/talosprimes/packages/platform
pm2 start dist/index.js --name "talosprimes-api"

cd /var/www/talosprimes/packages/client
pm2 start .next/standalone/server.js --name "talosprimes-client"
```

### 2. Vérifier les logs

```bash
# Logs backend
pm2 logs talosprimes-api --lines 50

# Logs frontend
pm2 logs talosprimes-client --lines 50

# Logs Nginx (si vous utilisez Nginx)
sudo tail -f /var/log/nginx/error.log
```

### 3. Vérifier les variables d'environnement

```bash
# Backend
cd /var/www/talosprimes/packages/platform
cat .env

# Frontend
cd /var/www/talosprimes/packages/client
cat .env.local
```

**Variables requises pour le backend :**
- `DATABASE_URL` (Supabase)
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `PORT=3001`
- `CORS_ORIGIN` (doit pointer vers votre domaine frontend)

**Variables requises pour le frontend :**
- `NEXT_PUBLIC_API_URL` (doit pointer vers votre backend, ex: `https://api.talosprimes.com`)

### 4. Vérifier la connexion à la base de données

```bash
cd /var/www/talosprimes/packages/platform
pnpm prisma db pull
```

### 5. Vérifier les ports

```bash
# Vérifier que les ports sont ouverts
sudo netstat -tlnp | grep -E '3000|3001'

# Ou avec ss
sudo ss -tlnp | grep -E '3000|3001'
```

### 6. Vérifier Nginx (si utilisé)

```bash
# Tester la configuration Nginx
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx

# Vérifier le statut
sudo systemctl status nginx
```

### 7. Vérifier les permissions

```bash
# Vérifier les permissions des fichiers
ls -la /var/www/talosprimes/packages/client/.next/
ls -la /var/www/talosprimes/packages/platform/dist/
```

## 🐛 Erreurs courantes

### Erreur : "Cannot find module"
**Solution :** Réinstaller les dépendances
```bash
cd /var/www/talosprimes
pnpm install
```

### Erreur : "Database connection failed"
**Solution :** Vérifier `DATABASE_URL` dans `.env`

### Erreur : "CORS error"
**Solution :** Vérifier `CORS_ORIGIN` dans le backend

### Erreur : "NEXT_PUBLIC_API_URL not set"
**Solution :** Créer `.env.local` dans `packages/client/` avec :
```
NEXT_PUBLIC_API_URL=https://api.talosprimes.com
```

## 📋 Checklist rapide

- [ ] Backend démarré avec PM2
- [ ] Frontend démarré avec PM2
- [ ] Variables d'environnement configurées
- [ ] Base de données accessible
- [ ] Ports 3000 et 3001 ouverts
- [ ] Nginx configuré (si utilisé)
- [ ] Logs vérifiés pour erreurs spécifiques

## 🔧 Commandes de redémarrage complète

```bash
# Arrêter tout
pm2 stop all

# Rebuild
cd /var/www/talosprimes
git pull origin main
cd packages/shared && pnpm build
cd ../platform && pnpm build
cd ../client && pnpm build

# Redémarrer
cd packages/platform
pm2 restart talosprimes-api

cd ../client
pm2 restart talosprimes-client

# Vérifier
pm2 list
pm2 logs
```

