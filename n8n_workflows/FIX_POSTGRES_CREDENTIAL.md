# Fix : Différence entre Supabase API et Postgres dans n8n

## ❌ Le problème

Tu as créé un credential **"Supabase API"** au lieu d'un credential **"Postgres"**.

**Pourquoi ça ne marche pas** :
- Les workflows n8n que j'ai créés utilisent un **nœud Postgres** (`n8n-nodes-base.postgres`)
- Ce nœud nécessite un credential de type **Postgres**, pas "Supabase API"

---

## ✅ Solution : Créer un credential Postgres

### Étape 1 : Créer le credential Postgres

1. Dans n8n : **Credentials** → **+ New Credential**
2. Chercher **"Postgres"** (⚠️ **pas "Supabase"**)
3. Sélectionner **"Postgres"**

### Étape 2 : Remplir avec ces valeurs

Basé sur ton URL : `postgresql://postgres:(monmotdepasse)@db.prspvpaaeuxxhombqeuc.supabase.co:5432/postgres`

| Champ | Valeur |
|-------|--------|
| **Host** | `db.prspvpaaeuxxhombqeuc.supabase.co` ⚠️ **Sans `https://`** |
| **Database** | `postgres` |
| **User** | `postgres` |
| **Password** | `TON_MOT_DE_PASSE_DB` (remplacer `(monmotdepasse)` par ton vrai mot de passe) |
| **Port** | `5432` |
| **SSL** | `require` (ou `allow` si `require` ne fonctionne pas) |
| **Maximum Number of Connections** | `100` |

### Étape 3 : Tester

1. Cliquer sur **"Test"** (en bas du formulaire)
2. Si ça affiche **"Connection tested successfully"** ✅ → cliquer sur **"Save"**
3. Nom suggéré : **"Supabase Postgres"**

---

## 🔍 Si le test échoue

### Erreur : "Connection refused" ou "Timeout"

**Causes possibles** :
1. Le port `5432` est bloqué par un firewall
2. SSL mal configuré

**Solutions** :
1. Essayer **Port `6543`** (pooler Supabase) au lieu de `5432`
2. Essayer **SSL `allow`** au lieu de `require`
3. Vérifier que le host est bien `db.prspvpaaeuxxhombqeuc.supabase.co` (sans `https://`)

### Erreur : "Authentication failed"

**Cause** : Mot de passe incorrect.

**Solution** :
- Vérifier le mot de passe dans ton `.env` backend :
  ```bash
  cat /var/www/talosprimes/packages/platform/.env | grep DATABASE_URL
  ```
- Le mot de passe est entre `postgres:` et `@`

### Erreur : "SSL required"

**Solution** :
1. S'assurer que **SSL** est sur `require` ou `allow`
2. Désactiver **"Ignore SSL Issues (Insecure)"** (si présent)

---

## 🎯 Après avoir créé le credential Postgres

1. **Ré-importer les workflows** :
   - `n8n_workflows/leads/leads-list.json`
   - `n8n_workflows/leads/lead-get.json`

2. **Pour chaque workflow** :
   - Ouvrir le workflow
   - Cliquer sur le nœud **"Postgres - SELECT leads"**
   - Dans **Credentials**, sélectionner **"Supabase Postgres"** (ton nouveau credential)
   - **Activer** le workflow

3. **Tester** :
   - Ouvrir `https://talosprimes.com/onboarding`
   - Les leads doivent s'afficher

---

## 📊 Résumé

| Type credential | Usage | Host |
|----------------|-------|------|
| **Supabase API** | Appeler l'API REST Supabase | `https://prspvpaaeuxxhombqeuc.supabase.co` |
| **Postgres** | Se connecter à la DB PostgreSQL | `db.prspvpaaeuxxhombqeuc.supabase.co` (sans https) |

**Pour nos workflows leads, il faut un credential Postgres.**

