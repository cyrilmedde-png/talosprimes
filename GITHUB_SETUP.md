# Guide pour pousser sur GitHub

## Étapes à suivre

### 1. Créer le repository sur GitHub

1. Allez sur [github.com](https://github.com) et connectez-vous
2. Cliquez sur le **+** en haut à droite → **New repository**
3. Nom : `talosprimes` (ou autre nom)
4. Description : `SaaS de gestion d'entreprise orchestré par n8n`
5. **Ne cochez PAS** "Initialize with README" (on a déjà un README)
6. Choisissez **Public** ou **Private** selon vos préférences
7. Cliquez sur **Create repository**

### 2. Initialiser Git localement

**Depuis votre machine locale** (pas le VPS), dans le dossier du projet :

```bash
cd "/Users/giiz_mo_o/Desktop/devellopement application/talosprimes"

# Initialiser Git
git init

# Configurer votre identité (remplacez par vos infos)
git config user.name "Votre Nom"
git config user.email "votre.email@example.com"

# Ou configurer globalement pour tous vos projets
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"
```

### 3. Ajouter tous les fichiers

```bash
# Vérifier que .env est bien ignoré
git check-ignore -v packages/platform/.env || echo ".env n'est PAS ignoré - VÉRIFIEZ!"

# Ajouter tous les fichiers
git add .

# Vérifier ce qui va être commité
git status
```

### 4. Premier commit

```bash
git commit -m "Initial commit: Architecture complète avec Fastify, Next.js, Prisma et Supabase"
```

### 5. Connecter au repository GitHub

**Remplacez `VOTRE_USERNAME` par votre nom d'utilisateur GitHub :**

```bash
# Ajouter le remote
git remote add origin https://github.com/VOTRE_USERNAME/talosprimes.git

# OU si vous utilisez SSH
git remote add origin git@github.com:VOTRE_USERNAME/talosprimes.git

# Vérifier
git remote -v
```

### 6. Pousser sur GitHub

```bash
# Renommer la branche principale en 'main' (standard GitHub)
git branch -M main

# Pousser
git push -u origin main
```

Si vous êtes demandé vos identifiants GitHub :
- Utilisateur : votre nom d'utilisateur GitHub
- Mot de passe : utilisez un **Personal Access Token** (pas votre mot de passe GitHub)

### 7. Créer un Personal Access Token (si nécessaire)

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. Donnez-lui un nom : `talosprimes`
4. Cochez `repo` (tous les droits sur les repositories)
5. Generate token
6. **COPIEZ-LE** (vous ne pourrez plus le voir)
7. Utilisez-le comme mot de passe lors du `git push`

## Vérification

Après le push, allez sur `https://github.com/VOTRE_USERNAME/talosprimes` et vous devriez voir tous vos fichiers !

## Commandes utiles ensuite

```bash
# Voir l'état
git status

# Ajouter des fichiers modifiés
git add .
git commit -m "Description des changements"
git push

# Créer une nouvelle branche
git checkout -b feature/nom-de-la-feature
git push -u origin feature/nom-de-la-feature

# Voir l'historique
git log --oneline
```

## ⚠️ Important : Fichiers sensibles

Les fichiers suivants sont **déjà exclus** par `.gitignore` :
- ✅ `packages/platform/.env` (variables d'environnement avec secrets)
- ✅ `packages/client/.env.local`
- ✅ `node_modules/`
- ✅ `.next/` (build Next.js)
- ✅ `dist/` (build TypeScript)

**NE COMMITEZ JAMAIS** ces fichiers avec vos secrets en production !

## En cas d'erreur

Si vous avez déjà un repo Git et voulez recommencer :

```bash
# Supprimer le dossier .git (ATTENTION : supprime l'historique)
rm -rf .git

# Puis refaire depuis l'étape 2
```

Ou si vous voulez forcer le push (attention) :

```bash
git push -u origin main --force
```

## Cloner sur le VPS (après le push)

Une fois poussé sur GitHub, vous pouvez cloner sur votre VPS :

```bash
cd /var/www
git clone https://github.com/VOTRE_USERNAME/talosprimes.git
cd talosprimes

# Installer les dépendances
pnpm install

# Configurer les .env (voir INSTRUCTIONS.md)
```

