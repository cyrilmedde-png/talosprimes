# Workflow n8n : Formulaire d'inscription

## 📋 Description

Ce workflow gère les demandes d'inscription reçues via le formulaire web :
1. Reçoit les données du formulaire (nom, prénom, téléphone, email)
2. Envoie un email de confirmation à l'utilisateur
3. Envoie une notification à l'équipe TalosPrimes

## 🔗 URL du Webhook

Une fois le workflow créé dans n8n, l'URL de production sera :
```
https://n8n.talosprimes.com/webhook/inscription
```

(Le path "inscription" sera généré automatiquement ou vous pouvez le personnaliser)

## 📝 Étapes du Workflow

### 1. Nœud Webhook (Déclencheur)

**Configuration :**
- **HTTP Method :** `POST`
- **Path :** `inscription` (ou laissez vide pour un ID automatique)
- **Authentication :** `None`
- **Respond :** `When Last Node Finishes`

**Données reçues :**
```json
{
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "+33 6 12 34 56 78",
  "email": "jean.dupont@example.com",
  "timestamp": "2026-01-06T23:00:00.000Z"
}
```

### 2. Nœud Code (Optionnel - Validation)

**Mode :** JavaScript

**Code :**
```javascript
// Validation des données
const data = $input.all()[0].json;

const errors = [];

if (!data.nom || !data.nom.trim()) {
  errors.push('Le nom est requis');
}

if (!data.prenom || !data.prenom.trim()) {
  errors.push('Le prénom est requis');
}

if (!data.telephone || !data.telephone.trim()) {
  errors.push('Le téléphone est requis');
}

if (!data.email || !data.email.trim()) {
  errors.push('L\'email est requis');
} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
  errors.push('Format d\'email invalide');
}

if (errors.length > 0) {
  throw new Error(`Validation échouée: ${errors.join(', ')}`);
}

return {
  json: {
    ...data,
    validated: true,
    dateReception: new Date().toISOString()
  }
};
```

### 3. Nœud Email (Confirmation utilisateur)

**Configuration :**
- **From Email :** `noreply@talosprimes.com` (ou votre email SMTP)
- **To Email :** `{{ $json.email }}`
- **Subject :** `Demande d'inscription TalosPrimes - Confirmation`

**Body (HTML) :**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9fafb; padding: 20px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TalosPrimes</h1>
    </div>
    <div class="content">
      <p>Bonjour {{ $json.prenom }} {{ $json.nom }},</p>
      
      <p>Nous avons bien reçu votre demande d'inscription sur TalosPrimes.</p>
      
      <p><strong>Vos informations :</strong></p>
      <ul>
        <li>Nom : {{ $json.nom }}</li>
        <li>Prénom : {{ $json.prenom }}</li>
        <li>Email : {{ $json.email }}</li>
        <li>Téléphone : {{ $json.telephone }}</li>
      </ul>
      
      <p>Notre équipe va examiner votre demande et vous recontactera dans un délai de <strong>24 à 48 heures</strong>.</p>
      
      <p>En attendant, n'hésitez pas à consulter notre site web pour en savoir plus sur nos services.</p>
      
      <p>Cordialement,<br>
      L'équipe TalosPrimes</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>
```

**Configuration SMTP :**
- Vous devrez configurer les paramètres SMTP dans n8n (Settings → Credentials)
- Ou utiliser un service comme SendGrid, Mailgun, etc.

### 4. Nœud Email/HTTP Request (Notification équipe)

**Option A : Email interne**

- **To Email :** `contact@talosprimes.com` (ou votre email équipe)
- **Subject :** `Nouvelle demande d'inscription - {{ $json.prenom }} {{ $json.nom }}`
- **Body :**
```
Nouvelle demande d'inscription reçue :

Nom : {{ $json.nom }}
Prénom : {{ $json.prenom }}
Email : {{ $json.email }}
Téléphone : {{ $json.telephone }}

Date de réception : {{ $json.timestamp }}

---
TalosPrimes - Système automatisé
```

**Option B : Slack/Discord (si configuré)**

Utilisez un nœud Slack ou Discord pour envoyer une notification dans votre canal d'équipe.

**Option C : HTTP Request vers votre API**

- **Method :** `POST`
- **URL :** `https://api.talosprimes.com/api/inscriptions` (si vous créez cette route)
- **Body :**
```json
{
  "nom": "{{ $json.nom }}",
  "prenom": "{{ $json.prenom }}",
  "email": "{{ $json.email }}",
  "telephone": "{{ $json.telephone }}",
  "timestamp": "{{ $json.timestamp }}"
}
```

### 5. Nœud Respond to Webhook (Réponse)

**Configuration :**
- **Response Code :** `200`
- **Response Body :**
```json
{
  "success": true,
  "message": "Votre demande a été prise en compte. Vous serez recontacté dans 24 à 48 heures."
}
```

## ✅ Workflow complet

```
Webhook (POST)
    ↓
[Code - Validation] (optionnel)
    ↓
Email (Confirmation utilisateur)
    ↓
Email/Notification (Équipe TalosPrimes)
    ↓
Respond to Webhook (200 OK)
```

## 🔧 Configuration SMTP dans n8n

1. Allez dans **Settings** → **Credentials**
2. Cliquez sur **Add Credential** → **SMTP**
3. Remplissez :
   - **User :** votre email SMTP
   - **Password :** mot de passe de l'email
   - **Host :** smtp.gmail.com (ou votre serveur SMTP)
   - **Port :** 587 (ou 465 pour SSL)
   - **Secure :** true (pour SSL/TLS)

## 📝 Exemple de test

Pour tester le workflow, envoyez une requête POST :

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

## 🚀 Prochaines étapes

Une fois le workflow créé :

1. **Copiez l'URL de production** du webhook
2. **Ajoutez-la dans `.env.local`** du frontend :
   ```
   NEXT_PUBLIC_N8N_INSCRIPTION_WEBHOOK=https://n8n.talosprimes.com/webhook/VOTRE-ID
   ```
3. **Testez le formulaire** sur `/inscription`
4. **Activez le workflow** dans n8n (bouton ON en haut à droite)

