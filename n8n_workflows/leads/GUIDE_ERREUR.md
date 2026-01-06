# Guide : Ajouter gestion d'erreur dans n8n

## 🔧 Configuration dans l'interface n8n

### 1. Activer la gestion d'erreur sur un nœud

1. Cliquez sur le nœud concerné (ex: "Code - Validation")
2. Ouvrez les **"Settings"** du nœud (icône ⚙️ en bas)
3. Cochez **"Continue On Fail"** ou sélectionnez **"Error Output"**
4. Cela permet au workflow de continuer même en cas d'erreur

### 2. Connecter le nœud d'erreur

1. Cliquez sur le nœud qui peut générer une erreur
2. Vous verrez un point de connexion **rouge** (erreur) en plus du point vert (succès)
3. Cliquez et tirez depuis le point rouge vers le nœud "Code - Formatage Alerte Erreur"
4. La connexion d'erreur est maintenant active

### 3. Ajouter les nœuds d'alerte

Les nœuds suivants ont été ajoutés au workflow :

1. **Code - Formatage Alerte Erreur** : Extrait les informations de l'erreur
2. **Code - Formatage Email Alerte** : Formate l'email d'alerte
3. **Resend - Email Alerte Erreur** : Envoie l'email d'alerte
4. **HTTP Request - Alerte Plateforme** : Envoie une alerte à l'API (optionnel)

## 📝 Code du nœud "Code - Formatage Alerte Erreur"

Copiez ce code dans le nœud :

```javascript
// Récupérer les informations de l'erreur
const error = $input.all()[0].json;
const execution = $execution;

// Extraire les données originales si disponibles
const originalData = error.json || error.body || {};

// Construire le message d'alerte
const alertMessage = {
  type: 'workflow_error',
  workflow: 'Leads - Formulaire d\'inscription',
  timestamp: new Date().toISOString(),
  executionId: execution.id,
  error: {
    message: error.message || error.error?.message || 'Erreur inconnue',
    node: error.node?.name || 'Node inconnu',
    stack: error.stack || error.error?.stack || null
  },
  data: {
    nom: originalData.nom || 'N/A',
    prenom: originalData.prenom || 'N/A',
    email: originalData.email || 'N/A',
    telephone: originalData.telephone || 'N/A'
  },
  severity: 'high',
  actionRequired: true
};

console.error('Erreur workflow:', JSON.stringify(alertMessage, null, 2));

return {
  json: alertMessage
};
```

## 🎯 Options de notification

### Option 1 : Email uniquement (Recommandé - Déjà configuré)

L'email d'alerte est automatiquement envoyé via Resend.

### Option 2 : Slack/Discord (À ajouter)

Ajoutez un nœud Slack ou Discord après "Code - Formatage Email Alerte" :

**Slack :**
1. Ajoutez un nœud **Slack**
2. Sélectionnez l'action **"Post Message"**
3. Configurez le webhook ou la credential Slack
4. Message : `🚨 Erreur workflow: {{ $json.error.message }}`

**Discord :**
1. Ajoutez un nœud **Discord Webhook**
2. Configurez le webhook URL
3. Message : `🚨 Erreur workflow: {{ $json.error.message }}`

### Option 3 : SMS d'alerte (Twilio)

Pour envoyer un SMS d'urgence :

1. Ajoutez un nœud **Twilio** après "Code - Formatage Email Alerte"
2. Configurez :
   - **To** : Numéro d'urgence (ex: `+33612345678`)
   - **Message** : `🚨 ERREUR workflow inscription - {{ $json.error.message }}`

## ✅ Vérification

1. **Testez une erreur** :
   - Envoyez un formulaire avec des champs manquants
   - L'email d'alerte devrait être envoyé

2. **Vérifiez les logs** :
   - Dans n8n, allez dans "Executions"
   - Regardez les logs de l'exécution en erreur
   - Le `console.error` devrait afficher les détails

## 🔍 Dépannage

### Les alertes ne se déclenchent pas

1. Vérifiez que la connexion d'erreur est bien créée (ligne rouge)
2. Vérifiez que "Continue On Fail" est activé sur le nœud d'erreur
3. Testez avec "Execute Node" en forçant une erreur

### Email d'alerte non reçu

1. Vérifiez les credentials Resend
2. Vérifiez l'adresse email de destination
3. Consultez les logs du workflow pour voir si l'email a été envoyé

