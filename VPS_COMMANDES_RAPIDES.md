# Commandes Rapides VPS - Copier-Coller

## 🚀 Cloner depuis GitHub

```bash
# Aller dans /var/www
cd /var/www

# Cloner (choisir SSH ou HTTPS)
git clone git@github.com:cyrimedde-png/talosprimes.git
# OU
git clone https://github.com/cyrimedde-png/talosprimes.git

# Aller dans le dossier
cd talosprimes
```

---

## 📦 Installation complète

```bash
# Installer les dépendances
pnpm install

# Générer Prisma client
cd packages/platform
pnpm db:generate

# Retour à la racine
cd ../..

# Build tout le projet
pnpm build
```

---

## ⚙️ Configuration

### Backend `.env`

```bash
cd packages/platform
nano .env
```

**Contenu :**
```env
DATABASE_URL="postgresql://postgres:VOTRE_MDP@db.xxxxx.supabase.co:5432/postgres"
JWT_SECRET="votre-secret-tres-long-minimum-32-caracteres"
JWT_REFRESH_SECRET="votre-autre-secret-tres-long-minimum-32-caracteres"
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://app.votredomaine.com
```

### Frontend `.env.local`

```bash
cd ../client
nano .env.local
```

**Contenu :**
```env
NEXT_PUBLIC_API_URL=https://api.votredomaine.com
```

---

## 🎯 Démarrer avec PM2

```bash
# Backend
cd /var/www/talosprimes/packages/platform
pm2 start dist/index.js --name "talosprimes-api"

# Frontend
cd ../client
pm2 start .next/standalone/server.js --name "talosprimes-client"

# Sauvegarder
pm2 save
pm2 startup
```

---

## 🔄 Mettre à jour depuis GitHub

```bash
cd /var/www/talosprimes
git pull origin main
pnpm install
pnpm build
pm2 restart all
```

---

## 📊 Gérer PM2

```bash
# Voir les processus
pm2 list

# Voir les logs
pm2 logs

# Redémarrer
pm2 restart all

# Arrêter
pm2 stop all
```

---

## 🔍 Vérifier que tout fonctionne

```bash
# Backend health check
curl http://localhost:3001/health

# Devrait retourner : {"status":"ok","database":"connected"}
```

