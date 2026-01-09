# Migration Prisma - Table Notifications

## Problème
Le modèle `Notification` a été ajouté dans `schema.prisma`, mais la migration n'a pas été générée, ce qui cause des erreurs TypeScript lors du build.

## Solution

### Sur le VPS (Production)

Exécutez ces commandes depuis `/var/www/talosprimes/packages/platform` :

```bash
# 1. Générer la migration (mode dev, pour créer le fichier de migration)
pnpm prisma migrate dev --name add_notifications_table --create-only

# 2. Appliquer la migration à la base de données (production)
pnpm prisma migrate deploy

# 3. Régénérer le client Prisma TypeScript
pnpm prisma generate

# 4. Rebuild le projet
pnpm build
```

### Alternative : Génération du client uniquement (si la migration existe déjà)

Si la table `notifications` existe déjà dans la base de données, vous pouvez simplement régénérer le client Prisma :

```bash
pnpm prisma generate
pnpm build
```

### Vérification

Pour vérifier que tout fonctionne :

```bash
# Vérifier que le modèle Notification existe dans le client Prisma
pnpm prisma studio
# Ouvrez http://localhost:5555 et vérifiez que la table "notifications" existe
```

## Commandes rapides

```bash
cd /var/www/talosprimes/packages/platform
pnpm prisma migrate dev --name add_notifications_table --create-only
pnpm prisma migrate deploy
pnpm prisma generate
pnpm build
```

## Structure de la table

La table `notifications` aura les colonnes suivantes :
- `id` (UUID, primary key)
- `tenant_id` (UUID, foreign key vers `tenants`)
- `type` (String, ex: "lead_inscription")
- `titre` (String)
- `message` (Text)
- `donnees` (JSON, nullable)
- `lu` (Boolean, default: false)
- `created_at` (Timestamp)

## Index

Les index suivants seront créés :
- Sur `tenant_id`
- Sur `type`
- Sur `lu`
- Sur `created_at`

