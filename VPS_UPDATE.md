# Commandes VPS - Mise à jour depuis GitHub

## 📥 Récupérer les changements depuis GitHub

```bash
# Aller dans le dossier du projet
cd /var/www/talosprimes

# Récupérer les derniers changements
git pull origin main
```

## 📦 Installer/Mettre à jour les dépendances

```bash
# Installer les nouvelles dépendances
pnpm install
```

## 🗄️ Mettre à jour la base de données

```bash
# Aller dans le package platform
cd packages/platform

# Générer le client Prisma (si le schema a changé)
pnpm db:generate

# Appliquer les changements de schema (si nécessaire)
pnpm db:push
```

## 🌱 Créer l'utilisateur admin

```bash
# Toujours dans packages/platform
# Exécuter le script de seed pour créer l'utilisateur admin
pnpm db:seed
```

## 🔄 Redémarrer l'application

```bash
# Si vous utilisez PM2
pm2 restart talosprimes-api

# OU si vous démarrez manuellement
cd /var/www/talosprimes/packages/platform
pnpm build
pnpm start
```

## ✅ Vérifier que tout fonctionne

```bash
# Tester le health check
curl http://localhost:3001/health

# Devrait retourner : {"status":"ok","database":"connected"}
```

---

## 📋 Checklist complète (copier-coller)

```bash
# 1. Récupérer les changements
cd /var/www/talosprimes
git pull origin main

# 2. Installer les dépendances
pnpm install

# 3. Mettre à jour Prisma
cd packages/platform
pnpm db:generate
pnpm db:push

# 4. Créer l'utilisateur admin
pnpm db:seed

# 5. Build (si nécessaire)
pnpm build

# 6. Redémarrer avec PM2
pm2 restart talosprimes-api

# OU démarrer manuellement
# pnpm start
```

---

## 🔍 En cas d'erreur

### Erreur "git pull" - Conflits

```bash
# Si vous avez des modifications locales
git stash
git pull origin main
git stash pop
```

### Erreur "pnpm install" - Dépendances

```bash
# Nettoyer et réinstaller
rm -rf node_modules
pnpm install
```

### Erreur Prisma

```bash
# Régénérer le client
pnpm db:generate

# Vérifier la connection string dans .env
cat .env | grep DATABASE_URL
```

---

## 🎯 Après la mise à jour

Une fois tout mis à jour, vous pouvez :

1. **Tester le login** :
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "groupemclem@gmail.com",
    "password": "21052024_Aa!"
  }'
```

2. **Vérifier les routes** :
```bash
# Health check
curl http://localhost:3001/health

# Test n8n (avec token)
curl -X GET http://localhost:3001/api/n8n/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

