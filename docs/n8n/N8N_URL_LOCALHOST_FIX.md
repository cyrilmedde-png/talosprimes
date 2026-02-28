# Fix : URL toujours en localhost dans n8n

## 🔍 Problème

Même après avoir modifié les variables d'environnement Docker, l'URL de production dans n8n affiche toujours `http://localhost:5678/webhook/...` au lieu de `https://n8n.talosprimes.com/webhook/...`.

## ✅ Solution étape par étape

### Étape 1 : Vérifier que les variables sont correctes

```bash
cd /var/www/talosprimes/scripts
./verify-n8n-config.sh
```

Ce script vérifie que les variables d'environnement sont bien définies dans le conteneur Docker.

### Étape 2 : Si les variables sont incorrectes

Exécutez le script de correction :

```bash
./fix-n8n-simple.sh
```

### Étape 3 : Redémarrer complètement n8n

Même si les variables sont correctes, n8n peut avoir mis en cache l'ancienne URL.

```bash
# Redémarrer le conteneur
docker restart root-n8n-1

# Attendre 2-3 minutes
sleep 120
```

### Étape 4 : Forcer n8n à rafraîchir l'URL

Dans l'interface n8n :

1. **Désactiver le workflow** :
   - Ouvrez votre workflow
   - Cliquez sur le bouton **"Active"** en haut à droite
   - Il devient **"Inactive"**
   - Attendez 10 secondes

2. **Réactiver le workflow** :
   - Cliquez sur le bouton **"Inactive"**
   - Il redevient **"Active"**

3. **Rafraîchir la page** :
   - Appuyez sur **Ctrl+F5** (Windows/Linux) ou **Cmd+Shift+R** (Mac)
   - Ou fermez et rouvrez l'onglet

4. **Vérifier l'URL de production** :
   - Cliquez sur le nœud Webhook
   - Cliquez sur l'onglet **"Production URL"**
   - Vous devriez maintenant voir : `https://n8n.talosprimes.com/webhook/...`

### Étape 5 : Si ça ne fonctionne toujours pas

n8n peut avoir l'URL en cache dans la base de données. Essayez de :

1. **Supprimer et recréer le nœud Webhook** :
   - Supprimez le nœud Webhook existant
   - Ajoutez un nouveau nœud Webhook
   - Configurez-le avec le même path
   - Activez le workflow

2. **Vérifier les variables directement** :

```bash
# Voir toutes les variables d'environnement
docker exec root-n8n-1 env | grep N8N

# Vérifier que n8n les voit
docker exec root-n8n-1 printenv | grep N8N
```

Vous devriez voir :
```
N8N_HOST=n8n.talosprimes.com
N8N_PROTOCOL=https
N8N_PORT=443
WEBHOOK_URL=https://n8n.talosprimes.com/
```

## 🔍 Vérification approfondie

### Vérifier que n8n utilise bien les variables

```bash
# Se connecter au conteneur
docker exec -it root-n8n-1 sh

# Vérifier les variables
printenv | grep N8N

# Vérifier les logs de démarrage
tail -f /home/node/.n8n/logs/n8n.log
```

### Vérifier les logs du conteneur

```bash
docker logs root-n8n-1 --tail 100 | grep -i host
docker logs root-n8n-1 --tail 100 | grep -i webhook
```

## 🐛 Si rien ne fonctionne

Si après toutes ces étapes, l'URL est toujours en localhost :

1. **Vérifier que Nginx route correctement** :
   ```bash
   curl -I https://n8n.talosprimes.com/healthz
   ```

2. **Vérifier les logs n8n** :
   ```bash
   docker logs root-n8n-1 --tail 200
   ```

3. **Recréer complètement le conteneur** :
   ```bash
   # Sauvegarder les données
   docker run --rm -v root_n8n_data:/data -v $(pwd):/backup alpine tar czf /backup/n8n-backup.tar.gz /data
   
   # Supprimer et recréer
   docker stop root-n8n-1
   docker rm root-n8n-1
   docker volume rm root_n8n_data  # ATTENTION : supprime les données !
   
   # Recréer avec les bonnes variables
   docker run -d \
     --name root-n8n-1 \
     -p 5678:5678 \
     -v root_n8n_data:/home/node/.n8n \
     -e N8N_HOST=n8n.talosprimes.com \
     -e N8N_PROTOCOL=https \
     -e N8N_PORT=443 \
     -e WEBHOOK_URL=https://n8n.talosprimes.com/ \
     --restart unless-stopped \
     docker.n8n.io/n8nio/n8n
   ```

## 💡 Note importante

n8n peut mettre quelques minutes à prendre en compte les nouvelles variables d'environnement. **Attendez toujours 2-3 minutes** après avoir modifié les variables et redémarré le conteneur.

## ✅ Checklist

- [ ] Variables d'environnement vérifiées avec `./verify-n8n-config.sh`
- [ ] Conteneur redémarré avec `docker restart root-n8n-1`
- [ ] Attendu 2-3 minutes
- [ ] Workflow désactivé puis réactivé dans n8n
- [ ] Page rafraîchie avec Ctrl+F5
- [ ] URL de production vérifiée : doit être `https://n8n.talosprimes.com/webhook/...`

