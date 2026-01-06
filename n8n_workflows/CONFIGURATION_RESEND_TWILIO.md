# Configuration Resend (Email) et Twilio (SMS) dans n8n

Ce guide explique comment configurer les credentials Resend et Twilio dans n8n pour utiliser ces services dans vos workflows.

---

## 📧 Configuration Resend (Emails)

### 1. Obtenir votre API Key Resend

1. Connectez-vous à [Resend](https://resend.com/)
2. Allez dans **API Keys**
3. Cliquez sur **Create API Key**
4. Donnez un nom (ex: "TalosPrimes n8n")
5. Copiez l'API Key générée (vous ne pourrez la voir qu'une fois !)

### 2. Configurer Resend dans n8n

**Option A : Utiliser le nœud HTTP Request (Recommandé)**

Resend utilise une API REST simple. Vous pouvez utiliser le nœud **HTTP Request** avec l'authentification API Key.

1. Dans n8n, créez un nouveau workflow ou ouvrez un workflow existant
2. Ajoutez un nœud **HTTP Request**
3. Configurez comme suit :

**Paramètres HTTP Request :**
- **Method** : `POST`
- **URL** : `https://api.resend.com/emails`
- **Authentication** : `Generic Credential Type`
  - **Credential Type** : `Header Auth`
  - **Name** : `Resend API`
  - **Header Name** : `Authorization`
  - **Header Value** : `Bearer YOUR_RESEND_API_KEY`
- **Headers** :
  - `Content-Type: application/json`
- **Body** :
```json
{
  "from": "TalosPrimes <noreply@talosprimes.com>",
  "to": ["{{ $json.email }}"],
  "subject": "{{ $json.subject }}",
  "html": "{{ $json.htmlBody }}",
  "text": "{{ $json.textBody }}"
}
```

**Ou utilisez l'authentification dans l'URL :**
- Créez une credential **Header Auth** :
  1. Allez dans **Settings** → **Credentials**
  2. Cliquez sur **Add Credential**
  3. Recherchez **"Header Auth"**
  4. Remplissez :
     - **Name** : `Resend API`
     - **Header Name** : `Authorization`
     - **Header Value** : `Bearer YOUR_RESEND_API_KEY`
  5. Cliquez sur **Save**

### 3. Utilisation dans un workflow

**Exemple de nœud HTTP Request configuré pour Resend :**

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://api.resend.com/emails",
    "authentication": "headerAuth",
    "headerAuth": {
      "name": "Resend API",
      "id": "resend-credential-id"
    },
    "options": {
      "headers": {
        "Content-Type": "application/json"
      }
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "from",
          "value": "TalosPrimes <noreply@talosprimes.com>"
        },
        {
          "name": "to",
          "value": "={{ [$json.email] }}"
        },
        {
          "name": "subject",
          "value": "={{ $json.subject }}"
        },
        {
          "name": "html",
          "value": "={{ $json.htmlBody }}"
        }
      ]
    }
  }
}
```

### 4. Template d'email avec Resend

Dans votre workflow, avant le nœud HTTP Request, ajoutez un nœud **Code** pour formater les données :

```javascript
// Formater les données pour Resend
const emailData = $input.all()[0].json;

