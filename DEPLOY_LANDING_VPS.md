# 🚀 Déploiement Landing Page sur VPS

## 📋 Vue d'ensemble

Ce guide vous explique comment déployer la nouvelle landing page sur votre serveur VPS.

---

## 🔄 Workflow de Déploiement

```
Local (Mac) → GitHub → VPS
```

1. **En local** : Développer et tester
2. **Push GitHub** : `git push origin main`
3. **Sur VPS** : `git pull` et rebuild

---

## 📤 ÉTAPE 1 : Push Local → GitHub

### Commandes à exécuter sur votre Mac

```bash
# 1. Se placer dans le projet
cd /Users/giiz_mo_o/Desktop/devellopement\ application/talosprimes

# 2. Vérifier les fichiers modifiés
git status

# 3. Ajouter tous les nouveaux fichiers
git add .

# 4. Créer le commit
git commit -m "feat: Landing page complète avec CMS et pages légales

- Nouveaux modèles Prisma (Testimonial, LandingContent, ContactMessage)
- Routes API /api/landing/* (contenu, testimonials, contact)
- Landing page responsive avec hero, features, testimonials
- CMS admin /dashboard/cms (gestion contenu + testimonials + messages)
- Pages légales RGPD (mentions-legales, cgu, cgv, confidentialite)
- Composant Toast pour notifications
- Animations et améliorations UX
- Script seed-landing.ts
- Documentation complète"

# 5. Pousser vers GitHub
git push origin main
```

### Si c'est votre premier push

```bash
# Vérifier le remote
git remote -v

# Si pas de remote configuré
git remote add origin https://github.com/VOTRE_USERNAME/talosprimes.git

# Push initial
git push -u origin main
```

### Si vous avez des conflits

```bash
# Récupérer les changements distants
git pull origin main --rebase

# Résoudre les conflits si nécessaire
# Puis continuer
git rebase --continue

# Pousser
git push origin main
```

---

## 🖥️ ÉTAPE 2 : Mise à Jour VPS

### Option A : Commandes Manuelles (Détaillées)

```bash
# 1. Se connecter au VPS
ssh root@VOTRE_IP_VPS
# Exemple : ssh root@vps.talosprimes.com

# 2. Aller dans le répertoire du projet
cd /var/www/talosprimes
# (Adapter le chemin selon votre installation)

# 3. Vérifier la branche actuelle
git branch
git status

# 4. Récupérer les derniers changements
git pull origin main

# 5. Installer les dépendances (si nouvelles)
pnpm install

# 6. Aller dans le backend
cd packages/platform

# 7. Générer le client Prisma avec les nouveaux modèles
pnpm prisma generate

# 8. Appliquer les changements à la base de données
pnpm prisma db push

# 9. Créer les données de la landing page
npx tsx prisma/seed-landing.ts

# 10. Revenir à la racine
cd ../..

# 11. Rebuild les applications
pnpm build

# 12. Redémarrer les services PM2
pm2 restart all

# 13. Vérifier le statut
pm2 status

# 14. Voir les logs en temps réel (optionnel)
pm2 logs --lines 50
```

### Option B : Script Automatisé (Recommandé)

**Sur votre Mac, ajoutez le script au commit :**

```bash
# Ajouter le script de déploiement
git add scripts/update-vps-landing.sh

git commit -m "chore: Ajout script de déploiement VPS pour landing page"

git push origin main
```

**Sur le VPS :**

```bash
# Se connecter au VPS
ssh root@VOTRE_IP_VPS

# Aller dans le projet
cd /var/www/talosprimes

# Récupérer le script
git pull origin main

# Rendre le script exécutable
chmod +x scripts/update-vps-landing.sh

# Exécuter le script
./scripts/update-vps-landing.sh
```

---

## 🔍 Vérifications Post-Déploiement

### 1. Vérifier les Services PM2

```bash
pm2 status

# Devrait afficher :
# platform  | online | 0s | 0  | 0b
# client    | online | 0s | 0  | 0b
```

### 2. Tester les Endpoints API

```bash
# Test de santé
curl https://api.talosprimes.com/health

# Test landing content
curl https://api.talosprimes.com/api/landing/content

# Test testimonials
curl https://api.talosprimes.com/api/landing/testimonials
```

### 3. Vérifier le Frontend

Ouvrir dans le navigateur :
- ✅ Landing page : `https://talosprimes.com`
- ✅ Connexion : `https://talosprimes.com/login`
- ✅ CMS Admin : `https://talosprimes.com/dashboard/cms`
- ✅ Mentions légales : `https://talosprimes.com/mentions-legales`
- ✅ CGU : `https://talosprimes.com/cgu`
- ✅ CGV : `https://talosprimes.com/cgv`
- ✅ Confidentialité : `https://talosprimes.com/confidentialite`

### 4. Tester le Formulaire de Contact

1. Remplir le formulaire sur la landing page
2. Envoyer
3. Vérifier dans `/dashboard/cms` (onglet Messages) que le message apparaît

### 5. Tester le CMS

1. Se connecter avec un compte admin
2. Aller sur `/dashboard/cms`
3. Modifier une section de contenu
4. Sauvegarder
5. Recharger la landing page → voir le changement

---

## 🗄️ Gestion de la Base de Données

### Backup Avant Mise à Jour (Important !)

