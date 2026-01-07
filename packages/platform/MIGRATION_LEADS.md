# Migration : Ajout du modèle Lead

## 📋 Changements

Un nouveau modèle `Lead` a été ajouté au schéma Prisma pour enregistrer les demandes d'inscription.

## 🔄 Migration de la base de données

### Sur votre VPS :

```bash
cd /var/www/talosprimes/packages/platform

# Générer le client Prisma avec le nouveau modèle
pnpm db:generate

# Appliquer les changements à la base de données
pnpm db:push
```

### Vérification

```bash
# Vérifier que la table a été créée
pnpm db:studio
# Ou via SQL :
# SELECT * FROM leads LIMIT 10;
```

## 📊 Modèle Lead

Le modèle contient :
- `id` : UUID unique
- `nom` : Nom du lead
- `prenom` : Prénom du lead
- `email` : Email (unique)
- `telephone` : Numéro de téléphone
- `statut` : nouveau | contacte | converti | abandonne
- `source` : Source du lead (par défaut: "formulaire_inscription")
- `notes` : Notes optionnelles
- `dateContact` : Date de contact (si contacté)
- `createdAt` : Date de création
- `updatedAt` : Date de mise à jour

## 🔌 API disponible

### Créer un lead (Public)
```
POST /api/leads
Body: {
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean@example.com",
  "telephone": "+33612345678"
}
```

### Lister les leads (Admin)
```
GET /api/leads
Headers: Authorization: Bearer <token>
```

### Obtenir un lead (Admin)
```
GET /api/leads/:id
Headers: Authorization: Bearer <token>
```

### Mettre à jour le statut (Admin)
```
PATCH /api/leads/:id/statut
Headers: Authorization: Bearer <token>
Body: {
  "statut": "contacte"
}
```

## ✅ Après migration

1. Le workflow n8n sauvegarde automatiquement les leads
2. Vous pouvez consulter les leads via l'API (admin)
3. Les leads sont enregistrés en base de données

