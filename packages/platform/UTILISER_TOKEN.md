# Comment utiliser le Token JWT

## 🔐 À quoi sert le token ?

Le **Access Token** (token d'accès) est votre "carte d'identité" pour l'API. Il permet de :
- ✅ Accéder aux routes protégées (clients, factures, etc.)
- ✅ Identifier qui vous êtes (email, rôle, tenant)
- ✅ Garantir l'isolation tenant (vous ne voyez que vos données)

## 📋 Utilisation du Token

### Format

Toutes les requêtes protégées nécessitent ce header :

```
Authorization: Bearer VOTRE_TOKEN_ICI
```

### Exemples avec curl

#### 1. Récupérer vos informations (/api/auth/me)

```bash
# Remplacez VOTRE_TOKEN par le token reçu lors du login
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
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
    }
  }
}
```

#### 2. Créer un client final

```bash
TOKEN="votre-token-ici"

curl -X POST http://localhost:3001/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "b2b",
    "raisonSociale": "Ma Première Entreprise",
    "email": "contact@entreprise.com",
    "telephone": "+33123456789"
  }'
```

#### 3. Lister vos clients

```bash
TOKEN="votre-token-ici"

curl -X GET http://localhost:3001/api/clients \
  -H "Authorization: Bearer $TOKEN"
```

#### 4. Tester la connexion n8n

```bash
TOKEN="votre-token-ici"

curl -X GET http://localhost:3001/api/n8n/test \
  -H "Authorization: Bearer $TOKEN"
```

## ⏰ Durée de vie du token

- **Access Token** : 15 minutes (configurable via `JWT_EXPIRES_IN`)
- **Refresh Token** : 7 jours (configurable via `JWT_REFRESH_EXPIRES_IN`)

## 🔄 Renouveler le token (quand il expire)

Quand l'access token expire, utilisez le refresh token :

```bash
# Récupérer le refresh token depuis le login initial
REFRESH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "'$REFRESH_TOKEN'"
  }'
```

Vous recevrez un **nouveau access token**.

## 🚫 Erreurs possibles

### Token expiré

```json
{
  "error": "Non authentifié",
  "message": "Token invalide ou expiré"
}
```

**Solution :** Utilisez le refresh token pour obtenir un nouveau token.

### Token manquant

```json
{
  "error": "Non authentifié",
  "message": "Token manquant. Utilisez le format: Authorization: Bearer <token>"
}
```

**Solution :** Vérifiez que vous avez bien le header `Authorization: Bearer ...`

### Token invalide

```json
{
  "error": "Non authentifié",
  "message": "Token invalide"
}
```

**Solution :** Reconnectez-vous pour obtenir un nouveau token.

## 💡 Astuce : Sauvegarder le token dans une variable

```bash
# Sauvegarder le token après le login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "groupemclem@gmail.com",
    "password": "21052024_Aa!"
  }' | jq -r '.data.tokens.accessToken')

# Utiliser le token
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## 📱 Utilisation dans le Frontend (futur)

Quand vous créerez le frontend Next.js, le token sera stocké dans le localStorage ou dans un cookie, et automatiquement ajouté à chaque requête API.

## ✅ Test rapide

Copiez-collez ceci (remplacez VOTRE_TOKEN) :

```bash
TOKEN="COLLEZ_VOTRE_TOKEN_ICI"

# Test 1 : Vos infos
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Test 2 : Créer un client
curl -X POST http://localhost:3001/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "b2b",
    "raisonSociale": "Test Client",
    "email": "test@example.com"
  }'
```