```bash
# Sur le VPS
cd /var/www/talosprimes/packages/platform

# Créer un backup
pg_dump $DATABASE_URL > ~/backup-talosprimes-$(date +%Y%m%d-%H%M%S).sql

# Ou si vous utilisez Supabase, faire un backup via l'interface
```

### Vérifier les Nouvelles Tables

```bash
# Se connecter à la base de données
npx prisma studio

# Ou en ligne de commande
npx prisma db execute --sql "SELECT * FROM testimonials LIMIT 5;"
npx prisma db execute --sql "SELECT * FROM landing_content LIMIT 5;"
npx prisma db execute --sql "SELECT * FROM contact_messages LIMIT 5;"
```

---

## 🔧 Troubleshooting

### Problème : "Module not found"

```bash
# Réinstaller toutes les dépendances
rm -rf node_modules
pnpm install
pnpm build
pm2 restart all
```

### Problème : Erreur Prisma

```bash
cd packages/platform

# Régénérer le client
pnpm prisma generate

# Réappliquer les migrations
pnpm prisma db push

# Vérifier le schéma
npx prisma studio
```

### Problème : PM2 ne redémarre pas

```bash
# Arrêter tous les processus
pm2 stop all

# Supprimer les processus
pm2 delete all

# Redémarrer depuis le début
cd /var/www/talosprimes

# Backend
cd packages/platform
pm2 start npm --name "platform" -- start

# Frontend
cd ../client
pm2 start npm --name "client" -- start

# Sauvegarder la configuration
pm2 save
```

### Problème : Pages 404

```bash
# Vérifier Nginx
sudo nginx -t

# Relancer Nginx si besoin
sudo systemctl reload nginx

# Vérifier les logs
sudo tail -f /var/log/nginx/error.log
```

### Problème : "Database locked" ou timeout

```bash
# Redémarrer PostgreSQL (Supabase)
# Ou augmenter le timeout dans .env
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000
```

---

## 📊 Monitoring

### Vérifier les Logs PM2

```bash
# Logs en temps réel
pm2 logs

# Logs d'une app spécifique
pm2 logs platform
pm2 logs client

# Dernières 100 lignes
pm2 logs --lines 100

# Logs d'erreur uniquement
pm2 logs --err
```

### Vérifier les Performances

```bash
# Monitoring PM2
pm2 monit

# Utilisation mémoire/CPU
pm2 status
```

### Vérifier Nginx

```bash
# Logs d'accès
sudo tail -f /var/log/nginx/access.log

# Logs d'erreur
sudo tail -f /var/log/nginx/error.log
```

---

## 🎯 Checklist Complète de Déploiement

### Avant le Déploiement
- [ ] Tests locaux OK (landing page, CMS, formulaire)
- [ ] Commit et push vers GitHub
- [ ] Backup de la base de données VPS

### Pendant le Déploiement
- [ ] Connexion SSH au VPS
- [ ] `git pull origin main`
- [ ] `pnpm install`
- [ ] `pnpm prisma generate`
- [ ] `pnpm prisma db push`
- [ ] `npx tsx prisma/seed-landing.ts`
- [ ] `pnpm build`
- [ ] `pm2 restart all`

### Après le Déploiement
- [ ] `pm2 status` - Tous les services online
- [ ] Landing page accessible et responsive
- [ ] CMS admin accessible
- [ ] Pages légales accessibles
- [ ] Formulaire de contact fonctionnel
- [ ] API endpoints répondent
- [ ] Aucune erreur dans `pm2 logs`

---

## 🚀 Déploiement en Une Commande

Pour simplifier, ajoutez cet alias dans votre `.bashrc` ou `.zshrc` sur le VPS :

```bash
# Sur le VPS, éditer le fichier
nano ~/.bashrc

# Ajouter à la fin
alias update-talos='cd /var/www/talosprimes && ./scripts/update-vps-landing.sh'

# Sauvegarder et recharger
source ~/.bashrc
```

Ensuite, pour déployer :

```bash
# Sur VPS, simplement :
update-talos
```

---

## 📝 Variables d'Environnement à Vérifier

### Backend (.env)

```env
# Base de données
DATABASE_URL="postgresql://..."

# API
PORT=3001
NODE_ENV=production

# CORS
CORS_ORIGIN=https://talosprimes.com

# n8n
N8N_WEBHOOK_URL=https://n8n.talosprimes.com
```

### Frontend (.env.local)

```env
# API Backend
NEXT_PUBLIC_API_URL=https://api.talosprimes.com
```

---

## 🎉 Résumé

**Workflow simple :**

1. **Sur Mac** :
   ```bash
   git add .
   git commit -m "Message"
   git push origin main
   ```

2. **Sur VPS** :
   ```bash
   ssh root@VPS_IP
   cd /var/www/talosprimes
   ./scripts/update-vps-landing.sh
   ```

3. **Vérifier** :
   - https://talosprimes.com (landing page)
   - https://talosprimes.com/dashboard/cms (admin)

**C'est tout ! 🚀**

---

## 📞 En Cas de Problème

1. Vérifier `pm2 logs`
2. Vérifier `/var/log/nginx/error.log`
3. Tester les endpoints API avec `curl`
4. Restaurer le backup si nécessaire
5. Consulter la documentation dans `/docs`

**Bon déploiement ! 🎊**
