# Module Newsletter & Marketing Digital — Topo Complet

## Vue d'ensemble

Module complet de marketing digital intégré à TalosPrimes, couvrant : collecte automatique de contacts, gestion d'abonnés/listes, campagnes email & SMS, templates, analytics, et automatisations. Le tout orchestré par n8n selon l'architecture 100% workflow de la plateforme.

---

## 1. Ce qui existe déjà

### Infrastructure réutilisable

| Composant | Détail |
|-----------|--------|
| **MarketingPost** (Prisma) | Publications sociales (Facebook, Instagram, TikTok, LinkedIn) avec statuts, scheduling, engagement |
| **TenantMarketingConfig** | Config par tenant : tokens sociaux, clé OpenAI |
| **SmsLog** (Prisma) | Historique SMS via Twilio (direction, status, twilioSid) |
| **ContactMessage** (Prisma) | Messages de contact (nom, email, téléphone, entreprise) — **source de contacts à exploiter** |
| **Lead** (Prisma) | Prospects avec email, téléphone — **source de contacts** |
| **ClientFinal** (Prisma) | Clients avec email — **source de contacts** |
| **email-agent.service.ts** | Service IMAP/SMTP déjà fonctionnel (listEmails, sendEmail) |
| **marketing-config.service.ts** | Gestion config marketing par tenant |
| **sms.routes.ts** | Routes SMS existantes (envoi, liste, stats) |
| **n8n workflows SMS** | sms-send déjà fonctionnel |
| **Pages frontend marketing/** | Dashboard, publications, calendrier, configuration |

### Ce qui manque

- Aucun modèle Newsletter, EmailTemplate, Subscriber, EmailCampaign, SmsCampaign
- Aucune gestion de listes d'abonnés / segments
- Aucun système de templates email
- Aucune campagne email (envoi en masse, scheduling, tracking)
- Aucune campagne SMS en masse
- Aucun tracking d'ouvertures / clics
- Aucune page frontend pour newsletters ou campagnes

---

## 2. Architecture du module

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                     │
│                                                           │
│  /marketing/newsletters    → Liste campagnes email        │
│  /marketing/newsletters/new → Éditeur de campagne         │
│  /marketing/sms-campaigns  → Campagnes SMS                │
│  /marketing/contacts       → Gestion contacts/abonnés     │
│  /marketing/templates      → Bibliothèque templates       │
│  /marketing/analytics      → Dashboard analytics          │
│                                                           │
└───────────────┬───────────────────────────────────────────┘
                │ API calls
                ▼
┌─────────────────────────────────────────────────────────┐
│               PLATFORM (Fastify)                          │
│                                                           │
│  newsletter.routes.ts    → CRUD campagnes, envoi          │
│  subscriber.routes.ts    → Gestion abonnés/listes         │
│  email-template.routes.ts → CRUD templates                │
│  sms-campaign.routes.ts  → Campagnes SMS                  │
│                                                           │
│  Toutes les routes → n8nService.callWorkflowReturn()      │
│                                                           │
└───────────────┬───────────────────────────────────────────┘
                │ HTTP POST webhooks
                ▼
┌─────────────────────────────────────────────────────────┐
│                    N8N WORKFLOWS                          │
│                                                           │
│  subscribers-list / subscribers-create / subscribers-sync │
│  email-template-list / email-template-create / ...        │
│  newsletter-create / newsletter-send / newsletter-stats   │
│  sms-campaign-create / sms-campaign-send / ...            │
│  contact-auto-collect (cron)                              │
│  email-tracking-webhook                                   │
│                                                           │
└───────────────┬───────────────────────────────────────────┘
                │ SQL + Services externes
                ▼
┌─────────────────────────────────────────────────────────┐
│           POSTGRES + SERVICES EXTERNES                    │
│                                                           │
│  Tables: subscriber, subscriber_list, email_template,     │
│          email_campaign, email_send_log, sms_campaign,    │
│          sms_campaign_log, unsubscribe_token              │
│                                                           │
│  SMTP (existant via email-agent.service)                  │
│  Twilio SMS (existant)                                    │
│  SendGrid / Resend / Mailgun (optionnel, pour le masse)   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Nouveaux modèles Prisma

### 3.1 Subscriber (Abonné)

```prisma
model Subscriber {
  id            String    @id @default(uuid())
  tenantId      String    @map("tenant_id")
  email         String
  telephone     String?
  nom           String?
  prenom        String?
  entreprise    String?
  source        SubscriberSource  @default(manual)
  status        SubscriberStatus  @default(active)
  tags          String[]  @default([])
  metadata      Json?
  unsubscribedAt DateTime? @map("unsubscribed_at")
  bouncedAt     DateTime?  @map("bounced_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  tenant        Tenant    @relation(fields: [tenantId], references: [id])
  lists         SubscriberListMember[]
  emailSendLogs EmailSendLog[]

  @@unique([tenantId, email])
  @@map("subscribers")
}

enum SubscriberSource {
  manual
  lead
  client
  contact_form
  import_csv
  api
}

enum SubscriberStatus {
  active
  unsubscribed
  bounced
  complained
}
```

### 3.2 SubscriberList (Liste de diffusion)

```prisma
model SubscriberList {
  id          String    @id @default(uuid())
  tenantId    String    @map("tenant_id")
  nom         String
  description String?
  type        ListType  @default(manual)
  filtres     Json?                        // Pour listes dynamiques
  couleur     String?   @default("#3b82f6")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  members     SubscriberListMember[]
  campaigns   EmailCampaign[]

  @@map("subscriber_lists")
}

enum ListType {
  manual
  dynamic     // Auto-filtrée selon critères (tags, source, etc.)
  all         // Tous les abonnés actifs
}

model SubscriberListMember {
  id             String    @id @default(uuid())
  subscriberId   String    @map("subscriber_id")
  listId         String    @map("list_id")
  addedAt        DateTime  @default(now()) @map("added_at")

  subscriber     Subscriber     @relation(fields: [subscriberId], references: [id])
  list           SubscriberList @relation(fields: [listId], references: [id])

  @@unique([subscriberId, listId])
  @@map("subscriber_list_members")
}
```

### 3.3 EmailTemplate

```prisma
model EmailTemplate {
  id          String    @id @default(uuid())
  tenantId    String    @map("tenant_id")
  nom         String
  sujet       String
  contenuHtml String    @map("contenu_html")  // HTML du template
  contenuText String?   @map("contenu_text")  // Version texte
  variables   String[]  @default([])           // {{prenom}}, {{entreprise}}, etc.
  categorie   EmailTemplateCategory @default(newsletter)
  thumbnail   String?                          // Aperçu miniature
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  campaigns   EmailCampaign[]

  @@map("email_templates")
}

enum EmailTemplateCategory {
  newsletter
  promotion
  transactionnel
  relance
  bienvenue
  evenement
}
```

### 3.4 EmailCampaign

```prisma
model EmailCampaign {
  id              String    @id @default(uuid())
  tenantId        String    @map("tenant_id")
  nom             String
  sujet           String
  templateId      String?   @map("template_id")
  listId          String?   @map("list_id")
  contenuHtml     String    @map("contenu_html")
  contenuText     String?   @map("contenu_text")
  expediteurNom   String    @map("expediteur_nom")
  expediteurEmail String    @map("expediteur_email")
  status          CampaignStatus @default(brouillon)
  scheduledAt     DateTime? @map("scheduled_at")
  sentAt          DateTime? @map("sent_at")
  totalEnvoyes    Int       @default(0) @map("total_envoyes")
  totalOuverts    Int       @default(0) @map("total_ouverts")
  totalCliques    Int       @default(0) @map("total_cliques")
  totalBounces    Int       @default(0) @map("total_bounces")
  totalDesabonnes Int       @default(0) @map("total_desabonnes")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  tenant          Tenant         @relation(fields: [tenantId], references: [id])
  template        EmailTemplate? @relation(fields: [templateId], references: [id])
  list            SubscriberList? @relation(fields: [listId], references: [id])
  sendLogs        EmailSendLog[]

  @@map("email_campaigns")
}

enum CampaignStatus {
  brouillon
  planifiee
  en_cours
  envoyee
  annulee
}
```

### 3.5 EmailSendLog (Tracking individuel)

```prisma
model EmailSendLog {
  id           String    @id @default(uuid())
  campaignId   String    @map("campaign_id")
  subscriberId String    @map("subscriber_id")
  email        String
  status       EmailSendStatus @default(pending)
  ouvertAt     DateTime? @map("ouvert_at")
  cliqueAt     DateTime? @map("clique_at")
  bounceType   String?   @map("bounce_type")
  erreur       String?
  sentAt       DateTime? @map("sent_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  campaign     EmailCampaign @relation(fields: [campaignId], references: [id])
  subscriber   Subscriber    @relation(fields: [subscriberId], references: [id])

  @@map("email_send_logs")
}

enum EmailSendStatus {
  pending
  sent
  delivered
  opened
  clicked
  bounced
  failed
  unsubscribed
}
```

### 3.6 SmsCampaign

```prisma
model SmsCampaign {
  id              String    @id @default(uuid())
  tenantId        String    @map("tenant_id")
  nom             String
  contenu         String                   // Corps du SMS (160 chars max conseillé)
  listId          String?   @map("list_id")
  status          CampaignStatus @default(brouillon)
  scheduledAt     DateTime? @map("scheduled_at")
  sentAt          DateTime? @map("sent_at")
  totalEnvoyes    Int       @default(0) @map("total_envoyes")
  totalDelivered  Int       @default(0) @map("total_delivered")
  totalFailed     Int       @default(0) @map("total_failed")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  tenant          Tenant    @relation(fields: [tenantId], references: [id])

  @@map("sms_campaigns")
}
```

---

## 4. Workflows n8n

### 4.1 Gestion des abonnés

| Workflow | Trigger | Fonction |
|----------|---------|----------|
| `subscribers-list` | GET webhook | Lister les abonnés (pagination, filtres par liste/tag/status) |
| `subscribers-create` | POST webhook | Créer un abonné (déduplique par email+tenant) |
| `subscribers-update` | POST webhook | Modifier un abonné (tags, status, infos) |
| `subscribers-delete` | POST webhook | Supprimer/désabonner |
| `subscribers-import` | POST webhook | Import CSV en masse (parse, déduplique, insert batch) |
| `subscribers-sync` | Cron (1x/jour) | **Collecte automatique** : sync les emails depuis leads, clients, contact_messages → crée les subscribers manquants |
| `subscribers-unsubscribe` | GET webhook (public) | Lien de désabonnement (token signé, pas d'auth) |

**Workflow clé — `subscribers-sync` (collecte automatique) :**

```
[Cron 1x/jour] → [Code: Requête SQL UNION]
  → SELECT email, nom, prenom, 'lead' as source FROM leads WHERE tenant_id = X AND email IS NOT NULL
  UNION
  → SELECT email, nom, prenom, 'client' as source FROM client_finals WHERE tenant_id = X AND email IS NOT NULL
  UNION
  → SELECT email, nom, prenom, 'contact_form' as source FROM contact_messages WHERE email IS NOT NULL
→ [Code: Déduplique vs subscribers existants]
→ [Postgres: INSERT batch nouveaux subscribers]
→ [Log: event_log entry "subscribers_synced"]
```

### 4.2 Templates email

| Workflow | Trigger | Fonction |
|----------|---------|----------|
| `email-template-list` | GET webhook | Lister templates (filtrable par catégorie) |
| `email-template-get` | GET webhook | Détail d'un template |
| `email-template-create` | POST webhook | Créer un template HTML avec variables |
| `email-template-update` | POST webhook | Modifier un template |
| `email-template-delete` | POST webhook | Supprimer un template |
| `email-template-preview` | POST webhook | Rendu du template avec données de test |

### 4.3 Campagnes email (newsletters)

| Workflow | Trigger | Fonction |
|----------|---------|----------|
| `newsletter-list` | GET webhook | Lister campagnes (filtres status, date) |
| `newsletter-get` | GET webhook | Détail campagne + stats |
| `newsletter-create` | POST webhook | Créer brouillon de campagne |
| `newsletter-update` | POST webhook | Modifier brouillon |
| `newsletter-delete` | POST webhook | Supprimer brouillon |
| `newsletter-send-test` | POST webhook | Envoyer un email de test à une adresse |
| `newsletter-send` | POST webhook | **Lancer l'envoi** → déclenche le workflow d'envoi en masse |
| `newsletter-send-batch` | Interne | Envoi par batch de 50 (rate limiting SMTP) |
| `newsletter-schedule` | Cron | Vérifie campagnes planifiées → déclenche envoi |
| `newsletter-stats` | GET webhook | Stats agrégées (ouvertures, clics, bounces) |

**Workflow clé — `newsletter-send` (envoi en masse) :**

```
[Webhook POST] → [Parse: campaignId, tenantId]
→ [SQL: SELECT campagne + template + config SMTP tenant]
→ [SQL: SELECT subscribers de la liste, status = 'active']
→ [Code: Split en batches de 50]
→ [Loop: Pour chaque batch]
  → [Code: Remplacer variables {{prenom}}, {{nom}}, {{entreprise}} dans le HTML]
  → [Code: Ajouter pixel tracking + liens trackés]
  → [Code: Ajouter lien désabonnement avec token]
  → [SMTP Send: Envoi via config tenant]
  → [SQL: INSERT email_send_logs (status: sent)]
  → [Wait: 2s entre chaque batch (rate limiting)]
→ [SQL: UPDATE campaign SET status = 'envoyee', sentAt = NOW(), totalEnvoyes = N]
→ [Log: event_log]
```

### 4.4 Tracking email

| Workflow | Trigger | Fonction |
|----------|---------|----------|
| `email-tracking-open` | GET webhook (public) | Pixel 1x1 transparent → log ouverture |
| `email-tracking-click` | GET webhook (public) | Redirect avec log du clic |
| `email-tracking-bounce` | POST webhook | Webhook du provider SMTP → log bounce, update subscriber |
| `email-tracking-stats-update` | Cron (5 min) | Agrège les logs → met à jour les compteurs de la campagne |

**Tracking d'ouverture :**

Chaque email envoyé contient un pixel invisible :
```html
<img src="https://n8n.votredomaine.com/webhook/email-tracking-open?id={{sendLogId}}&t={{token}}" width="1" height="1" />
```

Le workflow `email-tracking-open` :
```
[GET webhook public] → [Parse: sendLogId, token]
→ [SQL: UPDATE email_send_logs SET ouvert_at = NOW(), status = 'opened' WHERE id = X AND ouvert_at IS NULL]
→ [Respond: image/gif 1x1 transparent]
```

**Tracking de clics :**

Les liens dans le HTML sont réécrits :
```
https://n8n.votredomaine.com/webhook/email-tracking-click?id={{sendLogId}}&url={{encodedOriginalUrl}}&t={{token}}
```

### 4.5 Campagnes SMS

| Workflow | Trigger | Fonction |
|----------|---------|----------|
| `sms-campaign-list` | GET webhook | Lister campagnes SMS |
| `sms-campaign-create` | POST webhook | Créer campagne |
| `sms-campaign-send` | POST webhook | Envoi en masse via Twilio (batches) |
| `sms-campaign-stats` | GET webhook | Stats livraison |

**Workflow `sms-campaign-send` :**

```
[Webhook POST] → [Parse: campaignId]
→ [SQL: SELECT campagne + subscribers avec téléphone de la liste]
→ [Code: Split en batches de 20]
→ [Loop: Pour chaque batch]
  → [Code: Personnaliser SMS ({{prenom}}, etc.)]
  → [Twilio: Send SMS]
  → [SQL: INSERT sms_log pour chaque envoi]
  → [Wait: 1s entre batches]
→ [SQL: UPDATE sms_campaign SET status, totalEnvoyes, sentAt]
→ [Log: event_log]
```

### 4.6 Automatisations

| Workflow | Trigger | Fonction |
|----------|---------|----------|
| `welcome-email` | Event: subscriber créé | Email de bienvenue automatique au nouvel abonné |
| `lead-nurturing` | Cron (hebdo) | Séquence de relance pour leads non convertis |
| `review-request` | Event: client créé depuis X jours | Demande d'avis automatique |
| `birthday-email` | Cron (quotidien) | Email anniversaire (si date de naissance renseignée) |
| `re-engagement` | Cron (mensuel) | Relance abonnés inactifs (pas d'ouverture depuis 90j) |

---

## 5. Routes API (Fastify)

### 5.1 newsletter.routes.ts

```
GET    /api/newsletters              → liste campagnes       → n8n: newsletter-list
GET    /api/newsletters/:id          → détail campagne       → n8n: newsletter-get
POST   /api/newsletters              → créer campagne        → n8n: newsletter-create
PUT    /api/newsletters/:id          → modifier campagne     → n8n: newsletter-update
DELETE /api/newsletters/:id          → supprimer campagne    → n8n: newsletter-delete
POST   /api/newsletters/:id/send     → lancer envoi          → n8n: newsletter-send
POST   /api/newsletters/:id/test     → envoi test            → n8n: newsletter-send-test
GET    /api/newsletters/:id/stats    → stats campagne        → n8n: newsletter-stats
```

### 5.2 subscriber.routes.ts

```
GET    /api/subscribers              → liste abonnés         → n8n: subscribers-list
POST   /api/subscribers              → créer abonné          → n8n: subscribers-create
PUT    /api/subscribers/:id          → modifier              → n8n: subscribers-update
DELETE /api/subscribers/:id          → supprimer             → n8n: subscribers-delete
POST   /api/subscribers/import       → import CSV            → n8n: subscribers-import
POST   /api/subscribers/sync         → sync manuelle         → n8n: subscribers-sync
GET    /api/subscribers/lists        → listes de diffusion   → n8n: subscriber-lists-list
POST   /api/subscribers/lists        → créer liste           → n8n: subscriber-lists-create
```

### 5.3 email-template.routes.ts

```
GET    /api/email-templates          → liste templates       → n8n: email-template-list
GET    /api/email-templates/:id      → détail                → n8n: email-template-get
POST   /api/email-templates          → créer                 → n8n: email-template-create
PUT    /api/email-templates/:id      → modifier              → n8n: email-template-update
DELETE /api/email-templates/:id      → supprimer             → n8n: email-template-delete
POST   /api/email-templates/:id/preview → aperçu             → n8n: email-template-preview
```

### 5.4 sms-campaign.routes.ts

```
GET    /api/sms-campaigns            → liste                 → n8n: sms-campaign-list
POST   /api/sms-campaigns            → créer                 → n8n: sms-campaign-create
POST   /api/sms-campaigns/:id/send   → envoyer              → n8n: sms-campaign-send
GET    /api/sms-campaigns/:id/stats  → stats                → n8n: sms-campaign-stats
```

---

## 6. Pages Frontend

### 6.1 /marketing/contacts — Gestion des abonnés

- **Vue tableau** : liste paginée avec recherche, filtres (source, status, tags, liste)
- **Actions** : ajouter manuellement, import CSV, sync auto (bouton), export
- **Détail abonné** : historique emails reçus, ouvertures, clics
- **Gestion des listes** : créer/modifier listes, ajouter/retirer des abonnés
- **Tags** : système de tags libres pour segmentation

### 6.2 /marketing/templates — Bibliothèque de templates

- **Galerie** : aperçu visuel des templates avec catégorie
- **Éditeur** : éditeur HTML WYSIWYG avec preview
- **Templates par défaut** : 5-6 templates pré-construits (bienvenue, newsletter, promo, relance, événement)
- **Variables** : insertion de variables dynamiques ({{prenom}}, {{entreprise}}, etc.)

### 6.3 /marketing/newsletters — Campagnes email

- **Dashboard** : liste des campagnes avec status, date d'envoi, stats rapides
- **Création en 4 étapes** :
  1. Infos générales (nom, sujet, expéditeur)
  2. Choix du template ou édition libre
  3. Sélection de la liste d'envoi
  4. Planification (immédiat ou schedulé) + envoi test
- **Détail campagne** : stats complètes (taux d'ouverture, taux de clic, bounces, désabonnements)
- **Graphiques** : courbe d'ouvertures/clics dans le temps

### 6.4 /marketing/sms-campaigns — Campagnes SMS

- **Dashboard** : liste des campagnes SMS
- **Création** : contenu SMS (compteur caractères), sélection liste, planification
- **Stats** : envoyés, délivrés, échoués

### 6.5 /marketing/analytics — Dashboard analytics global

- **KPIs** : total abonnés, taux d'ouverture moyen, taux de clic moyen, taux de désabonnement
- **Graphiques** : évolution abonnés, performance campagnes, meilleurs sujets
- **Comparaison** : email vs SMS performance
- **Top** : meilleures campagnes, abonnés les plus engagés

---

## 7. Fonctionnement de la collecte automatique

### Sources de contacts

```
┌──────────────┐     ┌───────────────┐     ┌────────────────┐
│    Leads     │     │   Clients     │     │  Formulaire    │
│  (prospects) │     │  (convertis)  │     │  de contact    │
└──────┬───────┘     └──────┬────────┘     └──────┬─────────┘
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  subscribers-   │
                    │     sync        │   Cron quotidien
                    │   (n8n)         │   ou déclenché
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Déduplique     │
                    │  par email      │
                    │  + tenant_id    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Table          │
                    │  subscribers    │
                    └─────────────────┘
```

### Règles de collecte

1. **Leads** : tout lead avec email non null → subscriber source `lead`
2. **Clients** : tout client avec email non null → subscriber source `client`
3. **Formulaire contact** : tout contact_message → subscriber source `contact_form`
4. **Déduplique** : si l'email existe déjà pour ce tenant, on ne recrée pas
5. **Opt-in** : les contacts collectés automatiquement sont en status `active` (le lien de désabonnement dans chaque email garantit la conformité RGPD)
6. **Sync incrémentale** : ne traite que les entrées créées depuis la dernière sync (colonne `created_at`)

---

## 8. Conformité RGPD

- **Lien de désabonnement** obligatoire dans chaque email (en-tête `List-Unsubscribe` + lien dans le footer)
- **Token signé** pour les liens de désabonnement (empêche le désabonnement malveillant)
- **Suppression des données** : endpoint pour supprimer complètement un subscriber et ses logs
- **Export des données** : endpoint pour exporter toutes les données d'un subscriber (droit d'accès)
- **Double opt-in** (optionnel) : workflow `subscriber-confirm` envoie un email de confirmation

---

## 9. Estimation du temps de développement

### Phase 1 — Fondations (2-3 jours)

- Modèles Prisma (migrations)
- 6 workflows n8n basiques (CRUD subscribers + listes)
- Routes Fastify subscribers
- Page /marketing/contacts (frontend)

### Phase 2 — Templates & Campagnes email (3-4 jours)

- 5 workflows n8n templates
- 8 workflows n8n campagnes (CRUD + envoi + tracking)
- Routes Fastify newsletters + templates
- Pages /marketing/templates + /marketing/newsletters
- Éditeur HTML basique
- Pixel tracking + link tracking

### Phase 3 — SMS Campaigns (1-2 jours)

- 4 workflows n8n SMS
- Routes Fastify sms-campaigns
- Page /marketing/sms-campaigns
- Intégration Twilio batch

### Phase 4 — Automatisations & Analytics (2-3 jours)

- Workflows automatiques (welcome, nurturing, re-engagement)
- Workflow sync automatique quotidien
- Dashboard analytics avec graphiques
- Page /marketing/analytics

### Phase 5 — Polish & Conformité (1-2 jours)

- Templates par défaut pré-construits
- Conformité RGPD (désabonnement, double opt-in)
- Tests end-to-end
- Documentation

### Total estimé : 9-14 jours de développement

(en tenant compte de l'infrastructure existante qui accélère beaucoup : SMTP, Twilio, n8n, architecture déjà en place)

---

## 10. Récapitulatif des livrables

| Catégorie | Quantité |
|-----------|----------|
| Modèles Prisma | 6 nouveaux modèles + 4 enums |
| Workflows n8n | ~25-30 workflows |
| Routes Fastify | 4 nouveaux fichiers de routes (~20 endpoints) |
| Pages Frontend | 5 nouvelles pages + composants |
| Templates email par défaut | 5-6 templates HTML |
| Automatisations | 5 workflows cron/event |

---

*Document généré le 16 mars 2026 — TalosPrimes*
