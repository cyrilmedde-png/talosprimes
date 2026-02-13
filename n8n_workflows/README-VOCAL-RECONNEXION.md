# Workflow vocal – Réglages et reconnexion

## Modifications appliquées (version corrigée)

- **Récupérer Fichier Audio** : `resource: "file"`, `operation: "get"` (nœud Telegram correct pour getFile).
- **Envoyer Réponse Vocale** : utilisation de **sendAudio** (au lieu de sendVoice, non disponible dans n8n) avec `resource: "message"`, `operation: "sendAudio"`, envoi du binaire en propriété `data`.
- **Transcription Whisper** et **Synthèse Vocale (TTS)** : remplacés par des nœuds **HTTP Request** (typeVersion 4.2) qui appellent directement l’API OpenAI, pour être utilisables et connectables en n8n 2.3.5.

### Credential OpenAI pour les nœuds HTTP (Whisper + TTS)

Les deux nœuds **Transcription Whisper** et **Synthèse Vocale (TTS)** utilisent une authentification **Header Auth**. À configurer une seule fois :

1. Dans n8n : **Credentials** → **Add credential** → **Header Auth**.
2. Nom suggéré : **OpenAI API Key (Header)**.
3. **Name** : `Authorization`  
4. **Value** : `Bearer sk-votre-cle-openai` (remplacer par votre clé API OpenAI).
5. Enregistrer, puis ouvrir les nœuds **Transcription Whisper** et **Synthèse Vocale (TTS)** et sélectionner ce credential dans le champ **Credential to connect with**.

Si après import les nœuds vocaux apparaissent **déconnectés**, reconnecte-les comme suit.

## Chaîne entrée vocale (message reçu)

1. **Telegram Trigger** → **Vérifier Type Message**
2. **Vérifier Type Message** (sortie **true** / première) → **Récupérer Fichier Audio**
3. **Vérifier Type Message** (sortie **false** / deuxième) → **Préparer Contexte (Texte)**
4. **Récupérer Fichier Audio** → **Transcription Whisper**
5. **Transcription Whisper** → **Préparer Contexte (Voix)**
6. **Préparer Contexte (Voix)** → **AI Agent**
7. **Préparer Contexte (Texte)** → **AI Agent**

## Chaîne sortie (réponse)

8. **AI Agent** → **Vérifier Type Réponse**
9. **Vérifier Type Réponse** (sortie **true** / première = voix) → **Synthèse Vocale (TTS)**
10. **Vérifier Type Réponse** (sortie **false** / deuxième = texte) → **Reponse**
11. **Synthèse Vocale (TTS)** → **Envoyer Réponse Vocale**

## Résumé visuel

```
Telegram Trigger → Vérifier Type Message
   ├─ [true]  → Récupérer Fichier Audio → Transcription Whisper → Préparer Contexte (Voix) ─┐
   └─ [false] → Préparer Contexte (Texte) ──────────────────────────────────────────────────┼→ AI Agent
                                                                                             │
When chat message received ────────────────────────────────────────────────────────────────┘
                                                                                             │
                                                                                             ▼
                                                                              Vérifier Type Réponse
                                                                                 ├─ [true]  → Synthèse Vocale (TTS) → Envoyer Réponse Vocale
                                                                                 └─ [false] → Reponse
```

Ne pas toucher aux connexions **ai_tool** et **ai_languageModel** / **ai_memory** (elles relient les outils et le modèle à l’AI Agent).

---

## Gestion complète de l’application (leads, clients, notifications)

L’agent dispose d’outils pour gérer l’ensemble de l’application TalosPrimes :

| Domaine       | Outils disponibles |
|---------------|--------------------|
| **Leads**     | lister_leads, obtenir_lead, creer_lead, modifier_statut_lead, supprimer_lead |
| **Clients**   | lister_clients, obtenir_client, creer_client, modifier_client, supprimer_client |
| **Notifications** | envoyer_notification |

- Les outils **Obtenir / Creer / Modifier / Supprimer** sont des nœuds **HTTP Request** (typeVersion 4.2) connectés en **ai_tool** ; ils utilisent **Header Auth** (credential TalosPrimes API). Si après import le credential n’est pas reconnu, assigne le même credential que pour **lister_leads** / **lister_clients** (TalosPrimes API).
- Pour **Creer un client**, l’agent a besoin d’un **tenantId** ; tu peux le préciser dans le message système de l’agent ou le fournir à la demande.
- Les **abonnements** (création, modification, annulation) passent aujourd’hui par les workflows dédiés (webhooks) ; l’agent peut lister et gérer leads, clients et envoyer des notifications.
