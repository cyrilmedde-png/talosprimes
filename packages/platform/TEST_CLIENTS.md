# Tester les Routes Clients Finaux

## Routes disponibles

Toutes les routes nécessitent une authentification (header `Authorization: Bearer <token>`).

### GET /api/clients
Liste tous les clients du tenant connecté.

**Headers :**
```
Authorization: Bearer <accessToken>
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "uuid",
        "type": "b2b",
        "raisonSociale": "Entreprise XYZ",
        "email": "contact@xyz.com",
        "statut": "actif",
        "createdAt": "2026-01-15T10:30:00Z"
      }
    ],
    "count": 1
  }
}
```

### GET /api/clients/:id
Récupère un client spécifique avec ses abonnements et factures.

**Headers :**
```
Authorization: Bearer <accessToken>
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "client": {
      "id": "uuid",
      "type": "b2b",
      "raisonSociale": "Entreprise XYZ",
      "email": "contact@xyz.com",
      "subscriptions": [],
      "invoices": []
    }
  }
}
```

### POST /api/clients
Crée un nouveau client.

**Headers :**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body (B2B) :**
```json
{
  "type": "b2b",
  "raisonSociale": "Entreprise XYZ",
  "email": "contact@xyz.com",
  "telephone": "+33123456789",
  "adresse": "123 Rue Example, Paris",
  "tags": ["premium", "important"]
}
```

**Body (B2C) :**
```json
{
  "type": "b2c",
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@example.com",
  "telephone": "+33123456789",
  "tags": []
}
```

**Réponse (201) :**
```json
{
  "success": true,
  "data": {
    "client": {
      "id": "uuid",
      "type": "b2b",
      "raisonSociale": "Entreprise XYZ",
      "email": "contact@xyz.com",
      "statut": "actif",
      "createdAt": "2026-01-15T10:30:00Z"
    }
  }
}
```

### PUT /api/clients/:id
Met à jour un client.

**Headers :**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body :**
```json
{
  "email": "nouveau@email.com",
  "telephone": "+33987654321",
  "tags": ["updated"]
}
```

### DELETE /api/clients/:id
Supprime un client (soft delete - statut → inactif).

**Headers :**
```
Authorization: Bearer <accessToken>
```

**Réponse (200) :**
```json
{
  "success": true,
  "message": "Client supprimé avec succès",
  "data": {
    "client": {
      "id": "uuid",
      "statut": "inactif"
    }
  }
}
```

## Tester avec curl

```bash
# 1. Login d'abord
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"motdepasse123"}' \
  | jq -r '.data.tokens.accessToken')

# 2. Créer un client B2B
curl -X POST http://localhost:3001/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "b2b",
    "raisonSociale": "Test Entreprise",
    "email": "test@example.com",
    "telephone": "+33123456789"
  }'

# 3. Lister les clients
curl -X GET http://localhost:3001/api/clients \
  -H "Authorization: Bearer $TOKEN"

# 4. Récupérer un client spécifique
curl -X GET http://localhost:3001/api/clients/CLIENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

## Isolation Tenant

✅ **Toutes les requêtes vérifient automatiquement le `tenantId`**  
✅ **Un utilisateur ne peut voir/modifier que les clients de son entreprise**  
✅ **Aucune possibilité d'accès cross-tenant**

## Événements émis

Chaque action émet un événement dans `EventLog` :
- `client.created` - Lors de la création
- `client.updated` - Lors de la mise à jour
- `client.deleted` - Lors de la suppression

Ces événements seront traités par n8n (prochaine étape).

