# Fix : URL de production n8n en localhost

## 🔍 Problème

L'URL de production du webhook dans n8n affiche `http://localhost:5678/webhook/123` au lieu de `https://n8n.talosprimes.com/webhook/123`.

## ✅ Solution

Il faut configurer les variables d'environnement de n8n pour qu'il utilise le bon domaine.

## 📋 Configuration n8n

Sur votre VPS, trouvez où n8n est configuré (fichier `.env` de n8n ou variables d'environnement).

### Option 1 : Si n8n utilise un fichier .env

Trouvez le fichier `.env` de n8n (généralement dans `/root/.n8n/.env` ou `/var/www/n8n/.env`).

Ajoutez ou modifiez ces variables :

```env
# URL publique de n8n (sans le port)
N8N_HOST=n8n.talosprimes.com

# Protocole (https en production)
N8N_PROTOCOL=https

# Port (optionnel, 443 pour HTTPS par défaut)
N8N_PORT=443

# URL complète du webhook (optionnel, mais recommandé)
WEBHOOK_URL=https://n8n.talosprimes.com/
```

### Option 2 : Si n8n est géré par PM2

Vérifiez la configuration PM2 de n8n :

```bash
pm2 show n8n
```

Ou éditez le fichier de configuration PM2 et ajoutez les variables d'environnement :

```json
{
  "apps": [{
    "name": "n8n",
    "script": "n8n",
    "env": {
      "N8N_HOST": "n8n.talosprimes.com",
      "N8N_PROTOCOL": "https",
      "N8N_PORT": "443",
      "WEBHOOK_URL": "https://n8n.talosprimes.com/"
    }
  }]
}
```

### Option 3 : Si n8n est dans un conteneur Docker

Si n8n tourne dans Docker, ajoutez les variables dans le `docker-compose.yml` ou la commande `docker run` :

```yaml
environment:
  - N8N_HOST=n8n.talosprimes.com
  - N8N_PROTOCOL=https
  - N8N_PORT=443
  - WEBHOOK_URL=https://n8n.talosprimes.com/
```

## 🔄 Redémarrer n8n

Après avoir modifié la configuration, redémarrez n8n :

```bash
# Si PM2
pm2 restart n8n

# Si Docker
docker-compose restart n8n
# ou
docker restart n8n

# Si service systemd
sudo systemctl restart n8n
```

## ✅ Vérifier

1. Allez sur https://n8n.talosprimes.com
2. Ouvrez votre workflow
3. Cliquez sur le nœud Webhook
4. Cliquez sur l'onglet **"Production URL"**
5. Vous devriez maintenant voir : `https://n8n.talosprimes.com/webhook/123`

## 🧪 Tester

Testez l'URL de production :

```bash
curl -X POST https://n8n.talosprimes.com/webhook/123 \
  -H "Content-Type: application/json" \
  -d '{
    "event": "client.created",
    "tenantId": "00000000-0000-0000-0000-000000000001",
    "data": {"test": "data"}
  }'
```

Si vous recevez une réponse, c'est que ça fonctionne !

## 🔍 Trouver où n8n est configuré

Si vous ne savez pas où n8n est configuré, cherchez :

```bash
# Chercher le processus n8n
ps aux | grep n8n

# Chercher les fichiers de configuration
find / -name ".n8n" -type d 2>/dev/null
find / -name "n8n.env" 2>/dev/null

# Chercher dans les variables d'environnement
pm2 env n8n
```

## 📝 Variables d'environnement importantes

- `N8N_HOST` : Le domaine (sans http:// ou https://)
- `N8N_PROTOCOL` : `https` en production
- `N8N_PORT` : `443` pour HTTPS (ou laissez vide)
- `WEBHOOK_URL` : URL complète (optionnel mais recommandé)

## ⚠️ Important

- N'utilisez **pas** `http://` ou `https://` dans `N8N_HOST`
- Utilisez seulement le domaine : `n8n.talosprimes.com`
- Le protocole est défini séparément avec `N8N_PROTOCOL`

