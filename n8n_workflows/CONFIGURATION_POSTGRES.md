# Configuration Postgres/Supabase dans n8n

Ce guide explique comment configurer le credential **Postgres** dans n8n pour permettre aux workflows de lire/écrire directement dans la base de données Supabase.

---

## 🎯 Pourquoi Postgres direct ?

Au lieu de passer par l'API TalosPrimes (qui peut créer des boucles), les workflows n8n peuvent **lire et écrire directement** dans la base de données Postgres/Supabase.

**Avantages** :
- ✅ Pas de boucle (n8n → backend → n8n)
- ✅ Plus rapide (pas d'appel HTTP intermédiaire)
- ✅ Accès direct aux données
- ✅ Requêtes SQL personnalisées

---

## 📋 Prérequis

1. **URL de connexion Postgres** : Tu dois avoir ton `DATABASE_URL` Supabase
2. **n8n installé** : `https://n8n.talosprimes.com`

---

## 🔧 Étape 1 : Récupérer les informations de connexion

### Option A : Depuis le `.env` backend

Sur le VPS :

```bash
cat /var/www/talosprimes/packages/platform/.env | grep DATABASE_URL
```

Tu verras quelque chose comme :
```
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Option B : Depuis Supabase Dashboard

1. Ouvrir [supabase.com](https://supabase.com)
2. Aller dans ton projet
3. **Settings** → **Database**
4. Copier la **Connection string** (mode "Transaction" ou "Session")

---

## 🎨 Étape 2 : Créer le credential dans n8n

1. Ouvrir `https://n8n.talosprimes.com`
2. Aller dans **Credentials** (menu de gauche)
3. Cliquer sur **+ New Credential**
4. Chercher et sélectionner **Postgres**

### Configuration du credential

**Nom du credential** : `Supabase Postgres` (ou un nom de ton choix)

#### Méthode 1 : Connection String (recommandé)

- **Connection Type** : `Connection String`
- **Connection String** : Coller ton `DATABASE_URL` complet

Exemple :
```
postgresql://postgres.xxxxx:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

#### Méthode 2 : Paramètres individuels

Si tu préfères séparer les paramètres :

- **Connection Type** : `Values`
- **Host** : `aws-0-eu-central-1.pooler.supabase.com` (ton host Supabase)
- **Database** : `postgres`
- **User** : `postgres.xxxxx` (ton user Supabase)
- **Password** : `ton_password`
- **Port** : `6543` (ou `5432` selon ton mode)
- **SSL** : `Allow` ou `Require` (selon Supabase)

### Tester la connexion

1. Cliquer sur **Test** (en bas du formulaire)
2. Si ça fonctionne : ✅ "Connection successful"
3. Cliquer sur **Save**

---

## 📦 Étape 3 : Importer les workflows mis à jour

Les workflows suivants utilisent maintenant **Postgres direct** :

1. **`leads-list.json`** → Liste des leads (SELECT)
2. **`lead-get.json`** → Détail d'un lead (SELECT WHERE id)

### Import

1. Dans n8n : **Workflows** → **Import from File**
2. Sélectionner `n8n_workflows/leads/leads-list.json`
3. Répéter pour `lead-get.json`

### Configuration

Pour **chaque workflow importé** :

1. Ouvrir le workflow
2. Cliquer sur le nœud **"Postgres - SELECT leads"** (ou similaire)
3. Dans **Credentials**, sélectionner **"Supabase Postgres"** (le credential créé à l'étape 2)
4. **Activer** le workflow (toggle en haut à droite)

---

## 🧪 Étape 4 : Test

### Test du workflow `leads_list`

```bash
curl -X POST "https://n8n.talosprimes.com/webhook/leads_list" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "leads_list",
    "tenantId": "00000000-0000-0000-0000-000000000001",
    "data": {
      "source": null,
      "statut": null,
      "limit": "10"
    }
  }'
```

**Résultat attendu** :
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "id": "...",
        "nom": "...",
        "prenom": "...",
        "email": "...",
        "telephone": "...",
        "statut": "nouveau",
        "source": "admin",
        "createdAt": "2026-01-07T...",
        "updatedAt": "2026-01-07T..."
      }
    ]
  }
}
```

