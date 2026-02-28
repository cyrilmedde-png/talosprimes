# Guide de mise à jour du serveur VPS

Ce guide vous permet de mettre à jour votre serveur avec les dernières modifications du code.

---

## 🚀 Mise à jour rapide (Script automatique)

### Option 1 : Script complet (recommandé)

```bash
cd /var/www/talosprimes
git pull origin main
cd packages/client && pnpm install && pnpm build
cd ../../packages/platform && pnpm install && pnpm build
cd ../..
pm2 restart all
```

### Option 2 : Commande unique

```bash
cd /var/www/talosprimes && git pull origin main && cd packages/client && pnpm install && pnpm build && cd ../../packages/platform && pnpm install && pnpm build && cd ../.. && pm2 restart all
```

---

## 📋 Mise à jour étape par étape (avec vérifications)

### Étape 1 : Récupérer les dernières modifications

```bash
cd /var/www/talosprimes
git pull origin main
```

Si vous avez des modifications locales qui entrent en conflit :

```bash
# Sauvegarder vos modifications locales
git stash

# Récupérer les modifications
git pull origin main

# Appliquer vos modifications (si nécessaire)
git stash pop
```

### Étape 2 : Installer les nouvelles dépendances (si nécessaire)

**Backend :**
```bash
cd /var/www/talosprimes/packages/platform
pnpm install
```

**Frontend :**
```bash
cd /var/www/talosprimes/packages/client
pnpm install
```

**Shared (si nécessaire) :**
```bash
cd /var/www/talosprimes/packages/shared
pnpm install
```

### Étape 3 : Rebuilder les applications

**Frontend (obligatoire si fichiers changés) :**
```bash
cd /var/www/talosprimes/packages/client
pnpm build
```

**Backend (obligatoire si fichiers changés) :**
```bash
cd /var/www/talosprimes/packages/platform
pnpm build
```

**Shared (si nécessaire) :**
```bash
cd /var/www/talosprimes/packages/shared
pnpm build
```

### Étape 4 : Appliquer les migrations de base de données (si nécessaire)

```bash
cd /var/www/talosprimes/packages/platform
pnpm db:push
# ou
pnpm db:migrate
```

### Étape 5 : Redémarrer les services PM2

```bash
# Redémarrer tous les services
pm2 restart all

# Ou redémarrer individuellement
pm2 restart talosprimes-platform
pm2 restart talosprimes-client

# Vérifier le statut
pm2 status

# Voir les logs
pm2 logs
```

---

## 🔍 Vérifications après mise à jour

### 1. Vérifier que les services sont démarrés

```bash
pm2 status
```

Vous devriez voir :
- `talosprimes-platform` : `online`
- `talosprimes-client` : `online`

### 2. Vérifier les logs

```bash
# Logs en temps réel
pm2 logs

# Logs spécifiques
pm2 logs talosprimes-platform
pm2 logs talosprimes-client
```

### 3. Tester l'API

```bash
curl https://api.talosprimes.com/health
```

Réponse attendue :
```json
{"status":"ok","database":"connected"}
```

### 4. Tester le frontend

Ouvrez dans votre navigateur :
- `https://talosprimes.com` (doit afficher le frontend)
- `https://talosprimes.com/inscription` (nouveau formulaire)

### 5. Vérifier Nginx

```bash
sudo nginx -t
sudo systemctl status nginx
```

---

## 🐛 En cas de problème

### Erreur lors du git pull

```bash
# Annuler les modifications locales
git reset --hard HEAD

# Ou sauvegarder et forcer
git stash
git pull origin main
```

### Erreur lors du build

```bash
# Nettoyer et rebuilder
cd /var/www/talosprimes/packages/client
rm -rf .next node_modules
pnpm install
pnpm build

# Même chose pour le backend
cd ../platform
rm -rf dist node_modules
pnpm install
pnpm build
```

### Service qui ne démarre pas

```bash
# Arrêter tous les services
pm2 stop all

# Supprimer et recréer
pm2 delete all
pm2 start ecosystem.config.js

# Ou manuellement
cd /var/www/talosprimes/packages/platform
pm2 start "pnpm start" --name talosprimes-platform

cd ../client
pm2 start "pnpm start" --name talosprimes-client
```

### Port déjà utilisé

```bash
# Trouver le processus qui utilise le port
sudo lsof -i :3000  # Frontend
sudo lsof -i :3001  # Backend

# Tuer le processus
sudo kill -9 <PID>

# Redémarrer PM2
pm2 restart all
```

---

## 📝 Script de mise à jour automatique

Créez un script pour automatiser la mise à jour :

```bash
#!/bin/bash
# /var/www/talosprimes/update.sh

set -e

echo "🔄 Mise à jour du serveur TalosPrimes..."

cd /var/www/talosprimes

echo "📥 Récupération des modifications..."
git pull origin main

echo "📦 Installation des dépendances..."
cd packages/client && pnpm install
cd ../platform && pnpm install
cd ../shared && pnpm install

echo "🏗️  Build des applications..."
cd ../client && pnpm build
cd ../platform && pnpm build

echo "🔄 Redémarrage des services..."
pm2 restart all

echo "✅ Mise à jour terminée !"
pm2 status
```

Rendez-le exécutable :

```bash
chmod +x /var/www/talosprimes/update.sh
```

Utilisation :

```bash
cd /var/www/talosprimes
./update.sh
```

---

## 🎯 Commandes rapides

### Mise à jour complète (une commande)

```bash
cd /var/www/talosprimes && git pull origin main && cd packages/client && pnpm install && pnpm build && cd ../platform && pnpm install && pnpm build && cd ../.. && pm2 restart all && pm2 status
```

### Rebuild frontend uniquement

```bash
cd /var/www/talosprimes/packages/client && pnpm build && pm2 restart talosprimes-client
```

### Rebuild backend uniquement

```bash
cd /var/www/talosprimes/packages/platform && pnpm build && pm2 restart talosprimes-platform
```

### Redémarrer tous les services

```bash
pm2 restart all
```

---

## 📅 Mise à jour automatique (Cron - Optionnel)

Pour mettre à jour automatiquement tous les jours à 3h du matin :

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne
0 3 * * * cd /var/www/talosprimes && git pull origin main && cd packages/client && pnpm install && pnpm build && cd ../platform && pnpm install && pnpm build && cd ../.. && pm2 restart all
```

---

## ✅ Checklist de mise à jour

- [ ] Git pull réussi
- [ ] Dépendances installées
- [ ] Build frontend réussi
- [ ] Build backend réussi
- [ ] Services PM2 redémarrés
- [ ] API répond (health check)
- [ ] Frontend accessible
- [ ] Pas d'erreurs dans les logs

---

## 💡 Astuces

- Toujours vérifier les logs après une mise à jour : `pm2 logs`
- En cas de doute, redémarrer tous les services : `pm2 restart all`
- Garder une sauvegarde de la base de données avant les migrations importantes
- Tester dans un environnement de staging si possible
