# Guide - Workflows Questionnaire, Entretien et Confirmation

## 📋 Vue d'ensemble

Ces 3 workflows complètent le cycle de vie des leads après leur inscription :

1. **Questionnaire** : Envoie un questionnaire au lead et met à jour le statut à "contacte"
2. **Entretien** : Planifie et envoie un email pour l'entretien avec le lead
3. **Confirmation** : Confirme la conversion du lead et met à jour le statut à "converti"

## 🔧 Configuration

### 1. Importer les workflows dans n8n

1. Ouvrir n8n
2. Workflows → Import from File
3. Importer les 3 fichiers :
   - `lead-questionnaire.json`
   - `lead-entretien.json`
   - `lead-confirmation.json`

### 2. Configurer les credentials

Chaque workflow nécessite les credentials suivants :

#### TalosPrimes API Auth
- **Type** : Header Auth
- **Header Name** : `X-TalosPrimes-N8N-Secret`
- **Header Value** : Le secret défini dans `N8N_WEBHOOK_SECRET` (backend `.env`)

#### Resend API (pour les emails)
- **Type** : Header Auth
- **Header Name** : `Authorization`
- **Header Value** : `Bearer re_...` (avec "Bearer" + espace + votre clé API Resend)

### 3. Configurer les WorkflowLinks dans la base de données

Exécuter le script de configuration :

```bash
cd /var/www/talosprimes
pnpm workflow:setup-leads
```

Ce script créera automatiquement les 3 nouveaux `WorkflowLink` :
- `lead_questionnaire`
- `lead_entretien`
- `lead_confirmation`

### 4. Activer les workflows dans n8n

1. Ouvrir chaque workflow dans n8n
2. Cliquer sur "Active" pour activer le workflow
3. Vérifier que les webhook URLs sont correctes :
   - `https://n8n.talosprimes.com/webhook/lead_questionnaire`
   - `https://n8n.talosprimes.com/webhook/lead_entretien`
   - `https://n8n.talosprimes.com/webhook/lead_confirmation`

## 📝 Utilisation

### Workflow Questionnaire (`lead_questionnaire`)

**Objectif** : Envoyer un questionnaire au lead et mettre à jour son statut à "contacte".

**Payload attendu** :
```json
{
  "id": "uuid-du-lead"
}
```

**Actions effectuées** :
1. Récupère les informations du lead depuis l'API
2. Met à jour le statut à "contacte"
3. Envoie un email avec un lien vers le questionnaire

**Personnalisation** :
- Modifier l'URL du questionnaire dans le nœud "Préparer données" :
  ```javascript
  const questionnaireUrl = `https://talosprimes.com/questionnaire/${leadId}`;
  ```

### Workflow Entretien (`lead_entretien`)

**Objectif** : Planifier et envoyer un email pour l'entretien avec le lead.

**Payload attendu** :
```json
{
  "id": "uuid-du-lead",
  "dateEntretien": "2026-01-15",  // Optionnel
  "heureEntretien": "14:00",      // Optionnel
  "typeEntretien": "téléphonique" // Optionnel (défaut: "téléphonique")
}
```

**Actions effectuées** :
1. Récupère les informations du lead depuis l'API
2. Prépare les données (date, heure, type d'entretien)
3. Envoie un email avec les informations de planification ou un lien de planification

**Personnalisation** :
- Modifier l'URL de planification dans le nœud "Préparer données" :
  ```javascript
  const lienPlanification = `https://talosprimes.com/planifier/${leadId}`;
  ```

### Workflow Confirmation (`lead_confirmation`)

**Objectif** : Confirmer la conversion du lead et mettre à jour son statut à "converti".

**Payload attendu** :
```json
{
  "id": "uuid-du-lead"
}
```

**Actions effectuées** :
1. Récupère les informations du lead depuis l'API
2. Met à jour le statut à "converti"
3. Envoie un email de bienvenue avec accès à l'espace client

**Personnalisation** :
- Modifier l'URL de connexion dans le nœud "Resend - Email Confirmation" :
  ```
  https://talosprimes.com/login
  ```

## 🧪 Tests

### Tester le workflow Questionnaire

```bash
curl -X POST "https://n8n.talosprimes.com/webhook/lead_questionnaire" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "UUID_DU_LEAD"
  }'
```

### Tester le workflow Entretien

```bash
curl -X POST "https://n8n.talosprimes.com/webhook/lead_entretien" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "UUID_DU_LEAD",
    "dateEntretien": "2026-01-15",
    "heureEntretien": "14:00",
    "typeEntretien": "téléphonique"
  }'
```

### Tester le workflow Confirmation

```bash
curl -X POST "https://n8n.talosprimes.com/webhook/lead_confirmation" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "UUID_DU_LEAD"
  }'
```

## 🔄 Flux complet recommandé

1. **Inscription** → Lead créé avec statut "nouveau"
2. **Questionnaire** → Statut mis à "contacte" + email questionnaire envoyé
3. **Entretien** → Email d'entretien envoyé (statut reste "contacte")
4. **Confirmation** → Statut mis à "converti" + email de bienvenue envoyé

## ⚠️ Notes importantes

- Tous les workflows nécessitent que le lead existe déjà dans la base de données
- Les workflows utilisent l'API TalosPrimes pour récupérer et mettre à jour les leads
- Les emails sont envoyés via Resend
- Les URLs (questionnaire, planification, login) doivent être personnalisées selon votre configuration
- Les workflows sont conçus pour être appelés depuis le backend via les `WorkflowLink`, mais peuvent aussi être testés directement via les webhooks n8n

## 🚨 Gestion d'erreurs

Si un workflow échoue :
1. Vérifier les logs dans n8n
2. Vérifier que les credentials sont correctement configurés
3. Vérifier que le lead existe dans la base de données
4. Vérifier que l'API TalosPrimes est accessible
5. Vérifier que Resend est correctement configuré

