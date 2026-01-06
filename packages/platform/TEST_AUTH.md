# Tester l'Authentification

## Routes disponibles

### POST /api/auth/login
Authentifie un utilisateur et retourne les tokens.

**Body :**
```json
{
  "email": "admin@example.com",
  "password": "motdepasse123"
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
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

### POST /api/auth/refresh
Rafraîchit l'access token avec un refresh token.

**Body :**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc..."
  }
}
```

### GET /api/auth/me
Récupère les informations de l'utilisateur connecté (route protégée).

**Headers :**
```
Authorization: Bearer <accessToken>
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "role": "super_admin",
      "tenantId": "uuid"
    }
  }
}
```

## Tester avec curl

```bash
# 1. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"motdepasse123"}'

# 2. Utiliser le token pour /me
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer VOTRE_ACCESS_TOKEN"
```

## Créer un utilisateur de test

Pour tester, vous devez d'abord créer un tenant et un utilisateur dans la base de données.

Via Prisma Studio :
```bash
pnpm db:studio
```

Ou via SQL direct dans Supabase.

## Prochaines étapes

- [ ] Créer route d'inscription (register)
- [ ] Créer routes CRUD clients finaux
- [ ] Créer service n8n
- [ ] Créer pages frontend login

