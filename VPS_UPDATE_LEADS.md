# 🔄 Mise à jour VPS - Ajout modèle Lead

## 📋 Commandes à exécuter sur le VPS

**Copiez-collez ces commandes une par une :**

```bash
# 1. Aller dans le répertoire du projet
cd /var/www/talosprimes

# 2. Récupérer les dernières modifications
git pull origin main

# 3. Installer les dépendances (si nécessaire)
pnpm install

# 4. Générer le client Prisma avec le nouveau modèle Lead
cd packages/platform
pnpm db:generate

# 5. Appliquer les changements à la base de données (créer la table leads)
pnpm db:push

# 6. Rebuilder le backend
pnpm build

# 7. Vérifier que le build a réussi
ls -la dist/index.js

# 8. Redémarrer le backend
pm2 restart talosprimes-api

# 9. Vérifier que le backend est démarré
pm2 list

# 10. Vérifier les logs pour détecter d'éventuelles erreurs
pm2 logs talosprimes-api --lines 50
```

## ✅ Vérification

### 1. Vérifier que le backend répond

```bash
curl http://localhost:3001/health
```

**Résultat attendu :**
```json
{"status":"ok","database":"connected"}
```

### 2. Vérifier que la route /api/leads existe

```bash
curl -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Test",
    "prenom": "User",
    "email": "test@example.com",
    "telephone": "+33612345678"
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "Lead créé avec succès",
  "data": {
    "lead": {
      "id": "...",
      "nom": "Test",
      ...
    }
  }
}
```

### 3. Vérifier que Nginx route correctement

```bash
curl -X POST https://api.talosprimes.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Test",
    "prenom": "User",
    "email": "test2@example.com",
    "telephone": "+33612345678"
  }'
```

## 🐛 Si erreur 502 Bad Gateway

Voir le fichier `DIAGNOSTIC_502.md` pour diagnostiquer le problème.

## 📝 Notes

- Le modèle `Lead` est maintenant disponible en base de données
- La route `/api/leads` est accessible publiquement (pas besoin d'authentification pour créer)
- Les leads sont consultables via l'API avec authentification admin

