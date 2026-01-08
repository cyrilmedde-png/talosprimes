# Guide - Workflow Inscription Leads

## 📋 Nouveau Workflow Propre et Professionnel

Un nouveau workflow d'inscription a été créé : `lead-inscription.json`

### ✨ Améliorations

#### 1. **Structure claire et organisée**
- Noms de nœuds explicites et cohérents
- Flux logique et facile à suivre
- Séparation claire des responsabilités

#### 2. **Gestion des données robuste**
- **Validation données** : Validation stricte avec messages d'erreur clairs
- **Préparer données** : Centralisation des données pour tous les nœuds suivants
- Plus de problème de données `undefined`

#### 3. **Emails professionnels**
- **Email Client** : Design moderne avec gradient, responsive, bien structuré
- **Email Équipe** : Notification claire et professionnelle pour l'équipe
- **Email Erreur** : Alerte détaillée en cas de problème

#### 4. **Gestion d'erreur complète**
- Tous les nœuds ont une branche d'erreur
- Formatage d'alerte unifié
- Notification automatique de l'équipe en cas d'erreur

#### 5. **Flux parallèle optimisé**
- Email client, SMS et email équipe envoyés en parallèle
- Merge node pour combiner les résultats
- Réponse unique après tous les envois

### 🔄 Flux du Workflow

```
1. Webhook - Inscription
   ↓
2. Validation données
   ↓ (succès)                    ↓ (erreur)
3. API - Sauvegarder Lead    Formatage Erreur
   ↓                              ↓
4. Préparer données          Formatage Email Erreur
   ↓                              ↓
   ├─→ Formatage Email Client    Resend - Email Erreur
   ├─→ Formatage SMS             ↓
   └─→ Formatage Email Équipe   Réponse Erreur
        ↓
   Resend/Twilio (parallèle)
        ↓
   Merge - Emails envoyés
        ↓
   Réponse Succès
```

### 📦 Nœuds du Workflow

1. **Webhook - Inscription** : Réception des données du formulaire
2. **Validation données** : Validation et normalisation
3. **API - Sauvegarder Lead** : Sauvegarde dans la base de données
4. **Préparer données** : Préparation des données pour les communications
5. **Formatage Email Client** : Formatage de l'email de confirmation
6. **Resend - Email Client** : Envoi de l'email au client
7. **Formatage SMS** : Formatage du SMS de confirmation
8. **Twilio - SMS** : Envoi du SMS au client
9. **Formatage Email Équipe** : Formatage de la notification équipe
10. **Resend - Email Équipe** : Envoi de la notification à l'équipe
11. **Merge - Emails envoyés** : Fusion des résultats
12. **Réponse Succès** : Réponse positive au formulaire
13. **Formatage Erreur** : Formatage des erreurs
14. **Formatage Email Erreur** : Formatage de l'email d'alerte
15. **Resend - Email Erreur** : Envoi de l'alerte
16. **Réponse Erreur** : Réponse d'erreur au formulaire

### 🔧 Configuration Requise

#### Credentials n8n

1. **TalosPrimes API Auth** (Header Auth)
   - Header Name: `X-TalosPrimes-N8N-Secret`
   - Header Value: Valeur de `N8N_WEBHOOK_SECRET` du backend

2. **Resend API** (Header Auth)
   - Header Name: `Authorization`
   - Header Value: `Bearer RE_RESEND_API_KEY`

3. **Twilio** (Twilio API)
   - Account SID
   - Auth Token
   - From Number

### 📝 Import dans n8n

1. Ouvrir n8n : `https://n8n.talosprimes.com`
2. Créer un nouveau workflow ou ouvrir l'existant
3. Menu (trois points) → **"Import from File"**
4. Sélectionner `n8n_workflows/leads/lead-inscription.json`
5. Configurer les credentials :
   - Assigner "TalosPrimes API Auth" au nœud "API - Sauvegarder Lead"
   - Assigner "Resend API" aux nœuds "Resend - Email Client", "Resend - Email Équipe", "Resend - Email Erreur"
   - Assigner "Twilio" au nœud "Twilio - SMS"
6. Activer le workflow (bouton vert en haut)
7. Copier l'URL du webhook et l'utiliser dans le formulaire frontend

### 🎨 Design des Emails

#### Email Client
- Header avec gradient violet/bleu
- Carte d'information structurée
- Box de highlight pour le délai de réponse
- Footer professionnel
- Responsive design

#### Email Équipe
- Header vert pour les notifications
- Carte d'information claire
- Box d'action pour le suivi
- Design épuré et professionnel

#### Email Erreur
- Header rouge pour les alertes
- Détails de l'erreur
- Informations du lead
- Design d'alerte clair

### ✅ Avantages du Nouveau Workflow

1. **Plus propre** : Code bien structuré, noms explicites
2. **Plus robuste** : Gestion d'erreur complète à tous les niveaux
3. **Plus professionnel** : Emails avec design moderne
4. **Plus maintenable** : Structure claire, facile à modifier
5. **Plus performant** : Envois en parallèle, pas d'attente inutile

### 🔄 Migration depuis l'Ancien Workflow

Si tu as déjà l'ancien workflow `workflow-inscription.json` :

1. **Désactiver** l'ancien workflow dans n8n
2. **Importer** le nouveau `lead-inscription.json`
3. **Configurer** les credentials (voir section ci-dessus)
4. **Tester** avec un formulaire d'inscription
5. **Activer** le nouveau workflow
6. **Supprimer** l'ancien workflow si tout fonctionne

### 📞 Support

En cas de problème :
1. Vérifier les credentials dans n8n
2. Vérifier les logs d'exécution dans n8n
3. Vérifier que le backend est accessible (`https://api.talosprimes.com`)
4. Vérifier que Resend et Twilio sont bien configurés

