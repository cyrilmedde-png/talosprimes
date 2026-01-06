# Correction : Erreur "Failed to fetch"

## 🔍 Problème

Le frontend ne peut pas communiquer avec le backend API. Cela peut être dû à :

1. **Variable d'environnement manquante** : `NEXT_PUBLIC_API_URL` n'est pas configurée
2. **CORS mal configuré** : Le backend n'autorise pas les requêtes depuis le domaine frontend
3. **Backend non accessible** : Le backend n'est pas accessible depuis l'extérieur (pas de reverse proxy)

## ✅ Solutions

### 1. Vérifier et configurer NEXT_PUBLIC_API_URL

Sur le VPS, créer/modifier le fichier `.env.local` dans le dossier client :

```bash
cd /var/www/talosprimes/packages/client
nano .env.local
```

Contenu :
```env
NEXT_PUBLIC_API_URL=https://api.talosprimes.com
```

**⚠️ Important :** 
- Utilisez `https://` (pas `http://`)
- Utilisez le domaine complet de votre backend API
- Si vous n'avez pas de sous-domaine `api`, utilisez le même domaine : `https://talosprimes.com:3001` (mais mieux vaut configurer un reverse proxy)

### 2. Rebuild le frontend après modification

```bash
cd /var/www/talosprimes/packages/client
pnpm build
pm2 restart talosprimes-client
```

### 3. Vérifier la configuration CORS du backend

Vérifier le fichier `.env` du backend :

```bash
cd /var/www/talosprimes/packages/platform
cat .env | grep CORS
```

Doit contenir :
```env
CORS_ORIGIN=https://talosprimes.com
```

Si ce n'est pas le cas, modifier :
```bash
nano .env
```

Ajouter ou modifier :
```env
CORS_ORIGIN=https://talosprimes.com
```

Puis redémarrer le backend :
```bash
pm2 restart talosprimes-api
```

### 4. Configurer Nginx comme reverse proxy (Recommandé)

Si vous n'avez pas encore configuré Nginx, créez un fichier de configuration :

```bash
sudo nano /etc/nginx/sites-available/talosprimes
```

Contenu pour le backend API :
```nginx
server {
    listen 80;
    server_name api.talosprimes.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Contenu pour le frontend :
```nginx
server {
    listen 80;
    server_name talosprimes.com www.talosprimes.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activer la configuration :
```bash
sudo ln -s /etc/nginx/sites-available/talosprimes /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Configuration SSL avec Let's Encrypt (HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d talosprimes.com -d www.talosprimes.com -d api.talosprimes.com
```

## 🔧 Vérification rapide

### Tester le backend directement

```bash
# Depuis le VPS
curl http://localhost:3001/health

# Depuis l'extérieur (remplacez par votre IP ou domaine)
curl https://api.talosprimes.com/health
```

### Tester depuis le navigateur

Ouvrez la console du navigateur (F12) et vérifiez :
- L'URL utilisée pour les requêtes API
- Les erreurs CORS éventuelles
- Les erreurs réseau

## 📋 Checklist

- [ ] `.env.local` créé dans `packages/client/` avec `NEXT_PUBLIC_API_URL`
- [ ] Frontend rebuild après modification
- [ ] `CORS_ORIGIN` configuré dans le backend `.env`
- [ ] Backend redémarré
- [ ] Nginx configuré (si utilisé)
- [ ] SSL/HTTPS configuré (recommandé)

