# Fix : Remplacer les nœuds Resend par HTTP Request

## Problème

Le nœud `n8n-nodes-base.resend` n'est pas reconnu dans votre instance n8n. L'erreur affichée est :
```
Unrecognized node type: n8n-nodes-base.resend
```

## Solution

Remplacer tous les nœuds Resend par des nœuds **HTTP Request** qui appellent directement l'API Resend.

## Configuration de l'API Resend via HTTP Request

### 1. URL
```
https://api.resend.com/emails
```

### 2. Méthode
```
POST
```

### 3. Headers
```
Content-Type: application/json
Authorization: Bearer re_... (votre clé API Resend)
```

### 4. Body (JSON)
```json
{
  "from": "TalosPrimes <contact@talosprimes.com>",
  "to": ["email@example.com"],
  "subject": "Sujet de l'email",
  "html": "<html>...</html>",
  "text": "Version texte"
}
```

## Credential à créer dans n8n

1. Aller dans **Credentials** → **Add Credential**
2. Sélectionner **Header Auth**
3. Configurer :
   - **Name** : `Authorization`
   - **Value** : `Bearer re_...` (avec "Bearer" + espace + votre clé API Resend)

## Exemple de nœud HTTP Request pour Resend

Dans n8n, créer un nœud **HTTP Request** avec :
- **Method** : `POST`
- **URL** : `https://api.resend.com/emails`
- **Authentication** : `Header Auth` (utiliser le credential créé ci-dessus)
- **Send Body** : `Yes`
- **Body Content Type** : `JSON`
- **JSON Body** :
```json
{
  "from": "TalosPrimes <contact@talosprimes.com>",
  "to": ["{{ $json.email }}"],
  "subject": "{{ $json.subject }}",
  "html": "{{ $json.html }}",
  "text": "{{ $json.text }}"
}
```

## Workflows mis à jour

Les workflows suivants ont été mis à jour pour utiliser HTTP Request au lieu de Resend :
- `lead-questionnaire.json`
- `lead-entretien.json`
- `lead-confirmation.json`

Réimporter ces workflows dans n8n après la mise à jour.

