# Configuration des alertes d'erreur

Ce workflow envoie automatiquement des notifications en cas d'erreur dans le traitement du formulaire d'inscription.

## 📋 Types d'alertes

### 1. Email d'alerte (Resend)

En cas d'erreur, un email est automatiquement envoyé à l'équipe avec :
- Détails de l'erreur
- Informations du lead concerné
- Stack trace (si disponible)
- Execution ID pour le débogage

### 2. Alerte sur la plateforme (API - Optionnel)

Si vous avez créé une route API pour les alertes, le workflow envoie aussi une notification à votre plateforme.

## ⚙️ Configuration

### Email d'alerte (Automatique)

Aucune configuration supplémentaire nécessaire. L'email est envoyé à :
- `EMAIL_TO_EQUIPE` (variable d'environnement) ou
- `contact@talosprimes.com` par défaut

### Alerte sur la plateforme (Optionnel)

Pour activer les alertes sur votre plateforme :

1. **Créer une route API** dans votre backend :
   ```
   POST /api/alerts
   ```

2. **Créer une credential dans n8n** :
   - Settings → Credentials → Add Credential
   - Type : **Header Auth**
   - Name : `TalosPrimes API`
   - Header Name : `Authorization`
   - Header Value : `Bearer VOTRE_API_KEY`

3. **Mettre à jour le nœud** "HTTP Request - Alerte Plateforme" :
   - Dans le workflow, cliquez sur ce nœud
   - Sélectionnez la credential `TalosPrimes API`
   - Vérifiez l'URL : `https://api.talosprimes.com/api/alerts`

4. **Définir la variable d'environnement** (optionnel) :
   ```env
   API_URL=https://api.talosprimes.com
   ```

## 🔄 Fonctionnement

### Déclenchement des alertes

Les alertes se déclenchent automatiquement si :
- Une erreur se produit dans le nœud "Code - Validation"
- Une erreur se produit dans n'importe quel nœud du workflow (si configuré)

### Données envoyées

L'alerte contient :
```json
{
  "type": "workflow_error",
  "workflow": "Leads - Formulaire d'inscription",
  "timestamp": "2026-01-07T00:00:00.000Z",
  "executionId": "123",
  "error": {
    "message": "Validation échouée: Le nom est requis",
    "node": "Code - Validation",
    "stack": "..."
  },
  "data": {
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean@example.com",
    "telephone": "+33 6 12 34 56 78"
  },
  "severity": "high",
  "actionRequired": true
}
```

## 📧 Exemple d'email d'alerte

L'email contient :
- Header rouge avec "⚠️ ALERTE - Erreur Workflow"
- Détails de l'erreur (message, nœud concerné)
- Informations du lead
- Détails techniques (Execution ID, date, sévérité)
- Stack trace (si disponible)

## 🔧 Désactiver les alertes

Pour désactiver temporairement les alertes :

1. Dans le workflow, sélectionnez les nœuds d'alerte
2. Désactivez-les (bouton ON/OFF)
3. Ou supprimez les connexions d'erreur

## ✅ Test

Pour tester les alertes :

1. **Provoquer une erreur** :
   - Envoyez un formulaire avec des données invalides
   - Ou désactivez temporairement Resend/Twilio

2. **Vérifier l'email d'alerte** :
   - L'email devrait arriver dans la boîte de l'équipe
   - Vérifiez les logs du workflow dans n8n

3. **Vérifier l'alerte plateforme** (si configuré) :
   - Vérifiez les logs de l'API backend
   - Consultez la base de données si vous stockez les alertes

## 📝 Route API recommandée (Backend)

Si vous voulez créer une route pour recevoir les alertes :

```typescript
// packages/platform/src/api/routes/alerts.routes.ts
fastify.post('/api/alerts', async (request, reply) => {
  const alert = request.body;
  
  // Logger l'alerte
  console.error('🚨 ALERTE WORKFLOW:', alert);
  
  // Optionnel : sauvegarder en base de données
  // await prisma.alert.create({ data: alert });
  
  // Optionnel : envoyer une notification interne
  
  return { success: true, message: 'Alerte reçue' };
});
```

Puis protégez la route avec une API key ou une authentification.

