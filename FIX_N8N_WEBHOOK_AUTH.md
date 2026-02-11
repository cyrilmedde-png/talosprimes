# 🔧 Fix : Désactiver l'Authentification pour les Webhooks n8n

**Problème confirmé :** n8n bloque les webhooks avec une erreur 403 "Authorization data is wrong!"

**Cause :** Votre instance n8n a une authentification activée qui protège TOUS les endpoints, y compris les webhooks.

---

## ✅ Solution : Désactiver l'Authentification pour les Webhooks

### Option 1 : Via les Variables d'Environnement n8n (RECOMMANDÉ)

**Si n8n est en Docker :**

```bash
# Sur votre VPS, trouvez le conteneur n8n
docker ps | grep n8n

# Vérifiez les variables d'environnement actuelles
docker exec n8n env | grep -i auth

# Modifiez le docker-compose.yml ou la commande docker run
```

**Variables à configurer :**

```env
# Désactiver l'authentification Basic Auth (si activée)
N8N_BASIC_AUTH_ACTIVE=false

# OU si vous utilisez JWT
N8N_JWT_AUTH_ACTIVE=false

# Permettre les webhooks publics
N8N_PUBLIC_API_DISABLED=false
```

**Redémarrer n8n :**

```bash
# Si Docker
docker restart n8n

# Si PM2
pm2 restart n8n

# Si service systemd
sudo systemctl restart n8n
```

---

### Option 2 : Via l'Interface n8n

**Dans n8n :**

1. Allez dans **Settings** → **Security**
2. Cherchez les options d'authentification :
   - **Basic Auth** : Désactivez si activé
   - **JWT Auth** : Désactivez si activé
   - **Webhook Authentication** : Désactivez si activé
3. Sauvegardez

**⚠️ Note :** Certaines versions de n8n ne permettent pas de désactiver l'authentification pour les webhooks via l'interface. Dans ce cas, utilisez l'Option 1.

---

### Option 3 : Configuration Avancée (Si les Options 1 et 2 ne fonctionnent pas)

**Si n8n nécessite absolument une authentification, vous pouvez :**

#### A) Utiliser l'API REST au lieu des webhooks

**Modifier le code pour utiliser l'API REST :**

Je peux modifier le code pour utiliser `/api/v1/workflows/{id}/execute` au lieu de `/webhook/{id}`.

**Avantages :**
- Fonctionne avec l'authentification
- Plus de contrôle

**Inconvénients :**
- Nécessite le vrai Workflow ID (pas le webhook path)
- Nécessite une modification du code

#### B) Configurer n8n pour Accepter les Webhooks avec Query Parameter

Certaines versions de n8n permettent d'authentifier les webhooks via query parameter :

```
https://n8n.talosprimes.com/webhook/lead_create?auth=YOUR_SECRET
```

**Je peux modifier le code pour ajouter ce paramètre si votre n8n le supporte.**

---

## 🔍 Vérification de la Configuration n8n Actuelle

**Sur votre VPS, exécutez :**

```bash
# Si n8n est en Docker
docker exec n8n env | grep -E "AUTH|SECURITY|WEBHOOK" | sort

# Si n8n est installé directement
# Vérifiez le fichier de configuration n8n
# Généralement dans : /root/.n8n/config ou /etc/n8n/
```

**Variables importantes à vérifier :**

- `N8N_BASIC_AUTH_ACTIVE` : Doit être `false` ou non défini
- `N8N_BASIC_AUTH_USER` : Ne doit pas être défini (ou vide)
- `N8N_BASIC_AUTH_PASSWORD` : Ne doit pas être défini (ou vide)
- `N8N_JWT_AUTH_ACTIVE` : Doit être `false` ou non défini
- `N8N_PUBLIC_API_DISABLED` : Doit être `false` ou non défini

---

## 🧪 Test Après Correction

**Après avoir modifié la configuration n8n :**

```bash
cd /var/www/talosprimes
./scripts/test-n8n-webhook.sh lead_create
```

**Résultat attendu :**
```
✅ Webhook fonctionne correctement !
```

---

## 📋 Checklist de Correction

- [ ] Identifier comment n8n est installé (Docker, PM2, systemd)
- [ ] Vérifier les variables d'environnement n8n
- [ ] Désactiver l'authentification pour les webhooks
- [ ] Redémarrer n8n
- [ ] Tester le webhook (`./scripts/test-n8n-webhook.sh`)
- [ ] Vérifier que l'erreur 403 a disparu dans l'application

---

## 🆘 Si Vous Ne Pouvez Pas Désactiver l'Authentification

**Si votre instance n8n nécessite absolument une authentification (sécurité entreprise), je peux :**

1. **Modifier le code pour utiliser l'API REST** au lieu des webhooks
2. **Ajouter l'authentification via query parameter** (si supporté)
3. **Créer un proxy** qui ajoute l'authentification automatiquement

**Dites-moi quelle option vous préférez et je l'implémente.**

---

## 📚 Documentation n8n

- [n8n Security Settings](https://docs.n8n.io/hosting/configuration/security/)
- [n8n Environment Variables](https://docs.n8n.io/hosting/configuration/environment-variables/)

---

**✅ Une fois l'authentification désactivée pour les webhooks, l'erreur 403 disparaîtra !**
