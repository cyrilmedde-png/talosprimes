# Configuration Déploiement Production

## Architecture Production

```
api.votredomaine.com    → Backend API (Fastify sur port 3001)
app.votredomaine.com    → Frontend (Next.js)
www.votredomaine.com    → Redirection vers app.votredomaine.com (optionnel)
```

## Configuration Backend (Fastify)

### Variables d'environnement production

```env
NODE_ENV=production
PORT=3001

# CORS - Autoriser uniquement votre domaine frontend
CORS_ORIGIN=https://app.votredomaine.com

# Database - Supabase (même connection string)
DATABASE_URL="postgresql://postgres:...@db.xxxxx.supabase.co:5432/postgres"

# JWT
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
```

### Configuration CORS

Le backend doit autoriser uniquement votre domaine frontend :

```typescript
// Dans Fastify
fastify.register(require('@fastify/cors'), {
  origin: process.env.CORS_ORIGIN || 'https://app.votredomaine.com',
  credentials: true,
});
```

## Configuration Frontend (Next.js)

### Variables d'environnement production

```env
NEXT_PUBLIC_API_URL=https://api.votredomaine.com
```

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Pour déploiement Docker
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
```

## Options de Déploiement

### Option 1 : Vercel (Frontend) + Railway/Render (Backend) ⭐ Recommandé

**Frontend (Next.js) sur Vercel :**
- Gratuit pour débuter
- Déploiement automatique via Git
- HTTPS automatique
- CDN global

**Backend (Fastify) sur Railway ou Render :**
- Déploiement simple
- Variables d'environnement sécurisées
- Scaling automatique
- ~5-20$/mois

### Option 2 : Tout sur un VPS (DigitalOcean, Hetzner, etc.)

**Avantages :**
- Contrôle total
- Coût fixe (~5-10€/mois)

**Inconvénients :**
- Gestion serveur (Docker, Nginx, SSL, etc.)
- Plus de maintenance

### Option 3 : Docker Compose sur VPS

**Fichiers nécessaires :**
- `docker-compose.yml`
- `Dockerfile` (frontend + backend)
- Nginx comme reverse proxy

## Configuration DNS

### Enregistrements DNS

```
Type    Name    Value                    TTL
A       api     IP_DU_SERVEUR_BACKEND    3600
A       app     IP_DU_SERVEUR_FRONTEND   3600
CNAME   www     app.votredomaine.com     3600
```

## SSL/HTTPS

**Vercel/Railway/Render :** SSL automatique (Let's Encrypt)

**VPS manuel :** Utiliser Certbot (Let's Encrypt) avec Nginx

## Reverse Proxy (si VPS)

### Nginx Configuration

```nginx
# Frontend (app.votredomaine.com)
server {
    listen 80;
    server_name app.votredomaine.com;
    
    location / {
        proxy_pass http://localhost:3000;  # Next.js
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API (api.votredomaine.com)
server {
    listen 80;
    server_name api.votredomaine.com;
    
    location / {
        proxy_pass http://localhost:3001;  # Fastify
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Checklist Déploiement

- [ ] Domaine configuré (DNS pointant vers les serveurs)
- [ ] SSL/HTTPS activé (certificat Let's Encrypt)
- [ ] Variables d'environnement configurées en production
- [ ] CORS configuré (backend autorise uniquement le domaine frontend)
- [ ] Base de données Supabase accessible depuis production
- [ ] Tests de connexion API depuis le frontend
- [ ] Monitoring/Logs configurés
- [ ] Backups base de données configurés

