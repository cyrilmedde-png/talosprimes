# Guide : Vérifier la synchronisation n8n

## 🎯 Objectif

Vérifier que les événements émis par l'application sont bien reçus et traités par n8n.

## 🚀 Test rapide

```bash
cd /var/www/talosprimes/scripts
./test-n8n-sync.sh
```

Ce script va :
1. ✅ Se connecter à l'API
2. ✅ Tester la connexion à n8n
3. ✅ Vérifier les workflows configurés
4. ✅ Créer un client de test (déclenche un événement)
5. ✅ Vous guider pour vérifier les logs

## 📋 Vérifications manuelles

### 1. Vérifier les logs du backend

```bash
pm2 logs talosprimes-platform --lines 50 | grep -i n8n
```

**Ce que vous devriez voir si tout fonctionne :**
```
[n8n] Workflow déclenché avec succès: Nom du workflow (client.created)
```

**Si vous voyez une erreur :**
```
[n8n] Erreur lors du déclenchement du workflow (client.created): Connection refused
```
→ Vérifiez que n8n est accessible et que les credentials sont corrects.

### 2. Vérifier les exécutions dans n8n

1. Allez sur https://n8n.talosprimes.com
2. Cliquez sur **"Executions"** dans le menu de gauche
3. Vous devriez voir une nouvelle exécution avec :
   - **Status** : Success (vert) ou Error (rouge)
   - **Workflow** : Le nom de votre workflow
   - **Time** : Il y a quelques secondes/minutes

**Si vous ne voyez rien :**
- Vérifiez que le workflow est **actif** (bouton "Active" en haut à droite)
- Vérifiez que le WorkflowLink existe dans la base de données

### 3. Vérifier les événements dans la base de données

```bash
cd /var/www/talosprimes/packages/platform

# Se connecter à la base de données
psql "$DATABASE_URL" -c "
  SELECT 
    id,
    type_evenement,
    statut_execution,
    workflow_n8n_declenche,
    workflow_n8n_id,
    message_erreur,
    created_at
  FROM event_logs 
  WHERE type_evenement = 'client.created' 
  ORDER BY created_at DESC 
  LIMIT 5;
"
```

**Ce que vous devriez voir :**
- `statut_execution` = `succes` → ✅ L'événement a été traité
- `workflow_n8n_declenche` = `true` → ✅ Le workflow a été déclenché
- `workflow_n8n_id` = L'ID de votre workflow n8n

**Si vous voyez :**
- `statut_execution` = `erreur` → ❌ Vérifiez `message_erreur`
- `workflow_n8n_declenche` = `false` → ❌ Aucun workflow n'a été trouvé

## 🔍 Troubleshooting

### Problème : Aucun workflow n'est déclenché

**Vérifications :**
1. ✅ Le workflow existe dans n8n et est **actif**
2. ✅ Le WorkflowLink existe dans la base de données :
   ```sql
   SELECT * FROM workflow_links 
   WHERE tenant_id = 'VOTRE_TENANT_ID' 
   AND type_evenement = 'client.created' 
   AND statut = 'actif';
   ```
3. ✅ Le `workflow_n8n_id` correspond au Workflow ID dans n8n
4. ✅ Le webhook dans n8n est configuré avec le path `/webhook/{workflow_id}`

**Solution :**
```bash
cd /var/www/talosprimes/scripts
./create-workflow-link.sh
```

### Problème : Erreur "Connection refused"

**Vérifications :**
1. ✅ n8n est accessible : `curl https://n8n.talosprimes.com/healthz`
2. ✅ Les variables dans `packages/platform/.env` :
   ```env
   N8N_API_URL="https://n8n.talosprimes.com"
   N8N_USERNAME="votre_email"
   N8N_PASSWORD="votre_mot_de_passe"
   ```
3. ✅ Redémarrer le backend après modification du `.env` :
   ```bash
   pm2 restart talosprimes-platform
   ```

### Problème : Erreur "Workflow non trouvé"

**Vérifications :**
1. ✅ Le WorkflowLink existe avec `statut = 'actif'`
2. ✅ Le `type_evenement` correspond (ex: `client.created`)
3. ✅ Le `workflow_n8n_id` correspond au Workflow ID dans n8n

**Solution :**
Vérifiez et mettez à jour le WorkflowLink :
```sql
UPDATE workflow_links
SET statut = 'actif',
    workflow_n8n_id = 'VOTRE_WORKFLOW_ID'
WHERE tenant_id = 'VOTRE_TENANT_ID'
AND type_evenement = 'client.created';
```

## 📊 Événements disponibles

Les événements suivants sont automatiquement émis :

### Clients Finaux
- `client.created` - Lors de la création d'un client
- `client.updated` - Lors de la mise à jour d'un client
- `client.deleted` - Lors de la suppression d'un client

### Format du payload envoyé à n8n

```json
{
  "event": "client.created",
  "tenantId": "uuid-du-tenant",
  "timestamp": "2026-01-15T10:30:00Z",
  "data": {
    "clientId": "uuid",
    "tenantId": "uuid",
    "type": "b2b",
    "email": "test@example.com",
    "nom": "Entreprise Test"
  },
  "metadata": {
    "workflowId": "123",
    "workflowName": "Onboarding Client",
    "module": "crm_base"
  }
}
```

## ✅ Checklist de synchronisation

- [ ] Connexion n8n testée avec succès (`./test-n8n-connection.sh`)
- [ ] Au moins un workflow configuré (`./list-workflows.sh`)
- [ ] Workflow actif dans n8n
- [ ] WorkflowLink créé dans la base de données
- [ ] Test de création de client effectué
- [ ] Logs backend montrent "Workflow déclenché avec succès"
- [ ] Exécution visible dans n8n
- [ ] Événement enregistré avec `statut_execution = 'succes'` dans la base de données

## 🎯 Test complet en une commande

```bash
cd /var/www/talosprimes/scripts
./test-n8n-sync.sh
```

Ce script fait tout automatiquement et vous guide pour les vérifications finales.

