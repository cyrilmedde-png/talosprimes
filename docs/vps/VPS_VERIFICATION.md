# ✅ Vérification Post-Mise à Jour VPS

Guide pour vérifier que tout fonctionne correctement après la mise à jour.

---

## 🔍 Vérifications Immédiates

### 1. Vérifier les Services PM2

```bash
pm2 status
```

**Résultat attendu :**
- ✅ `talosprimes-api` : status `online` (vert)
- ✅ `talosprimes-client` : status `online` (vert)

**Si un service est `errored` ou `stopped` :**
```bash
# Voir les logs d'erreur
pm2 logs talosprimes-api --lines 50
pm2 logs talosprimes-client --lines 50

# Redémarrer si nécessaire
pm2 restart talosprimes-api
pm2 restart talosprimes-client
```

---

### 2. Tester le Backend

```bash
# Test de santé
curl http://localhost:3001/health
```

**Résultat attendu :**
```json
{"status":"ok","database":"connected"}
```

**Si erreur :**
- `Connection refused` → Backend non démarré
- `{"status":"error","database":"disconnected"}` → Problème de connexion DB
- Vérifier les logs : `pm2 logs talosprimes-api`

---

### 3. Tester le Frontend

```bash
# Test du frontend
curl http://localhost:3000
```

**Résultat attendu :** Code HTML de la page d'accueil

**Si erreur :**
- Vérifier les logs : `pm2 logs talosprimes-client`
- Vérifier que le port 3000 est accessible

---

### 4. Vérifier Nginx (si configuré)

```bash
# Tester la configuration Nginx
sudo nginx -t

# Vérifier que Nginx tourne
sudo systemctl status nginx

# Tester via le domaine (si configuré)
curl https://votre-domaine.com/health
```

---

### 5. Vérifier les Logs Récentes

```bash
# Logs backend (dernières 50 lignes)
pm2 logs talosprimes-api --lines 50 --nostream

# Logs frontend (dernières 50 lignes)
pm2 logs talosprimes-client --lines 50 --nostream

# Logs en temps réel
pm2 logs
```

**Chercher :**
- ❌ Erreurs `Cannot find module`
- ❌ Erreurs `Prisma Client not generated`
- ❌ Erreurs de connexion DB
- ❌ Erreurs de port déjà utilisé

---

## 🧪 Tests Fonctionnels

### Test 1: API Health Check

```bash
curl http://localhost:3001/health
```

**Attendu :** `{"status":"ok","database":"connected"}`

---

### Test 2: API Root

```bash
curl http://localhost:3001/
```

**Attendu :** 
```json
{
  "message": "TalosPrimes API",
  "version": "0.1.0",
  "status": "running"
}
```

---

### Test 3: Test d'Authentification (si utilisateur existe)

```bash
# Récupérer un token (remplacer email/password)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "votre-mot-de-passe"
  }'
```

**Attendu :** Token JWT si les credentials sont corrects

---

### Test 4: Frontend Accessible

Ouvrir dans le navigateur :
- `http://votre-ip-vps:3000` (si pas de domaine)
- `https://votre-domaine.com` (si domaine configuré)

**Vérifier :**
- ✅ Page se charge
- ✅ Pas d'erreurs dans la console (F12)
- ✅ API accessible depuis le frontend

---

## 🔧 Problèmes Courants et Solutions

### Problème 1: Service "errored"

**Symptôme :** `pm2 status` montre `errored` (rouge)

**Solution :**
```bash
# Voir l'erreur exacte
pm2 logs talosprimes-api --err --lines 100

# Causes courantes :
# - Variable d'environnement manquante (.env)
# - Port déjà utilisé
# - Erreur de build (fichiers manquants)
```

---

### Problème 2: "Cannot find module '@talosprimes/shared'"

**Symptôme :** Erreur dans les logs

**Solution :**
```bash
cd /var/www/talosprimes
cd packages/shared
pnpm build
cd ../..
pm2 restart talosprimes-api
```

---

### Problème 3: "Prisma Client not generated"

**Symptôme :** Erreur Prisma dans les logs

**Solution :**
```bash
cd /var/www/talosprimes/packages/platform
pnpm prisma generate
pnpm build
pm2 restart talosprimes-api
```

---

### Problème 4: Database "disconnected"

**Symptôme :** `/health` retourne `"database":"disconnected"`

**Solution :**
```bash
# Vérifier DATABASE_URL dans .env
cd /var/www/talosprimes/packages/platform
cat .env | grep DATABASE_URL

# Tester la connexion manuellement
pnpm prisma db push --skip-generate

# Vérifier que Supabase est accessible
```

---

### Problème 5: Port déjà utilisé

**Symptôme :** `Error: listen EADDRINUSE: address already in use :::3001`

**Solution :**
```bash
# Trouver le processus qui utilise le port
sudo lsof -i :3001
# OU
sudo netstat -tlnp | grep 3001

# Tuer le processus si nécessaire
sudo kill -9 <PID>

# Redémarrer PM2
pm2 restart talosprimes-api
```

---

## ✅ Checklist de Vérification

- [ ] Services PM2 sont `online` (vert)
- [ ] Backend répond sur `/health` avec `database: connected`
- [ ] Frontend accessible (port 3000 ou domaine)
- [ ] Pas d'erreurs dans les logs PM2
- [ ] Nginx fonctionne (si configuré)
- [ ] SSL/HTTPS fonctionne (si configuré)
- [ ] Base de données accessible
- [ ] API répond correctement

---

## 📊 Commandes de Diagnostic

```bash
# État complet des services
pm2 status
pm2 info talosprimes-api
pm2 info talosprimes-client

# Utilisation des ressources
pm2 monit

# Logs en temps réel
pm2 logs

# Vérifier les ports
sudo netstat -tlnp | grep -E '3000|3001'

# Vérifier les processus Node
ps aux | grep node

# Vérifier l'espace disque
df -h

# Vérifier la mémoire
free -h
```

---

## 🎯 Si Tout Fonctionne

Si toutes les vérifications passent, votre application est **opérationnelle** !

**Prochaines étapes :**
1. Tester les fonctionnalités principales
2. Vérifier l'authentification
3. Tester la création de leads/clients
4. Vérifier l'intégration n8n (si configurée)

---

## 🆘 Besoin d'Aide ?

Si vous rencontrez des erreurs :
1. Copiez les logs d'erreur
2. Notez le message d'erreur exact
3. Vérifiez les sections "Problèmes Courants" ci-dessus
4. Consultez [DIAGNOSTIC_COMPLET.md](./DIAGNOSTIC_COMPLET.md)
