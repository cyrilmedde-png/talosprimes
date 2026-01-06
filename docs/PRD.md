# Product Requirements Document (PRD)
## SaaS de Gestion d'Entreprise Orchestré par n8n

**Version:** 1.0  
**Date:** 2026  
**Auteur:** Équipe Produit  
**Statut:** MVP

---

## Table des matières

1. [Vision & Objectifs](#1-vision--objectifs)
2. [Utilisateurs Cibles & Cas d'Usage](#2-utilisateurs-cibles--cas-dusage)
3. [Modèle de Données](#3-modèle-de-données)
4. [Portée Fonctionnelle (MVP)](#4-portée-fonctionnelle-mvp)
5. [Parcours Utilisateurs Détaillés](#5-parcours-utilisateurs-détaillés)
6. [Exigences n8n](#6-exigences-n8n)
7. [Architecture & Exigences Techniques](#7-architecture--exigences-techniques)
8. [Écrans & Interface Utilisateur](#8-écrans--interface-utilisateur)
9. [Règles Métier](#9-règles-métier)
10. [Roadmap MVP vs V1+](#10-roadmap-mvp-vs-v1)
11. [Critères de Succès](#11-critères-de-succès)
12. [Hypothèses & Contraintes](#12-hypothèses--contraintes)

---

## 1. Vision & Objectifs

### 1.1 Vision Produit

Un **SaaS multi-tenant** de gestion d'entreprise « full-automatisé » via n8n, permettant à des prestataires (agences, cabinets, etc.) de gérer leurs propres clients, leurs abonnements et leurs processus métier à travers des modules configurables par secteur d'activité, **sans écrire de code**.

**Contexte multi-niveau :**
- **Éditeur** (nous) = créateur de la plateforme SaaS
- **Clients directs** = entreprises (agences, cabinets, etc.)
- **Clients finaux** = clients B2B/B2C des entreprises clientes, gérés dans la plateforme

### 1.2 Objectifs Principaux

- Réduire au minimum le temps de mise en route d'une nouvelle entreprise (plateforme prête avec ses infos dès la création du compte)
- Permettre la création et l'exécution de workflows n8n métiers pour automatiser 100% des processus clés (CRM, facturation, onboarding, etc.)
- Fournir un modèle d'abonnement modulaire (modules par métier) avec facturation automatique
- Délégation complète de la logique métier aux workflows n8n, la plateforme servant d'interface, de gestion des tenants, des modules et de la facturation

---

## 2. Utilisateurs Cibles & Cas d'Usage

### 2.1 Personas Principaux

**1. Dirigeant de petite/moyenne entreprise ou agence (client direct)**
- Besoin de gérer ses clients et processus métier sans compétences techniques
- Souhaite une solution clé en main avec automatisation

**2. Consultant / Intégrateur no-code**
- Veut packager ses workflows n8n en offre SaaS
- Besoin de déployer rapidement des solutions pour ses clients

**3. Utilisateurs finaux (collaborateurs)**
- Sales, support, comptabilité des entreprises clientes
- Utilisent l'interface métier, pas n8n directement
- Besoin d'une interface simple et intuitive

### 2.2 Cas d'Usage Clés

**UC1 : Création d'un compte entreprise**
- Un dirigeant crée un compte, choisit son métier (ex. agence marketing, cabinet comptable, e-commerce B2B)
- Obtient une instance prête avec les modules par défaut de ce métier
- Configuration initiale en < 15 minutes

**UC2 : Configuration des clients finaux et abonnements**
- Le client configure ses propres clients (B2B/B2C)
- Définit les plans d'abonnement et les options de modules pour ses clients finaux
- Gestion complète du cycle de vie client

**UC3 : Automatisation des processus**
- À chaque événement (nouveau client, nouvelle facture, retard de paiement, création de ticket support), un workflow n8n dédié se déclenche automatiquement
- Traitement asynchrone sans impact sur les performances de l'interface

---

## 3. Modèle de Données

### 3.1 Entités Principales

#### Entreprise (Tenant)
```
- id (UUID)
- nom_entreprise (string)
- siret / numéro_légal (string, nullable)
- adresse_postale (text)
- pays (string)
- devise (string, default: EUR)
- langue (string, default: fr)
- email_contact (string)
- métier (enum: agence_marketing, cabinet_comptable, ecommerce_b2b, etc.)
- plan_actuel_id (foreign key)
- date_creation (timestamp)
- date_mise_à_jour (timestamp)
- statut (enum: actif, suspendu, résilié)
```

#### Utilisateur
```
- id (UUID)
- entreprise_id (foreign key, required)
- email (string, unique)
- mot_de_passe_hash (string)
- rôle (enum: super_admin, admin, collaborateur, lecture_seule)
- date_dernière_connexion (timestamp, nullable)
- date_creation (timestamp)
- statut (enum: actif, inactif)
```

#### ClientFinal (client de l'entreprise cliente)
```
- id (UUID)
- entreprise_id (foreign key, required)
- type (enum: b2b, b2c)
- nom / raison_sociale (string)
- email (string)
- téléphone (string, nullable)
- adresse (text, nullable)
- tags (array of strings)
- date_creation (timestamp)
- date_mise_à_jour (timestamp)
- statut (enum: actif, inactif, suspendu)
```

#### ModuleMetier
```
- id (UUID)
- code (string, unique: crm_base, facturation, relance_impayes, support_ticket, etc.)
- nom_affiché (string)
- description (text)
- métier_cible (string, nullable: si null = générique)
- prix_par_mois (decimal)
- prix_par_utilisateur (decimal, nullable)
- catégorie (string)
- icône (string, nullable)
- workflows_templates (array of workflow template IDs)
```

#### AbonnementEntreprise (ce que l'entreprise paye)
```
- id (UUID)
- entreprise_id (foreign key, unique)
- liste_modules_activés (array of module IDs)
- montant_mensuel_actuel (decimal)
- date_debut (timestamp)
- date_prochain_renouvellement (timestamp)
- fournisseur_paiement (enum: stripe, autre)
- id_abonnement_externe (string, ex: stripe_subscription_id)
- status_paiement (enum: ok, en_retard, suspendu)
- date_mise_à_jour (timestamp)
```

#### AbonnementClientFinal (ce que les clients finaux payent)
```
- id (UUID)
- client_final_id (foreign key, required)
- plan_interne_id (string, défini par l'entreprise)
- nom_plan (string)
- date_debut (timestamp)
- date_prochain_renouvellement (timestamp)
- montant_mensuel (decimal)
- modules_inclus (array of module codes)
- statut (enum: actif, annulé, en_retard, suspendu)
- date_mise_à_jour (timestamp)
```

#### Facture
```
- id (UUID)
- type (enum: facture_entreprise, facture_client_final)
- entreprise_id (foreign key, required)
- client_final_id (foreign key, nullable si facture pour l'entreprise)
- numéro_facture (string, unique)
- date_facture (timestamp)
- date_échéance (timestamp)
- montant_ht (decimal)
- montant_ttc (decimal)
- tva_taux (decimal, nullable)
- statut (enum: brouillon, envoyée, payée, en_retard, annulée)
- lien_pdf (string, nullable)
- id_externe_paiement (string, nullable: stripe_invoice_id, etc.)
- date_mise_à_jour (timestamp)
```

#### LienWorkflowN8N
```
- id (UUID)
- entreprise_id (foreign key, required)
- module_metier_id (foreign key, required)
- type_événement (string: client.created, abonnement.renouvellement, facture.en_retard, etc.)
- workflow_n8n_id (string, ID réel côté n8n)
- workflow_n8n_nom (string)
- statut (enum: actif, inactif)
- date_creation (timestamp)
- date_mise_à_jour (timestamp)
```

#### EventLog (journalisation des événements)
```
- id (UUID)
- entreprise_id (foreign key, required)
- type_événement (string)
- entité_type (string: ClientFinal, Facture, AbonnementClientFinal, etc.)
- entité_id (UUID)
- payload (JSON)
- workflow_n8n_déclenché (boolean)
- workflow_n8n_id (string, nullable)
- statut_exécution (enum: succès, erreur, en_attente)
- message_erreur (text, nullable)
- date_création (timestamp)
```

---

## 4. Portée Fonctionnelle (MVP)

### 4.1 Gestion des Comptes « Entreprises Client switching »

#### 4.1.1 Création d'un compte entreprise

**Fonctionnalités :**
- Formulaire d'inscription avec validation
- Champs requis : nom entreprise, email admin, pays, devise, métier
- Champs optionnels (MVP) : SIRET, adresse complète
- Choix d'un plan initial (modules inclus)
- Validation du paiement (carte bancaire via Stripe)

**Comportement système :**
- Attribution automatique d'une « instance logique » (tenant) avec isolation stricte
- Paramétrage initial basé sur le métier choisi (modules par défaut)
- Création automatique de l'utilisateur super_admin
- Déploiement des workflows n8n templates pour les modules activés
- Enregistrement des liens workflows dans `LienWorkflowN8N`

#### 4.1.2 Écran d'administration entreprise

**Fonctionnalités :**
- Modification des infos de l'entreprise (nom, adresse, contact)
- Visualisation du plan actuel et des modules activés
- Activation/désactivation de modules supplémentaires
- Consultation de l'état de la facturation (historique, prochaine échéance)
- Gestion des utilisateurs (création, modification, suppression, rôles)

### 4.2 Gestion des Clients de l'Entreprise (Multi-tenant B2B2B/B2B2C)

#### 4.2.1 Fiche client final

**Fonctionnalités :**
- Création/modification/suppression de clients finaux
- Types : B2B (raison sociale, SIRET) ou B2C (nom, prénom)
- Champs : nom/raison sociale, email, téléphone, adresse, tags
- Historique complet : abonnements, factures, interactions
- Isolation stricte des données par entreprise (multi-tenant)

#### 4.2.2 Gestion des rôles utilisateurs

**Rôles disponibles :**
- **super_admin** : accès total à l'entreprise (gestion modules, facturation, utilisateurs)
- **admin** : gestion opérationnelle (clients, factures, abonnements)
- **collaborateur** : accès en lecture/écriture aux clients et factures (limité)
- **lecture_seule** : consultation uniquement

### 4.3 Abonnements & Facturation par Modules

#### 4.3.1 Catalogue de modules métiers

**Modules MVP :**
- **CRM de base** : gestion clients, contacts, historique
- **Facturation récurrente** : création automatique de factures, gestion des abonnements clients finaux
- **Relance automatique impayés** : emails/SMS automatiques pour factures en retard

**Modules futurs (V1+) :**
- Support/tickets
- Marketing automation
- Reporting avancé
- Intégrations spécifiques métiers

#### 4.3.2 Création et gestion de plans

**Fonctionnalités :**
- Plans prédéfinis : Starter (modules de base), Pro (tous modules), Custom
- Activation/désactivation de modules additionnels via toggles
- Prix par mois ou par an avec réduction annuelle
- Option prix par utilisateur (V1+)
- Affichage clair du coût total mensuel

#### 4.3.3 Facturation automatique

**Fonctionnalités :**
- Renouvellements automatiques mensuels/annuels
- Gestion des upgrades/downgrades avec prorata simple
- Suspensions automatiques en cas d'échec de paiement (après X tentatives)
- Intégration Stripe pour abonnements récurrents
- Webhooks pour événements de paiement (succès, échec, annulation, remboursement)
- Génération de factures PDF pour l'entreprise cliente

### 4.4 Automatisation via n8n

#### 4.4.1 Principe architectural

**Toute la logique métier** est gérée via des workflows n8n. La plateforme SaaS sert de :
- Interface utilisateur (front-end)
- API et gestion des tenants
- Orchestrateur des événements → déclenchement workflows
- Gestion de la facturation et des modules

#### 4.4.2 Workflows n8n préconfigurés par métier

**Workflow : Onboarding client final**
- **Trigger** : événement `client.created` depuis le SaaS
- **Actions** :
  - Création du contact dans un CRM externe (si configuré)
  - Envoi d'email de bienvenue personnalisé
  - Création d'un dossier dans un drive partagé
  - Création de tâches dans un outil de gestion de tâches
  - Notification interne à l'équipe

**Workflow : Facturation récurrente**
- **Trigger** : cron quotidien ou événement `abonnement.renouvellement`
- **Actions** :
  - Récupération des abonnements à renouveler
  - Calcul du montant (gestion prorata)
  - Création de facture via API SaaS
  - Génération PDF
  - Envoi par email au client final
  - Déclenchement du prélèvement (si configuré)
  - Mise à jour des statuts

**Workflow : Relance impayés**
- **Trigger** : événement `facture.en_retard` (déclenché par cron ou webhook)
- **Actions** :
  - Vérification du nombre de jours de retard
  - Envoi email de rappel (J+3, J+7, J+15)
  - Envoi SMS (J+15, optionnel)
  - Création de tâche pour le service financier
  - Escalade automatique selon règles métier

#### 4.4.3 Exigences fonctionnelles n8n

**Mapping événements → workflows :**
- Chaque événement métier interne déclenche une recherche de workflow actif via `LienWorkflowN8N`
- Appel asynchrone à l'API n8n avec payload JSON standardisé
- Gestion des erreurs : retry avec backoff exponentiel, log des échecs

**Templating de workflows :**
- Chaque module métier est associé à 1-X templates de workflow
- À l'activation d'un module : copie du template dans l'espace n8n de l'entreprise
- Injection automatique de variables (entreprise_id, nom_entreprise, clés API, etc.)
- Convention de nommage : `TENANT_<entreprise_id>__<module_code>__<event>`

**Interface de gestion workflows (super-admin éditeur) :**
- Liste des workflows liés à une entreprise
- Statut d'exécution (succès/erreurs)
- Possibilité de forcer une réinitialisation depuis un template
- Déclenchement manuel d'un test de workflow
- Logs d'exécution détaillés

---

## 5. Parcours Utilisateurs Détaillés

### 5.1 Création d'un Nouveau Compte Entreprise

**Acteur :** Futur client (admin)  
**Objectif :** Avoir sa plateforme prête et paramétrée automatiquement en < 15 minutes

#### Étapes côté interface

1. Utilisateur arrive sur la page « Créer mon compte entreprise »
2. Renseigne les informations :
   - Nom entreprise (requis)
   - Email admin (requis)
   - Mot de passe (requis)
   - Pays (requis)
   - Devise (par défaut selon pays)
   - Métier (requis, sélection parmi liste)
   - SIRET (optionnel MVP)
3. Choix d'un plan initial (ex: Plan Starter avec modules CRM + Facturation)
4. Validation et renseignement des informations de paiement (carte bancaire Stripe)
5. Redirection vers onboarding guidé avec checklist

#### Étapes côté backend

1. **Validation des données** et vérification unicité email
2. **Création du tenant :**
   - Insertion dans `Entreprise` avec statut `actif`
   - Génération d'un UUID unique comme tenant_id
3. **Création utilisateur :**
   - Insertion dans `Utilisateur` avec rôle `super_admin`
   - Hash du mot de passe (bcrypt/argon2)
4. **Création abonnement :**
   - Insertion dans `AbonnementEntreprise` avec modules du plan choisi
   - Calcul du montant mensuel
5. **Intégration paiement :**
   - Appel API Stripe pour créer customer
   - Création de l'abonnement récurrent Stripe
   - Stockage de l'ID d'abonnement externe
6. **Déploiement workflows n8n :**
   - Création d'un « espace » ou contexte d'exécution dédié pour l'entreprise dans n8n
   - Clonage/activation des workflows templates liés aux modules activés
   - Injection des variables d'environnement (entreprise_id, nom, clés API)
   - Enregistrement des `LienWorkflowN8N` pour chaque workflow déployé
7. **Émission événement initial :**
   - Log dans `EventLog` de type `entreprise.created`
   - Déclenchement éventuel d'un workflow de bienvenue

#### Résultat attendu

- Le tenant est fonctionnel en < 5-10 minutes
- Les workflows de base (onboarding client, facturation récurrente, relance impayés) sont configurés avec les infos de l'entreprise
- L'utilisateur peut immédiatement créer son premier client final

---

### 5.2 Activation d'un Module Métier Supplémentaire

**Acteur :** Admin entreprise  
**Objectif :** Ajouter un module supplémentaire (ex: Relance automatique des impayés)

#### Étapes côté interface

1. Admin accède à « Modules & options » dans le menu
2. Visualise la liste des modules disponibles avec :
   - Nom et description
   - Prix mensuel
   - Statut (activé/non activé)
3. Clique sur « Activer » pour un module non activé
4. Modal de confirmation affiche :
   - Nom du module
   - Nouveau prix total mensuel
   - Impact sur la prochaine facture (prorata)
5. Validation de l'activation

#### Étapes côté backend

1. **Vérification permissions :** L'utilisateur doit avoir le rôle `super_admin` ou `admin`
2. **Mise à jour abonnement :**
   - Ajout du module dans `liste_modules_activés` de `AbonnementEntreprise`
   - Recalcul du `montant_mensuel_actuel`
3. **Mise à jour paiement :**
   - Appel API Stripe pour mettre à jour la subscription (ajout item)
   - Calcul du prorata pour la période en cours
4. **Déploiement workflows n8n :**
   - Récupération des workflows templates associés au module
   - Clonage dans l'espace n8n de l'entreprise
   - Injection des variables spécifiques au tenant
   - Enregistrement des nouveaux `LienWorkflowN8N`
5. **Activation workflows :**
   - Mise en statut `actif` dans n8n
   - Vérification de la connectivité

#### Résultat attendu

- Les écrans liés au module apparaissent immédiatement dans l'UI
- Les workflows sont actifs et prêts à recevoir des événements
- La facturation est mise à jour avec prorata

---

### 5.3 Création d'un Client Final et Automatisation d'Onboarding

**Acteur :** Collaborateur chez le client (ex: commercial)  
**Objectif :** Créer un client final et déclencher l'automatisation d'onboarding

#### Étapes côté interface

1. Utilisateur clique sur « Nouveau client » dans le menu ou liste clients
2. Sélection du type : B2B ou B2C
3. Remplissage du formulaire :
   - B2B : Raison sociale, SIRET (optionnel), email, téléphone, adresse, tags
   - B2C : Nom, prénom, email, téléphone, adresse, tags
4. Validation et enregistrement

#### Étapes côté backend

1. **Validation des données :**
   - Email unique par entreprise (pas global)
   - Champs requis vérifiés
2. **Création client :**
   - Insertion dans `ClientFinal` avec `entreprise_id` (isolation tenant)
   - Génération d'un UUID unique
   - Statut initial : `actif`
3. **Émission événement :**
   - Log dans `EventLog` avec type `client.created`
   - Payload JSON contenant toutes les infos du client
4. **Recherche workflow :**
   - Requête dans `LienWorkflowN8N` pour (entreprise_id, type_événement = `client.created`)
   - Si trouvé et statut = `actif`, procéder au déclenchement
5. **Appel API n8n (asynchrone) :**
   - Appel HTTP POST à l'API n8n pour exécuter le workflow
   - Payload JSON standardisé :
     ```json
     {
       "event": "client.created",
       "entreprise_id": "uuid",
       "entreprise": { "nom": "...", "email": "..." },
       "client": { "id": "uuid", "nom": "...", "email": "...", ... },
       "timestamp": "2026-..."
     }
     ```
   - Gestion asynchrone : ne pas bloquer la réponse API
6. **Mise à jour log :**
   - Si succès : `statut_exécution = succès` dans `EventLog`
   - Si erreur : `statut_exécution = erreur`, stockage du message d'erreur, retry planifié

#### Exemple de workflow n8n pour `client.created`

**Structure du workflow :**
- **Nœud 1 :** Webhook/HTTP Request (réception données du SaaS)
- **Nœud 2 :** Condition (vérifier si CRM externe configuré)
- **Nœud 3 :** HTTP Request → création contact dans CRM externe (HubSpot, Pipedrive, etc.)
- **Nœud 4 :** Email → envoi email de bienvenue personnalisé (template avec variables)
- **Nœud 5 :** Google Drive/Dropbox → création dossier client
- **Nœud 6 :** Notion/Trello/Asana → création tâche "Onboarding nouveau client"
- **Nœud 7 :** Webhook → notification interne à l'équipe (Slack, Discord)

#### Résultat attendu

- Le client final apparaît immédiatement dans l'UI avec son statut `actif`
- Les actions d'onboarding configurées par le template n8n sont exécutées automatiquement
- L'utilisateur peut voir dans les logs que le workflow a été déclenché (succès/erreur)

---

### 5.4 Renouvellement d'Abonnement Client Final et Facturation

**Acteur :** Système (automatique)  
**Objectif :** Facturer automatiquement tous les abonnements actifs des clients finaux

#### Étapes côté backend

1. **Job planifié (cron quotidien) :**
   - Exécution tous les jours à 2h du matin (ou selon timezone entreprise)
   - Recherche des `AbonnementClientFinal` où :
     - `statut = actif`
     - `date_prochain_renouvellement = aujourd'hui`

2. **Pour chaque abonnement trouvé :**
   - Création d'une `Facture` en statut `brouillon`
   - Calcul des montants HT/TTC
   - Génération d'un numéro de facture unique

3. **Émission événement :**
   - Log dans `EventLog` avec type `abonnement.renouvellement`
   - Payload contenant : abonnement_id, client_final_id, montant, etc.

4. **Recherche et exécution workflow n8n :**
   - Recherche du `LienWorkflowN8N` pour `abonnement.renouvellement`
   - Appel API n8n avec payload
   - Le workflow n8n :
     - Calcule le montant final (gestion prorata si changement de plan en cours de période)
     - Met à jour la facture via API SaaS (statut → `envoyée`)
     - Génère le PDF de facture
     - Envoie la facture par email au client final
     - Appelle le fournisseur de paiement (Stripe, etc.) si prélèvement automatique configuré
     - Met à jour la facture : `payée` ou `en_retard` selon réponse
     - Met à jour `date_prochain_renouvellement` (+1 mois)

5. **Gestion des échecs :**
   - Si échec de paiement : statut facture → `en_retard`
   - Déclenchement éventuel du workflow `facture.en_retard` après X jours

#### Résultat attendu

- Toutes les factures de renouvellement sont créées et envoyées sans intervention humaine
- Les statuts sont synchronisés entre le SaaS et les systèmes externes (paiement, email)
- Les clients finaux reçoivent leurs factures automatiquement

---

## 6. Exigences n8n

### 6.1 Organisation des Workflows

#### 6.1.1 Structure par Module Métier

Pour chaque module métier, définir :
- 1 à X workflows templates par événement métier
- Événements standards : `client.created`, `facture.created`, `facture.en_retard`, `abonnement.renouvellement`, `abonnement.cancelled`, etc.

#### 6.1.2 Convention de Nommage

**Format :** `TENANT_<entreprise_id>__<module_code>__<event>`

**Exemples :**
- `TENANT_42__facturation__abonnement.renouvellement`
- `TENANT_42__crm_base__client.created`
- `TENANT_42__relance_impayes__facture.en_retard`

**Rationale :**
- Préfixe `TENANT_` pour identification rapide
- `entreprise_id` pour isolation
- `module_code` pour catégorisation
- `event` pour identification du déclencheur

### 6.2 Variables / Credentials

#### 6.2.1 Credentials par Entreprise

À la création d'une entreprise, créer dans n8n :
- **API Key de la plateforme SaaS** : token d'authentification pour appels API depuis n8n vers le SaaS
- **Clés SMTP** : si l'entreprise configure son propre serveur email
- **Clés CRM externes** : HubSpot, Pipedrive, etc. (optionnel, configuré par l'entreprise)
- **Clés services tiers** : Stripe (pour prélèvements clients finaux), etc.

#### 6.2.2 Variables Globales par Tenant

Créer un set de variables globales (ou data store n8n) avec :
- `entreprise_id` : UUID de l'entreprise
- `nom_entreprise` : nom affiché
- `devise` : EUR, USD, etc.
- `timezone` : Europe/Paris, etc.
- `url_portail_client` : URL de l'interface SaaS (pour liens dans emails)
- `email_contact` : email de contact principal
- `langue` : fr, en, etc.

**Injection lors du clonage :**
- Les templates de workflow utilisent des placeholders (ex: `{{$vars.entreprise_id}}`)
- Lors du clonage pour un tenant, injection automatique des valeurs réelles via API n8n ou script

### 6.3 Intégration API n8n

#### 6.3.1 Déclenchement de Workflows

**Méthode :** Appel HTTP POST à l'API n8n

**Endpoint :** `POST /webhook/<workflow_id>` ou `POST /api/v1/workflows/<workflow_id>/execute`

**Authentification :** API Key n8n dans les headers

**Payload standardisé :**
```json
{
  "event": "client.created",
  "entreprise_id": "uuid",
  "timestamp": "2026-01-15T10:30:00Z",
  "data": {
    "client": { ... },
    "entreprise": { ... }
  }
}
```

#### 6.3.2 Gestion des Erreurs

- **Retry avec backoff exponentiel :** 3 tentatives max (1s, 2s, 4s)
- **Logging :** Tous les appels et réponses loggés dans `EventLog`
- **Non-bloquant :** L'exécution du workflow ne doit pas bloquer la transaction principale du SaaS
- **Alertes :** Si taux d'erreur > X% sur une période, alerte super-admin

### 6.4 Interface de Gestion (Super-Admin Éditeur)

**Fonctionnalités :**
- Liste de tous les workflows d'une entreprise avec statut (actif/inactif)
- Visualisation des logs d'exécution (succès, erreurs, durée)
- Bouton « Réinitialiser workflows par défaut » pour un module (recréation depuis template)
- Bouton « Tester workflow » : déclenchement manuel avec payload de test
- Visualisation des variables/credentials associés à une entreprise

---

## 7. Architecture & Exigences Techniques

### 7.1 Architecture Générale

#### 7.1.1 Multi-Tenant

**Modèle :** Single database, strict row-level isolation

- Une seule base de données (ou schémas séparés par tenant si PostgreSQL)
- Isolation stricte par `entreprise_id` sur toutes les requêtes
- Middleware d'authentification injectant automatiquement le `tenant_id` dans les requêtes
- Aucune possibilité d'accès cross-tenant (vérification systématique)

**Alternative (évolutif) :** Schémas PostgreSQL séparés par tenant pour isolation renforcée

#### 7.1.2 Stack Technique (Recommandations)

**Backend :**
- Framework : Node.js (Express/NestJS) ou Python (FastAPI/Django)
- Base de données : PostgreSQL (recommandé) ou MySQL
- Cache : Redis (sessions, rate limiting)
- Queue jobs : Bull (Node.js) ou Celery (Python) pour tâches asynchrones

**Frontend :**
- Framework : React, Vue.js, ou Next.js
- UI Library : Tailwind CSS + composants (Shadcn/ui, Ant Design, etc.)
- State management : Redux, Zustand, ou Context API

**n8n :**
- Instance(s) n8n managées par l'éditeur
- Déploiement : Docker, Kubernetes, ou cloud managé
- Scaling horizontal si nécessaire

**Paiement :**
- Stripe (recommandé pour MVP) ou équivalent
- Webhooks pour événements de facturation

**Authentification :**
- JWT tokens avec refresh tokens
- Sessions sécurisées (HttpOnly cookies)
- OAuth 2.0 (V1+)

### 7.2 Intégrations Externes

#### 7.2.1 n8n

- **API n8n** : Déclenchement de workflows, création/modification workflows
- **Authentification :** Token de service ou API Key
- **Webhooks n8n → SaaS** : Retour d'information depuis workflows (optionnel, pour synchronisation)

#### 7.2.2 Stripe

- **Abonnements récurrents** : Gestion des abonnements entreprises clientes
- **Payment Intents** : Prélèvements clients finaux (optionnel MVP)
- **Webhooks Stripe → SaaS** : Événements paiement (succès, échec, annulation)

#### 7.2.3 Services Tiers (via n8n)

- CRM externes : HubSpot, Pipedrive, Salesforce
- Email : SMTP, SendGrid, Mailchimp
- Stockage : Google Drive, Dropbox
- Communication : Slack, Discord, WhatsApp Business
- Gestion tâches : Notion, Trello, Asana

### 7.3 Exigences Non-Fonctionnelles

#### 7.3.1 Scalabilité

- **Capacité :** Support de 100+ tenants en MVP, scaling horizontal prévu
- **Workflows :** Gestion de 10 000+ exécutions workflows/mois par tenant
- **Base de données :** Indexation optimale sur `entreprise_id`, pagination systématique

#### 7.3.2 Disponibilité

- **Objectif MVP :** > 99,5% uptime
- **Monitoring :** Uptime checks, logs centralisés, alertes (Sentry, Datadog, etc.)
- **Backup :** Sauvegarde quotidienne base de données, rétention 30 jours

#### 7.3.3 Sécurité

- **Isolation données :** Vérification systématique `entreprise_id` dans toutes les requêtes
- **Chiffrement :**
  - En transit : HTTPS obligatoire (TLS 1.3)
  - Au repos : Chiffrement base de données, secrets dans vault (AWS Secrets Manager, HashiCorp Vault)
- **Authentification :** Mots de passe hashés (bcrypt/argon2), rate limiting sur login
- **API :** Rate limiting par tenant, validation stricte des inputs (sanitization)
- **Conformité :** RGPD (anonymisation données, droit à l'oubli), PCI-DSS si gestion cartes (via Stripe)

#### 7.3.4 Journalisation

- **Logs métiers :** Tous les événements dans `EventLog` (création client, facturation, erreurs)
- **Logs techniques :** Logs d'application (erreurs, performances) via système centralisé
- **Logs workflows :** Logs d'exécution n8n accessibles via API n8n, synchronisés dans `EventLog`
- **Rétention :** 90 jours pour logs techniques, 1 an pour logs métiers

---

## 8. Écrans & Interface Utilisateur

### 8.1 Écrans « Éditeur » (Super-Admin)

#### 8.1.1 Dashboard Global des Entreprises

**Fonctionnalités :**
- Liste des tenants (tableau avec pagination, tri, filtres)
- Colonnes : Nom entreprise, Statut, Plan actuel, Date création, Exécutions workflows/mois, MRR
- Actions : « Ouvrir comme admin » (impersonation), « Voir détails »
- Statistiques globales : Nombre total tenants, MRR total, Taux d'erreur workflows global

#### 8.1.2 Fiche Détaillée Tenant

**Sections :**
- **Infos entreprise :** Tous les champs de `Entreprise`, possibilité de modification
- **Modules activés :** Liste avec statut, date d'activation
- **Abonnement :** Plan actuel, montant, prochaine échéance, historique factures
- **Workflows n8n :** Liste des workflows avec statut, dernière exécution, taux de succès
- **Logs d'exécution :** Filtrables par type événement, date, statut (succès/erreur)
- **Actions :**
  - « Réinitialiser workflows par défaut » pour un module (recréation depuis template)
  - « Forcer exécution workflow » (test manuel)
  - « Suspendre tenant » / « Réactiver tenant »

### 8.2 Écrans « Entreprise Cliente »

#### 8.2.1 Accueil / Dashboard

**Widgets :**
- **KPI principaux :**
  - Nombre de clients finaux actifs
  - MRR (Recettes Mensuelles Récurrentes) basé sur `AbonnementClientFinal`
  - Nombre de factures du mois (envoyées, payées, en retard)
  - Taux de conversion (nouveaux clients/mois)
- **État des workflows :** Graphique succès/erreurs sur 30 jours
- **Activité récente :** Derniers clients créés, dernières factures, événements importants

#### 8.2.2 Modules & Facturation

**Sections :**
- **Catalogue modules :** Liste avec description, prix, toggle ON/OFF
- **Résumé facturation :**
  - Prix total mensuel actuel
  - Prochaine date de renouvellement
  - Historique factures (liste avec PDF téléchargeable)
- **Gestion paiement :** Carte bancaire enregistrée, possibilité de mise à jour

#### 8.2.3 Gestion des Clients Finaux

**Liste clients :**
- Tableau avec colonnes : Nom, Email, Type (B2B/B2C), Statut, Nombre abonnements, MRR client, Actions
- Filtres : Par tag, statut, type, date création
- Recherche : Par nom, email
- Actions : Créer, Modifier, Supprimer, Voir détails

**Fiche client :**
- **Infos générales :** Tous les champs du client, possibilité de modification
- **Abonnements :** Liste des abonnements actifs/passés avec détails (plan, montant, dates)
- **Factures :** Historique avec statuts, possibilité de télécharger PDF
- **Workflow logs :** Historique des événements/actions liés à ce client (onboarding, relances, etc.)

#### 8.2.4 Paramètres

**Sections :**
- **Infos entreprise :** Nom, adresse, SIRET, contacts (modifiables par super_admin uniquement)
- **Coordonnées facturation :** Adresse de facturation, contacts
- **Utilisateurs :** Liste des utilisateurs avec rôles, possibilité de création/modification/suppression
- **Connexions externes :** Configuration SMTP, CRM externe, services tiers (intégrations optionnelles)
- **Sécurité :** Changement mot de passe, activation 2FA (V1+)

---

## 9. Règles Métier

### 9.1 Gestion des Tenants

- **Statut suspendu :** Une entreprise ne peut pas se connecter si `statut = suspendu`
- **Suspension automatique :** Si échec de paiement après X tentatives (ex: 3), statut → `suspendu`
- **Réactivation :** Après règlement, statut → `actif`, workflows réactivés

### 9.2 Gestion des Modules

- **Désactivation module :**
  - N'impacte pas l'historique de données (données conservées)
  - Stoppe les workflows liés (mise en statut `inactif` dans n8n, `LienWorkflowN8N` → `inactif`)
  - Les écrans UI du module sont masqués (ou en lecture seule)
- **Réactivation :** Les workflows sont réactivés depuis les templates (pas de perte de configuration si sauvegardée)

### 9.3 Événements & Workflows

- **Tous les événements métiers** doivent être loggés dans `EventLog`
- **Appel n8n :** Toujours tenter d'appeler n8n, mais **ne jamais bloquer** la transaction principale en cas d'erreur
- **Exécution asynchrone :** Utilisation d'une queue de jobs pour les appels n8n
- **Retry :** En cas d'échec, retry automatique avec backoff exponentiel (max 3 tentatives)

### 9.4 Limites par Plan

**Plan Starter (MVP) :**
- Max 1 000 exécutions de workflow / mois
- Max 100 clients finaux
- Support email

**Plan Pro (MVP) :**
- Max 10 000 exécutions / mois
- Clients finaux illimités
- Support prioritaire

**Dépassement :**
- Surcoût par exécution supplémentaire (ex: 0,10€/exécution au-delà)
- Ou upgrade forcé vers plan supérieur

### 9.5 Facturation

- **Prorata :** Calcul simple lors d'upgrade/downgrade (nombre de jours restants × nouveau prix / nombre de jours dans le mois)
- **Renouvellement :** Automatique sauf résiliation explicite (délai de préavis : 30 jours)
- **Remboursement :** Pas de remboursement en cas de résiliation anticipée (sauf clause spécifique)

### 9.6 Données & Conformité

- **RGPD :** Droit à l'oubli (suppression/anonymisation données), export données, consentement
- **Rétention données :** Conservation 3 ans après résiliation (obligations légales), puis anonymisation
- **Backup :** Sauvegarde quotidienne, rétention 30 jours

---

## 10. Roadmap MVP vs V1+

### 10.1 MVP (Minimum Viable Product)

#### Fonctionnalités Core

- **Multi-tenant de base :** Gestion des entreprises clientes et de leurs utilisateurs
- **Modules génériques :**
  - CRM simple (gestion clients finaux B2B/B2C)
  - Facturation récurrente (création automatique factures, gestion abonnements clients finaux)
  - Relance impayés (emails automatiques)
- **Intégration paiement :** Stripe uniquement (abonnements entreprises clientes)
- **Templates n8n :** 3 workflows de base (onboarding client, facturation récurrente, relance impayés)
- **Onboarding automatique :** Déploiement de workflows + paramétrage à la création d'un tenant
- **Interface admin :** Dashboard, gestion clients, modules, facturation (écrans essentiels)

#### Limitations MVP

- 1 intégration paiement (Stripe)
- Modules génériques uniquement (pas de modules spécifiques métiers)
- Pas de personnalisation avancée des workflows (uniquement templates)
- Pas de marketplace

### 10.2 V1+ (Évolutions Post-MVP)

#### Modules Spécifiques Métiers

- **Agence marketing :** Gestion campagnes, reporting clients, automatisation marketing
- **Cabinet comptable :** Déclarations, relances fiscales, gestion dossiers clients
- **Expert-comptable :** Modules comptabilité avancés
- **SaaS B2B :** Gestion abonnements clients finaux avec intégrations spécifiques
- **E-commerce B2B :** Catalogue produits, commandes, facturation automatique

#### Marketplace de Modules

- Modules créés par l'éditeur ou d'autres intégrateurs
- Système de reviews/ratings
- Facturation par module (revenue sharing)

#### Personnalisation Avancée

- UI simplifiée pour personnaliser les workflows n8n sans passer par l'UI n8n complète
- Éditeur de templates de workflow visuel (low-code)
- A/B testing de workflows

#### Rapports & Analytics

- Rapports avancés par module (KPIs par métier)
- Export données (CSV, Excel, PDF)
- Dashboards personnalisables

#### Intégrations Additionnelles

- Multiples passerelles de paiement (PayPal, Mollie, etc.)
- OAuth 2.0 (Google, Microsoft, etc.)
- Intégrations CRM/ERP supplémentaires
- API publique pour intégrations custom

---

## 11. Critères de Succès

### 11.1 Métriques Techniques

- **Temps de mise en route :** < 15 minutes pour qu'un nouveau tenant soit fonctionnel sans intervention humaine
- **Disponibilité :** > 99,5% uptime (mesuré sur 3 mois)
- **Performance :** Temps de réponse API < 200ms (p95)
- **Taux d'erreur workflows :** < 5% d'échecs non gérés (sur exécutions totales)

### 11.2 Métriques Produit

- **Adoption workflows :** Au moins 500 workflows n8n exécutés par mois par tenant actif (signe d'automatisation effective)
- **Rétention :** Rétention des entreprises clientes à 3 mois > 80%
- **Activation :** % de tenants ayant créé au moins 5 clients finaux dans les 7 premiers jours > 60%
- **Engagement :** % de tenants utilisant au moins 2 modules > 70%

### 11.3 Métriques Business

- **MRR (Monthly Recurring Revenue) :** Croissance de X% par mois (objectif défini selon business plan)
- **Churn rate :** < 5% par mois
- **LTV/CAC :** Ratio > 3:1 (Lifetime Value / Customer Acquisition Cost)
- **NPS (Net Promoter Score) :** > 50

---

## 12. Hypothèses & Contraintes

### 12.1 Hypothèses Produit

- **Tous les processus métiers complexes** doivent être modélisés dans n8n, pas dans le code backend (hors exceptions techniques : authentification, isolation multi-tenant, facturation SaaS)
- **Chaque module métier** correspond à :
  - Un schéma de données (entités, champs définis dans le SaaS)
  - Un ou plusieurs workflows n8n templates
  - Des écrans UI basiques pour la gestion opérationnelle
- **Les entreprises clientes** n'ont pas besoin d'accéder directement à l'interface n8n (workflows gérés en arrière-plan)
- **La personnalisation avancée** des workflows par les clients n'est pas nécessaire en MVP (templates suffisants)

### 12.2 Contraintes Techniques

- **n8n :** Dépendance externe critique, nécessite une instance stable et scalable
- **Limitation exécutions :** Coût et performance liés au nombre d'exécutions workflows (nécessité de capping par plan)
- **Isolation multi-tenant :** Contrainte stricte de sécurité (aucune faille d'isolation tolérée)
- **Synchronisation :** Complexité de synchronisation entre SaaS et n8n (gestion des états, idempotence)

### 12.3 Contraintes Business

- **Conformité :** RGPD, PCI-DSS (si gestion paiements), obligations légales par pays
- **Support :** Besoin de support initial pour onboarding des premiers clients (documentation, assistance)
- **Pricing :** Nécessité d'un modèle de pricing clair et scalable (par modules, par utilisateurs, par exécutions)

---

## Annexes

### A. Glossaire

- **Tenant :** Instance logique d'une entreprise cliente dans le système multi-tenant
- **Client Final :** Client B2B ou B2C d'une entreprise cliente, géré dans la plateforme
- **Module Métier :** Package fonctionnel (CRM, facturation, etc.) avec workflows n8n associés
- **Workflow Template :** Modèle de workflow n8n prédéfini, cloné pour chaque tenant
- **MRR :** Monthly Recurring Revenue (Recettes Mensuelles Récurrentes)

### B. Références

- Documentation n8n : https://docs.n8n.io
- Documentation Stripe : https://stripe.com/docs
- RGPD : https://www.cnil.fr/fr/rgpd-de-quoi-parle-t-on

---

**Fin du PRD**

