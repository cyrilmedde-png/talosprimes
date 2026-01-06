# Correction : Port 3000 déjà utilisé

## 🔍 Problème

Le port 3000 est déjà utilisé par d'anciens processus `talosprimes` en mode cluster.

## ✅ Solution

### 1. Arrêter tous les anciens processus "talosprimes"

```bash
# Arrêter tous les processus talosprimes (sauf talosprimes-api)
pm2 stop talosprimes
pm2 delete talosprimes
```

### 2. Vérifier quel processus utilise le port 3000

```bash
sudo netstat -tlnp | grep 3000
# Ou
sudo lsof -i :3000
```

### 3. Tuer le processus qui utilise le port 3000 (si nécessaire)

```bash
# Trouver le PID
sudo lsof -i :3000

# Tuer le processus (remplacez <PID> par le numéro trouvé)
sudo kill -9 <PID>
```

### 4. Redémarrer le frontend proprement

```bash
cd /var/www/talosprimes/packages/client

# Arrêter l'ancien processus en erreur
pm2 stop talosprimes-client
pm2 delete talosprimes-client

# Redémarrer
pm2 start "pnpm start" --name "talosprimes-client" --cwd /var/www/talosprimes/packages/client
```

### 5. Vérifier

```bash
pm2 list
pm2 logs talosprimes-client
```

## 🧹 Nettoyage complet PM2

Si vous voulez tout nettoyer et repartir proprement :

```bash
# Arrêter tout sauf n8n et talosprimes-api
pm2 stop all
pm2 delete talosprimes
pm2 delete talosprimes-client

# Redémarrer seulement ce dont vous avez besoin
pm2 restart talosprimes-api
pm2 restart n8n

# Démarrer le frontend
cd /var/www/talosprimes/packages/client
pm2 start "pnpm start" --name "talosprimes-client" --cwd /var/www/talosprimes/packages/client

# Vérifier
pm2 list
```

Vous devriez avoir seulement :
- ✅ `talosprimes-api` (port 3001)
- ✅ `talosprimes-client` (port 3000)
- ✅ `n8n` (port 5678)

