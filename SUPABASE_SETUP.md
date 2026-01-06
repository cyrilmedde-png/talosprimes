# Configuration Supabase pour TalosPrimes

Ce guide vous explique comment configurer Supabase pour utiliser Prisma avec PostgreSQL.

## Étapes à suivre

### 1. Créer un compte Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Cliquez sur "Start your project"
3. Créez un compte (GitHub, Google, ou email)

### 2. Créer un nouveau projet

1. Une fois connecté, cliquez sur "New Project"
2. Remplissez les informations :
   - **Name** : `talosprimes-dev` (ou `talosprimes-prod` pour production)
   - **Database Password** : Choisissez un mot de passe fort (⚠️ **SAVEZ-LE**, vous en aurez besoin)
   - **Region** : Choisissez la région la plus proche (ex: `West EU (Paris)`)
3. Cliquez sur "Create new project"
4. ⏳ Attendez 2-3 minutes que le projet soit créé

### 3. Récupérer la connection string

1. Dans votre projet Supabase, allez dans **Settings** (⚙️) > **Database**
2. Descendez jusqu'à la section **Connection string**
3. Sélectionnez **URI** (pas Transaction)
4. Copiez la connection string qui ressemble à :
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```
5. ⚠️ Remplacez `[YOUR-PASSWORD]` par le mot de passe que vous avez défini à l'étape 2

### 4. Configurer votre fichier `.env`

1. Dans `packages/platform/`, créez un fichier `.env` (copiez depuis `.env.example` si vous l'avez)
2. Collez votre connection string dans `DATABASE_URL` :

```env
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@db.xxxxxxxxxxxxx.supabase.co:5432/postgres"
```

3. Ajoutez les autres variables nécessaires (voir `.env.example`)

### 5. Générer le client Prisma et créer les tables

Une fois la connection string configurée, exécutez :

```bash
cd packages/platform

# Générer le client Prisma
pnpm db:generate

# Créer les tables dans Supabase
pnpm db:push
```

Ou en une seule commande depuis la racine :

```bash
pnpm --filter platform db:push
```

### 6. Vérifier que tout fonctionne

```bash
# Ouvrir Prisma Studio (interface graphique pour voir vos données)
pnpm --filter platform db:studio
```

Cela devrait ouvrir une interface dans votre navigateur où vous pouvez voir vos tables.

## ⚠️ Sécurité

- **NE COMMITEZ JAMAIS** votre fichier `.env` dans Git
- Le fichier `.gitignore` est déjà configuré pour l'ignorer
- Pour la production, utilisez les variables d'environnement de votre plateforme d'hébergement (Vercel, Railway, etc.)

## 🔍 Accès à la base de données Supabase

Vous pouvez aussi accéder directement à votre base via le dashboard Supabase :

1. Dans votre projet Supabase
2. Allez dans **Table Editor** (menu de gauche)
3. Vous verrez toutes vos tables créées par Prisma

## 📚 Documentation Supabase

- [Supabase Docs](https://supabase.com/docs)
- [Connection Strings](https://supabase.com/docs/guides/database/connecting-to-postgres)

## ✅ Vérification finale

Une fois configuré, vous devriez avoir :
- ✅ Connection string dans `.env`
- ✅ Client Prisma généré (`node_modules/.prisma/client`)
- ✅ Tables créées dans Supabase (vérifiable dans Table Editor)

**C'est tout ! Vous êtes prêt à développer 🚀**

