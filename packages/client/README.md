# Client Package - Frontend Next.js

Interface utilisateur pour TalosPrimes.

## Configuration

### Variables d'environnement

Créez un fichier `.env.local` dans ce dossier :

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
# OU pour production
NEXT_PUBLIC_API_URL=https://api.votredomaine.com
```

## Développement

```bash
# Démarrer le serveur de développement
pnpm dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

## Build

```bash
# Build pour production
pnpm build

# Démarrer en production
pnpm start
```

## Pages disponibles

- `/` - Redirection automatique (login ou dashboard)
- `/login` - Page de connexion
- `/dashboard` - Tableau de bord (protégé)

## Authentification

L'authentification utilise :
- **localStorage** pour stocker les tokens
- **Automatic token refresh** si le token expire
- **Redirection automatique** vers `/login` si non authentifié

## Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/          # Page login
│   ├── (dashboard)/
│   │   └── dashboard/      # Page dashboard
│   └── layout.tsx           # Layout racine
├── lib/
│   ├── auth.ts              # Fonctions d'authentification
│   ├── api-client.ts        # Client API authentifié
│   └── api.ts               # Client API de base
└── components/              # Composants React (à créer)
```

