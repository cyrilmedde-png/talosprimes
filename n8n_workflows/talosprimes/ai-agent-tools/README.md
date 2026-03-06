# Super Agent IA TalosPrimes v2 — Workflows n8n

## Architecture

```
Telegram → AI Agent → 13 Postgres READ tools (SELECT)
                    → 8 Postgres WRITE tools (UPDATE/INSERT/DELETE)
                    → 10 Sub-workflows (logique métier complexe)
                    → 2 HTTP tools (Qonto API externe)
```

## Fichiers

| Fichier | Description |
|---------|-------------|
| `super-agent-ia-v2-main.json` | Workflow principal avec AI Agent + 33 outils |
| `sw-creer-lead.json` | Création lead avec déduplication |
| `sw-creer-client.json` | Création client B2B/B2C |
| `sw-modifier-client.json` | Modification partielle client |
| `sw-creer-devis.json` | Création devis (DEV-XXXX) + lignes |
| `sw-creer-facture.json` | Création facture (FAC-XXXX) + lignes |
| `sw-creer-bdc.json` | Création bon de commande (BDC-XXXX) |
| `sw-devis-vers-facture.json` | Conversion devis → facture |
| `sw-bdc-vers-facture.json` | Conversion BDC → facture |
| `sw-envoyer-facture.json` | Génération PDF + envoi email |
| `sw-envoyer-notification.json` | Envoi email notification |

## Installation

### 1. Importer les sub-workflows en premier
Importez chaque `sw-*.json` dans n8n et notez les IDs générés.

### 2. Mettre à jour les IDs dans le workflow principal
Dans `super-agent-ia-v2-main.json`, remplacez les placeholders :

- `__SW_CREER_LEAD_ID__` → ID du workflow sw-creer-lead
- `__SW_CREER_CLIENT_ID__` → ID du workflow sw-creer-client
- `__SW_MODIFIER_CLIENT_ID__` → ID du workflow sw-modifier-client
- `__SW_CREER_DEVIS_ID__` → ID du workflow sw-creer-devis
- `__SW_CREER_FACTURE_ID__` → ID du workflow sw-creer-facture
- `__SW_CREER_BDC_ID__` → ID du workflow sw-creer-bdc
- `__SW_DEVIS_VERS_FACTURE_ID__` → ID du workflow sw-devis-vers-facture
- `__SW_BDC_VERS_FACTURE_ID__` → ID du workflow sw-bdc-vers-facture
- `__SW_ENVOYER_FACTURE_ID__` → ID du workflow sw-envoyer-facture
- `__SW_ENVOYER_NOTIFICATION_ID__` → ID du workflow sw-envoyer-notification

### 3. Configurer les credentials
- `__TELEGRAM_CREDENTIAL_ID__` → ID de votre Bot Telegram
- `__OPENAI_CREDENTIAL_ID__` → ID de votre clé OpenAI
- `OGqj65ZoFRileCck` → Déjà configuré pour Supabase Postgres

### 4. Importer le workflow principal
Importez `super-agent-ia-v2-main.json` et activez-le.

## Tests recommandés

1. **READ** : "Liste mes leads", "Montre le devis DEV-0001", "Quel est mon solde Qonto?"
2. **WRITE simple** : "Passe le lead X en qualifié", "Accepte le devis DEV-0003"
3. **WRITE complexe** : "Crée un devis pour le client X avec 2 lignes", "Convertis le devis DEV-0005 en facture"
4. **Bout en bout** : "Crée un lead, qualifie-le, crée un devis, accepte-le, convertis en facture, envoie-la"
