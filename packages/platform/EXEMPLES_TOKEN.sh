#!/bin/bash
# Script d'exemples pour utiliser le token JWT

echo "🔐 Exemples d'utilisation du Token JWT"
echo ""

# 1. Login et récupérer le token
echo "1️⃣ Login..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "groupemclem@gmail.com",
    "password": "21052024_Aa!"
  }')

# Extraire le token (nécessite jq)
if command -v jq &> /dev/null; then
    TOKEN=$(echo $RESPONSE | jq -r '.data.tokens.accessToken')
    echo "✅ Token récupéré: ${TOKEN:0:50}..."
    echo ""
    
    # 2. Tester /api/auth/me
    echo "2️⃣ Test /api/auth/me..."
    curl -X GET http://localhost:3001/api/auth/me \
      -H "Authorization: Bearer $TOKEN"
    echo ""
    echo ""
    
    # 3. Créer un client
    echo "3️⃣ Création d'un client..."
    curl -X POST http://localhost:3001/api/clients \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "type": "b2b",
        "raisonSociale": "Test Entreprise",
        "email": "test@example.com",
        "telephone": "+33123456789"
      }'
    echo ""
    echo ""
    
    # 4. Lister les clients
    echo "4️⃣ Liste des clients..."
    curl -X GET http://localhost:3001/api/clients \
      -H "Authorization: Bearer $TOKEN"
    echo ""
    
else
    echo "⚠️ jq n'est pas installé. Installez-le avec: apt install jq"
    echo "Réponse brute:"
    echo $RESPONSE
fi

