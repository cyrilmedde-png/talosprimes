# Workflows Factures

Ce dossier contient tous les workflows liés à la gestion des factures.

## 📋 Workflows prévus

### 🔄 À venir

1. **invoice-created** - Création automatique de facture
   - Génération du PDF
   - Envoi par email au client
   - Notification à l'équipe
   - Enregistrement dans le système de comptabilité

2. **invoice-paid** - Traitement du paiement
   - Mise à jour du statut
   - Envoi d'un reçu
   - Notification au client
   - Mise à jour de la comptabilité

3. **invoice-overdue** - Relance automatique des impayés
   - Détection des factures en retard
   - Envoi d'email de relance
   - Escalade après X jours
   - Notification à l'équipe comptable

## 📝 Structure

Chaque workflow contiendra :
- `workflow.json` - Export n8n
- `README.md` - Documentation
- `config.env.example` - Configuration