### Test du workflow `lead_get`

```bash
curl -X POST "https://n8n.talosprimes.com/webhook/lead_get" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "lead_get",
    "tenantId": "00000000-0000-0000-0000-000000000001",
    "data": {
      "id": "ID_DU_LEAD"
    }
  }'
```

---

## 🔄 Étape 5 : Activer la délégation à n8n

Sur le **VPS**, éditer `/var/www/talosprimes/packages/platform/.env` :

```bash
nano /var/www/talosprimes/packages/platform/.env
```

**Modifier** :
```env
USE_N8N_VIEWS=true       # ← Activer la délégation des vues (GET)
USE_N8N_COMMANDS=true    # ← Garder la délégation des commandes (POST/PATCH/DELETE)
```

Redémarrer :
```bash
pm2 restart talosprimes-api
```

---

## ✅ Vérification

1. Ouvrir `https://talosprimes.com/onboarding`
2. Les leads doivent s'afficher (récupérés via n8n → Postgres)
3. Dans n8n : **Executions** → Tu dois voir des exécutions du workflow `leads_list`

---

## 🔍 Dépannage

### Erreur : "Connection failed"

**Causes possibles** :
- Mauvais `DATABASE_URL`
- Firewall bloquant la connexion
- SSL mal configuré

**Solution** :
1. Vérifier le `DATABASE_URL` dans le `.env` backend
2. Tester la connexion depuis le VPS :
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```
3. Si ça fonctionne en VPS mais pas dans n8n, vérifier les paramètres SSL

### Erreur : "Workflow not found"

**Cause** : Le WorkflowLink n'existe pas en base.

**Solution** :
```bash
cd /var/www/talosprimes/packages/platform
pnpm workflow:setup-leads
pm2 restart talosprimes-api
```

### Les leads ne s'affichent pas

**Causes possibles** :
1. `USE_N8N_VIEWS=false` dans `.env` backend
2. Le workflow n8n n'est pas activé
3. Le credential Postgres n'est pas configuré

**Solution** :
1. Vérifier `USE_N8N_VIEWS=true` dans `.env`
2. Activer le workflow dans n8n
3. Vérifier le credential dans le nœud Postgres

### Erreur SQL dans n8n

**Cause** : Requête SQL incorrecte ou table inexistante.

**Solution** :
1. Vérifier que la table `leads` existe :
   ```bash
   psql $DATABASE_URL -c "\dt leads;"
   ```
2. Vérifier les colonnes :
   ```bash
   psql $DATABASE_URL -c "\d leads;"
   ```
3. Ajuster la requête SQL dans le nœud Postgres si nécessaire

---

## 📊 Workflows disponibles avec Postgres

| Workflow | Fichier | Opération | Nœud Postgres |
|----------|---------|-----------|---------------|
| Liste des leads | `leads-list.json` | `SELECT` avec filtres | ✅ |
| Détail d'un lead | `lead-get.json` | `SELECT WHERE id` | ✅ |
| Créer un lead | `lead-create.json` | Appel API | ❌ (garde l'API) |
| Mettre à jour statut | `lead-update-status.json` | Appel API | ❌ (garde l'API) |
| Supprimer un lead | `lead-delete.json` | Appel API | ❌ (garde l'API) |

**Note** : Les workflows de **création/modification/suppression** gardent l'appel API TalosPrimes (avec le header secret) pour bénéficier de la validation backend et des événements.

---

## 🎯 Résumé des étapes

```bash
# 1. Récupérer le DATABASE_URL
cat /var/www/talosprimes/packages/platform/.env | grep DATABASE_URL

# 2. Créer le credential Postgres dans n8n
# (via l'interface web)

# 3. Importer les workflows mis à jour
# (via l'interface web)

# 4. Activer USE_N8N_VIEWS=true
nano /var/www/talosprimes/packages/platform/.env
pm2 restart talosprimes-api

# 5. Tester
curl -X POST "https://n8n.talosprimes.com/webhook/leads_list" \
  -H "Content-Type: application/json" \
  -d '{"event":"leads_list","data":{}}'
```

**✅ Après ça, les leads s'afficheront sur `/onboarding` !**

