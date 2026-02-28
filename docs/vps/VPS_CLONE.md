# Récupérer le code sur votre VPS

## 📋 Prérequis

Avant de cloner, assurez-vous d'avoir :

1. ✅ **pnpm installé** (voir VPS_SETUP.md)
2. ✅ **Node.js installé** (version 20+)
3. ✅ **Git installé** (généralement déjà installé)

## 🚀 Méthode 1 : Cloner avec SSH (Recommandée)

### Étape 1 : Ajouter votre clé SSH du VPS sur GitHub

Sur votre **VPS**, créez une clé SSH :

```bash
# Générer une clé SSH sur le VPS
ssh-keygen -t ed25519 -C "vps@talosprimes"

# Appuyez sur Entrée pour accepter l'emplacement par défaut
# Créez un mot de passe ou laissez vide

# Afficher la clé publique
cat ~/.ssh/id_ed25519.pub
```

### Étape 2 : Ajouter la clé sur GitHub

1. **Copiez** la clé affichée (commence par `ssh-ed25519...`)
2. Allez sur : https://github.com/settings/keys
3. Cliquez sur **"New SSH key"**
4. **Title** : "VPS Ubuntu" (ou un nom de votre choix)
5. **Key** : Collez la clé
6. Cliquez sur **"Add SSH key"**

### Étape 3 : Cloner le repository

```bash
# Aller dans le dossier où vous voulez cloner
cd /var/www

# Cloner avec SSH
git clone git@github.com:cyrimedde-png/talosprimes.git

# OU si vous préférez HTTPS (nécessite un token)
git clone https://github.com/cyrimedde-png/talosprimes.git
```

---

## 🔐 Méthode 2 : Cloner avec HTTPS + Token

Si vous préférez HTTPS :

### Étape 1 : Créer un Personal Access Token

1. Allez sur : https://github.com/settings/tokens
2. **Generate new token** → **Generate new token (classic)**
3. Nom : `vps-talosprimes`
4. Cochez `repo`
5. **Generate token**
6. **COPIEZ LE TOKEN** (vous ne le reverrez plus !)

### Étape 2 : Cloner

```bash
cd /var/www

# Cloner (vous serez demandé username et password)
git clone https://github.com/cyrimedde-png/talosprimes.git

# Username : cyrimedde-png
# Password : [collez votre token]
```

---

## ✅ Après le clonage

### 1. Installer les dépendances

```bash
cd /var/www/talosprimes

# Installer toutes les dépendances
pnpm install

# OU avec npm
npm install
```

### 2. Configurer les variables d'environnement

```bash
# Backend
cd packages/platform
cp .env.example .env  # Si vous avez un .env.example
nano .env              # Éditer avec vos valeurs
```

**Contenu du `.env` :**
```env
DATABASE_URL="postgresql://postgres:...@db.xxxxx.supabase.co:5432/postgres"
JWT_SECRET="votre-secret-tres-long"
JWT_REFRESH_SECRET="votre-autre-secret-tres-long"
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://app.votredomaine.com
```

```bash
# Frontend
cd ../client
nano .env.local
```

**Contenu du `.env.local` :**
```env
NEXT_PUBLIC_API_URL=https://api.votredomaine.com
```

### 3. Générer le client Prisma

```bash
cd /var/www/talosprimes/packages/platform
pnpm db:generate
```

### 4. Créer les tables (si pas déjà fait)

```bash
pnpm db:push
```

### 5. Build le projet

```bash
# Depuis la racine
cd /var/www/talosprimes

# Build tout
pnpm build

# OU build séparément
pnpm --filter platform build
pnpm --filter client build
```

---

## 🔄 Mettre à jour le code depuis GitHub

Quand vous avez fait des changements et poussé sur GitHub :

```bash
cd /var/www/talosprimes

# Récupérer les changements
git pull origin main

# Réinstaller les dépendances si nécessaire
pnpm install

# Rebuild si nécessaire
pnpm build

# Redémarrer les services (voir section PM2)
pm2 restart all
```

---

## 🎯 Structure recommandée sur VPS

```
/var/www/
└── talosprimes/              # Repository cloné
    ├── packages/
    │   ├── platform/         # Backend
    │   │   ├── .env          # ⚠️ Configurer avec vos secrets
    │   │   └── dist/         # Build backend
    │   └── client/           # Frontend
    │       ├── .env.local    # ⚠️ Configurer
    │       └── .next/        # Build frontend
    └── node_modules/
```

---

## 🚀 Démarrer les services avec PM2

### Backend

```bash
cd /var/www/talosprimes/packages/platform

# Démarrer le backend
pm2 start dist/index.js --name "talosprimes-api"

# Ou en mode développement (avec watch)
pm2 start "pnpm dev" --name "talosprimes-api-dev" --interpreter bash
```

### Frontend

```bash
cd /var/www/talosprimes/packages/client

# Si Next.js est build en standalone
pm2 start .next/standalone/server.js --name "talosprimes-client"

# OU en mode développement
pm2 start "pnpm dev" --name "talosprimes-client-dev" --interpreter bash
```

### Gérer PM2

```bash
# Voir tous les processus
pm2 list

# Voir les logs
pm2 logs

# Redémarrer
pm2 restart all

# Arrêter
pm2 stop all

# Sauvegarder la config (pour redémarrer au boot)
pm2 save
pm2 startup
```

---

## 🔒 Permissions (si problème)

Si vous avez des erreurs de permissions :

```bash
# Changer le propriétaire du dossier
sudo chown -R $USER:$USER /var/www/talosprimes

# Donner les permissions d'exécution
chmod +x /var/www/talosprimes
```

---

## ✅ Checklist VPS

- [ ] pnpm installé
- [ ] Node.js 20+ installé
- [ ] Repository cloné depuis GitHub
- [ ] Dépendances installées (`pnpm install`)
- [ ] Variables d'environnement configurées (`.env` et `.env.local`)
- [ ] Client Prisma généré (`pnpm db:generate`)
- [ ] Tables créées (`pnpm db:push`)
- [ ] Projet build (`pnpm build`)
- [ ] Services démarrés avec PM2
- [ ] Nginx configuré (reverse proxy)
- [ ] DNS configuré (api.votredomaine.com, app.votredomaine.com)

---

## 📝 Commandes rapides

```bash
# Tout faire en une fois (après le clone)
cd /var/www/talosprimes
pnpm install
pnpm --filter platform db:generate
pnpm build
```

Ensuite configurez les `.env` et démarrez avec PM2.

