# Fix : Port n8n pour HTTPS

## 🔍 Problème

Dans votre fichier `.env` de n8n, vous avez :
```env
N8N_PORT=5678
```

Le port 5678 est le port HTTP par défaut de n8n. Pour HTTPS en production, il faut utiliser le port 443 ou ne pas définir le port (n8n utilisera 443 par défaut).

## ✅ Solution

### Option 1 : Utiliser le port 443 (recommandé)

Modifiez votre fichier `.env` :

```env
N8N_HOST=n8n.talosprimes.com
N8N_PORT=443
N8N_PROTOCOL=https
WEBHOOK_URL=https://n8n.talosprimes.com/
N8N_METRICS=true
```

### Option 2 : Supprimer N8N_PORT (encore mieux)

Si n8n est derrière un reverse proxy (Nginx) qui gère HTTPS, vous pouvez supprimer complètement `N8N_PORT` :

```env
N8N_HOST=n8n.talosprimes.com
N8N_PROTOCOL=https
WEBHOOK_URL=https://n8n.talosprimes.com/
N8N_METRICS=true
```

## 🔄 Redémarrer n8n

Après avoir modifié le fichier `.env`, redémarrez n8n :

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
5. Vous devriez maintenant voir : `https://n8n.talosprimes.com/webhook/123` (sans localhost)

## 🐛 Si ça ne fonctionne toujours pas

Si après le redémarrage, l'URL est toujours en localhost, vérifiez :

1. **Que n8n lit bien le fichier .env** :
   ```bash
   # Vérifier où n8n cherche le .env
   pm2 show n8n | grep -i env
   ```

2. **Que les variables sont bien chargées** :
   ```bash
   # Voir les variables d'environnement de n8n
   pm2 env n8n
   ```

3. **Forcer le rechargement** :
   ```bash
   pm2 delete n8n
   pm2 start n8n
   ```

## 📝 Configuration complète recommandée

Voici une configuration `.env` complète pour n8n en production :

```env
# Domaine
N8N_HOST=n8n.talosprimes.com
N8N_PROTOCOL=https

# Port (443 pour HTTPS, ou laissez vide si derrière reverse proxy)
# N8N_PORT=443

# URL complète du webhook
WEBHOOK_URL=https://n8n.talosprimes.com/

# Métriques (optionnel)
N8N_METRICS=true

# Sécurité (recommandé)
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=votre_email
N8N_BASIC_AUTH_PASSWORD=votre_mot_de_passe

# Base de données (si vous utilisez une DB externe)
# N8N_DATABASE_TYPE=postgresdb
# N8N_DATABASE_POSTGRESDB_HOST=...
```

