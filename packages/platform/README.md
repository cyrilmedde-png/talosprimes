# Platform Package

Backend API de la plateforme TalosPrimes.

## Configuration

### 1. Variables d'environnement

Créez un fichier `.env` dans ce dossier avec :

```env
# Database - Supabase PostgreSQL
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# JWT Secrets
JWT_SECRET="your-secret-min-32-characters"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-characters"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV=development

# n8n Integration
N8N_API_URL="https://your-n8n-instance.com"
N8N_API_KEY="your-n8n-api-key"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Redis
REDIS_URL="redis://localhost:6379"
```

### 2. Setup Supabase

Voir [../../SUPABASE_SETUP.md](../../SUPABASE_SETUP.md) pour les instructions complètes.

### 3. Générer Prisma Client

```bash
pnpm db:generate
```

### 4. Créer les tables dans Supabase

```bash
pnpm db:push
```

## Scripts disponibles

- `pnpm dev` : Démarre le serveur en mode développement (watch)
- `pnpm build` : Build TypeScript
- `pnpm start` : Démarre le serveur en production
- `pnpm db:generate` : Génère le client Prisma
- `pnpm db:push` : Push le schema vers la DB (Supabase)
- `pnpm db:migrate` : Crée une migration
- `pnpm db:studio` : Ouvre Prisma Studio (interface graphique)

