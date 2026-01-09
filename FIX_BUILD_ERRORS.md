# 🔧 Fix : Erreurs de build TypeScript

## ❌ Erreurs rencontrées

```
error TS2353: Object literal may only specify known properties, and 'mustChangePassword' does not exist
error TS2353: Object literal may only specify known properties, and 'temporaryPassword' does not exist
error TS2353: Object literal may only specify known properties, and 'createdAt' does not exist
```

## 🔍 Cause

Le client Prisma n'a pas été régénéré après les modifications du schéma. Les nouveaux champs (`mustChangePassword`, `temporaryPassword`) n'existent pas dans les types TypeScript générés.

## ✅ Solution

### 1. Appliquer la migration Prisma

Sur le VPS, exécuter :

```bash
cd /var/www/talosprimes/packages/platform
pnpm prisma db push
pnpm prisma generate
```

Ou utiliser le script automatique :

```bash
cd /var/www/talosprimes
./scripts/fix-prisma-migration.sh
```

### 2. Vérifier les corrections appliquées

J'ai corrigé :
- ✅ `createdAt` → `updatedAt` (car `createdAt` n'est pas un champ orderBy valide, il faut utiliser `updatedAt`)
- ✅ Le script `fix-prisma-migration.sh` pour appliquer automatiquement les migrations

### 3. Relancer le build

```bash
cd /var/www/talosprimes
pnpm build
```

## 📝 Modifications du schéma

Les champs suivants ont été ajoutés :
- `User.mustChangePassword` : Boolean (force le changement de mot de passe à la première connexion)
- `ClientSubscription.temporaryPassword` : String? (stockage temporaire du mot de passe en clair)

## ⚠️ Important

**Le client Prisma DOIT être régénéré après chaque modification du schéma** :
1. Modifier `schema.prisma`
2. Exécuter `prisma db push` (pour appliquer au DB)
3. Exécuter `prisma generate` (pour régénérer les types TypeScript)

