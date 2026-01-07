# Migration : Onboarding + Paramètres Entreprise + Gestion Utilisateurs

## 📋 Changements

### 1. Modèle Tenant (Entreprise)
Ajout des champs :
- `siren` : Numéro SIREN
- `codeAPE` : Code APE
- `codeNAF` : Code NAF
- `statutJuridique` : Statut juridique (enum avec tous les statuts français)
- `codePostal` : Code postal
- `ville` : Ville
- `telephone` : Téléphone

### 2. Modèle User (Utilisateur)
Ajout des champs :
- `nom` : Nom de l'utilisateur
- `prenom` : Prénom de l'utilisateur
- `telephone` : Téléphone
- `fonction` : Fonction dans l'entreprise
- `salaire` : Salaire (Decimal)
- `dateEmbauche` : Date d'embauche

### 3. Nouveau modèle Lead
- Déjà créé dans la migration précédente

### 4. Nouveau enum StatutJuridique
Tous les statuts juridiques français :
- SA, SARL, SAS, SASU, SCI, SNC, SCS, SCA
- EURL, SCP, SEL, SELARL, SELAS, SELAFA
- AUTO_ENTREPRENEUR, EIRL, ENTREPRISE_INDIVIDUELLE

## 🔄 Migration de la base de données

### Sur votre VPS :

```bash
cd /var/www/talosprimes

# 1. Récupérer les dernières modifications
git pull origin main

# 2. Installer les dépendances (si nécessaire)
pnpm install

# 3. Générer le client Prisma avec les nouveaux champs
cd packages/platform
pnpm db:generate

# 4. Appliquer les changements à la base de données
pnpm db:push

# 5. Rebuilder le backend
pnpm build

# 6. Redémarrer le backend
pm2 restart talosprimes-api

# 7. Rebuilder le frontend
cd ../client
pnpm build

# 8. Redémarrer le frontend
pm2 restart talosprimes-client
```

## ✅ Vérification

### 1. Vérifier que le backend répond

```bash
curl http://localhost:3001/health
```

### 2. Tester les nouvelles routes

```bash
# Profil entreprise
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/tenant

# Liste des utilisateurs
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/users

# Liste des leads avec filtre
curl -H "Authorization: Bearer <token>" "http://localhost:3001/api/leads?source=formulaire_inscription"
```

## 📊 Nouvelles fonctionnalités

### Frontend

1. **Page Onboarding** (`/dashboard/onboarding`) :
   - Affichage des leads inscrits (formulaire)
   - Affichage des leads créés par admin
   - Filtres par source
   - Recherche
   - Statistiques

2. **Page Paramètres** (`/dashboard/settings`) :
   - **Onglet Profil Entreprise** :
     - Configuration complète de l'entreprise
     - Tous les statuts juridiques français
     - SIRET, SIREN, Code APE/NAF
     - Coordonnées complètes
   - **Onglet Utilisateurs** :
     - Création d'utilisateurs
     - Liste des utilisateurs
     - Informations détaillées (fonction, salaire, date d'embauche)

### Backend

1. **Routes `/api/tenant`** :
   - `GET /` : Obtenir le profil entreprise
   - `PUT /` : Mettre à jour le profil entreprise

2. **Routes `/api/users`** :
   - `GET /` : Lister les utilisateurs du tenant
   - `POST /` : Créer un utilisateur
   - `PUT /:id` : Mettre à jour un utilisateur
   - `DELETE /:id` : Supprimer un utilisateur

3. **Routes `/api/leads`** (améliorées) :
   - `GET /?source=formulaire_inscription` : Filtrer par source
   - `GET /?statut=nouveau` : Filtrer par statut
   - `GET /?limit=50` : Limiter le nombre de résultats

## 🎯 Utilisation

### Configurer le profil entreprise

1. Aller dans **Paramètres** → **Profil Entreprise**
2. Remplir tous les champs
3. Sélectionner le statut juridique
4. Cliquer sur **Enregistrer**

### Créer un utilisateur

1. Aller dans **Paramètres** → **Utilisateurs**
2. Remplir le formulaire de création
3. Définir le rôle (admin, collaborateur, lecture_seule)
4. Ajouter les informations optionnelles (fonction, salaire, etc.)
5. Cliquer sur **Créer l'utilisateur**

### Consulter les leads

1. Aller dans **Onboarding**
2. Utiliser les filtres pour voir :
   - Tous les leads
   - Leads inscrits (formulaire)
   - Leads créés par admin
3. Utiliser la recherche pour trouver un lead spécifique

