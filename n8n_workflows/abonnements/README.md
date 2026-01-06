# Workflows Abonnements

Ce dossier contient tous les workflows liés à la gestion des abonnements.

## 📋 Workflows prévus

### 🔄 À venir

1. **subscription-created** - Création d'un nouvel abonnement
   - Configuration automatique
   - Activation des services
   - Envoi d'email de confirmation
   - Création du cycle de facturation

2. **subscription-renewal** - Renouvellement automatique
   - Vérification de la validité
   - Génération de la facture
   - Paiement automatique (si configuré)
   - Activation de la nouvelle période

3. **subscription-cancelled** - Annulation d'abonnement
   - Désactivation des services
   - Calcul du prorata
   - Notification au client
   - Archivage

4. **subscription-upgrade** - Upgrade/Downgrade
   - Calcul de la différence
   - Ajustement de facturation
   - Mise à jour des fonctionnalités
   - Notification

## 📝 Structure

Chaque workflow contiendra :
- `workflow.json` - Export n8n
- `README.md` - Documentation
- `config.env.example` - Configuration

