# 🔍 Diagnostic Erreur 502 Bad Gateway

## 🎯 Problème

L'erreur **502 Bad Gateway** signifie que Nginx ne peut pas se connecter au backend Fastify.

## 🔧 Diagnostic étape par étape

### 1. Vérifier que le backend est démarré

```bash
pm2 list
```

**Vérifier :**
- ✅ `talosprimes-api` doit être **online** (statut vert)
- ❌ Si **stopped** ou **errored** → Voir section "Redémarrer le backend"

### 2. Vérifier que le backend écoute sur le bon port

```bash
# Vérifier les ports en écoute
sudo netstat -tlnp | grep 3001
# OU
sudo ss -tlnp | grep 3001
```

**Résultat attendu :**
```
tcp  0  0  0.0.0.0:3001  0.0.0.0:*  LISTEN  <PID>/node
```

**Si rien n'apparaît :** Le backend n'écoute pas → Voir section "Redémarrer le backend"

### 3. Tester le backend directement (sans Nginx)

```bash
curl http://localhost:3001/health
```

**Résultat attendu :**
```json
{"status":"ok","database":"connected"}
```

**Si erreur :**
- ❌ `Connection refused` → Backend non démarré
- ❌ `timeout` → Backend bloqué
- ❌ Autre erreur → Voir les logs

### 4. Tester la route /api/leads directement

```bash
curl -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Test",
    "prenom": "User",
    "email": "test@example.com",
    "telephone": "+33612345678"
  }'
```

**Si ça fonctionne en local mais pas via Nginx :** Problème de configuration Nginx

### 5. Vérifier la configuration Nginx

```bash
# Vérifier la config Nginx
sudo nginx -t

# Voir la config pour api.talosprimes.com
sudo cat /etc/nginx/sites-enabled/talosprimes-api
```

**Vérifier que :**
- ✅ `proxy_pass http://localhost:3001;` (ou `127.0.0.1:3001`)
- ✅ Pas de typo dans le nom du serveur
- ✅ Le fichier est bien activé (symlink dans `sites-enabled`)

### 6. Vérifier les logs Nginx

```bash
# Logs d'erreur Nginx
sudo tail -50 /var/log/nginx/error.log

# Logs d'accès
sudo tail -50 /var/log/nginx/access.log
```

**Chercher :**
- `connect() failed (111: Connection refused)` → Backend non démarré
- `upstream timed out` → Backend trop lent ou bloqué
- `no resolver defined` → Problème DNS

### 7. Vérifier les logs du backend

```bash
pm2 logs talosprimes-api --lines 100
```

**Chercher :**
- Erreurs de démarrage
- Erreurs de connexion base de données
- Erreurs de routes

## 🔧 Solutions

### Solution 1 : Redémarrer le backend

```bash
cd /var/www/talosprimes/packages/platform

# Arrêter
pm2 stop talosprimes-api

# Supprimer (si nécessaire)
pm2 delete talosprimes-api

# Rebuild
pnpm build

# Redémarrer
pm2 start dist/index.js --name "talosprimes-api" --env production

# Vérifier
pm2 list
pm2 logs talosprimes-api --lines 20
```

### Solution 2 : Vérifier les variables d'environnement

```bash
cd /var/www/talosprimes/packages/platform

# Vérifier que le .env existe
ls -la .env

# Vérifier les variables importantes
grep -E "PORT|DATABASE_URL|NODE_ENV" .env
```

**Vérifier :**
- ✅ `PORT=3001`
- ✅ `DATABASE_URL` est correct
- ✅ `NODE_ENV=production`

### Solution 3 : Reconfigurer Nginx

```bash
# Utiliser le script de configuration
cd /var/www/talosprimes/scripts
sudo ./configure-nginx.sh
```

### Solution 4 : Vérifier le firewall

```bash
# Vérifier que le port 3001 n'est pas bloqué
sudo ufw status

# Si nécessaire, autoriser (mais normalement 3001 ne doit pas être exposé publiquement)
# sudo ufw allow 3001
```

**Note :** Le port 3001 ne doit être accessible que depuis localhost (Nginx), pas depuis l'extérieur.

## 🚨 Diagnostic rapide (script)

```bash
#!/bin/bash
echo "=== Diagnostic 502 Bad Gateway ==="
echo ""
echo "1. État PM2 :"
pm2 list | grep talosprimes-api
echo ""
echo "2. Port 3001 :"
sudo netstat -tlnp | grep 3001 || echo "❌ Port 3001 non utilisé"
echo ""
echo "3. Test backend local :"
curl -s http://localhost:3001/health || echo "❌ Backend non accessible"
echo ""
echo "4. Logs Nginx (dernières erreurs) :"
sudo tail -5 /var/log/nginx/error.log
echo ""
echo "5. Logs backend (dernières lignes) :"
pm2 logs talosprimes-api --lines 5 --nostream
```

## 📋 Checklist complète

- [ ] Backend démarré avec PM2 (`pm2 list`)
- [ ] Backend écoute sur port 3001 (`netstat -tlnp | grep 3001`)
- [ ] Backend répond en local (`curl http://localhost:3001/health`)
- [ ] Route /api/leads fonctionne en local
- [ ] Nginx configuré correctement (`nginx -t`)
- [ ] Nginx peut se connecter au backend
- [ ] Pas d'erreurs dans les logs Nginx
- [ ] Pas d'erreurs dans les logs backend
- [ ] Variables d'environnement correctes
- [ ] Base de données accessible

## 💡 Cause la plus fréquente

**Le backend n'est pas démarré ou a crashé.**

**Solution :**
```bash
cd /var/www/talosprimes/packages/platform
pm2 restart talosprimes-api
pm2 logs talosprimes-api
```

