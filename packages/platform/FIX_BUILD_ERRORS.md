# Correction des erreurs de build

## Problème

Le package `@talosprimes/shared` doit être buildé avant de pouvoir être utilisé par `platform`.

## Solution

### Sur le VPS, exécutez dans cet ordre :

```bash
# 1. Builder le package shared d'abord
cd /var/www/talosprimes/packages/shared
pnpm build

# 2. Ensuite builder platform
cd ../platform
pnpm build
```

### OU depuis la racine :

```bash
cd /var/www/talosprimes

# Builder tous les packages dans l'ordre
pnpm --filter shared build
pnpm --filter platform build
```

## Corrections appliquées

J'ai aussi corrigé :
- ✅ Imports inutilisés supprimés
- ✅ Types JWT corrigés
- ✅ Variables non utilisées corrigées

## Commandes complètes pour le VPS

```bash
cd /var/www/talosprimes

# Récupérer les changements
git pull origin main

# Installer dépendances
pnpm install

# Builder shared d'abord
cd packages/shared
pnpm build

# Ensuite platform
cd ../platform
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm build

# Redémarrer
pm2 restart talosprimes-api
```

