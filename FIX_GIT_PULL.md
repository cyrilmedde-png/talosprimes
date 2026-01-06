# Correction : Conflit Git Pull

## 🔍 Problème

Vous avez des modifications locales dans `packages/client/next.config.js` qui empêchent le pull.

## ✅ Solution

### Option 1 : Stasher les modifications (recommandé)

```bash
cd /var/www/talosprimes

# Sauvegarder les modifications locales
git stash

# Récupérer les dernières modifications
git pull origin main

# Voir les modifications sauvegardées (optionnel)
git stash list

# Si vous avez besoin de réappliquer les modifications
git stash pop
```

### Option 2 : Écraser les modifications locales

Si vous êtes sûr que les modifications du repo sont correctes :

```bash
cd /var/www/talosprimes

# Écraser les modifications locales
git checkout -- packages/client/next.config.js

# Récupérer les dernières modifications
git pull origin main
```

### Option 3 : Commiter les modifications locales

Si vos modifications locales sont importantes :

```bash
cd /var/www/talosprimes

# Voir les différences
git diff packages/client/next.config.js

# Si les modifications sont correctes, les commiter
git add packages/client/next.config.js
git commit -m "fix: Configuration locale next.config.js"

# Puis pull (il y aura peut-être un conflit à résoudre)
git pull origin main
```

## 📋 Recommandation

Utilisez l'**Option 1** (stash) car :
- Elle préserve vos modifications
- Elle permet de récupérer les dernières modifications du repo
- Vous pouvez voir les différences après

## 🔄 Après le pull

Une fois le pull réussi, vérifiez que `next.config.js` est correct :

```bash
cat packages/client/next.config.js
```

Il ne devrait **pas** avoir `output: 'standalone'` (on l'a retiré dans le commit `32afb16`).

