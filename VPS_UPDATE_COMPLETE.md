# 🚀 Mise à Jour du VPS - TalosPrimes

Guide pour mettre à jour votre serveur VPS avec les dernières corrections.

---

## ⚡ Mise à Jour Rapide (5 minutes)

### 1. Se connecter au VPS
```bash
ssh votre-utilisateur@votre-vps-ip
```

### 2. Aller dans le répertoire du projet
```bash
cd /var/www/talosprimes
```

### 3. Récupérer les dernières modifications
```bash
git pull origin main
```

### 4. Exécuter le script de setup (si nécessaire)
```bash
./scripts/setup-complete.sh
```

**OU** manuellement :

```bash
# Installer les dépendances
pnpm install

# Builder le package shared (OBLIGATOIRE en premier)
cd packages/shared
pnpm build
cd ../..

# Générer Prisma Client
cd packages/platform
pnpm prisma generate
cd ../..

# Builder le backend
cd packages/platform
pnpm build
cd ../..
```

### 5. Redémarrer les services PM2
```bash
pm2 restart ecosystem.config.js
# OU
pm2 restart talosprimes-api
pm2 restart talosprimes-client
```

### 6. Vérifier que tout fonctionne
```bash
# Vérifier les services
pm2 list

# Vérifier les logs
pm2 logs --lines 50

# Tester le backend
curl http://localhost:3001/health
```

---

## 📋 Mise à Jour Détaillée

### Étape 1: Sauvegarder l'état actuel (optionnel mais recommandé)

```bash
cd /var/www/talosprimes

# Vérifier l'état Git actuel
git status

# Voir les derniers commits
git log --oneline -5
```

### Étape 2: Récupérer les modifications

```bash
# Récupérer les dernières modifications depuis GitHub
git pull origin main
```

**Si vous avez des modifications locales non commitées :**
```bash
# Sauvegarder vos modifications locales
git stash

# Récupérer les modifications
git pull origin main

# Restaurer vos modifications (si nécessaire)
git stash pop
```

### Étape 3: Installer les nouvelles dépendances

```bash
# Installer les dépendances (si package.json modifié)
pnpm install
```

### Étape 4: Builder les packages

**IMPORTANT :** Toujours builder dans cet ordre :

```bash
# 1. Builder shared (OBLIGATOIRE en premier)
cd packages/shared
pnpm build
cd ../..

# 2. Générer Prisma Client (si schéma modifié)
cd packages/platform
pnpm prisma generate
pnpm build
cd ../..

# 3. Builder client (si nécessaire)
cd packages/client
pnpm build
cd ../..
```

### Étape 5: Redémarrer les services

```bash
# Redémarrer avec PM2
pm2 restart ecosystem.config.js

# OU redémarrer individuellement
pm2 restart talosprimes-api
pm2 restart talosprimes-client
```

### Étape 6: Vérification

```bash
# Vérifier le statut des services
pm2 status

# Vérifier les logs en temps réel
pm2 logs

# Tester le backend
curl http://localhost:3001/health

# Tester le frontend (si accessible)
curl http://localhost:3000
```

---

## 🔧 Script Automatique de Mise à Jour

Créez un script `update-vps.sh` sur votre VPS :

```bash
#!/bin/bash
set -e

echo "🔄 Mise à jour du VPS TalosPrimes"
echo "=================================="

cd /var/www/talosprimes

echo "📥 Récupération des modifications..."
git pull origin main

echo "📦 Installation des dépendances..."
pnpm install

echo "🔨 Build du package shared..."
cd packages/shared
pnpm build
cd ../..

echo "🗄️  Génération Prisma Client..."
cd packages/platform
pnpm prisma generate
cd ../..

echo "🔨 Build du backend..."
cd packages/platform
pnpm build
cd ../..

echo "🔄 Redémarrage des services..."
pm2 restart ecosystem.config.js

echo "✅ Mise à jour terminée!"
echo ""
echo "📊 Statut des services:"
pm2 status

echo ""
echo "📝 Logs récents:"
pm2 logs --lines 20 --nostream
```

**Utilisation :**
```bash
chmod +x update-vps.sh
./update-vps.sh
```

---

## ⚠️ Problèmes Courants

### Erreur: "Cannot find module '@talosprimes/shared'"
**Solution :** Builder le package shared en premier
```bash
cd packages/shared && pnpm build && cd ../..
```

### Erreur: "Prisma Client not generated"
**Solution :** Générer le client Prisma
```bash
cd packages/platform && pnpm prisma generate && cd ../..
```

### Erreur: "Port already in use"
**Solution :** Les services PM2 sont peut-être déjà démarrés
```bash
pm2 restart ecosystem.config.js
```

### Erreur: "Git pull failed"
**Solution :** Vérifier les modifications locales
```bash
git status
git stash  # Sauvegarder les modifications locales
git pull origin main
```

### Erreur: "Build failed"
**Solution :** Vérifier les logs
```bash
cd packages/platform
pnpm build 2>&1 | tee build.log
# Examiner build.log pour les erreurs
```

---

## 📝 Checklist de Mise à Jour

- [ ] Se connecter au VPS
- [ ] Aller dans `/var/www/talosprimes`
- [ ] Faire `git pull origin main`
- [ ] Faire `pnpm install` (si nécessaire)
- [ ] Builder `packages/shared` en premier
- [ ] Générer Prisma Client (`pnpm prisma generate`)
- [ ] Builder `packages/platform`
- [ ] Redémarrer PM2 (`pm2 restart ecosystem.config.js`)
- [ ] Vérifier les services (`pm2 status`)
- [ ] Tester le backend (`curl http://localhost:3001/health`)
- [ ] Vérifier les logs (`pm2 logs`)

---

## 🎯 Commandes Rapides

```bash
# Mise à jour complète en une commande
cd /var/www/talosprimes && git pull origin main && pnpm install && cd packages/shared && pnpm build && cd ../.. && cd packages/platform && pnpm prisma generate && pnpm build && cd ../.. && pm2 restart ecosystem.config.js && pm2 status
```

---

## 📚 Documentation

- [GUIDE_DEMARRAGE_RAPIDE.md](./GUIDE_DEMARRAGE_RAPIDE.md) - Guide de démarrage
- [DIAGNOSTIC_COMPLET.md](./DIAGNOSTIC_COMPLET.md) - Diagnostic de l'application
- [CORRECTIONS_APPLIQUEES.md](./CORRECTIONS_APPLIQUEES.md) - Corrections appliquées

---

**Dernière mise à jour :** Les corrections ont été poussées sur GitHub et sont prêtes à être déployées sur le VPS.
