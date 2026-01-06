# TalosPrimes

SaaS de gestion d'entreprise orchestré par n8n - Plateforme multi-tenant avec logique métier automatisée.

## 🚀 Architecture

- **Backend** : Fastify + TypeScript + Prisma + PostgreSQL (Supabase)
- **Frontend** : Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Base de données** : Supabase PostgreSQL
- **Automatisation** : n8n (workflows)
- **Paiement** : Stripe

## 📦 Structure Monorepo

```
talosprimes/
├── packages/
│   ├── platform/     # Backend API (Fastify)
│   ├── client/       # Frontend (Next.js)
│   └── shared/       # Code partagé (types, constants)
└── docs/             # Documentation
```

## Architecture

- **`packages/platform`** : Backend API (gestion tenants, sécurité, intégration n8n)
- **`packages/client`** : Frontend (interface utilisateur pour entreprises clientes)
- **`packages/shared`** : Code partagé (types, constants)

## Principes

✅ Séparation stricte plateforme/client  
✅ TypeScript strict (pas de `any`)  
✅ Logique métier dans n8n uniquement  
✅ Code professionnel, transparent, maintenable  

## Développement

```bash
# Installation
pnpm install

# Développement (platform + client)
pnpm dev

# Build
pnpm build

# Tests
pnpm test

# Lint
pnpm lint
```

## Documentation

- [PRD](./docs/PRD.md) - Product Requirements Document
- [Architecture](./docs/ARCHITECTURE.md) - Architecture technique
- [Valorisation](./docs/VALORISATION.md) - Analyse financière

## Stack Technique

- **Backend** : Node.js, Express, TypeScript, Prisma, PostgreSQL
- **Frontend** : Next.js, React, TypeScript, Tailwind CSS
- **Infrastructure** : n8n, Stripe, Redis, BullMQ
