# Scripts de test n8n

## 📋 Scripts disponibles

### 1. `get-token.sh` - Obtenir un token JWT

Obtient automatiquement un token JWT en se connectant à l'API.

**Usage :**
```bash
cd /var/www/talosprimes/scripts
./get-token.sh
```

**Options :**
```bash
./get-token.sh [EMAIL] [PASSWORD]
```

**Exemple :**
```bash
TOKEN=$(./get-token.sh)
echo $TOKEN
```

---

### 2. `test-n8n-connection.sh` - Tester la connexion à n8n

Teste si la connexion à n8n fonctionne correctement.

**Usage :**
```bash
./test-n8n-connection.sh [TOKEN]
```

**Exemple :**
```bash
# Avec token automatique
./test-n8n-connection.sh

# Avec token manuel
TOKEN="votre_token"
./test-n8n-connection.sh $TOKEN
```

---

### 3. `list-workflows.sh` - Lister les workflows configurés

Affiche tous les workflows enregistrés dans la base de données pour votre tenant.

**Usage :**
```bash
./list-workflows.sh [TOKEN]
```

**Exemple :**
```bash
./list-workflows.sh
```

---

### 4. `create-workflow-link.sh` - Créer un WorkflowLink

Crée un lien entre un workflow n8n et un événement dans la base de données.

**Usage :**
```bash
./create-workflow-link.sh [WORKFLOW_ID] [WORKFLOW_NAME] [EVENT_TYPE]
```

**Exemple interactif :**
```bash
./create-workflow-link.sh
# Le script vous demandera les informations
```

**Exemple direct :**
```bash
./create-workflow-link.sh "123" "Onboarding Client" "client.created"
```

**Événements disponibles :**
- `client.created` - Lors de la création d'un client
- `client.updated` - Lors de la mise à jour d'un client
- `client.deleted` - Lors de la suppression d'un client

**Prérequis :**
- Le script doit être exécuté depuis la racine du projet ou depuis `scripts/`
- Le fichier `.env` doit exister dans `packages/platform/` avec `DATABASE_URL`
- `psql` doit être installé et accessible

---

### 5. `test-workflow-trigger.sh` - Tester le déclenchement d'un workflow

Crée un client de test pour déclencher un workflow n8n.

**Usage :**
```bash
./test-workflow-trigger.sh [TOKEN]
```

**Exemple :**
```bash
./test-workflow-trigger.sh
```

**Ce que fait le script :**
1. Crée un client B2B avec un email unique
2. Déclenche l'événement `client.created`
3. Affiche des instructions pour vérifier les logs

---

### 6. `n8n-test-all.sh` - Test complet

Script principal qui orchestre tous les tests.

**Usage :**
```bash
./n8n-test-all.sh
```

**Ce que fait le script :**
1. ✅ Connexion à l'API et obtention d'un token
2. ✅ Test de connexion à n8n
3. ✅ Liste des workflows configurés
4. ❓ Option pour créer un workflow de test
5. ❓ Option pour tester le déclenchement

**Exemple :**
```bash
cd /var/www/talosprimes/scripts
./n8n-test-all.sh
```

---

## 🚀 Guide rapide

### Première configuration

1. **Vérifier la connexion n8n :**
   ```bash
   cd /var/www/talosprimes/scripts
   ./test-n8n-connection.sh
   ```

2. **Créer un workflow dans n8n :**
   - Allez sur https://n8n.talosprimes.com
   - Créez un nouveau workflow
   - Ajoutez un nœud **Webhook** avec le path `/webhook/{votre-workflow-id}`
   - Activez le workflow
   - Notez le **Workflow ID** (visible dans l'URL ou les paramètres)

3. **Enregistrer le workflow dans la base de données :**
   ```bash
   ./create-workflow-link.sh
   # Entrez le Workflow ID, le nom et le type d'événement
   ```

4. **Tester le workflow :**
   ```bash
   ./test-workflow-trigger.sh
   ```

### Test complet en une commande

```bash
./n8n-test-all.sh
```

---

## 🔧 Configuration requise

### Variables d'environnement

Le script `create-workflow-link.sh` nécessite :
- `DATABASE_URL` dans `packages/platform/.env`

Les autres scripts nécessitent :
- API accessible sur `https://api.talosprimes.com` (ou variable `API_URL`)

### Dépendances

- `curl` - Pour les requêtes HTTP
- `jq` - Pour parser le JSON (optionnel mais recommandé)
- `psql` - Pour `create-workflow-link.sh` (client PostgreSQL)

**Installation sur Ubuntu :**
```bash
sudo apt update
sudo apt install -y curl jq postgresql-client
```

---

## 🐛 Troubleshooting

### Erreur "psql: command not found"

Installez le client PostgreSQL :
```bash
sudo apt install -y postgresql-client
```

### Erreur "DATABASE_URL not found"

Vérifiez que le fichier `.env` existe :
```bash
cd /var/www/talosprimes/packages/platform
cat .env | grep DATABASE_URL
```

### Erreur "Connection refused" lors du test n8n

Vérifiez :
1. Que n8n est accessible sur https://n8n.talosprimes.com
2. Les variables dans `packages/platform/.env` :
   ```env
   N8N_API_URL="https://n8n.talosprimes.com"
   N8N_API_KEY="votre_api_key"
   # OU
   N8N_USERNAME="votre_email"
   N8N_PASSWORD="votre_mot_de_passe"
   ```

### Le workflow ne se déclenche pas

1. Vérifiez que le workflow est **actif** dans n8n
2. Vérifiez que le WorkflowLink existe avec `./list-workflows.sh`
3. Vérifiez les logs du backend :
   ```bash
   pm2 logs talosprimes-platform | grep n8n
   ```
4. Vérifiez les exécutions dans n8n : https://n8n.talosprimes.com/executions

---

## 📚 Exemples d'utilisation

### Exemple 1 : Configuration complète

```bash
cd /var/www/talosprimes/scripts

# 1. Tester la connexion
./test-n8n-connection.sh

# 2. Créer un workflow dans n8n (manuellement)
# Workflow ID: 456

# 3. Enregistrer le workflow
./create-workflow-link.sh 456 "Onboarding Client" client.created

# 4. Tester
./test-workflow-trigger.sh
```

### Exemple 2 : Test rapide

```bash
cd /var/www/talosprimes/scripts
./n8n-test-all.sh
```

### Exemple 3 : Vérification régulière

```bash
# Vérifier que tout fonctionne
./test-n8n-connection.sh && ./list-workflows.sh
```

---

## 📝 Notes

- Tous les scripts peuvent être exécutés sans arguments (ils utiliseront des valeurs par défaut)
- Les scripts utilisent `jq` pour formater le JSON, mais fonctionnent sans (affichage brut)
- Les tokens JWT sont valides pendant 15 minutes par défaut
- Les scripts sont idempotents (peuvent être exécutés plusieurs fois sans problème)
