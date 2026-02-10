# Guide de Reset n8n - TalosPrimes

## Pourquoi ce reset ?

L'encryption key de n8n n'était pas fixée dans le docker-compose. À chaque redémarrage du container, n8n générait une nouvelle clé, rendant tous les credentials illisibles (`__n8n_BLANK_VALUE_...`).

## Procédure complète

### Étape 1 : Exécuter le script de reset

```bash
cd /var/www/talosprimes
bash scripts/reset-n8n.sh
```

Ce script va :
- Arrêter n8n
- Sauvegarder les anciennes données (dans `n8n-data-backup-YYYYMMDD-HHMMSS`)
- Créer un dossier de données vierge
- Écrire un `docker-compose.yml` propre avec `N8N_ENCRYPTION_KEY` fixée
- Redémarrer n8n

### Étape 2 : Créer le compte owner

1. Ouvrir **https://n8n.talosprimes.com**
2. Créer le compte administrateur (email + mot de passe)

### Étape 3 : Activer l'API n8n

1. **Settings** > **API** > **Enable API**
2. Créer une API Key
3. La copier (elle servira pour le script d'import)

### Étape 4 : Créer les credentials

Aller dans **Settings** > **Credentials** > **Add Credential**

#### a) Header Auth — `TalosPrimes API`
- **Type :** Header Auth
- **Name :** `TalosPrimes API`
- **Header Name :** `x-talosprimes-n8n-secret`
- **Header Value :** `Wx0t2B5hR4`
- Utilisé par : 14 workflows (clients, leads, factures, abonnements)

#### b) Telegram API
- **Type :** Telegram
- **Name :** `Telegram Bot`
- **Bot Token :** (votre token de @BotFather)
- Utilisé par : Agent Telegram IA

#### c) Anthropic (Claude)
- **Type :** Anthropic
- **Name :** `Anthropic Claude`
- **API Key :** (votre clé API Anthropic)
- Utilisé par : Agent Telegram IA

#### d) OpenAI
- **Type :** OpenAI
- **Name :** `OpenAI Whisper`
- **API Key :** (votre clé API OpenAI)
- Utilisé par : Agent Telegram IA (transcription vocale)

#### e) PostgreSQL
- **Type :** Postgres
- **Name :** `TalosPrimes DB`
- **Host :** `localhost` (ou l'IP du serveur)
- **Port :** `5432`
- **Database :** `talosprimes`
- **User :** `talosprimes`
- **Password :** (votre mot de passe PostgreSQL)
- **SSL :** Non (si en local)
- Utilisé par : 12 workflows

#### f) Twilio (optionnel)
- **Type :** Twilio
- **Name :** `Twilio SMS`
- **Account SID / Auth Token** : depuis console.twilio.com
- Utilisé par : lead-inscription, workflow-inscription

#### g) Resend (optionnel)
- **Type :** Header Auth ou Resend
- **Name :** `Resend Email`
- **API Key :** depuis resend.com
- Utilisé par : invoice-created

### Étape 5 : Importer les workflows

```bash
cd /var/www/talosprimes
bash scripts/import-n8n-workflows.sh VOTRE_API_KEY
```

Ou manuellement dans n8n :
1. **Workflows** > **Import from file**
2. Sélectionner les fichiers JSON depuis `/var/www/talosprimes/n8n_workflows/`

### Étape 6 : Remapper les credentials

Après l'import, chaque workflow aura des nodes en erreur (icône rouge) car les credentials n'ont pas le même ID qu'avant.

Pour chaque workflow :
1. Ouvrir le workflow
2. Cliquer sur chaque node avec une erreur rouge
3. Dans la section **Credentials**, sélectionner le bon credential depuis la liste
4. Sauvegarder le workflow

### Étape 7 : Activer les workflows

Une fois les credentials remappées :
1. Ouvrir chaque workflow
2. Cliquer sur **Active** (toggle en haut à droite)
3. Vérifier que tous les webhooks sont fonctionnels

## Résumé des fichiers

| Fichier | Rôle |
|---------|------|
| `scripts/reset-n8n.sh` | Script de reset complet |
| `scripts/import-n8n-workflows.sh` | Import automatique via API |
| `n8n_workflows/clients/*.json` | 8 workflows clients |
| `n8n_workflows/leads/*.json` | 10 workflows leads |
| `n8n_workflows/factures/*.json` | 3 workflows factures |
| `n8n_workflows/abonnements/*.json` | 4 workflows abonnements |
| `n8n_workflows/agent-telegram-ia-v4-pro.json` | Agent Telegram IA (dernière version) |

## Valeurs de référence

| Clé | Valeur |
|-----|--------|
| N8N_ENCRYPTION_KEY | `OsfTZ7GJvYcado7XYMgZUz4gySHIMmis` |
| N8N_WEBHOOK_SECRET | `Wx0t2B5hR4` |
| Header name pour API | `x-talosprimes-n8n-secret` |
| URL n8n | `https://n8n.talosprimes.com` |
| Port local | `5678` |

## En cas de problème

Si les credentials redeviennent `__n8n_BLANK_VALUE_...` :
1. Vérifier que `N8N_ENCRYPTION_KEY` est bien dans le docker-compose
2. `docker-compose exec n8n env | grep ENCRYPTION` — doit afficher la clé
3. Ne JAMAIS supprimer le `docker-compose.yml` sans sauvegarder l'encryption key
