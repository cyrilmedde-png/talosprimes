# Workflows n8n - Gestion des Leads

## 📋 Description

Workflows professionnels pour gérer le cycle de vie complet des leads : inscription, questionnaire, entretien et confirmation.

## ✅ Workflows disponibles

### 1. **lead_create** - Création d'un lead
- Validation stricte des données d'entrée
- Sauvegarde en base de données
- Utilisé lors de l'inscription via formulaire ou création manuelle

### 2. **leads_list** - Liste des leads
- Récupération de tous les leads depuis la base de données
- Utilisé pour afficher la liste dans l'interface

### 3. **lead_get** - Récupération d'un lead
- Récupération d'un lead spécifique par ID
- Utilisé pour afficher les détails d'un lead

### 4. **lead_update_status** - Mise à jour du statut
- Mise à jour du statut d'un lead (nouveau, contacte, converti, abandonne)
- Utilisé pour changer manuellement le statut

### 5. **lead_delete** - Suppression d'un lead
- Suppression d'un lead de la base de données
- Utilisé pour supprimer un lead

### 6. **lead_questionnaire** - Envoi du questionnaire
- Récupération des informations du lead
- Mise à jour du statut à "contacte"
- Envoi d'un email avec lien vers le questionnaire

### 7. **lead_entretien** - Planification d'entretien
- Récupération des informations du lead
- Envoi d'un email avec date/heure proposées ou lien de planification
- Support pour entretien téléphonique ou en présentiel

### 8. **lead_confirmation** - Confirmation de conversion
- Récupération des informations du lead
- Mise à jour du statut à "converti"
- Envoi d'un email de bienvenue avec accès à l'espace client

## 🔄 Flux d'exécution

```
Webhook → Validation → Sauvegarder Lead → [En parallèle]
                                              ├─ Email Confirmation
                                              ├─ SMS Confirmation
                                              └─ Notification Équipe
                                                      ↓
                                              Réponse Webhook (success)
```

En cas d'erreur à n'importe quelle étape :
```
Erreur → Formatage Alerte → Email Alerte → Réponse Webhook (error 500)
```

## ⚠️ Gestion d'erreurs

**AUCUN `continueOnFail`** - Toute erreur fait échouer le workflow et déclenche une alerte.

- ✅ Erreur de validation → Alerte immédiate
- ✅ Erreur de sauvegarde → Alerte immédiate
- ✅ Erreur d'envoi email → Alerte immédiate
- ✅ Erreur d'envoi SMS → Alerte immédiate

Le workflow **NE PEUT PAS** se terminer en "succeeded" s'il y a une erreur.

## 📦 Import

1. Ouvrir n8n
2. Workflows → Import from File
3. Importer les workflows (un fichier par workflow) :
   - `lead-create.json` (Webhook `lead_create`)
   - `leads-list.json` (Webhook `leads_list`)
   - `lead-get.json` (Webhook `lead_get`)
   - `lead-update-status.json` (Webhook `lead_update_status`)
   - `lead-delete.json` (Webhook `lead_delete`)
   - `lead-questionnaire.json` (Webhook `lead_questionnaire`)
   - `lead-entretien.json` (Webhook `lead_entretien`)
   - `lead-confirmation.json` (Webhook `lead_confirmation`)
4. Configurer les credentials :
   - **Resend API** : Clé API Resend
   - **Twilio** : Credentials Twilio (optionnel)
5. Activer le workflow

## 🔧 Configuration requise

### Credentials n8n

1. **Resend API** :
   - Type : Header Auth
   - **Header Name** : `Authorization`
   - **Header Value** : `Bearer re_...` (obligatoire : "Bearer" + espace + clé)

2. **TalosPrimes API (pour le nœud “Sauvegarder Lead” vers https://api.talosprimes.com/api/leads)** :
   - Type : Header Auth
   - **Header Name** : `X-TalosPrimes-N8N-Secret`
   - **Header Value** : un secret partagé (à mettre aussi dans `/var/www/talosprimes/packages/platform/.env` via `N8N_WEBHOOK_SECRET=...`)

2. **Twilio** (optionnel) :
   - Account SID
   - Auth Token
   - Phone Number

### Variables d'environnement backend

Le workflow appelle `https://api.talosprimes.com/api/leads` - assurez-vous que :
- Le backend est accessible
- La route `/api/leads` est fonctionnelle
- La base de données est accessible

## 🧪 Test

```bash
curl -X POST "https://n8n.talosprimes.com/webhook/inscription" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean@example.com",
    "telephone": "+33612345678"
  }'
```

**Réponse attendue (succès)** :
```json
{
  "success": true,
  "message": "Votre demande a été prise en compte. Vous serez recontacté dans 24 à 48 heures."
}
```

**Réponse attendue (erreur)** :
```json
{
  "success": false,
  "message": "Une erreur s'est produite. Notre équipe a été notifiée.",
  "error": "Message d'erreur détaillé"
}
```

## 📊 Vérification

1. **Base de données** : Vérifier que le lead est enregistré
2. **Email lead** : Vérifier la réception de l'email de confirmation
3. **Email équipe** : Vérifier la notification à l'équipe
4. **Logs n8n** : Vérifier l'exécution dans n8n

## 🚨 Alertes

En cas d'erreur, un email d'alerte est envoyé à `contact@talosprimes.com` avec :
- Message d'erreur
- Nœud concerné
- Execution ID
- Données du lead
- Stack trace (si disponible)
