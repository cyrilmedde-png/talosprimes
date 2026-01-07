# 🚀 Mise à jour automatique du VPS

## 📋 Script automatique (Recommandé)

Un script a été créé pour automatiser complètement la mise à jour du VPS.

### Utilisation

```bash
# Sur le VPS, depuis n'importe quel répertoire
/var/www/talosprimes/scripts/update-vps.sh
```

### Ce que fait le script

1. ✅ **Récupère les modifications** depuis GitHub (`git pull`)
2. ✅ **Installe les dépendances** (`pnpm install`)
3. ✅ **Build tous les packages** (shared, platform, client)
4. ✅ **Redémarre les services PM2** (backend et frontend)
5. ✅ **Affiche le statut** des services

### Options

```bash
# Ignorer le build (si vous avez déjà buildé)
/var/www/talosprimes/scripts/update-vps.sh --skip-build

# Ignorer le redémarrage (si vous voulez redémarrer manuellement)
/var/www/talosprimes/scripts/update-vps.sh --skip-restart

# Ignorer les deux
/var/www/talosprimes/scripts/update-vps.sh --skip-build --skip-restart
```

### Alias pratique (optionnel)

Ajoutez ceci à votre `~/.bashrc` ou `~/.zshrc` sur le VPS :

```bash
alias update-talosprimes="/var/www/talosprimes/scripts/update-vps.sh"
```

Ensuite, vous pouvez simplement taper :
```bash
update-talosprimes
```

## 📝 Commandes manuelles

Si vous préférez faire la mise à jour manuellement :

```bash
# 1. Aller dans le répertoire du projet
cd /var/www/talosprimes

# 2. Récupérer les modifications
git pull origin main

# 3. Installer les dépendances
pnpm install

# 4. Build shared
cd packages/shared
pnpm build
cd ../..

# 5. Build platform
cd packages/platform
pnpm build
cd ../..

# 6. Build client
cd packages/client
pnpm build
cd ../..

# 7. Redémarrer backend
pm2 restart talosprimes-api

# 8. Redémarrer frontend
pm2 restart talosprimes-client

# 9. Vérifier le statut
pm2 list
```

## 🔄 Workflow recommandé

1. **Développement local** : Modifications dans votre IDE
2. **Commit et push** : Les commits sont automatiquement poussés sur GitHub
3. **Mise à jour VPS** : Exécutez le script `update-vps.sh` sur le VPS

## ⚠️ En cas d'erreur

Si le script échoue :

1. Vérifiez les logs PM2 :
   ```bash
   pm2 logs talosprimes-api --lines 50
   pm2 logs talosprimes-client --lines 50
   ```

2. Vérifiez que les services sont bien démarrés :
   ```bash
   pm2 list
   ```

3. Si un service n'existe pas, créez-le :
   ```bash
   # Backend
   cd /var/www/talosprimes/packages/platform
   pm2 start "pnpm start" --name talosprimes-api
   pm2 save

   # Frontend
   cd /var/www/talosprimes/packages/client
   pm2 start "pnpm start" --name talosprimes-client
   pm2 save
   ```

## 📧 Notifications

Le script affiche des messages colorés pour indiquer :
- 🔵 **Bleu** : Informations générales
- 🟡 **Jaune** : Actions en cours
- 🟢 **Vert** : Succès
- 🔴 **Rouge** : Erreurs

