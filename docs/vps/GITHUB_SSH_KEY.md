# Configuration Clé SSH pour GitHub

## Pourquoi une clé SSH ?

Une clé SSH vous permet de vous connecter à GitHub **sans entrer votre mot de passe** à chaque fois. Plus sûr et plus pratique !

## Méthode 1 : Clé SSH (Recommandée) 🔐

### Étape 1 : Vérifier si vous avez déjà une clé SSH

```bash
ls -al ~/.ssh
```

Si vous voyez des fichiers `id_ed25519` ou `id_rsa`, vous avez déjà une clé. Passez à l'étape 3.

### Étape 2 : Créer une nouvelle clé SSH

```bash
# Créer une clé SSH (remplacez votre.email@example.com par votre email GitHub)
ssh-keygen -t ed25519 -C "votre.email@example.com"

# Appuyez sur Entrée pour accepter l'emplacement par défaut
# Créez un mot de passe ou appuyez sur Entrée pour ne pas en mettre (optionnel mais recommandé)
```

**Exemple de sortie :**
```
Generating public/private ed25519 key pair.
Enter file in which to save the key (/Users/votre-user/.ssh/id_ed25519): [Appuyez sur Entrée]
Enter passphrase (empty for no passphrase): [Tapez un mot de passe ou Entrée]
Enter same passphrase again: [Répétez le mot de passe ou Entrée]
```

### Étape 3 : Copier votre clé publique

```bash
# Afficher et copier la clé publique
cat ~/.ssh/id_ed25519.pub

# OU sur macOS, copier directement dans le presse-papiers :
pbcopy < ~/.ssh/id_ed25519.pub
```

### Étape 4 : Ajouter la clé sur GitHub

1. **Allez sur GitHub** : https://github.com/settings/keys
2. Cliquez sur **"New SSH key"**
3. **Title** : Donnez un nom (ex: "MacBook Pro" ou "Mon ordinateur")
4. **Key** : Collez le contenu que vous avez copié (commence par `ssh-ed25519...`)
5. Cliquez sur **"Add SSH key"**
6. Entrez votre mot de passe GitHub pour confirmer

### Étape 5 : Tester la connexion

```bash
# Tester la connexion SSH
ssh -T git@github.com
```

Vous devriez voir :
```
Hi VOTRE_USERNAME! You've successfully authenticated, but GitHub does not provide shell access.
```

### Étape 6 : Utiliser SSH avec Git

Lorsque vous ajoutez le remote, utilisez l'URL SSH :

```bash
# Au lieu de :
git remote add origin https://github.com/VOTRE_USERNAME/talosprimes.git

# Utilisez :
git remote add origin git@github.com:VOTRE_USERNAME/talosprimes.git
```

---

## Méthode 2 : Personal Access Token (Alternative) 🔑

Si vous préférez HTTPS au lieu de SSH :

### Étape 1 : Créer un token

1. Allez sur : https://github.com/settings/tokens
2. Cliquez sur **"Generate new token"** → **"Generate new token (classic)"**
3. Donnez un nom : `talosprimes`
4. Choisissez l'expiration : `90 days` (ou `No expiration` pour développement)
5. Cochez les permissions :
   - ✅ `repo` (toutes les sous-permissions)
6. Cliquez sur **"Generate token"** en bas
7. **COPIEZ LE TOKEN** (vous ne pourrez plus le voir !)

### Étape 2 : Utiliser le token

Quand vous faites `git push`, GitHub vous demandera :
- **Username** : votre nom d'utilisateur GitHub
- **Password** : **collez le token** (pas votre mot de passe GitHub !)

Ou configurez Git Credential Manager pour sauvegarder le token :

```bash
# Sauvegarder le token dans le keychain macOS
git config --global credential.helper osxkeychain
```

---

## Comparaison

| Méthode | Avantages | Inconvénients |
|---------|-----------|---------------|
| **SSH** | Plus sûr, pas besoin de token, fonctionne partout | Configuration initiale un peu plus complexe |
| **Token HTTPS** | Plus simple, fonctionne immédiatement | Token à renouveler, moins sûr |

## Recommandation

**Utilisez SSH** si vous travaillez souvent avec Git (plus pratique à long terme).  
**Utilisez Token** si c'est juste pour un projet et que vous voulez être rapide.

---

## Troubleshooting

### Erreur "Permission denied (publickey)"

```bash
# Vérifier que l'agent SSH a votre clé
ssh-add ~/.ssh/id_ed25519

# Vérifier la connexion
ssh -T git@github.com
```

### Changer de HTTPS à SSH

Si vous avez déjà ajouté le remote en HTTPS :

```bash
# Supprimer l'ancien remote
git remote remove origin

# Ajouter avec SSH
git remote add origin git@github.com:VOTRE_USERNAME/talosprimes.git

# Vérifier
git remote -v
```

---

## Commandes complètes pour votre projet

**Une fois la clé SSH configurée :**

```bash
cd "/Users/giiz_mo_o/Desktop/devellopement application/talosprimes"

git init
git config user.name "Votre Nom"
git config user.email "votre.email@example.com"
git add .
git commit -m "Initial commit"
git remote add origin git@github.com:VOTRE_USERNAME/talosprimes.git
git branch -M main
git push -u origin main
```

Plus besoin de mot de passe ! 🎉

