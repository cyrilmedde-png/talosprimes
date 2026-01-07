# Guide simple : Configuration Postgres dans n8n

## 🎯 Objectif

Créer un credential Postgres dans n8n qui fonctionne avec Supabase.

---

## 📋 Méthode 1 : Utiliser le script de diagnostic (recommandé)

Sur le **VPS** :

```bash
cd /var/www/talosprimes
./scripts/test-postgres-connection.sh
```

Ce script va :
1. Lire ton `DATABASE_URL` depuis le `.env` backend
2. Extraire automatiquement : Host, Port, Database, User
3. Tester la connexion
4. Te donner les valeurs exactes à mettre dans n8n

---

## 📋 Méthode 2 : Récupérer manuellement les valeurs

Sur le **VPS** :

```bash
cat /var/www/talosprimes/packages/platform/.env | grep DATABASE_URL
```

Tu verras quelque chose comme :
```
DATABASE_URL=postgresql://postgres:MON_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

**Décompose comme ça** :
- **Host** = tout ce qui est entre `@` et `:` → `db.xxxxx.supabase.co`
- **Port** = le nombre après le `:` → `5432`
- **Database** = tout ce qui est après `/` et avant `?` → `postgres`
- **User** = tout ce qui est entre `://` et `:` → `postgres`
- **Password** = tout ce qui est entre `postgres:` et `@` → `MON_PASSWORD`

---

## 🎨 Configuration dans n8n

### Étape 1 : Créer le credential

1. Dans n8n : **Credentials** → **+ New Credential**
2. Chercher **"Postgres"** (pas "Supabase")
3. Sélectionner **"Postgres"**

### Étape 2 : Remplir le formulaire

Utilise les valeurs extraites par le script ou manuellement :

| Champ | Exemple de valeur |
|-------|-------------------|
| **Host** | `db.xxxxx.supabase.co` (sans `https://`) |
| **Database** | `postgres` |
| **User** | `postgres` |
| **Password** | Ton mot de passe (celui entre `postgres:` et `@`) |
| **Port** | `5432` ou `6543` (selon ton Supabase) |
| **SSL** | `require` ou `allow` |
| **Maximum Number of Connections** | `100` |

### Étape 3 : Si ça ne fonctionne pas avec le port 5432

**Essaie avec le pooler Supabase** (port 6543) :

1. Remplace le **Host** par : `aws-0-eu-central-1.pooler.supabase.com`
2. Remplace le **Port** par : `6543`
3. Garde **User** : `postgres`
4. Garde **Password** : le même
5. Garde **Database** : `postgres`

---

## 🔍 Erreurs courantes et solutions

### Erreur : "Connection refused"

**Solution** :
1. Vérifier que le **Host** est correct (pas de `https://`)
2. Essayer avec le pooler (port 6543) au lieu de 5432
3. Vérifier que le **Port** est correct

### Erreur : "Authentication failed"

**Solution** :
1. Vérifier que le **Password** est correct (celui de ton `.env`)
2. Si le mot de passe contient des caractères spéciaux (`@`, `#`, etc.), les encoder en URL :
   - `@` → `%40`
   - `#` → `%23`
   - `$` → `%24`
   - etc.

### Erreur : "SSL required"

**Solution** :
1. Mettre **SSL** sur `require` ou `allow`
2. Désactiver **"Ignore SSL Issues (Insecure)"** (si présent)

---

## 🧪 Test de connexion

### Dans n8n

1. Cliquer sur **"Test"** dans le formulaire
2. Attendre le résultat

**Si ça fonctionne** :
- ✅ "Connection tested successfully"
- Cliquer sur **"Save"**

**Si ça ne fonctionne pas** :
- ❌ Voir l'erreur exacte
- Utiliser le script de diagnostic : `./scripts/test-postgres-connection.sh`

### Depuis le VPS (vérification)

```bash
# Tester la connexion
psql "$DATABASE_URL" -c "SELECT 1;"
```

Si ça fonctionne depuis le VPS mais pas dans n8n :
- Vérifier les paramètres SSL
- Vérifier que le Host est bien sans `https://`

---

## 📸 Capture d'écran idéale

Si tu veux que je t'aide précisément, envoie-moi :
1. **L'erreur exacte** affichée dans n8n lors du "Test"
2. **Les valeurs** que tu as mises (masquer juste le password avec `***`)

---

## ✅ Checklist finale

- [ ] Script de diagnostic exécuté (`./scripts/test-postgres-connection.sh`)
- [ ] Valeurs extraites (Host, Port, Database, User, Password)
- [ ] Credential Postgres créé dans n8n (pas Supabase API)
- [ ] Test de connexion réussi dans n8n
- [ ] Credential sauvegardé avec un nom clair ("Supabase Postgres")
- [ ] Workflows `leads-list` et `lead-get` configurés avec ce credential

---

**Si ça ne fonctionne toujours pas, envoie-moi l'erreur exacte de n8n et je te dirai précisément quoi changer !** 🎯

