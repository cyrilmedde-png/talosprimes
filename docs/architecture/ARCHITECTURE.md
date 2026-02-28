# Architecture de l'Application
## SaaS de Gestion d'Entreprise Orchestré par n8n

**Version:** 1.0  
**Date:** 2026  
**Principes:** Séparation stricte, TypeScript strict, Logique métier dans n8n

---

## 1. Principes Fondamentaux

### 1.1 Règles d'Architecture

✅ **Séparation stricte :** Plateforme et Client sont des applications complètement séparées  
✅ **TypeScript strict :** Aucun `any`, types explicites partout  
✅ **Transparence :** Aucune magie cachée, code explicite  
✅ **Gestion d'erreurs :** Correction propre, jamais de forçage  
✅ **Qualité professionnelle :** Code fluide, fonctionnel, maintenable  
✅ **Logique métier = n8n :** Tout sauf la sécurité se fait dans n8n  
✅ **Communication :** Questionner plutôt que deviner  

### 1.2 Stack Technique

**Plateforme (Backend API) :**
- Runtime : Node.js 20+ (LTS)
- Framework : Express.js ou Fastify (à confirmer)
- Langage : TypeScript strict (noImplicitAny, strictNullChecks)
- Base de données : PostgreSQL 15+
- ORM : Prisma (type-safe)
- Authentification : JWT + refresh tokens
- Validation : Zod (schema validation)
- Tests : Vitest ou Jest

**Client (Frontend) :**
- Framework : Next.js 14+ (App Router) ou React (à confirmer)
- Langage : TypeScript strict
- UI : Tailwind CSS + composants (Shadcn/ui recommandé)
- State : Zustand ou React Query
- Validation : Zod (cohérence avec backend)

**Infrastructure :**
- n8n : Instance managée (séparée)
- Paiement : Stripe
- Cache : Redis (sessions, rate limiting)
- Queue : BullMQ (jobs asynchrones pour n8n)

---

## 2. Structure du Projet

### 2.1 Architecture Monorepo (Recommandée)

```
talosprimes/
├── packages/
│   ├── platform/              # Application Plateforme (Backend API)
│   │   ├── src/
│   │   │   ├── api/           # Routes API
│   │   │   ├── services/      # Services métiers (minimal, sécurité uniquement)
│   │   │   ├── models/        # Modèles Prisma
│   │   │   ├── types/         # Types TypeScript partagés
│   │   │   ├── utils/         # Utilitaires
│   │   │   ├── middleware/    # Auth, validation, etc.
│   │   │   └── config/        # Configuration
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── client/                # Application Client (Frontend)
│   │   ├── src/
│   │   │   ├── app/           # Next.js App Router (si Next.js)
│   │   │   ├── components/    # Composants React
│   │   │   ├── lib/           # Utilitaires, API client
│   │   │   ├── types/         # Types TypeScript
│   │   │   ├── hooks/         # React hooks
│   │   │   └── stores/        # State management
│   │   ├── public/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/                # Code partagé (types, constants)
│       ├── src/
│       │   ├── types/         # Types partagés
│       │   ├── constants/     # Constantes
│       │   └── utils/         # Utilitaires partagés
│       └── package.json
│
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md
│   ├── PRD.md
│   └── VALORISATION.md
│
├── .github/                   # GitHub workflows
├── docker-compose.yml         # Développement local
├── package.json               # Root (workspace)
├── pnpm-workspace.yaml        # ou npm/yarn workspaces
└── README.md
```

**Alternative : Repos séparés**
- `talosprimes-platform` (repo séparé)
- `talosprimes-client` (repo séparé)

### 2.2 Séparation Plateforme / Client

**Plateforme :**
- Gestion des tenants (entreprises clientes)
- Authentification / Autorisation
- Gestion des modules et abonnements
- Facturation (Stripe)
- API REST pour le client
- API pour déclencher workflows n8n
- Logique de sécurité uniquement

