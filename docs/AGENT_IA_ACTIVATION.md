# Activation du Super Agent IA TalosPrimes

Toutes les phases (texte, emails, agenda, Qonto, voix) sont implémentées. Ce document récapitule les variables d'environnement et les étapes pour tout activer.

---

## 1. Obligatoire (agent texte + app)

- **OPENAI_API_KEY** : clé API OpenAI (modèle gpt-4o-mini). Sans elle, l'assistant renverra un message d'erreur explicite.

---

## 2. Base de données (agenda)

Le modèle **AgentCalendarEvent** a été ajouté au schéma Prisma. Appliquer les changements :

```bash
cd packages/platform
npx prisma generate
npx prisma db push
# ou, si vous utilisez les migrations : npx prisma migrate dev --name add_agent_calendar_events
```

---

## 3. Optionnel – Emails (lecture + envoi)

Dans `packages/platform/.env` :

| Variable       | Description                          |
|----------------|--------------------------------------|
| IMAP_HOST      | Serveur IMAP (ex. imap.gmail.com)    |
| IMAP_PORT      | Port (défaut 993)                    |
| IMAP_USER      | Adresse email                        |
| IMAP_PASSWORD  | Mot de passe ou mot de passe d'app   |
| IMAP_TLS       | `true` par défaut                    |
| SMTP_HOST      | Serveur SMTP pour l'envoi            |
| SMTP_PORT      | Port SMTP (défaut 587)               |
| SMTP_USER      | Utilisateur SMTP                     |
| SMTP_PASSWORD  | Mot de passe SMTP                    |
| SMTP_FROM      | Adresse d'envoi (optionnel)         |

Sans ces variables, les outils `list_emails`, `get_email`, `send_email` renverront une erreur « Email non configuré ».

---

## 4. Optionnel – Qonto (mouvements bancaires)

Dans `packages/platform/.env` :

| Variable              | Description |
|-----------------------|-------------|
| QONTO_API_SECRET      | Token Bearer (OAuth ou clé API) |
| QONTO_BANK_ACCOUNT_ID| UUID du compte bancaire (ou utiliser QONTO_ORG_ID) |
| QONTO_ORG_ID          | Peut servir d’ID de compte si QONTO_BANK_ACCOUNT_ID n’est pas défini |

Obtenir les valeurs : [Portail développeur Qonto](https://developers.qonto.com/), API Business, scope `organization.read`.

Sans ces variables, l’outil `qonto_transactions` renverra « Qonto non configuré ».

---

## 5. Optionnel – Calendrier (Google)

Variables prévues pour une future intégration Google Calendar (non utilisées par l’agenda en base) :

- GOOGLE_CALENDAR_CREDENTIALS_JSON
- GOOGLE_CALENDAR_ID

L’agenda actuel utilise la table **AgentCalendarEvent** (Prisma) ; aucune config Google n’est requise.

---

## 6. Interface vocale (navigateur)

- **Mode voix** : cocher « Mode voix » sur la page Assistant, puis cliquer sur le micro.
- **STT** : Web Speech API (navigateur, ex. Chrome).
- **TTS** : synthèse vocale du navigateur (réponse en français).
- Aucune variable d’environnement supplémentaire.

---


## 7. Telegram via n8n (workflow obligatoire)

Le **Super Agent** est exposé sur Telegram (texte + voix) via un workflow n8n qui appelle POST /api/agent/chat avec le secret n8n et le tenantId.

- **Backend** : l'endpoint /api/agent/chat accepte soit un JWT (frontend), soit le header **X-TalosPrimes-N8N-Secret** + **tenantId** dans le body (n8n).
- **Workflow** : importer n8n_workflows/super-agent-telegram-talosprimes.json. Configurer les credentials (Telegram, Connexion TalosPrimes, OpenAI) et la variable d'environnement **TENANT_ID**.
- **Détails** : voir **n8n_workflows/SUPER_AGENT_TELEGRAM_README.md**.

L'agent utilisé est le même que dans l'application (emails, agenda, Qonto, etc.) avec le même prompt.

---

## Récapitulatif des outils de l’agent

| Domaine      | Outils |
|-------------|--------|
| TalosPrimes | list_leads, get_lead, list_clients, get_client, list_invoices, list_subscriptions, get_tenant, list_notifications, list_logs |
| Emails      | list_emails, get_email, send_email |
| Agenda      | list_calendar_events, create_calendar_event, update_calendar_event, delete_calendar_event |
| Qonto       | qonto_transactions (lecture seule) |

Tout est prêt pour une seconde mission une fois les variables et la base configurées.
