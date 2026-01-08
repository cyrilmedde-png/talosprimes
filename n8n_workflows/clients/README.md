# Workflows n8n - Gestion des Clients

## 📋 Description

Workflows professionnels pour gérer le cycle de vie complet des clients finaux : création depuis un lead converti, création directe, liste, récupération, mise à jour et suppression.

## ✅ Workflows disponibles

### 1. **client_create_from_lead** - Créer un client depuis un lead converti
- Récupère les informations du lead converti
- Crée un client B2C avec les données du lead
- Utilisé après la confirmation d'un lead

### 2. **client_create** - Créer un nouveau client directement
- Création manuelle d'un client (B2B ou B2C)
- Validation des données selon le type
- Utilisé pour créer un client sans passer par un lead

### 3. **clients_list** - Liste des clients
- Récupération de tous les clients du tenant
- Filtres par type, statut, etc.
- Utilisé pour afficher la liste dans l'interface

### 4. **client_get** - Récupération d'un client
- Récupération d'un client spécifique par ID
- Inclut les abonnements et factures associés
- Utilisé pour afficher les détails d'un client

### 5. **client_update** - Mise à jour d'un client
- Mise à jour des informations d'un client
- Validation des données
- Utilisé pour modifier un client existant

### 6. **client_delete** - Suppression d'un client
- Soft delete : met le statut à "inactif"
- Utilisé pour supprimer un client

## 🔄 Flux d'exécution

### Création depuis Lead
```
Webhook → Parser → Get Lead → Préparer données → Create Client → Respond
```

### Création directe
```
Webhook → Validation → Create Client → Respond
```

## 📦 Import

1. Ouvrir n8n
2. Workflows → Import from File
3. Importer les workflows (un fichier par workflow) :
   - `client-create-from-lead.json` (Webhook `client_create_from_lead`)
   - `client-create.json` (Webhook `client_create`)
   - `clients-list.json` (Webhook `clients_list`)
   - `client-get.json` (Webhook `client_get`)
   - `client-update.json` (Webhook `client_update`)
   - `client-delete.json` (Webhook `client_delete`)
4. Configurer les credentials :
   - **TalosPrimes API Auth** : Header Auth avec `X-TalosPrimes-N8N-Secret`
5. Activer les workflows

## 🔧 Configuration requise

### Credentials n8n

**TalosPrimes API (pour appeler https://api.talosprimes.com/api/clients)** :
- Type : Header Auth
- **Header Name** : `X-TalosPrimes-N8N-Secret`
- **Header Value** : un secret partagé (à mettre aussi dans `/var/www/talosprimes/packages/platform/.env` via `N8N_WEBHOOK_SECRET=...`)

## 🧪 Test

### Créer un client depuis un lead
```bash
curl -X POST "https://n8n.talosprimes.com/webhook/client_create_from_lead" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "uuid-du-lead-converti"
  }'
```

### Créer un client directement
```bash
curl -X POST "https://n8n.talosprimes.com/webhook/client_create" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "b2c",
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean@example.com",
    "telephone": "+33612345678"
  }'
```

## 📊 Types de clients

### B2C (Business to Consumer)
- Requis : `nom`, `prenom`, `email`
- Optionnel : `telephone`, `adresse`, `tags`

### B2B (Business to Business)
- Requis : `raisonSociale`, `email`
- Optionnel : `nom`, `prenom`, `telephone`, `adresse`, `tags`
