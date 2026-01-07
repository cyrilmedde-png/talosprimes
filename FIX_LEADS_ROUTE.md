# 🔧 Correction Route /api/leads

## ❌ Problème

L'erreur dans les logs :
```
Error: Cannot find module '/var/www/talosprimes/packages/platform/dist/config/database'
Route POST:/api/leads not found
```

## ✅ Solutions appliquées

1. **Import manquant `.js`** : Ajout de l'extension `.js` dans l'import de `database`
2. **Route mal enregistrée** : Correction du préfixe dans `index.ts`

## 🔄 Commandes à exécuter sur le VPS

```bash
cd /var/www/talosprimes

# 1. Récupérer les corrections
git pull origin main

# 2. Rebuilder le backend
cd packages/platform
pnpm build

# 3. Redémarrer le backend
pm2 restart talosprimes-api

# 4. Vérifier que ça fonctionne
curl http://localhost:3001/health

# 5. Tester la route /api/leads
curl -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Test",
    "prenom": "User",
    "email": "test@example.com",
    "telephone": "+33612345678"
  }'
```

## ✅ Résultat attendu

```json
{
  "success": true,
  "message": "Lead créé avec succès",
  "data": {
    "lead": {
      "id": "...",
      "nom": "Test",
      "prenom": "User",
      "email": "test@example.com",
      "telephone": "+33612345678",
      "statut": "nouveau",
      "createdAt": "..."
    }
  }
}
```

