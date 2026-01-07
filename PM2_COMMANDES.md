# 📋 Guide des Commandes PM2

## 🔍 Vérifier l'état des processus

```bash
# Voir tous les processus PM2
pm2 list

# OU utiliser le script de vérification
/var/www/talosprimes/scripts/check-pm2.sh
```

## 🎯 Noms des processus TalosPrimes

Les processus PM2 utilisent ces noms :

- **Backend** : `talosprimes-api` (pas `talosprimes-platform`)
- **Frontend** : `talosprimes-client`

## 🔄 Redémarrer le backend

### Option 1 : Commande directe
```bash
cd /var/www/talosprimes/packages/platform
pm2 restart talosprimes-api
```

### Option 2 : Script automatique (recommandé)
```bash
/var/www/talosprimes/scripts/restart-backend.sh
```

Le script :
- ✅ Vérifie si le processus existe
- ✅ Le redémarre s'il existe
- ✅ Le crée s'il n'existe pas
- ✅ Affiche les logs récents

## 🔄 Redémarrer le frontend

```bash
cd /var/www/talosprimes/packages/client
pm2 restart talosprimes-client
```

## 🔄 Redémarrer tous les services

```bash
pm2 restart all
```

## 📊 Voir les logs

```bash
# Tous les logs
pm2 logs

# Logs backend uniquement
pm2 logs talosprimes-api

# Logs frontend uniquement
pm2 logs talosprimes-client

# Logs avec nombre de lignes limité
pm2 logs talosprimes-api --lines 50
```

## 🚀 Démarrer un service (s'il n'existe pas)

### Backend
```bash
cd /var/www/talosprimes/packages/platform

# Build si nécessaire
pnpm build

# Démarrer
pm2 start dist/index.js --name "talosprimes-api" --env production
```

### Frontend
```bash
cd /var/www/talosprimes/packages/client

# Build si nécessaire
pnpm build

# Démarrer
pm2 start "pnpm start" --name "talosprimes-client" --cwd /var/www/talosprimes/packages/client
```

## 🛑 Arrêter un service

```bash
# Backend
pm2 stop talosprimes-api

# Frontend
pm2 stop talosprimes-client

# Tous
pm2 stop all
```

## 🗑️ Supprimer un processus

```bash
# Backend
pm2 delete talosprimes-api

# Frontend
pm2 delete talosprimes-client

# Tous
pm2 delete all
```

## 💾 Sauvegarder la configuration PM2

Après avoir démarré tous vos services :

```bash
# Sauvegarder la configuration actuelle
pm2 save

# Configurer le démarrage automatique au boot
pm2 startup
# Suivez les instructions affichées
```

## 🔍 Informations détaillées sur un processus

```bash
# Backend
pm2 show talosprimes-api

# Frontend
pm2 show talosprimes-client
```

## ⚠️ Erreur "Process not found"

Si vous voyez :
```
[PM2][ERROR] Process or Namespace talosprimes-platform not found
```

C'est normal ! Le nom correct est `talosprimes-api`, pas `talosprimes-platform`.

**Solution :**
```bash
# Vérifier les processus existants
pm2 list

# Utiliser le bon nom
pm2 restart talosprimes-api
```

## 🎯 Scripts disponibles

- `scripts/check-pm2.sh` : Vérifier l'état de tous les processus
- `scripts/restart-backend.sh` : Redémarrer le backend automatiquement

