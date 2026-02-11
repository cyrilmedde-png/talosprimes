# Commandes VPS : workflow "Lead en abandonné après suppression client"

À exécuter sur le VPS après avoir récupéré le code (git pull).

**Comportement :** Quand vous supprimez un client, le lead (même email) est passé en statut **abandonné** et réapparaît dans les leads (filtre « abandonnés »). Pour supprimer définitivement le lead à la place, modifiez dans n8n le nœud « PATCH lead statut abandonné » en un nœud **DELETE** vers `https://api.talosprimes.com/api/leads/{{ $json.leadId }}`.

## 1. Récupérer le code

```bash
cd /var/www/talosprimes
git pull origin main
```

## 2. Créer le WorkflowLink en base (client.deleted → client-deleted-cleanup-lead)

```bash
cd /var/www/talosprimes/packages/platform
pnpm workflow:setup-clients
```

Cela crée ou met à jour le WorkflowLink pour l’événement **client.deleted** (path webhook : `client-deleted-cleanup-lead`).

## 3. Importer et activer le workflow dans n8n

1. Ouvrir **https://n8n.talosprimes.com**
2. **Workflows** → **Import from File**
3. Choisir le fichier :  
   `n8n_workflows/clients/client-deleted-cleanup-lead.json`  
   (depuis le repo cloné sur le VPS : `/var/www/talosprimes/n8n_workflows/clients/client-deleted-cleanup-lead.json`)
4. Dans le workflow importé :
   - Vérifier que le nœud **Webhook** a le path **client-deleted-cleanup-lead** et **Authentication = None**
   - Sur les nœuds **HTTP Request**, assigner le credential **TalosPrimes API Auth** (si demandé / si l’import a mis un placeholder)
5. **Activer** le workflow (toggle en haut à droite)

## 4. (Optionnel) Redémarrer l’API

```bash
pm2 restart talosprimes-api
```

## Vérification

- Supprimer un client dans l’app (qui avait été créé depuis un lead).
- Le lead correspondant (même email, statut converti) ne doit plus réapparaître dans le tunnel entre leads et clients.
