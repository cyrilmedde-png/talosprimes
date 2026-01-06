# Workflows n8n - TalosPrimes

Ce dossier contient tous les workflows n8n de l'application TalosPrimes, organisés par fonctionnalité.

## 📁 Structure

```
n8n_workflows/
├── leads/              # Gestion des leads (formulaires d'inscription)
├── clients/            # Gestion des clients finaux
├── factures/           # Gestion des factures
├── abonnements/        # Gestion des abonnements
├── notifications/      # Système de notifications
└── integrations/       # Intégrations externes
```

## 📋 Organisation des fichiers

Chaque workflow contient :
- `workflow.json` : Export du workflow n8n (à importer dans n8n)
- `README.md` : Documentation du workflow
- `config.env.example` : Variables d'environnement nécessaires

## 🚀 Import dans n8n

### Méthode 1 : Import direct
1. Ouvrez n8n : `https://n8n.talosprimes.com`
2. Cliquez sur **Workflows** → **Import from File**
3. Sélectionnez le fichier `workflow.json`
4. Configurez les credentials (SMTP, etc.)
5. Activez le workflow

### Méthode 2 : Via l'interface
1. Créez un nouveau workflow dans n8n
2. Suivez la documentation dans `README.md`
3. Configurez les nœuds selon les instructions

## 🔧 Configuration

Avant d'importer un workflow :
1. Lisez le `README.md` du workflow
2. Configurez les variables d'environnement si nécessaire
3. Créez les credentials requis (SMTP, API keys, etc.)

## 📝 Liste des workflows

### Leads
- ✅ `inscription-formulaire` : Traitement du formulaire d'inscription

### Clients
- 🔄 À venir

### Factures
- 🔄 À venir

### Abonnements
- 🔄 À venir

### Notifications
- 🔄 À venir

