# Test : Vérifier le mot de passe Postgres

## 🔍 Méthode 1 : Script automatique (recommandé)

Sur le **VPS** :

```bash
cd /var/www/talosprimes
./scripts/extract-postgres-password.sh
```

Ce script va :
1. Lire ton `DATABASE_URL` depuis le `.env` backend
2. Extraire automatiquement le mot de passe
3. Te l'afficher (⚠️ attention, c'est sensible)
4. T'indiquer s'il contient des caractères spéciaux à encoder

---

## 🔍 Méthode 2 : Extraction manuelle

Sur le **VPS** :

```bash
cat /var/www/talosprimes/packages/platform/.env | grep DATABASE_URL
```

Tu verras quelque chose comme :
```
DATABASE_URL=postgresql://postgres:TON_MOT_DE_PASSE@db.xxxxx.supabase.co:5432/postgres
```

**Le mot de passe est** : tout ce qui est entre `postgres:` et `@`

**Exemple** :
- URL : `postgresql://postgres:SuperSecret2024@db.xxxxx.supabase.co:5432/postgres`
- Mot de passe : `SuperSecret2024`

---

## ⚠️ Caractères spéciaux dans le mot de passe

Si ton mot de passe contient des caractères spéciaux (`@`, `#`, `$`, `%`, `&`, `+`, `=`, `?`, `/`, espace), ils peuvent causer des problèmes dans n8n.

**Solution** : Les encoder en URL dans n8n :

| Caractère | Encodé |
|-----------|--------|
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |
| `=` | `%3D` |
| `?` | `%3F` |
| `/` | `%2F` |
| ` ` (espace) | `%20` |

**Exemple** :
- Mot de passe original : `Mon@Pass#123`
- Mot de passe encodé pour n8n : `Mon%40Pass%23123`

---

## 🧪 Test de connexion depuis le VPS

Pour vérifier que le mot de passe est correct :

### Option 1 : Avec psql (si installé)

```bash
# Récupérer le DATABASE_URL
DATABASE_URL=$(cat /var/www/talosprimes/packages/platform/.env | grep "^DATABASE_URL=" | cut -d'=' -f2- | tr -d '"' | tr -d "'")

# Tester la connexion
psql "$DATABASE_URL" -c "SELECT 1;"
```

Si ça fonctionne → le mot de passe est correct ✅  
Si ça échoue → le mot de passe est incorrect ❌

### Option 2 : Avec Prisma (sans psql)

```bash
cd /var/www/talosprimes/packages/platform
pnpm db:push
```

Si ça fonctionne → le mot de passe est correct ✅  
Si ça échoue → le mot de passe est incorrect ❌

---

## 🔧 Si le mot de passe est incorrect

### Solution 1 : Vérifier dans Supabase Dashboard

1. Ouvrir [supabase.com](https://supabase.com)
2. Aller dans ton projet
3. **Settings** → **Database**
4. Chercher la section **Connection string**
5. Copier le mot de passe (ou réinitialiser le mot de passe de la base)

### Solution 2 : Réinitialiser le mot de passe Supabase

1. Dans Supabase Dashboard : **Settings** → **Database**
2. Cliquer sur **"Reset database password"**
3. Choisir un nouveau mot de passe (sans caractères spéciaux si possible)
4. Mettre à jour le `.env` backend avec le nouveau mot de passe
5. Mettre à jour le credential n8n avec le nouveau mot de passe

---

## ✅ Vérification dans n8n

Une fois que tu as le mot de passe correct :

1. Dans n8n : **Credentials** → Ouvrir ton credential **Postgres**
2. Coller le mot de passe (ou le mot de passe encodé si caractères spéciaux)
3. Cliquer sur **"Test"**
4. Si ça affiche **"Connection tested successfully"** → ✅ Le mot de passe est correct
5. Si ça échoue → Vérifier :
   - Le mot de passe est bien collé (pas d'espaces avant/après)
   - Les caractères spéciaux sont encodés (si présents)
   - Le Host est correct : `db.prspvpaaeuxxhombqeuc.supabase.co` (sans `https://`)

---

## 📋 Checklist de vérification

- [ ] Mot de passe extrait depuis le `.env` backend
- [ ] Mot de passe testé depuis le VPS (psql ou Prisma)
- [ ] Caractères spéciaux encodés (si présents)
- [ ] Mot de passe collé dans n8n (sans espaces)
- [ ] Test de connexion dans n8n réussi

---

**Exécute le script `extract-postgres-password.sh` et teste le mot de passe dans n8n !** 🎯

