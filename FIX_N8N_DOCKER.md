# Fix : Configuration n8n dans Docker

## 🔍 Problème identifié

n8n est dans un conteneur Docker (`root-n8n-1`) et les variables d'environnement du conteneur sont :
- `N8N_PORT=5678` ❌
- `N8N_PROTOCOL=http` ❌

Ces variables écrasent le fichier `.env` que vous avez modifié.

## ✅ Solution : Modifier la configuration Docker

### Option 1 : Si vous utilisez docker-compose

1. Trouvez le fichier `docker-compose.yml` :

```bash
find /root /home /var/www -name "docker-compose.yml" -o -name "docker-compose.yaml" 2>/dev/null
```

2. Modifiez le fichier pour ajouter les variables d'environnement :

```yaml
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    environment:
      - N8N_HOST=n8n.talosprimes.com
      - N8N_PROTOCOL=https
      - N8N_PORT=443
      - WEBHOOK_URL=https://n8n.talosprimes.com/
      - N8N_METRICS=true
    ports:
      - "5678:5678"  # Gardez ce port pour l'accès interne
    # ... autres configurations
```

3. Redémarrez le conteneur :

```bash
docker-compose down
docker-compose up -d
```

### Option 2 : Si vous utilisez docker run

1. Trouvez la commande docker run actuelle :

```bash
docker inspect root-n8n-1 | grep -A 10 "Args"
```

2. Arrêtez et supprimez le conteneur actuel :

```bash
docker stop root-n8n-1
docker rm root-n8n-1
```

3. Recréez le conteneur avec les bonnes variables :

```bash
docker run -d \
  --name root-n8n-1 \
  -p 5678:5678 \
  -e N8N_HOST=n8n.talosprimes.com \
  -e N8N_PROTOCOL=https \
  -e N8N_PORT=443 \
  -e WEBHOOK_URL=https://n8n.talosprimes.com/ \
  -e N8N_METRICS=true \
  docker.n8n.io/n8nio/n8n
```

### Option 3 : Modifier le conteneur en cours (temporaire)

Si vous ne pouvez pas recréer le conteneur maintenant, vous pouvez modifier les variables directement :

```bash
# Arrêter le conteneur
docker stop root-n8n-1

# Modifier les variables d'environnement
docker commit root-n8n-1 n8n-temp

# Recréer avec les nouvelles variables
docker rm root-n8n-1
docker run -d \
  --name root-n8n-1 \
  -p 5678:5678 \
  -e N8N_HOST=n8n.talosprimes.com \
  -e N8N_PROTOCOL=https \
  -e N8N_PORT=443 \
  -e WEBHOOK_URL=https://n8n.talosprimes.com/ \
  -e N8N_METRICS=true \
  n8n-temp
```

## 🔍 Trouver la configuration Docker

Pour trouver comment n8n a été lancé :

```bash
# Voir les détails du conteneur
docker inspect root-n8n-1

# Voir la commande complète
docker inspect root-n8n-1 | grep -A 20 "Env"

# Chercher docker-compose
find /root /home /var/www -name "*docker-compose*" 2>/dev/null
```

## ✅ Vérifier après modification

1. Vérifiez les nouvelles variables :

```bash
docker inspect root-n8n-1 | grep -A 10 "Env"
```

Vous devriez voir :
- `N8N_HOST=n8n.talosprimes.com`
- `N8N_PROTOCOL=https`
- `N8N_PORT=443`
- `WEBHOOK_URL=https://n8n.talosprimes.com/`

2. Vérifiez dans n8n :
   - Allez sur https://n8n.talosprimes.com
   - Ouvrez votre workflow
   - Cliquez sur le nœud Webhook
   - Cliquez sur "Production URL"
   - Vous devriez voir : `https://n8n.talosprimes.com/webhook/123`

## 📝 Note importante

Si n8n est derrière un reverse proxy (Nginx) qui gère HTTPS, vous pouvez aussi :
- Garder `N8N_PROTOCOL=http` et `N8N_PORT=5678` dans le conteneur
- Mais définir `N8N_HOST=n8n.talosprimes.com` et `WEBHOOK_URL=https://n8n.talosprimes.com/`

Cela fonctionnera car Nginx gère HTTPS et transmet en HTTP à n8n.

## 🐛 Si ça ne fonctionne toujours pas

1. Vérifiez que le conteneur a bien redémarré :
   ```bash
   docker ps | grep n8n
   docker logs root-n8n-1 --tail 50
   ```

2. Vérifiez que Nginx route correctement vers n8n :
   ```bash
   cat /etc/nginx/sites-enabled/* | grep -A 10 n8n
   ```

3. Testez l'URL directement :
   ```bash
   curl -X POST https://n8n.talosprimes.com/webhook/123 \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