return {
  json: {
    subject: "Demande d'inscription TalosPrimes - Confirmation",
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TalosPrimes</h1>
          </div>
          <div class="content">
            <p>Bonjour ${emailData.prenom} ${emailData.nom},</p>
            <p>Nous avons bien reçu votre demande d'inscription.</p>
            <p>Vous serez recontacté dans 24 à 48 heures.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    textBody: `Bonjour ${emailData.prenom} ${emailData.nom},\n\nNous avons bien reçu votre demande d'inscription.\n\nVous serez recontacté dans 24 à 48 heures.\n\nCordialement,\nL'équipe TalosPrimes`,
    email: emailData.email
  }
};
```

**Important :** Assurez-vous que le domaine `talosprimes.com` est vérifié dans Resend pour pouvoir envoyer depuis `noreply@talosprimes.com`.

---

## 📱 Configuration Twilio (SMS)

### 1. Obtenir vos credentials Twilio

1. Connectez-vous à [Twilio Console](https://console.twilio.com/)
2. Allez dans le dashboard
3. Copiez :
   - **Account SID** (visible sur le dashboard)
   - **Auth Token** (cliquez sur "View" pour le révéler)
   - **Phone Number** (votre numéro Twilio, ex: +1234567890)

### 2. Configurer Twilio dans n8n

**Option A : Utiliser le nœud Twilio (Recommandé)**

1. Dans n8n, allez dans **Settings** → **Credentials**
2. Cliquez sur **Add Credential**
3. Recherchez **"Twilio"**
4. Remplissez :
   - **Name** : `Twilio TalosPrimes`
   - **Account SID** : `VOTRE_ACCOUNT_SID`
   - **Auth Token** : `VOTRE_AUTH_TOKEN`
   - **Phone Number** : `VOTRE_NUMERO_TWILIO` (optionnel, peut être défini dans le nœud)
5. Cliquez sur **Save**

### 3. Utilisation dans un workflow

1. Ajoutez un nœud **Twilio** dans votre workflow
2. Sélectionnez l'action : **"Send SMS"**
3. Dans **Credential to connect with**, sélectionnez `Twilio TalosPrimes`
4. Configurez :
   - **From** : Votre numéro Twilio (ex: `+1234567890`)
   - **To** : `={{ $json.telephone }}`
   - **Message** : Votre message SMS

**Exemple de configuration :**
```
From: +1234567890
To: {{ $json.telephone }}
Message: Bonjour {{ $json.prenom }}, votre demande d'inscription TalosPrimes a été reçue. Vous serez recontacté sous 24-48h.
```

### 4. Exemple de message SMS

Dans un nœud **Code** avant le nœud Twilio :

```javascript
const data = $input.all()[0].json;

return {
  json: {
    telephone: data.telephone,
    message: `Bonjour ${data.prenom} ${data.nom}, votre demande d'inscription TalosPrimes a été reçue. Vous serez recontacté par notre équipe dans les 24 à 48 heures. Merci de votre confiance !`
  }
};
```

---

## 🔄 Exemple de workflow complet

### Workflow avec Resend + Twilio

```
1. Webhook (réception formulaire)
   ↓
2. Code (validation)
   ↓
3. Code (formatage email pour Resend)
   ↓
4. HTTP Request (Resend - Email confirmation)
   ↓
5. Code (formatage SMS pour Twilio)
   ↓
6. Twilio (SMS confirmation)
   ↓
7. HTTP Request (Resend - Notification équipe)
   ↓
8. Respond to Webhook
```

---

## 📝 Variables d'environnement (Optionnel)

Pour centraliser la configuration, vous pouvez utiliser des variables d'environnement dans n8n :

1. Allez dans **Settings** → **Variables**
2. Ajoutez :

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
EMAIL_FROM=TalosPrimes <noreply@talosprimes.com>
EMAIL_TO_EQUIPE=contact@talosprimes.com
```

Puis dans vos nœuds, utilisez :
- Resend API Key : `{{ $env.RESEND_API_KEY }}`
- Twilio credentials : Utilisez la credential directement

---

## ✅ Test

### Test Resend

```bash
curl -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer YOUR_RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "TalosPrimes <noreply@talosprimes.com>",
    "to": ["test@example.com"],
    "subject": "Test",
    "html": "<h1>Test email</h1>"
  }'
```

### Test Twilio

1. Dans n8n, testez le nœud Twilio avec "Execute Node"
2. Ou utilisez l'API Twilio directement pour tester

---

## 🔐 Sécurité

- ✅ **Ne commitez jamais** vos API Keys dans le code
- ✅ Utilisez les **credentials** de n8n pour stocker les clés
- ✅ Utilisez des **variables d'environnement** si possible
- ✅ Limitez les **permissions** de vos API Keys dans Resend/Twilio
- ✅ **Rotez régulièrement** vos API Keys

---

## 📚 Documentation

- [Resend API Documentation](https://resend.com/docs/api-reference/emails/send-email)
- [Twilio API Documentation](https://www.twilio.com/docs/sms)
- [n8n HTTP Request Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- [n8n Twilio Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.twilio/)

