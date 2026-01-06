# Tests Complets de l'Application

## ✅ État actuel

- ✅ Base de données Supabase connectée
- ✅ Tables créées
- ✅ Utilisateur admin créé
- ✅ Build TypeScript réussi
- ✅ Application prête à démarrer

## 🚀 Démarrer l'application

### Sur votre VPS

```bash
cd /var/www/talosprimes/packages/platform

# Démarrer en mode développement (avec watch)
pnpm dev

# OU démarrer en production
pnpm build
pnpm start

# OU avec PM2 (recommandé pour production)
pm2 start dist/index.js --name "talosprimes-api"
pm2 save
```

## 🧪 Tests à effectuer

### 1. Health Check

```bash
curl http://localhost:3001/health
```

**Résultat attendu :**
```json
{"status":"ok","database":"connected"}
```

### 2. Test Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "groupemclem@gmail.com",
    "password": "21052024_Aa!"
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "groupemclem@gmail.com",
      "role": "super_admin",
      "tenantId": "uuid"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

### 3. Test Route Protégée (/api/auth/me)

```bash
# Récupérer le token depuis le login précédent
TOKEN="votre-access-token-ici"

curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Test Création Client

```bash
TOKEN="votre-access-token-ici"

curl -X POST http://localhost:3001/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "b2b",
    "raisonSociale": "Test Entreprise",
    "email": "test@example.com",
    "telephone": "+33123456789"
  }'
```

### 5. Test Liste Clients

```bash
TOKEN="votre-access-token-ici"

curl -X GET http://localhost:3001/api/clients \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Test n8n Connection

```bash
TOKEN="votre-access-token-ici"

curl -X GET http://localhost:3001/api/n8n/test \
  -H "Authorization: Bearer $TOKEN"
```

## 📋 Checklist Complète

- [ ] Health check fonctionne
- [ ] Login fonctionne et retourne un token
- [ ] Route /api/auth/me fonctionne avec le token
- [ ] Création d'un client fonctionne
- [ ] Liste des clients fonctionne
- [ ] Isolation tenant vérifiée (un utilisateur ne voit que ses clients)
- [ ] Test n8n (si configuré)

## 🔍 Vérification des Logs

Si vous utilisez PM2 :

```bash
# Voir les logs en temps réel
pm2 logs talosprimes-api

# Voir les dernières lignes
pm2 logs talosprimes-api --lines 50
```

## ⚠️ En cas d'erreur

### Erreur "Cannot find module"

```bash
# Réinstaller les dépendances
cd /var/www/talosprimes
pnpm install
```

### Erreur de connexion base de données

```bash
# Vérifier la connection string
cd packages/platform
cat .env | grep DATABASE_URL

# Tester la connexion
pnpm db:push
```

### Erreur "Port already in use"

```bash
# Trouver le processus qui utilise le port 3001
lsof -i :3001

# Tuer le processus ou changer le port dans .env
```

## 🎯 Prochaines étapes

Une fois que tout fonctionne :

1. ✅ Configurer n8n (URL et credentials dans .env)
2. ✅ Créer un workflow test dans n8n
3. ✅ Tester le déclenchement automatique
4. ⏳ Créer le frontend (Next.js)
5. ⏳ Pages login et dashboard

