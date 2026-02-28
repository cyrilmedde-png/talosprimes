# Configuration des Credentials n8n pour les Workflows Clients

## 🔐 Credential "TalosPrimes API Auth"

Tous les workflows clients qui appellent l'API TalosPrimes nécessitent le credential **"TalosPrimes API Auth"**.

### Configuration du Credential

1. Dans n8n, aller dans **Credentials** (icône en bas à gauche)
2. Cliquer sur **"New"** ou chercher **"TalosPrimes API Auth"** s'il existe déjà
3. Sélectionner le type : **"Header Auth"**
4. Remplir les champs :
   - **Name** : `TalosPrimes API Auth`
   - **Header Name** : `X-TalosPrimes-N8N-Secret`
   - **Header Value** : Le secret défini dans votre fichier `.env` du backend (`N8N_WEBHOOK_SECRET`)

### Récupérer le secret

Le secret se trouve dans le fichier `.env` du backend :
```bash
cd /var/www/talosprimes/packages/platform
cat .env | grep N8N_WEBHOOK_SECRET
```

### Vérification

Une fois le credential créé, il doit apparaître dans la liste des credentials disponibles. Il sera automatiquement utilisé par les workflows clients qui ont :
```json
"credentials": {
  "httpHeaderAuth": {
    "name": "TalosPrimes API Auth"
  }
}
```

### Workflows concernés

Les workflows suivants nécessitent ce credential :
- ✅ `client-create-from-lead` : nœud "API TalosPrimes - Create Client"
- ✅ `client-create` : nœud "API TalosPrimes - Create Client"
- ✅ `client-update` : nœud "API TalosPrimes - Update Client"
- ✅ `client-delete` : nœud "API TalosPrimes - Delete Client"

**Note** : Le workflow `client-create-from-lead` utilise aussi ce credential pour le nœud "API TalosPrimes - Get Lead" qui appelle `/api/leads/:id`.

## ✅ Vérifier que le credential est bien assigné

1. Ouvrir un workflow client dans n8n
2. Cliquer sur le nœud "API TalosPrimes - Create Client" (ou autre)
3. Dans l'onglet "Parameters", vérifier que **Authentication** est sur "Header Auth"
4. Vérifier que **Header Auth** affiche "TalosPrimes API Auth"

Si le credential n'apparaît pas :
- Créer le credential comme décrit ci-dessus
- Sauvegarder le workflow
- Réactiver le workflow

