# Configuration VPS Ubuntu pour TalosPrimes

## Installation de pnpm sur Ubuntu

### Méthode 1 : Via npm (si npm est déjà installé)

```bash
# Installer pnpm globalement
npm install -g pnpm

# Vérifier l'installation
pnpm --version
```

### Méthode 2 : Via le script officiel (recommandé)

```bash
# Installer pnpm via le script officiel
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Recharger le shell ou faire :
source ~/.bashrc

# Vérifier l'installation
pnpm --version
```

### Méthode 3 : Via Corepack (si Node.js 16.10+ est installé)

```bash
# Activer Corepack
corepack enable

# Installer pnpm
corepack prepare pnpm@latest --activate

# Vérifier
pnpm --version
```

## Installation de Node.js (si pas encore installé)

```bash
# Installer Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérifier
node --version
npm --version
```

## Vérification de l'environnement

```bash
# Vérifier Node.js
node --version  # Devrait afficher v20.x.x

# Vérifier npm
npm --version   # Devrait afficher 9.x.x ou 10.x.x

# Vérifier pnpm
pnpm --version  # Devrait afficher 8.x.x ou 9.x.x
```

## Installation des dépendances du projet

Une fois pnpm installé :

```bash
cd /var/www/talosprimes
pnpm install
```

## Installation d'autres outils nécessaires

### PostgreSQL Client (pour vérifier la DB)

```bash
sudo apt update
sudo apt install postgresql-client -y
```

### PM2 (pour gérer les processus Node.js en production)

```bash
# Installer PM2 globalement
pnpm add -g pm2

# OU via npm
npm install -g pm2
```

### Nginx (pour reverse proxy)

```bash
sudo apt update
sudo apt install nginx -y
```

## Structure de déploiement recommandée sur VPS

```
/var/www/talosprimes/          # Votre code
├── packages/
│   ├── platform/              # Backend
│   └── client/                # Frontend
├── node_modules/
└── pnpm-lock.yaml
```

## Commandes utiles PM2

```bash
# Démarrer le backend
cd /var/www/talosprimes/packages/platform
pm2 start dist/index.js --name "talosprimes-api"

# Démarrer le frontend (si build standalone)
cd /var/www/talosprimes/packages/client
pm2 start .next/standalone/server.js --name "talosprimes-client"

# Voir les processus
pm2 list

# Voir les logs
pm2 logs

# Redémarrer
pm2 restart all

# Sauvegarder la configuration PM2
pm2 save
pm2 startup  # Pour démarrer au boot
```

## Variables d'environnement sur VPS

### Backend

Créer `/var/www/talosprimes/packages/platform/.env` :

```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://app.votredomaine.com
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
```

### Frontend

Créer `/var/www/talosprimes/packages/client/.env.local` :

```env
NEXT_PUBLIC_API_URL=https://api.votredomaine.com
```

## Build et démarrage

```bash
# Build tout le projet
cd /var/www/talosprimes
pnpm build

# Ou build séparément
pnpm --filter platform build
pnpm --filter client build
```

