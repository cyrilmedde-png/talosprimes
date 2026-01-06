# Instructions d'import du workflow "Formulaire d'inscription"

## 📥 Import du workflow dans n8n

### Méthode 1 : Import direct (Recommandé)

1. **Ouvrez n8n** : `https://n8n.talosprimes.com`
2. **Connectez-vous** avec vos identifiants
3. Cliquez sur **"Workflows"** dans le menu de gauche
4. Cliquez sur **"Import from File"** (en haut à droite)
5. Sélectionnez le fichier `workflow.json` de ce dossier
6. Le workflow sera importé avec tous les nœuds

### Méthode 2 : Création manuelle

Si l'import ne fonctionne pas, suivez ces étapes :

1. Créez un nouveau workflow dans n8n
2. Nommez-le : **"Leads - Formulaire d'inscription"**
3. Suivez la structure ci-dessous pour créer chaque nœud

## 🔧 Configuration après import

### 1. Configurer les credentials SMTP

**Important :** Vous devez créer les credentials SMTP avant d'activer le workflow.

1. Allez dans **Settings** → **Credentials**
2. Cliquez sur **"Add Credential"**
3. Recherchez **"SMTP"** et sélectionnez-le
4. Remplissez les informations :
   - **Name** : `SMTP TalosPrimes`
   - **User** : Votre email SMTP (ex: `noreply@talosprimes.com`)
   - **Password** : Votre mot de passe SMTP
   - **Host** : Votre serveur SMTP (ex: `smtp.gmail.com`, `smtp.sendgrid.net`)
   - **Port** : `587` (TLS) ou `465` (SSL)
   - **Secure** : `true` (pour TLS/SSL)

5. Cliquez sur **"Save"**

### 2. Mettre à jour les nœuds Email

1. Ouvrez le workflow importé
2. Cliquez sur le nœud **"Email - Confirmation utilisateur"**
3. Dans **"Credential to connect with"**, sélectionnez `SMTP TalosPrimes`
4. Vérifiez que :
   - **From Email** : `noreply@talosprimes.com` (ou votre email)
   - **To Email** : `{{ $json.email }}`
   - **Subject** : `Demande d'inscription TalosPrimes - Confirmation`

5. Répétez pour le nœud **"Email - Notification équipe"**
   - **To Email** : `contact@talosprimes.com` (ou votre email équipe)

### 3. Configurer les variables d'environnement (Optionnel)

Si vous utilisez des variables d'environnement :

1. Allez dans **Settings** → **Variables**
2. Ajoutez les variables suivantes :
   - `EMAIL_FROM` = `noreply@talosprimes.com`
   - `EMAIL_TO_EQUIPE` = `contact@talosprimes.com`

### 4. Vérifier l'URL du Webhook

1. Cliquez sur le nœud **"Webhook - Réception formulaire"**
2. Vérifiez que le **Path** est bien `inscription`
3. **Copiez l'URL de production** affichée :
   ```
   https://n8n.talosprimes.com/webhook/inscription
   ```

### 5. Mettre à jour le frontend

Ajoutez l'URL du webhook dans `.env.local` du frontend :

```bash
# packages/client/.env.local
NEXT_PUBLIC_N8N_INSCRIPTION_WEBHOOK=https://n8n.talosprimes.com/webhook/inscription
```

Puis redémarrez le frontend :
```bash
cd packages/client
pnpm build
pm2 restart talosprimes-client
```

## ✅ Activer le workflow

1. Dans n8n, cliquez sur le bouton **"OFF"** en haut à droite du workflow
2. Il devrait passer à **"ON"** (vert)
3. Le workflow est maintenant actif !

## 🧪 Tester le workflow

### Test 1 : Via le formulaire web

1. Accédez à `https://talosprimes.com/inscription`
2. Remplissez le formulaire avec des données de test
3. Cliquez sur "Envoyer ma demande"
4. Vous devriez voir le message de confirmation

### Test 2 : Via curl

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

### Vérifications

- ✅ L'email de confirmation a été envoyé à l'utilisateur
- ✅ L'email de notification a été envoyé à l'équipe
- ✅ La réponse HTTP est 200 OK avec le message de succès

## 🔍 Dépannage

### Les emails ne sont pas envoyés

1. Vérifiez les credentials SMTP
2. Testez la connexion SMTP dans n8n (bouton "Test")
3. Vérifiez les logs du workflow (onglet "Executions")

### Le webhook ne répond pas

1. Vérifiez que le workflow est **activé** (bouton ON)
2. Vérifiez que l'URL est correcte
3. Vérifiez les logs d'exécution dans n8n

### Erreur de validation

1. Vérifiez que tous les champs sont bien remplis dans le formulaire
2. Regardez les logs d'exécution pour voir quelle validation a échoué

## 📝 Notes importantes

- Le workflow doit être **activé** pour fonctionner
- Les credentials SMTP doivent être configurés avant l'activation
- Les emails peuvent prendre quelques secondes à être envoyés
- En cas d'erreur, consultez les logs dans l'onglet "Executions" de n8n

