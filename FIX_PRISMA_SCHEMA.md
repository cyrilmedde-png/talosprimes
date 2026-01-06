# Correction du Schema Prisma

## Problème résolu

Les caractères accentués dans les enums Prisma ne sont pas supportés. J'ai corrigé :

- `résilié` → `resilie`
- `annulé` → `annule`
- `envoyée` → `envoyee`
- `payée` → `payee`
- `annulée` → `annulee`
- `succès` → `succes`
- `nomAffiché` → `nomAffiche`

## Changements effectués

1. ✅ Schema Prisma corrigé (`packages/platform/prisma/schema.prisma`)
2. ✅ Types partagés mis à jour (`packages/shared/src/types/index.ts`)
3. ✅ Constantes mises à jour (`packages/shared/src/constants/index.ts`)

## Sur votre VPS

Maintenant vous pouvez exécuter :

```bash
cd /var/www/talosprimes/packages/platform
pnpm db:generate
```

Cela devrait fonctionner sans erreur !

## Note importante

Les valeurs en base de données peuvent garder les accents via `@map()`, mais les **noms d'enum Prisma** doivent être sans accent.

Par exemple :
- Enum Prisma : `resilie`
- Colonne DB : `résilié` (via `@map("résilié")` si nécessaire)
- Affichage UI : Vous pouvez afficher "Résilié" dans l'interface

