# Instructions de Configuration - TalosPrimes

## ✅ Ce qui est configuré

### Backend (Fastify)
- ✅ Fastify configuré avec CORS, Helmet, Rate Limiting
- ✅ Prisma schema complet avec tous les models
- ✅ Validation des variables d'environnement (Zod)
- ✅ Configuration base de données
- ✅ Health check endpoint

### Frontend (Next.js 14)
- ✅ Next.js configuré avec App Router
- ✅ TypeScript strict
- ✅ Tailwind CSS
- ✅ Client API de base

## 📋 Prochaines étapes

### 1. Installer les dépendances

```bash
# Depuis la racine
pnpm install
```

### 2. Configurer Supabase (déjà fait ✅)

Vous avez déjà créé le projet Supabase. Maintenant :

1. Récupérez la connection string dans Settings > Database
2. Créez `packages/platform/.env` :

```env
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@db.xxxxx.supabase.co:5432/postgres"
JWT_SECRET="changez-moi-par-une-chaine-tres-longue-minimum-32-caracteres"
JWT_REFRESH_SECRET="changez-moi-par-une-autre-chaine-tres-longue-minimum-32-caracteres"
PORT=3001
NODE_ENV=development
```

### 3. Créer les tables dans Supabase

```bash
# Générer le client Prisma
pnpm --filter platform db:generate

# Créer les tables
pnpm --filter platform db:push
```

### 4. Tester le backend

```bash
# Démarrer le backend
pnpm --filter platform dev

# Dans un autre terminal, tester :
curl http://localhost:3001/health
```

Vous devriez voir : `{"status":"ok","database":"connected"}`

### 5. Tester le frontend

```bash
# Démarrer le frontend
pnpm --filter client dev
```

Ouvrez http://localhost:3000 dans votre navigateur.

## 🌐 Configuration pour Production (nom de domaine)

### Variables d'environnement Backend (production)

```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://app.votredomaine.com
DATABASE_URL="..." # Connection string Supabase
JWT_SECRET="..." # Secret long et sécurisé
JWT_REFRESH_SECRET="..." # Autre secret long et sécurisé
```

### Variables d'environnement Frontend (production)

Créer `.env.local` dans `packages/client/` :

```env
NEXT_PUBLIC_API_URL=https://api.votredomaine.com
```

### DNS Configuration

```
Type    Name    Value                    TTL
A       api     IP_SERVEUR_BACKEND       3600
A       app     IP_SERVEUR_FRONTEND      3600
```

## 🚀 Déploiement Recommandé

### Frontend (Next.js) → Vercel
- Gratuit pour débuter
- HTTPS automatique
- Déploiement Git automatique

### Backend (Fastify) → Railway ou Render
- ~5-20$/mois
- Variables d'environnement sécurisées
- Scaling automatique

Voir [DEPLOYMENT.md](./DEPLOYMENT.md) pour plus de détails.

## 📝 Prochaines fonctionnalités à implémenter

1. **Authentification** (JWT)
   - Routes login/register
   - Middleware auth
   - Refresh tokens

2. **Routes API**
   - Gestion tenants
   - Gestion clients finaux
   - Gestion modules
   - Intégration n8n

3. **Frontend**
   - Pages login/dashboard
   - Composants UI
   - State management (Zustand)

## ❓ Questions ?

Si vous avez des questions ou des besoins spécifiques, n'hésitez pas à me les poser !

