# Configuration complète - Backend (packages/platform/.env)

## 📝 Fichier à créer : `/var/www/talosprimes/packages/platform/.env`

```env
# ============================================
# ENVIRONNEMENT
# ============================================
NODE_ENV=production
PORT=3001

# ============================================
# BASE DE DONNÉES - SUPABASE
# ============================================
# Format : postgresql://postgres:[MOT_DE_PASSE]@[HOST]:5432/postgres
# Exemple : postgresql://postgres:VotreMotDePasse@db.xxxxx.supabase.co:5432/postgres
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE_SUPABASE@db.xxxxx.supabase.co:5432/postgres"

# ============================================
# JWT - TOKENS D'AUTHENTIFICATION
# ============================================
# Générer des secrets forts (exemple avec openssl : openssl rand -base64 32)
JWT_SECRET="votre_secret_jwt_tres_long_et_aleatoire_au_moins_32_caracteres"
JWT_REFRESH_SECRET="votre_secret_refresh_jwt_tres_long_et_aleatoire_au_moins_32_caracteres"

# Durée de vie des tokens (optionnel, valeurs par défaut)
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# ============================================
# CORS - ORIGINE AUTORISÉE
# ============================================
# Domaine frontend (avec https://)
CORS_ORIGIN="https://talosprimes.com"

# ============================================
# N8N - INTÉGRATION
# ============================================
# URL de votre instance n8n
N8N_URL="http://localhost:5678"

# Option 1 : Authentification par API Key
N8N_API_KEY="votre_api_key_n8n"

# Option 2 : Authentification Basic Auth (si pas d'API Key)
N8N_USERNAME="votre_username_n8n"
N8N_PASSWORD="votre_password_n8n"

# Note : Utilisez soit API_KEY, soit USERNAME/PASSWORD, pas les deux
```

## 🔐 Comment générer des secrets JWT forts

```bash
# Sur votre VPS ou Mac
openssl rand -base64 32
```

Exécutez cette commande deux fois pour obtenir deux secrets différents (un pour JWT_SECRET, un pour JWT_REFRESH_SECRET).

## 📋 Checklist

- [ ] Remplacer `VOTRE_MOT_DE_PASSE_SUPABASE` par votre vrai mot de passe Supabase
- [ ] Remplacer `db.xxxxx.supabase.co` par votre vrai host Supabase
- [ ] Générer et remplacer `JWT_SECRET` et `JWT_REFRESH_SECRET`
- [ ] Remplacer `https://talosprimes.com` par votre vrai domaine (avec https://)
- [ ] Configurer N8N (soit API_KEY, soit USERNAME/PASSWORD)
- [ ] Vérifier que le fichier `.env` n'est pas commité dans Git (déjà dans .gitignore)

## ⚠️ Important

- Ne partagez JAMAIS ce fichier `.env` publiquement
- Ne le commitez JAMAIS dans Git
- Utilisez des secrets différents en production et développement
- Changez les secrets si vous pensez qu'ils ont été compromis

