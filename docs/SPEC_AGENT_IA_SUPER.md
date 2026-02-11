# Spec – Super Agent IA textuel et vocal TalosPrimes

Agent unique (textuel + vocal) pour gérer l’application TalosPrimes, les emails, l’agenda et les entrées/sorties d’argent (Qonto), avec un prompt de niveau excellence.

---

## 1. Périmètre

| Domaine | Rôle de l’agent |
|--------|------------------|
| **TalosPrimes** | Tout faire : leads, clients, abonnements, factures, notifications, paramètres. Comprendre la demande, appeler la bonne API / n8n, résumer le résultat. |
| **Emails** | Trier, lire, écrire, répondre quand nécessaire (avec accord ou règles définies). |
| **Agenda / planning** | Créer / modifier / supprimer événements, proposer créneaux, rappels, vue jour/semaine. |
| **Qonto (banque)** | Consulter les mouvements (entrées / sorties), résumer par période, alerter si besoin. |

---

## 2. Principes techniques

- **Un seul agent** : une tête (LLM + prompt + outils), deux canaux (texte + voix).
- **Prompt d’excellence** : système unique (identité, règles, outils, exemples) pour cohérence texte/voix.
- **Tools / function calling** : l’agent choisit les actions (API TalosPrimes, email, calendrier, Qonto) et le backend les exécute.
- **Sécurité** : auth par utilisateur/tenant, pas d’accès cross-tenant, confirmation pour actions sensibles (virements, suppressions, etc.).
- **Traçabilité** : logs des décisions et des appels outils.

---

## 3. Architecture cible (haute niveau)

```
[Interface texte]  \                    / [Outils]
[Interface vocale]  → [Agent Backend]  →  - TalosPrimes API / n8n
                    /   (LLM + prompt)  \  - Email (IMAP/SMTP ou API)
                                        - Calendrier (Google Calendar / CalDAV)
                                        - Qonto API (transactions)
```

- **Agent Backend** : service (ex. dans `packages/platform` ou service dédié) qui :
  - Reçoit un message (texte ou transcription voix).
  - Met à jour un contexte conversation (historique).
  - Appelle le LLM avec le prompt système + contexte + liste d’outils (function calling).
  - Exécute les outils choisis par le LLM (TalosPrimes, email, agenda, Qonto).
  - Renvoie la réponse texte (et éventuellement un flux audio pour la voix).

- **Texte** : chat dans le client Next.js (dashboard) ou dédié.
- **Voix** : 
  - Entrée : STT (Speech-to-Text), ex. Web Speech API ou Whisper.
  - Sortie : TTS (Text-to-Speech), ex. Web Speech API ou API dédiée.

---

## 4. Prompt système (niveau excellence)

Le prompt doit couvrir :

1. **Identité**  
   Nom, rôle (“Super Agent TalosPrimes”), périmètre (app + emails + agenda + Qonto).

2. **Règles de comportement**  
   - Toujours confirmer les actions critiques (suppression, virement, envoi d’email important).  
   - Réponses courtes en vocal, plus détaillées en texte si utile.  
   - En cas d’ambiguïté : demander une précision plutôt que deviner.  
   - Respect strict du tenant / de l’utilisateur connecté.

3. **Connaissance de l’app**  
   - Résumé de l’architecture (TalosPrimes, n8n, Stripe, etc.).  
   - Endpoints et modèles principaux (déjà en partie dans `AGENT_SYSTEM_PROMPT.md`).  
   - Vocabulaire métier (lead, client, abonnement, facture, etc.).

4. **Outils disponibles**  
   - Liste des “tools” avec nom, description, paramètres.  
   - Quand utiliser quel outil (ex. “lister les leads” → outil TalosPrimes, “entrées/sorties ce mois” → outil Qonto).

5. **Exemples (few-shot)**  
   - 3–5 échanges courts “utilisateur → agent → utilisation outil → réponse” pour calibrer le ton et la précision.

6. **Emails**  
   - Règles de tri (priorité, expéditeur, objet).  
   - Quand répondre seul vs quand proposer un brouillon vs quand demander validation.  
   - Ton (professionnel, courtois) et structure des réponses (objet, formules, signature).

