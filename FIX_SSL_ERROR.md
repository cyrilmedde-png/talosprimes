# Correction de l'erreur SSL/TLS GitHub

## Erreur rencontrée
```
fatal: unable to access 'https://github.com/...': error setting certificate verify locations
```

## Solution 1 : Passer à SSH (Recommandée) ✅

Puisque vous avez déjà configuré votre clé SSH, utilisez-la :

```bash
# Changer le remote en SSH
git remote set-url origin git@github.com:cyrimedde-png/talosprimes.git

# Vérifier
git remote -v

# Pousser (plus besoin de certificat SSL)
git push -u origin main
```

**C'est la meilleure solution !** Plus de problème de certificat et plus besoin de mot de passe.

---

## Solution 2 : Corriger la configuration SSL (si vous voulez rester en HTTPS)

### Option A : Désactiver temporairement la vérification (déconseillé)

```bash
git config --global http.sslVerify false
git push -u origin main
```

⚠️ **Attention** : C'est moins sécurisé, mais ça fonctionnera.

### Option B : Configurer le bundle de certificats macOS

```bash
# Installer les certificats Homebrew (si vous avez Homebrew)
brew install ca-certificates

# Configurer Git pour utiliser les certificats système
git config --global http.sslCAInfo /usr/local/etc/ca-certificates/cert.pem
```

Ou si vous n'avez pas Homebrew :

```bash
# Télécharger le bundle de certificats
curl -L https://curl.se/ca/cacert.pem -o ~/cacert.pem

# Configurer Git
git config --global http.sslCAInfo ~/cacert.pem
```

---

## Solution 3 : Mettre à jour Git

Parfois, une version ancienne de Git cause ce problème :

```bash
# Vérifier la version
git --version

# Mettre à jour Git (via Homebrew)
brew upgrade git

# Ou installer Git via Homebrew
brew install git
```

---

## 🎯 Recommandation

**Utilisez la Solution 1 (SSH)** - C'est la plus simple et la plus sûre. Vous avez déjà configuré votre clé SSH, donc c'est la solution idéale !

