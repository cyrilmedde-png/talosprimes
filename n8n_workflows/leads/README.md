# Workflow n8n - Inscription Leads

## 📋 Description

Workflow professionnel pour gérer les inscriptions via formulaire web.

## ✅ Fonctionnalités

1. **Validation stricte** des données d'entrée
2. **Sauvegarde en base de données** (priorité absolue)
3. **Envoi email de confirmation** au lead
4. **Envoi SMS de confirmation** (optionnel, via Twilio)
5. **Notification équipe** par email
6. **Gestion d'erreurs stricte** : toute erreur déclenche une alerte et fait échouer le workflow

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
3. Sélectionner `workflow-inscription.json`
4. Configurer les credentials :
   - **Resend API** : Clé API Resend
   - **Twilio** : Credentials Twilio (optionnel)
5. Activer le workflow

## 🔧 Configuration requise

### Credentials n8n

1. **Resend API** :
   - Type : Header Auth
   - Name : `Authorization`
   - Value : `Bearer YOUR_RESEND_API_KEY`

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
