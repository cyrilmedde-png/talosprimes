# Scripts de Configuration TalosPrimes

## 📋 Scripts disponibles

### 1. `configure-nginx.sh` - Configuration Nginx

Configure automatiquement Nginx pour le frontend et le backend.

**Usage :**
```bash
cd /var/www/talosprimes/scripts
sudo ./configure-nginx.sh
```

**Ce que fait le script :**
- Crée les configurations Nginx pour le frontend et le backend
- Propose deux options :
  1. **Configuration séparée** : `talosprimes.com` (frontend) + `api.talosprimes.com` (backend)
  2. **Configuration combinée** : `talosprimes.com` (frontend) + `talosprimes.com/api` (backend)
- Active les configurations
- Teste la configuration
- Redémarre Nginx

**Prérequis :**
- Nginx installé
- Services PM2 démarrés (frontend sur port 3000, backend sur port 3001)

### 2. `configure-ssl.sh` - Configuration SSL avec Let's Encrypt

Configure automatiquement les certificats SSL pour votre domaine.

**Usage :**
```bash
cd /var/www/talosprimes/scripts
sudo ./configure-ssl.sh
```

**Ce que fait le script :**
- Installe Certbot si nécessaire
- Génère les certificats SSL pour votre domaine
- Configure le renouvellement automatique
- Teste le renouvellement

**Prérequis :**
- Nginx configuré et fonctionnel
- DNS pointant vers votre serveur
- Ports 80 et 443 ouverts

### 3. `test-n8n.sh` - Test de la configuration n8n

Teste la connexion à n8n et vérifie que les workflows sont correctement configurés.

**Usage :**
```bash
cd /var/www/talosprimes/scripts
./test-n8n.sh YOUR_JWT_TOKEN
```

**Ce que fait le script :**
- Teste la connexion à n8n via l'API
- Liste les workflows configurés
- Crée un client de test pour déclencher un workflow

**Prérequis :**
- Backend démarré et accessible
- Token JWT valide (obtenu via `/api/auth/login`)
- Variables d'environnement n8n configurées dans `packages/platform/.env`

**Exemple complet :**
```bash
# 1. Obtenir un token
TOKEN=$(curl -s -X POST https://api.talosprimes.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"groupemclem@gmail.com","password":"21052024_Aa!"}' \
  | jq -r '.data.accessToken')

# 2. Tester n8n
cd /var/www/talosprimes/scripts
./test-n8n.sh $TOKEN
```

## 🚀 Installation complète (étape par étape)

### Étape 1 : Installer Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

### Étape 2 : Configurer Nginx

```bash
cd /var/www/talosprimes
git pull origin main
cd scripts
sudo ./configure-nginx.sh
```

### Étape 3 : Configurer les DNS

Dans votre fournisseur de domaine, créez les enregistrements DNS :

**Option 1 : Avec sous-domaine API**
```
Type    Name    Value              TTL
A       @       IP_DU_SERVEUR      3600
A       www     IP_DU_SERVEUR      3600
A       api     IP_DU_SERVEUR      3600
```

**Option 2 : Sans sous-domaine (même domaine)**
```
Type    Name    Value              TTL
A       @       IP_DU_SERVEUR      3600
A       www     IP_DU_SERVEUR      3600
```

### Étape 4 : Attendre la propagation DNS

Vérifiez que les DNS sont propagés :
```bash
nslookup talosprimes.com
nslookup api.talosprimes.com  # Si vous utilisez un sous-domaine
```

### Étape 5 : Configurer SSL

```bash
cd /var/www/talosprimes/scripts
sudo ./configure-ssl.sh
```

### Étape 6 : Mettre à jour les variables d'environnement

**Backend** (`/var/www/talosprimes/packages/platform/.env`) :
```env
CORS_ORIGIN="https://talosprimes.com"
```

**Frontend** (`/var/www/talosprimes/packages/client/.env.local`) :
```env
# Si sous-domaine API
NEXT_PUBLIC_API_URL="https://api.talosprimes.com"

# Si même domaine
NEXT_PUBLIC_API_URL="https://talosprimes.com/api"
```

Puis rebuild le frontend :
```bash
cd /var/www/talosprimes/packages/client
pnpm build
pm2 restart talosprimes-client
```

## 🔧 Dépannage

### Nginx ne démarre pas

```bash
# Vérifier la configuration
sudo nginx -t

# Voir les erreurs
sudo tail -f /var/log/nginx/error.log
```

### Certbot échoue

```bash
# Vérifier que les DNS pointent vers le serveur
nslookup talosprimes.com

# Vérifier que les ports 80 et 443 sont ouverts
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Réessayer
sudo certbot --nginx -d talosprimes.com
```

### Les services ne répondent pas

```bash
# Vérifier que les services tournent
pm2 list

# Vérifier les logs
pm2 logs

# Vérifier que les ports sont ouverts localement
sudo netstat -tlnp | grep -E '3000|3001'
```

### 4. Scripts de test n8n

Une suite complète de scripts pour tester et configurer l'intégration n8n.

**Scripts disponibles :**
- `get-token.sh` - Obtenir un token JWT automatiquement
- `test-n8n-connection.sh` - Tester la connexion à n8n
- `list-workflows.sh` - Lister les workflows configurés
- `create-workflow-link-prisma.sh` - Créer un WorkflowLink dans la base de données (utilise Prisma)
- `test-workflow-trigger.sh` - Tester le déclenchement d'un workflow
- `test-n8n-sync.sh` - Test complet de synchronisation
- `n8n-test-all.sh` - Test complet en une commande
- `diagnostic-n8n.sh` - Diagnostic de la configuration n8n
- `fix-n8n-complete.sh` - **Script automatique pour corriger tous les problèmes n8n Docker**

**Usage rapide :**
```bash
cd /var/www/talosprimes/scripts
./n8n-test-all.sh
```

**Fix automatique n8n (si URL en localhost) :**
```bash
cd /var/www/talosprimes/scripts
./fix-n8n-complete.sh
```

> 📚 Voir [README_N8N.md](./README_N8N.md) pour la documentation complète

## 📝 Notes importantes

- Les scripts doivent être exécutés avec `sudo` (sauf les scripts n8n)
- Assurez-vous que les DNS sont configurés avant de lancer `configure-ssl.sh`
- Après configuration SSL, mettez à jour les variables d'environnement pour utiliser HTTPS
- Les certificats SSL sont valides pour 90 jours et se renouvellent automatiquement

