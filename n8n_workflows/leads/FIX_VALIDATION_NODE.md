# Fix : Node Code - Validation

## 🐛 Problème identifié

Le nœud "Code - Validation" ne reconnaît pas les champs car les données du webhook n8n peuvent être structurées différemment selon la version de n8n.

## ✅ Solution

Le code de validation a été corrigé pour :
1. Extraire les données depuis plusieurs emplacements possibles (`body`, `json`, ou directement)
2. Normaliser les noms de champs
3. Gérer les espaces avec `trim()`
4. Ajouter des logs pour le débogage

## 🔧 Code corrigé

Le code mis à jour gère ces cas :
- Données dans `$json.body`
- Données dans `$json.json`
- Données directement dans `$json`
- Champs avec ou sans espaces

## 📝 Instructions de mise à jour dans n8n

### Option 1 : Remplacer le code dans le nœud existant

1. Ouvrez votre workflow dans n8n
2. Cliquez sur le nœud **"Code - Validation"**
3. Remplacez tout le code JavaScript par le nouveau code ci-dessous
4. Cliquez sur **"Execute Node"** pour tester

### Option 2 : Réimporter le workflow

1. Exportez votre workflow actuel (backup)
2. Réimportez le fichier `workflow-resend-twilio.json` mis à jour
3. Reconfigurez les credentials Resend et Twilio

## 🔍 Code JavaScript corrigé

Copiez-collez ce code dans le nœud "Code - Validation" :

```javascript
// Validation des données reçues
// Les données du webhook peuvent être dans $json directement ou dans body
const inputData = $input.all()[0].json;

// Extraire les données (peuvent être dans body, query, ou directement)
const data = inputData.body || inputData.json || inputData;

console.log('Données reçues:', JSON.stringify(data, null, 2));

const errors = [];

// Normaliser les champs (gérer les variantes)
const nom = data.nom || data['nom'] || '';
const prenom = data.prenom || data['prenom'] || '';
const telephone = data.telephone || data['telephone'] || '';
const email = data.email || data['email'] || '';

// Validation du nom
if (!nom || typeof nom !== 'string' || !nom.trim()) {
  errors.push('Le nom est requis');
}

// Validation du prénom
if (!prenom || typeof prenom !== 'string' || !prenom.trim()) {
  errors.push('Le prénom est requis');
}

// Validation du téléphone
if (!telephone || typeof telephone !== 'string' || !telephone.trim()) {
  errors.push('Le téléphone est requis');
} else if (!/^[0-9+\s\-()]+$/.test(telephone.trim())) {
  errors.push('Format de téléphone invalide');
}

// Validation de l'email
if (!email || typeof email !== 'string' || !email.trim()) {
  errors.push('L\'email est requis');
} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
  errors.push('Format d\'email invalide');
}

if (errors.length > 0) {
  console.error('Erreurs de validation:', errors);
  throw new Error(`Validation échouée: ${errors.join(', ')}`);
}

// Retourner les données validées et normalisées
return {
  json: {
    nom: nom.trim(),
    prenom: prenom.trim(),
    telephone: telephone.trim(),
    email: email.trim(),
    timestamp: data.timestamp || new Date().toISOString(),
    validated: true,
    dateReception: new Date().toISOString()
  }
};
```

## 🧪 Test

Après avoir mis à jour le code :

1. **Testez le nœud** : Cliquez sur "Execute Node" dans le nœud Code
2. **Testez avec le formulaire** : Envoyez le formulaire depuis le frontend
3. **Vérifiez les logs** : Regardez les logs d'exécution dans n8n pour voir les données reçues

## 📊 Débogage

Si ça ne fonctionne toujours pas :

1. **Vérifiez les logs** dans l'exécution du workflow
2. Le `console.log` affichera les données exactes reçues
3. Adaptez le code selon la structure visible dans les logs

