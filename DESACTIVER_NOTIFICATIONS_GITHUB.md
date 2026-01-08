# Désactiver les notifications GitHub par email

Ce guide explique comment arrêter de recevoir des emails à chaque push sur GitHub.

---

## 🎯 Solution rapide (via GitHub Web)

### 1. Désactiver les notifications par email

1. Aller sur [GitHub.com](https://github.com)
2. Cliquer sur ton **profil** (en haut à droite) → **Settings**
3. Dans le menu de gauche : **Notifications**
4. Section **"Email notifications"** :
   - Décocher **"Actions"** (pour ne plus recevoir d'emails sur les CI/CD)
   - Décocher **"Security alerts"** (pour ne plus recevoir d'emails GitGuardian)
   - Ou cocher **"Only receive notifications for repositories you're watching"** (reçoit seulement pour les repos que tu suis)

### 2. Désactiver les notifications pour un repository spécifique

1. Aller sur ton repository : `https://github.com/cyrilmedde-png/talosprimes`
2. Cliquer sur **"Settings"** (onglet en haut)
3. Dans le menu de gauche : **Notifications**
4. Décocher **"Actions"** et **"Security alerts"**

---

## 🔧 Solution complète (via GitHub CLI - optionnel)

Si tu as `gh` (GitHub CLI) installé :

```bash
# Désactiver toutes les notifications par email
gh api user/email/settings -X PATCH -f email='ton-email@example.com' -f primary=true

# Désactiver les notifications Actions
gh api user/notifications/settings -X PATCH -f action_notification_setting='off'
```

---

## 🛡️ Corriger le secret exposé (GitGuardian)

### Option 1 : Marquer comme "False Positive" (si c'est un exemple)

1. Cliquer sur le lien dans l'email GitGuardian
2. Cliquer sur **"Mark As False Positive"**
3. GitGuardian ne t'enverra plus d'alertes pour ce secret

### Option 2 : Supprimer le secret de l'historique Git (si vraiment exposé)

Si un vrai secret a été commité, il faut le supprimer de l'historique Git :

```bash
# ⚠️ ATTENTION : Cela réécrit l'historique Git
# Ne le fais que si tu es sûr que personne d'autre n'a cloné le repo

# Installer git-filter-repo (si nécessaire)
pip install git-filter-repo

# Supprimer le secret de tout l'historique
git filter-repo --invert-paths --path scripts/analyze-database-url.sh

# Force push (⚠️ DANGEREUX si d'autres personnes travaillent sur le repo)
git push origin --force --all
```

**⚠️ Attention** : Si d'autres personnes ont cloné le repo, il faut les prévenir car elles devront re-cloner.

---

## 📋 Configuration recommandée

### Notifications GitHub (Settings → Notifications)

- ✅ **Email** : Décocher "Actions" et "Security alerts"
- ✅ **Web** : Garder activé (tu verras les notifications sur GitHub.com)
- ✅ **Mobile** : Désactiver si tu ne veux pas de notifications push

### Pour le repository `talosprimes`

- ✅ **Actions** : Désactiver les emails
- ✅ **Security alerts** : Désactiver les emails (ou les garder mais les consulter sur GitHub seulement)

---

## 🔍 Vérifier les secrets exposés

Pour voir tous les secrets détectés par GitGuardian :

1. Aller sur [GitGuardian Dashboard](https://dashboard.gitguardian.com)
2. Se connecter avec ton compte GitHub
3. Voir tous les secrets détectés
4. Les marquer comme "False Positive" ou les corriger

---

## ✅ Résultat attendu

Après ces modifications :
- ✅ Plus d'emails à chaque push
- ✅ Plus d'emails sur les CI/CD qui échouent
- ✅ Plus d'emails GitGuardian (ou seulement les critiques)
- ✅ Les notifications restent visibles sur GitHub.com (si tu veux)

---

## 🎯 Checklist

- [ ] Désactiver "Actions" dans Settings → Notifications
- [ ] Désactiver "Security alerts" dans Settings → Notifications (ou les garder mais sans email)
- [ ] Désactiver les notifications pour le repo `talosprimes` (optionnel)
- [ ] Marquer les alertes GitGuardian comme "False Positive" si ce sont des exemples
- [ ] Vérifier qu'on ne reçoit plus d'emails

---

**Après ça, tu ne recevras plus d'emails à chaque push !** 🎉

