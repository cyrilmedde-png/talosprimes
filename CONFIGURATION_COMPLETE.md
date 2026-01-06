# Configuration Complète - Guide Étape par Étape

## 🎯 Objectif

Configurer tous les fichiers d'environnement nécessaires pour que l'application fonctionne en production.

## 📁 Fichiers à créer sur le VPS

### 1. Backend : `/var/www/talosprimes/packages/platform/.env`

```bash
cd /var/www/talosprimes/packages/platform
nano .env
```

Copiez-collez ce contenu (remplacez les valeurs entre `[]`) :

```env
# ============================================
# ENVIRONNEMENT
# ============================================
NODE_ENV=production
PORT=3001

# ============================================
# BASE DE DONNÉES - SUPABASE
# ============================================
# Récupérez cette URL depuis votre dashboard Supabase
# Settings → Database → Connection string → URI
DATABASE_URL="postgresql://postgres:[VOTRE_MOT_DE_PASSE]@[VOTRE_HOST].supabase.co:5432/postgres"

# ============================================
# JWT - TOKENS D'AUTHENTIFICATION
# ============================================
# Générez deux secrets différents avec : openssl rand -base64 32
JWT_SECRET="[GÉNÉREZ_UN_SECRET_32_CARACTÈRES]"
JWT_REFRESH_SECRET="[GÉNÉREZ_UN_AUTRE_SECRET_32_CARACTÈRES]"

# Durée de vie des tokens
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# ============================================
# CORS - ORIGINE AUTORISÉE
# ============================================
# Votre domaine frontend avec https://
CORS_ORIGIN="https://talosprimes.com"

# ============================================
# N8N - INTÉGRATION
# ============================================
N8N_URL="http://localhost:5678"

# Option 1 : Avec API Key (recommandé)
N8N_API_KEY="[VOTRE_API_KEY_N8N]"

# Option 2 : Avec Basic Auth (si pas d'API Key)
# N8N_USERNAME="[VOTRE_USERNAME_N8N]"
# N8N_PASSWORD="[VOTRE_PASSWORD_N8N]"
```

### 2. Frontend : `/var/www/talosprimes/packages/client/.env.local`

```bash
cd /var/www/talosprimes/packages/client
nano .env.local
```

Copiez-collez ce contenu (remplacez par votre vrai domaine) :

```env
# ============================================
# URL DU BACKEND API
# ============================================
# Si vous avez un sous-domaine api :
NEXT_PUBLIC_API_URL="https://api.talosprimes.com"

# Si vous utilisez le même domaine avec un chemin :
# NEXT_PUBLIC_API_URL="https://talosprimes.com/api"
```

## 🔐 Génération des secrets JWT

Sur votre VPS, exécutez :

```bash
# Générer le premier secret
openssl rand -base64 32

# Générer le deuxième secret (différent)
openssl rand -base64 32
```

Copiez chaque résultat dans `JWT_SECRET` et `JWT_REFRESH_SECRET`.

## 📋 Récupération des informations Supabase

1. Allez sur https://supabase.com
2. Connectez-vous à votre projet
3. Allez dans **Settings** → **Database**
4. Copiez la **Connection string** (format URI)
5. Remplacez `[YOUR-PASSWORD]` par votre mot de passe de base de données

## 🔄 Après configuration

### Backend

```bash
cd /var/www/talosprimes/packages/platform
pm2 restart talosprimes-api
pm2 logs talosprimes-api
```

### Frontend

```bash
cd /var/www/talosprimes/packages/client
pnpm build
pm2 restart talosprimes-client
pm2 logs talosprimes-client
```

## ✅ Vérification

### Tester le backend

```bash
curl http://localhost:3001/health
```

Devrait retourner :
```json
{"status":"ok","database":"connected"}
```

### Tester depuis l'extérieur

```bash
curl https://api.talosprimes.com/health
```

### Tester le frontend

Ouvrez `https://talosprimes.com` dans votre navigateur et vérifiez :
- La page se charge
- Pas d'erreur "Failed to fetch"
- Le login fonctionne

## 🐛 Problèmes courants

### Erreur : "Failed to fetch"
- Vérifiez que `NEXT_PUBLIC_API_URL` est correct
- Vérifiez que `CORS_ORIGIN` correspond au domaine frontend
- Rebuild le frontend après modification

### Erreur : "Database connection failed"
- Vérifiez que `DATABASE_URL` est correct
- Vérifiez que votre IP est autorisée dans Supabase (Settings → Database → Connection pooling)

### Erreur : "CORS error"
- Vérifiez que `CORS_ORIGIN` correspond exactement au domaine (avec https://)
- Redémarrez le backend après modification

## 📝 Exemple complet avec valeurs réelles

### Backend `.env` (exemple)

```env
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://postgres:MonMotDePasse123@db.abcdefghijklmnop.supabase.co:5432/postgres"
JWT_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
JWT_REFRESH_SECRET="z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
CORS_ORIGIN="https://talosprimes.com"
N8N_URL="http://localhost:5678"
N8N_API_KEY="n8n_api_abc123def456ghi789"
```

### Frontend `.env.local` (exemple)

```env
NEXT_PUBLIC_API_URL="https://api.talosprimes.com"
```

## ⚠️ Sécurité

- Ne partagez JAMAIS ces fichiers publiquement
- Ne les commitez JAMAIS dans Git
- Changez les secrets régulièrement
- Utilisez des secrets différents pour chaque environnement

