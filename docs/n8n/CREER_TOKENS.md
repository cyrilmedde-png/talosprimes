# Guide : Comment créer des tokens JWT

## 🔐 Types de tokens

L'application utilise deux types de tokens JWT :

1. **Access Token** - Token principal pour authentifier les requêtes API (valide 15 minutes)
2. **Refresh Token** - Token pour renouveler l'access token (valide 7 jours)

## 📋 Méthode 1 : Via l'API de login (recommandé)

### Avec curl

```bash
curl -X POST https://api.talosprimes.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "groupemclem@gmail.com",
    "password": "21052024_Aa!"
  }'
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "groupemclem@gmail.com",
      "role": "super_admin",
      "tenantId": "uuid"
    }
  }
}
```

### Extraire uniquement le token

```bash
# Access Token uniquement
TOKEN=$(curl -s -X POST https://api.talosprimes.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"groupemclem@gmail.com","password":"21052024_Aa!"}' \
  | jq -r '.data.accessToken')

echo $TOKEN
```

### Utiliser le token dans une requête

```bash
curl -X GET https://api.talosprimes.com/api/clients \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🚀 Méthode 2 : Via le script automatique

Utilisez le script `get-token.sh` :

```bash
cd /var/www/talosprimes/scripts
./get-token.sh
```

**Avec email/password personnalisés :**
```bash
./get-token.sh "votre_email@example.com" "votre_mot_de_passe"
```

**Sauvegarder le token dans une variable :**
```bash
TOKEN=$(./get-token.sh)
echo $TOKEN
```

---

## 🔄 Méthode 3 : Renouveler un token expiré

Si votre access token est expiré, utilisez le refresh token :

```bash
curl -X POST https://api.talosprimes.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "votre_refresh_token"
  }'
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "accessToken": "nouveau_access_token",
    "refreshToken": "nouveau_refresh_token"
  }
}
```

---

## 📝 Méthode 4 : Via le frontend (navigateur)

Le frontend gère automatiquement les tokens via le service d'authentification :

1. **Se connecter :**
   - Allez sur https://talosprimes.com/login
   - Entrez vos identifiants
   - Les tokens sont automatiquement stockés dans `localStorage`

2. **Voir les tokens (console navigateur) :**
   ```javascript
   // Access Token
   localStorage.getItem('accessToken')
   
   // Refresh Token
   localStorage.getItem('refreshToken')
   ```

3. **Utiliser les tokens dans une requête :**
   Les tokens sont automatiquement inclus dans les requêtes API via `api-client.ts`

---

## 🧪 Exemples pratiques

### Exemple 1 : Tester une route API

```bash
# 1. Obtenir un token
TOKEN=$(curl -s -X POST https://api.talosprimes.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"groupemclem@gmail.com","password":"21052024_Aa!"}' \
  | jq -r '.data.accessToken')

# 2. Utiliser le token
curl -X GET https://api.talosprimes.com/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Exemple 2 : Créer un client avec token

```bash
TOKEN=$(./get-token.sh)

curl -X POST https://api.talosprimes.com/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "b2b",
    "raisonSociale": "Entreprise Test",
    "email": "test@example.com"
  }'
```

### Exemple 3 : Script complet avec gestion d'erreur

```bash
#!/bin/bash

# Obtenir un token
RESPONSE=$(curl -s -X POST https://api.talosprimes.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"groupemclem@gmail.com","password":"21052024_Aa!"}')

TOKEN=$(echo $RESPONSE | jq -r '.data.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Erreur de connexion"
  echo $RESPONSE | jq '.'
  exit 1
fi

echo "✅ Token obtenu: ${TOKEN:0:20}..."

# Utiliser le token
curl -X GET https://api.talosprimes.com/api/clients \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔍 Vérifier un token

### Décoder un token JWT (sans vérifier la signature)

```bash
# Installer jq si nécessaire
# sudo apt install jq

# Décoder le header
echo "votre_token" | cut -d. -f1 | base64 -d 2>/dev/null | jq '.'

# Décoder le payload
echo "votre_token" | cut -d. -f2 | base64 -d 2>/dev/null | jq '.'
```

### Vérifier les informations du token via l'API

```bash
TOKEN="votre_token"

curl -X GET https://api.talosprimes.com/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Réponse :**
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

---

## ⚠️ Sécurité

### Bonnes pratiques

1. **Ne jamais commiter les tokens dans Git**
   - Les tokens sont dans `.gitignore`
   - Utilisez des variables d'environnement

2. **Ne pas partager les tokens**
   - Chaque token est lié à un utilisateur spécifique
   - Les tokens expirent automatiquement

3. **Utiliser HTTPS en production**
   - Les tokens transitent en clair sur HTTP
   - Toujours utiliser HTTPS pour les requêtes API

4. **Renouveler les tokens régulièrement**
   - Les access tokens expirent après 15 minutes
   - Utilisez le refresh token pour obtenir un nouveau token

### Variables d'environnement

Pour les scripts, stockez les tokens dans des variables :

```bash
# Dans votre script
export ACCESS_TOKEN=$(./get-token.sh)
export API_URL="https://api.talosprimes.com"

# Utiliser
curl -X GET "$API_URL/api/clients" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## 🐛 Troubleshooting

### Erreur "Token expired"

Votre token a expiré. Renouvelez-le :

```bash
# Avec refresh token
curl -X POST https://api.talosprimes.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"votre_refresh_token"}'

# OU reconnectez-vous
TOKEN=$(./get-token.sh)
```

### Erreur "Invalid token"

Le token est invalide ou malformé. Vérifiez :

1. Le token est complet (3 parties séparées par des points)
2. Le token n'a pas été modifié
3. Le token correspond à l'environnement (dev/prod)

### Erreur "Unauthorized"

Vérifiez :

1. Le header `Authorization` est présent
2. Le format est correct : `Bearer <token>`
3. Le token n'a pas expiré
4. L'utilisateur a les permissions nécessaires

---

## 📚 Ressources

- **Scripts disponibles :** `scripts/get-token.sh`
- **Documentation API :** Voir les routes dans `packages/platform/src/api/routes/auth.routes.ts`
- **Configuration JWT :** `packages/platform/src/config/env.ts`

---

## 💡 Astuces

### Créer un alias pour obtenir rapidement un token

Ajoutez dans votre `~/.bashrc` ou `~/.zshrc` :

```bash
alias get-token='cd /var/www/talosprimes/scripts && ./get-token.sh'
```

Puis utilisez simplement :
```bash
TOKEN=$(get-token)
```

### Token pour les tests automatisés

Pour les tests, créez un script dédié :

```bash
#!/bin/bash
# test-with-token.sh

TOKEN=$(./get-token.sh)
export TOKEN

# Vos tests ici
curl -X GET https://api.talosprimes.com/api/clients \
  -H "Authorization: Bearer $TOKEN"
```