7. **Agenda**  
   - Création / modification d’événements, rappels, gestion des conflits.  
   - Fuseaux et langue (FR).

8. **Qonto**  
   - Vocabulaire (entrées, sorties, solde, période).  
   - Ne jamais initier un virement sans instruction explicite ; lecture seule par défaut.

Ce prompt sera implémenté comme **un (ou plusieurs) blocs système** côté backend, alimentant le LLM à chaque tour.

---

## 5. Intégrations externes

| Service | Usage | API / protocole |
|--------|--------|-------------------|
| **TalosPrimes** | Déjà en place | API REST + JWT / secret n8n |
| **Email** | Lire, trier, écrire, répondre | IMAP + SMTP ou Gmail API / Microsoft Graph (selon choix) |
| **Calendrier** | Agenda / planning | Google Calendar API ou CalDAV (Exchange, Nextcloud, etc.) |
| **Qonto** | Entrées/sorties d’argent | [Qonto Business API](https://docs.qonto.com/) (transactions, comptes) |

Pour Qonto : créer une app dans le portail développeur Qonto, utiliser l’API Business (transactions) pour exposer à l’agent “mouvements des X derniers jours” et résumés.

---

## 6. Phasage proposé

### Phase 1 – Agent textuel + TalosPrimes (prioritaire)
- Backend : route(s) “chat agent” (message in → message out).
- Prompt système unifié (fichier ou DB) basé sur `AGENT_SYSTEM_PROMPT.md` + `AI_ASSISTANT_PROMPT.md`.
- Tools : appels à l’API TalosPrimes (leads, clients, factures, abonnements, etc.) + éventuellement n8n si besoin.
- Frontend : page “Assistant” dans le dashboard avec chat (texte uniquement).
- Déploiement + push GitHub après chaque livrable.

### Phase 2 – Emails
- Connexion email (IMAP/SMTP ou OAuth Gmail/Outlook).
- Tools : lire boîte, trier, lire un email, rédiger/répondre (brouillon ou envoi avec règle de confirmation).
- Intégration au même agent (même prompt + nouveaux tools).

### Phase 3 – Agenda
- Connexion calendrier (Google ou CalDAV).
- Tools : lister événements, créer/modifier/supprimer, proposer créneaux.
- Intégration au même agent.

### Phase 4 – Qonto
- OAuth ou clé API Qonto (selon doc).
- Tools : lister transactions (période), résumer entrées/sorties par jour/semaine/mois.
- Intégration au même agent.

### Phase 5 – Voix
- STT : envoi audio → transcription (Whisper ou Web Speech API).
- TTS : réponse texte → audio (Web Speech API ou API TTS).
- Même backend agent, même prompt ; seul le canal change (texte vs voix).

---

## 7. Stack technique suggérée (phase 1)

- **LLM** : OpenAI (déjà utilisé pour le légal) ou Anthropic ; function calling pour les tools.
- **Backend** : Fastify, nouvelle route `POST /api/agent/chat` (body : `{ message, conversationId? }` ; réponse : `{ reply, toolCalls? }`).
- **Tools** : fonctions qui appellent l’API TalosPrimes (fetch avec JWT ou secret n8n selon contexte) et retournent un résumé au LLM.
- **Prompt** : fichier(s) markdown ou table “system_prompts” en base ; chargé au démarrage ou à la première requête.
- **Frontend** : page `/assistant` avec composant chat (liste de messages, input, envoi).

---

## 8. Prochaine étape

- **Valider** ce spec (périmètre, phasage, priorités).
- **Démarrer la Phase 1** :  
  - Création du prompt système “super agent” (un seul fichier ou module).  
  - Route `POST /api/agent/chat` + 1–2 tools TalosPrimes (ex. lister leads, lister clients).  
  - Page Assistant dans le client avec chat texte.  
  - Tout poussé sur GitHub au fur et à mesure.

Ensuite on enchaîne Phase 2 (emails), Phase 3 (agenda), Phase 4 (Qonto), Phase 5 (voix) en gardant le même agent et le même niveau d’exigence sur le prompt.
