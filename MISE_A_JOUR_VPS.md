# Guide de mise à jour du VPS

## 🚀 Script de mise à jour automatique

Un script complet est disponible pour mettre à jour automatiquement le VPS :

```bash
cd /var/www/talosprimes
./scripts/update-vps.sh
```

## 📋 Ce que fait le script

Le script `update-vps.sh` effectue automatiquement :

1. **Mise à jour de pnpm** (8.15.0 → dernière version)
   - Détecte la version actuelle
   - Met à jour via corepack (méthode recommandée)
   - Ou via npm si corepack n'est pas disponible
   - Ou via script d'installation si nécessaire

2. **Récupération du code** depuis GitHub
   - `git pull origin main`

3. **Installation des dépendances**
   - `pnpm install`

4. **Build des packages**
   - Build `@talosprimes/shared`
   - Build `@talosprimes/platform`
   - Build `@talosprimes/client`

5. **Redémarrage des services PM2**
   - Redémarre `talosprimes-api` (backend)
   - Redémarre `talosprimes-client` (frontend)

6. **Affichage du statut**
   - Affiche le statut de tous les services PM2

## ⚙️ Options disponibles

```bash
# Mise à jour complète (recommandé)
./scripts/update-vps.sh

# Ignorer le build (si pas de changements de code)
./scripts/update-vps.sh --skip-build

# Ignorer le redémarrage (pour tester avant)
./scripts/update-vps.sh --skip-restart

# Ignorer build ET redémarrage (juste pull + install)
./scripts/update-vps.sh --skip-build --skip-restart
```

## 🔧 Mise à jour manuelle de pnpm uniquement

Si tu veux juste mettre à jour pnpm sans faire tout le reste :

```bash
# Méthode 1 : Via corepack (recommandé)
corepack enable
corepack prepare pnpm@latest --activate

# Méthode 2 : Via npm
npm install -g pnpm@latest

# Méthode 3 : Via script d'installation
curl -fsSL https://get.pnpm.io/install.sh | sh -
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

# Vérifier la version
pnpm --version
```

## 📝 Exemple de sortie

```
========================================
  Mise à jour TalosPrimes VPS
========================================

📦 Vérification et mise à jour de pnpm...
  Version actuelle: 8.15.0
  → Mise à jour via corepack...
  ✅ pnpm mis à jour vers 10.27.0

📥 Récupération des modifications depuis GitHub...
✅ Modifications récupérées avec succès

📦 Installation des dépendances...
✅ Dépendances installées avec succès

🔨 Build des packages...
  → Build @talosprimes/shared...
  ✅ Shared buildé
  → Build @talosprimes/platform...
  ✅ Platform buildé
  → Build @talosprimes/client...
  ✅ Client buildé
✅ Tous les packages ont été buildés

🔄 Redémarrage des services PM2...
  ✅ Backend redémarré
  ✅ Frontend redémarré
✅ Services redémarrés

📊 Statut des services:
┌─────┬─────────────────────┬─────────┬─────────┬──────────┬─────────┐
│ id  │ name                │ mode    │ ↺       │ status   │ cpu     │
├─────┼─────────────────────┼─────────┼─────────┼──────────┼─────────┤
│ 0   │ talosprimes-api     │ cluster │ 0       │ online   │ 0%      │
│ 1   │ talosprimes-client  │ cluster │ 0       │ online   │ 0%      │
└─────┴─────────────────────┴─────────┴─────────┴──────────┴─────────┘

========================================
  ✅ Mise à jour terminée avec succès!
========================================
```

## ⚠️ En cas d'erreur

Si le script échoue :

1. **Vérifier les permissions** :
   ```bash
   chmod +x scripts/update-vps.sh
   ```

2. **Vérifier que git est à jour** :
   ```bash
   git status
   ```

3. **Vérifier que pnpm est accessible** :
   ```bash
   which pnpm
   pnpm --version
   ```

4. **Vérifier les logs PM2** :
   ```bash
   pm2 logs talosprimes-api --lines 50
   pm2 logs talosprimes-client --lines 50
   ```

## 🔄 Fréquence recommandée

- **Mise à jour complète** : Après chaque `git push` sur le VPS
- **Mise à jour pnpm** : Quand tu vois le message "Update available!" dans les logs
- **Mise à jour système** : Mensuellement ou selon les besoins

