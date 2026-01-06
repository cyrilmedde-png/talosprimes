# Configuration n8n dans .env

## Variables d'environnement pour n8n

Ajoutez ces lignes dans votre fichier `packages/platform/.env` :

### Option 1 : Authentification par Login/Mot de passe (Basic Auth)

```env
# URL de votre instance n8n
N8N_API_URL=http://localhost:5678
# OU pour production
N8N_API_URL=https://n8n.votredomaine.com

# Authentification Basic Auth (username/password)
N8N_USERNAME=votre-email@example.com
N8N_PASSWORD=votre-mot-de-passe-n8n
```

### Option 2 : Authentification par API Key

```env
# URL de votre instance n8n
N8N_API_URL=http://localhost:5678

# Authentification par API Key (si n8n est configuré avec API Key)
N8N_API_KEY=votre-api-key-n8n
```

### Option 3 : Sans authentification (développement local uniquement)

```env
# URL de votre instance n8n
N8N_API_URL=http://localhost:5678
# Pas besoin de N8N_USERNAME, N8N_PASSWORD ou N8N_API_KEY
```

## Priorité d'authentification

Le service n8n utilise l'authentification dans cet ordre :

1. **API Key** (si `N8N_API_KEY` est défini) - Priorité la plus haute
2. **Basic Auth** (si `N8N_USERNAME` et `N8N_PASSWORD` sont définis)
3. **Aucune authentification** (développement local uniquement)

## Exemple complet de .env

```env
# Database
DATABASE_URL="postgresql://postgres:...@db.xxxxx.supabase.co:5432/postgres"

# JWT
JWT_SECRET="votre-secret-tres-long-minimum-32-caracteres"
JWT_REFRESH_SECRET="votre-autre-secret-tres-long-minimum-32-caracteres"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV=production

# CORS
CORS_ORIGIN=https://app.votredomaine.com

# n8n - Configuration avec login/password
N8N_API_URL=http://localhost:5678
N8N_USERNAME=admin@example.com
N8N_PASSWORD=votre-mot-de-passe-n8n

# Stripe (optionnel pour l'instant)
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# Redis (optionnel pour l'instant)
REDIS_URL=""
```

## Où trouver les credentials n8n ?

### Si n8n est installé sur votre VPS

1. **Connectez-vous à n8n** via l'interface web (généralement `http://VPS_IP:5678`)
2. **Créez un compte** ou utilisez le compte admin existant
3. **Les credentials** sont ceux que vous utilisez pour vous connecter à l'interface n8n

### Si n8n utilise une API Key

1. Allez dans les **Settings** de n8n
2. Section **API** ou **Security**
3. Générez une **Personal API Key**
4. Utilisez cette clé dans `N8N_API_KEY`

## Vérification

Après avoir configuré, testez la connexion :

```bash
# Démarrer le serveur
pnpm dev

# Dans un autre terminal, tester (avec un token d'auth)
curl -X GET http://localhost:3001/api/n8n/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Vous devriez voir :
```json
{
  "success": true,
  "message": "Connexion à n8n réussie"
}
```

## Sécurité

⚠️ **Important** : Ne commitez JAMAIS le fichier `.env` dans Git !

Le fichier `.gitignore` est déjà configuré pour exclure `.env`.

Pour la production, utilisez les variables d'environnement de votre plateforme d'hébergement (Railway, Render, etc.).