**Client :**
- Interface utilisateur pour les entreprises clientes
- Gestion des clients finaux (CRUD via API)
- Dashboard, modules, facturation
- Authentification (login, tokens)
- Appels API uniquement (pas de logique métier)

---

## 3. Architecture Détaillée

### 3.1 Plateforme (Backend API)

#### 3.1.1 Structure des Dossiers

```
platform/src/
├── api/
│   ├── routes/
│   │   ├── auth.routes.ts         # Login, refresh token
│   │   ├── tenants.routes.ts      # Gestion tenants (admin only)
│   │   ├── modules.routes.ts      # Catalogue modules
│   │   ├── subscriptions.routes.ts # Abonnements entreprises
│   │   ├── clients.routes.ts      # CRUD clients finaux (via API)
│   │   ├── invoices.routes.ts     # Factures (lecture)
│   │   └── n8n.routes.ts          # Déclenchement workflows (interne)
│   │
│   └── server.ts                  # Configuration Express/Fastify
│
├── services/
│   ├── auth.service.ts            # JWT, validation tokens
│   ├── tenant.service.ts          # Isolation multi-tenant
│   ├── n8n.service.ts             # Communication avec n8n
│   ├── stripe.service.ts          # Intégration Stripe
│   └── event.service.ts           # Émission événements → n8n
│
├── middleware/
│   ├── auth.middleware.ts         # Vérification JWT
│   ├── tenant.middleware.ts       # Injection tenant_id
│   ├── validation.middleware.ts   # Validation Zod
│   └── error.middleware.ts        # Gestion erreurs centralisée
│
├── models/                        # Prisma models (générés)
├── types/
│   ├── api.types.ts               # Types requêtes/réponses
│   ├── n8n.types.ts               # Types pour n8n
│   └── stripe.types.ts            # Types Stripe
│
├── config/
│   ├── database.ts                # Prisma client
│   ├── n8n.ts                     # Config n8n
│   └── env.ts                     # Variables d'environnement (Zod)
│
└── utils/
    ├── logger.ts                  # Winston/Pino
    └── errors.ts                  # Classes d'erreurs custom
```

#### 3.1.2 Base de Données (Prisma Schema)

**Principe :** Toutes les tables ont un `tenant_id` (isolation stricte)

```prisma
// Schema simplifié (détaillé dans schema.prisma)

model Tenant {
  id            String   @id @default(uuid())
  nomEntreprise String
  siret         String?
  emailContact  String
  metier        String
  statut        TenantStatus @default(ACTIF)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  users         User[]
  subscriptions Subscription[]
  clients       ClientFinal[]
  invoices      Invoice[]
  
  @@index([emailContact])
}

model User {
  id          String   @id @default(uuid())
  tenantId    String
  email       String
  passwordHash String
  role        UserRole
  statut      UserStatus @default(ACTIF)
  lastLoginAt DateTime?
  createdAt   DateTime @default(now())
  
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, email])
  @@index([email])
}

// ... autres models (voir PRD section 3)
```

#### 3.1.3 Flux d'Authentification

1. **Login :** POST `/api/auth/login`
   - Vérification credentials (email + password)
   - Génération JWT (access token) + refresh token
   - Stockage refresh token en DB (hashé)
   - Retour tokens au client

2. **Requêtes API :** Header `Authorization: Bearer <token>`
   - Middleware vérifie JWT
   - Extraction `tenant_id` du token
   - Injection dans `req.tenantId` (isolation)

3. **Refresh :** POST `/api/auth/refresh`
   - Vérification refresh token
   - Génération nouveau access token

### 3.2 Client (Frontend)

#### 3.2.1 Structure des Dossiers

```
client/src/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── clients/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── modules/
│   │   │   └── page.tsx
│   │   ├── facturation/
│   │   │   └── page.tsx
│   │   └── layout.tsx            # Layout avec sidebar
│   └── layout.tsx                # Root layout
│
├── components/
│   ├── ui/                       # Composants Shadcn/ui
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── clients/
│   │   ├── ClientList.tsx
│   │   └── ClientForm.tsx
│   └── ...
│
├── lib/
│   ├── api/
│   │   ├── client.ts             # Client HTTP (axios/fetch)
│   │   ├── auth.ts               # Fonctions auth
│   │   └── endpoints.ts          # Types endpoints
│   ├── utils/
│   │   └── ...
│   └── constants.ts
│
├── types/
│   └── api.types.ts              # Types partagés avec backend
│
└── hooks/
    ├── useAuth.ts
    ├── useClients.ts
    └── ...
```

