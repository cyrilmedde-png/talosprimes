# Workflow : Traitement formulaire d'inscription (Leads)

## 📋 Description

Ce workflow gère les demandes d'inscription reçues via le formulaire web `/inscription`.

**Fonctionnalités :**
- Réception des données du formulaire (nom, prénom, téléphone, email)
- Validation des données
- Envoi d'un email de confirmation à l'utilisateur
- Notification à l'équipe TalosPrimes (email ou Slack/Discord)
- Réponse de confirmation au formulaire

## 🔗 URL du Webhook

**Production URL :**
```
https://n8n.talosprimes.com/webhook/inscription
```

**Test URL :**
```
http://localhost:5678/webhook-test/inscription
```

## 📥 Données d'entrée

Le formulaire envoie une requête POST avec :

```json
{
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "+33 6 12 34 56 78",
  "email": "jean.dupont@example.com",
  "timestamp": "2026-01-06T23:00:00.000Z"
}
```

## 🔄 Structure du workflow

```
1. Webhook (POST /inscription)
   ↓
2. Code - Validation (optionnel)
   ↓
3. Email - Confirmation utilisateur
   ↓
4. Email/Notification - Équipe TalosPrimes
   ↓
5. Respond to Webhook (200 OK)
```

## ⚙️ Configuration requise

### Credentials nécessaires

1. **SMTP** (pour envoi d'emails)
   - Email d'envoi : `noreply@talosprimes.com`
   - Serveur SMTP (ex: smtp.gmail.com, SendGrid, Mailgun)
   - Port : 587 (TLS) ou 465 (SSL)
   - User et Password

2. **Slack** (optionnel - pour notifications)
   - Webhook URL ou Bot Token

3. **Discord** (optionnel - pour notifications)
   - Webhook URL

### Variables d'environnement (si utilisées)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@talosprimes.com
SMTP_PASSWORD=votre_mot_de_passe
EMAIL_FROM=noreply@talosprimes.com
EMAIL_TO_EQUIPE=contact@talosprimes.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/... (optionnel)
```

## 📧 Templates d'emails

### Email de confirmation utilisateur

**Subject :** `Demande d'inscription TalosPrimes - Confirmation`

**Body HTML :** (voir `email-confirmation-template.html`)

### Email notification équipe

**Subject :** `Nouvelle demande d'inscription - {{ prenom }} {{ nom }}`

**Body :** (voir `email-notification-template.txt`)

## 🧪 Test

### Test avec curl

```bash
curl -X POST "https://n8n.talosprimes.com/webhook/inscription" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Dupont",
    "prenom": "Jean",
    "telephone": "+33 6 12 34 56 78",
    "email": "jean.dupont@example.com",
    "timestamp": "2026-01-06T23:00:00.000Z"
  }'
```

### Test depuis le formulaire

1. Accédez à `https://talosprimes.com/inscription`
2. Remplissez le formulaire
3. Vérifiez l'email de confirmation
4. Vérifiez la notification équipe

## ✅ Réponse attendue

**Code HTTP :** `200 OK`

**Body :**
```json
{
  "success": true,
  "message": "Votre demande a été prise en compte. Vous serez recontacté dans 24 à 48 heures."
}
```

## 🔄 Workflows liés (futurs)

- `leads/lead-vers-client` : Conversion d'un lead en client après validation
- `leads/relance-lead` : Relance automatique après 48h

## 📝 Notes

- Le workflow doit être **activé** dans n8n pour fonctionner
- Les emails peuvent prendre quelques secondes à être envoyés
- En cas d'erreur SMTP, vérifiez les credentials et les paramètres du serveur

