# Import du workflow - Guide simple

## 📥 Import dans n8n

1. Ouvrez n8n : `https://n8n.talosprimes.com`
2. Cliquez sur **"Workflows"** → **"Import from File"**
3. Sélectionnez le fichier : `workflow-inscription.json`
4. Le workflow sera importé avec tous les nœuds

## ⚙️ Configuration requise

### 1. Credential Resend (pour les emails)

1. Allez dans **Settings** → **Credentials**
2. Cliquez sur **"Add Credential"**
3. Recherchez **"Header Auth"**
4. Remplissez :
   - **Name** : `Resend API`
   - **Header Name** : `Authorization`
   - **Header Value** : `Bearer re_VOTRE_API_KEY_RESEND`
5. Cliquez sur **"Save"**

### 2. Credential Twilio (pour les SMS)

1. Allez dans **Settings** → **Credentials**
2. Cliquez sur **"Add Credential"**
3. Recherchez **"Twilio"**
4. Remplissez :
   - **Name** : `Twilio`
   - **Account SID** : `VOTRE_ACCOUNT_SID`
   - **Auth Token** : `VOTRE_AUTH_TOKEN`
   - **Phone Number** : `VOTRE_NUMERO_TWILIO` (ex: `+33612345678`)
5. Cliquez sur **"Save"**

### 3. Configurer le numéro Twilio dans le workflow

1. Ouvrez le workflow importé
2. Cliquez sur le nœud **"Twilio - SMS"**
3. Dans le champ **"From"**, entrez votre numéro Twilio (ex: `+33612345678`)
4. Sauvegardez

## ✅ Activer le workflow

1. Cliquez sur le bouton **"OFF"** en haut à droite
2. Il devrait passer à **"ON"** (vert)
3. Le workflow est maintenant actif !

## 🔗 URL du Webhook

Une fois activé, l'URL de production sera affichée dans le nœud Webhook :
```
https://n8n.talosprimes.com/webhook/inscription
```

Copiez cette URL et ajoutez-la dans `.env.local` du frontend :
```env
NEXT_PUBLIC_N8N_INSCRIPTION_WEBHOOK=https://n8n.talosprimes.com/webhook/inscription
```

## 🧪 Test

### Test avec curl

```bash
curl -X POST "https://n8n.talosprimes.com/webhook/inscription" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Dupont",
    "prenom": "Jean",
    "telephone": "+33612345678",
    "email": "jean.dupont@example.com"
  }'
```

### Test depuis le formulaire

1. Accédez à `https://talosprimes.com/inscription`
2. Remplissez le formulaire
3. Vérifiez :
   - ✅ Email de confirmation reçu
   - ✅ SMS reçu (si Twilio configuré)
   - ✅ Email de notification équipe reçu

## 📋 Structure du workflow

```
Webhook (POST /inscription)
    ↓
Validation (Code)
    ├─ Succès → Formatage Email → Resend Email
    ├─ Succès → Formatage SMS → Twilio SMS
    ├─ Succès → Formatage Notification → Resend Notification
    └─ Erreur → Formatage Alerte → Resend Alerte
    ↓
Réponse Webhook (200 OK)
```

## 🔧 Personnalisation

### Changer l'email de notification équipe

Dans le nœud **"Formatage Notification"**, modifiez :
```javascript
to: "votre-email@talosprimes.com"
```

### Changer l'email d'alerte

Dans le nœud **"Formatage Email Alerte"**, modifiez :
```javascript
to: "votre-email@talosprimes.com"
```

### Désactiver le SMS

1. Cliquez sur le nœud **"Twilio - SMS"**
2. Désactivez-le (bouton ON/OFF)
3. Ou supprimez la connexion depuis "Formatage SMS"

## ✅ Checklist

- [ ] Workflow importé
- [ ] Credential Resend créé et configuré
- [ ] Credential Twilio créé et configuré (si SMS activé)
- [ ] Numéro Twilio configuré dans le nœud
- [ ] Workflow activé
- [ ] URL du webhook copiée
- [ ] Variable d'environnement frontend mise à jour
- [ ] Test réussi

## 🐛 Dépannage

### Erreur "access to env vars denied"

✅ **Résolu** : Le workflow n'utilise plus de variables d'environnement, tout est en dur ou via credentials.

### Erreur Resend

- Vérifiez que la credential "Resend API" est bien créée
- Vérifiez que votre API Key Resend est correcte
- Vérifiez que le domaine `talosprimes.com` est vérifié dans Resend

### Erreur Twilio

- Vérifiez que la credential "Twilio" est bien créée
- Vérifiez que le numéro Twilio est correct dans le nœud
- Vérifiez que le format du numéro est correct (ex: `+33612345678`)

### Le workflow ne répond pas

- Vérifiez que le workflow est **activé** (bouton ON)
- Vérifiez les logs d'exécution dans n8n
- Testez avec "Execute Node" sur le nœud Webhook