#### 3.2.2 Gestion d'État

**Options :**
- **React Query** : Pour données serveur (cache, sync)
- **Zustand** : Pour état global (auth, UI state)

**Principe :** Client = présentation uniquement, pas de logique métier

### 3.3 Communication Plateforme ↔ n8n

#### 3.3.1 Déclenchement de Workflows

**Service n8n (`platform/src/services/n8n.service.ts`) :**

```typescript
// Pseudo-code (structure)

class N8nService {
  async triggerWorkflow(
    tenantId: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    // 1. Récupérer workflow_id depuis DB (LienWorkflowN8N)
    // 2. Appel HTTP POST à n8n API
    // 3. Log dans EventLog
    // 4. Gestion erreurs (retry queue)
  }
}
```

**Flux :**
1. Événement métier (ex: création client final)
2. Insertion DB (client créé)
3. Émission événement → `EventService.emit(eventType, payload)`
4. `EventService` appelle `N8nService.triggerWorkflow()`
5. Job asynchrone (BullMQ) pour ne pas bloquer
6. Log résultat dans `EventLog`

---

## 4. Sécurité & Isolation Multi-Tenant

### 4.1 Isolation des Données

**Principe :** Chaque requête vérifie `tenant_id`

**Middleware :**
```typescript
// Toutes les requêtes après auth
req.tenantId = extractTenantIdFromToken(req.user)

// Toutes les requêtes DB
prisma.clientFinal.findMany({
  where: { tenantId: req.tenantId } // TOUJOURS présent
})
```

**Validation :** Tests unitaires pour s'assurer qu'aucune requête ne peut accéder à un autre tenant

### 4.2 Variables d'Environnement

```env
# Plateforme
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
N8N_API_URL=https://n8n.example.com
N8N_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Client
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Validation :** Utiliser Zod pour valider les env vars au démarrage

---

## 5. Développement & Déploiement

### 5.1 Développement Local

**docker-compose.yml :**
```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: talosprimes
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  # n8n (à configurer séparément ou via docker)
```

**Scripts :**
- `pnpm dev` : Lance plateforme + client en dev
- `pnpm build` : Build production
- `pnpm test` : Tests
- `pnpm db:migrate` : Migrations Prisma
- `pnpm db:seed` : Seed données test

### 5.2 Tests

**Plateforme :**
- Tests unitaires : Services, utils
- Tests d'intégration : API routes
- Tests E2E : Scénarios complets (Playwright)

**Client :**
- Tests composants : Vitest + React Testing Library
- Tests E2E : Playwright

---

## 6. Questions à Clarifier

1. **Framework frontend :** Next.js (App Router) ou React pur + Vite ?
2. **Framework backend :** Express ou Fastify (recommandé pour perf) ?
3. **Monorepo :** pnpm workspaces, npm workspaces, ou repos séparés ?
4. **n8n :** Instance self-hosted ou cloud ? URL/credentials ?
5. **Déploiement :** Vercel (client) + Railway/Render (platform) ou autre ?
6. **CI/CD :** GitHub Actions ou autre ?

---

## 7. Prochaines Étapes

1. ✅ Créer structure de dossiers
2. ✅ Initialiser packages (package.json, tsconfig)
3. ✅ Configurer Prisma schema
4. ✅ Setup TypeScript strict
5. ⏳ Configurer ESLint/Prettier (qualité code)
6. ⏳ Créer premières routes API (auth)
7. ⏳ Créer premières pages client (login, dashboard)
8. ⏳ Intégrer n8n service
9. ⏳ Tests

---

**Fin du Document d'Architecture**

