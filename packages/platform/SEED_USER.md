# Script de Seed - Création Utilisateur Admin

## Utilisation

### Sur votre VPS

```bash
cd /var/www/talosprimes/packages/platform

# Exécuter le script de seed
pnpm db:seed
```

## Ce que fait le script

Le script crée automatiquement :

1. **Un tenant (entreprise)** :
   - Nom : "TalosPrimes Admin"
   - Email : groupemclem@gmail.com
   - Statut : actif

2. **Un utilisateur super_admin** :
   - Email : `groupemclem@gmail.com`
   - Mot de passe : `21052024_Aa!`
   - Rôle : `super_admin` (droits complets)
   - Statut : actif

3. **Un abonnement de base** :
   - Montant : 0€ (pour commencer)
   - Statut : ok

## Résultat attendu

```
🌱 Démarrage du seed...
📦 Création du tenant principal...
✅ Tenant créé: TalosPrimes Admin (uuid)
👤 Création de l'utilisateur admin...
✅ Utilisateur créé: groupemclem@gmail.com (rôle: super_admin)
💳 Création de l'abonnement...
✅ Abonnement créé (montant: 0€)

🎉 Seed terminé avec succès !

📋 Résumé:
   - Tenant: TalosPrimes Admin
   - Email: groupemclem@gmail.com
   - Rôle: super_admin
   - Mot de passe: 21052024_Aa!

🔐 Vous pouvez maintenant vous connecter avec ces identifiants.
```

## Tester la connexion

Après avoir exécuté le seed, testez la connexion :

```bash
# Tester le login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "groupemclem@gmail.com",
    "password": "21052024_Aa!"
  }'
```

Vous devriez recevoir un token JWT.

## Réexécuter le seed

Le script utilise `upsert`, donc vous pouvez le réexécuter sans problème :
- Si l'utilisateur existe déjà, il sera mis à jour
- Si l'utilisateur n'existe pas, il sera créé

## Sécurité

⚠️ **Important** : Après le premier déploiement en production, changez le mot de passe par défaut !

Le script est dans `prisma/seed.ts` - vous pouvez le modifier si besoin.

