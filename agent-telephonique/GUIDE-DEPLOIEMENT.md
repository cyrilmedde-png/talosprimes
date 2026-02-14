# Guide de Déploiement — Agent Téléphonique IA TalosPrimes

## Architecture

```
Appelant → Twilio (numéro FR) → Webhook n8n → Claude (IA) → TwiML (voix) → Appelant
                                      ↓
                               Post-appel:
                               ├── SMS de suivi (Twilio)
                               ├── Notification Telegram
                               ├── Lead en BDD (PostgreSQL)
                               └── Notification TalosPrimes API
```

## Prérequis

1. **Compte Twilio** avec numéro français (+33)
2. **n8n** fonctionnel sur `https://n8n.talosprimes.com`
3. **Credentials n8n** configurées : Anthropic, Twilio, PostgreSQL, Header Auth
4. **Table PostgreSQL** `call_logs` (voir section BDD)

---

## Étape 1 : Configuration Twilio

### 1.1 Acheter un numéro français
```
Twilio Console → Phone Numbers → Buy a Number
- Country: France (+33)
- Capabilities: Voice ✅ SMS ✅
- Choisir un numéro local ou mobile
```

### 1.2 Configurer le webhook d'appel entrant
```
Twilio Console → Phone Numbers → [votre numéro] → Configure
- Voice & Fax:
  - A CALL COMES IN: Webhook
  - URL: https://n8n.talosprimes.com/webhook/twilio-voice-incoming
  - HTTP Method: POST
  - STATUS CALLBACK URL: https://n8n.talosprimes.com/webhook/twilio-call-status
```

### 1.3 Récupérer les identifiants
```
Twilio Console → Account → API Keys
- Account SID: ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
- Auth Token: (garder secret)
```

---

## Étape 2 : Créer la table PostgreSQL

```sql
CREATE TABLE IF NOT EXISTS call_logs (
    id SERIAL PRIMARY KEY,
    call_sid VARCHAR(64) UNIQUE NOT NULL,
    caller_phone VARCHAR(20),
    called_number VARCHAR(20),
    duration INTEGER DEFAULT 0,
    status VARCHAR(20),
    conversation_log JSONB DEFAULT '[]'::jsonb,
    lead_id INTEGER REFERENCES leads(id),
    urgency_level VARCHAR(20) DEFAULT 'STANDARD',
    action_taken VARCHAR(50),
    sentiment VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_call_logs_caller ON call_logs(caller_phone);
CREATE INDEX idx_call_logs_created ON call_logs(created_at);
CREATE INDEX idx_call_logs_status ON call_logs(status);
```

---

## Étape 3 : Importer le workflow n8n

### Option A — Via l'UI n8n
1. Aller sur `https://n8n.talosprimes.com`
2. Cliquer sur "+" (nouveau workflow)
3. Menu (trois points) → "Import from file"
4. Sélectionner `workflow-agent-telephonique.json`
5. Sauvegarder

### Option B — Via l'API n8n
```bash
curl -X POST "https://n8n.talosprimes.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: VOTRE_API_KEY" \
  -H "Content-Type: application/json" \
  -d @agent-telephonique/workflow-agent-telephonique.json
```

---

## Étape 4 : Configurer les variables

### Dans le workflow n8n, remplacer :

| Placeholder | Valeur | Où |
|-------------|--------|----|
| `ANTHROPIC_CREDENTIAL_ID` | ID du credential Anthropic | Nodes Claude |
| `HEADER_AUTH_CREDENTIAL_ID` | ID du credential Header Auth | Nodes API |
| `POSTGRES_CREDENTIAL_ID` | ID du credential PostgreSQL | Node Logger BDD |
| `TWILIO_CREDENTIAL_ID` | ID du credential Twilio | Nodes Twilio |
| `{{TWILIO_ACCOUNT_SID}}` | Votre Account SID Twilio | Node SMS |
| `{{TWILIO_PHONE_NUMBER}}` | Votre numéro Twilio (+33...) | Nodes SMS + Appel |
| `{{TELEGRAM_BOT_TOKEN}}` | Token du bot Telegram | Node Telegram |
| `{{TELEGRAM_CHAT_ID}}` | ID du chat Telegram | Node Telegram |

### Dans le node "Charger Prompt Système" :
Remplacer le system prompt par celui de votre niche (voir `niches-config.json`).

---

## Étape 5 : Personnaliser pour votre niche

### 5.1 Choisir une niche
Ouvrir `niches-config.json` et copier la configuration de la niche souhaitée.

### 5.2 Construire le prompt final
Le prompt final est la combinaison de :
1. Le **prompt de base** (dans `system-prompt.md`) avec les variables remplacées
2. Le **SYSTEM_PROMPT_ADDON** spécifique à la niche
3. La **KNOWLEDGE_BASE** spécifique à la niche

### 5.3 Exemple concret — Plomberie

Le prompt final pour le node "Charger Prompt Système" serait :

```
Tu es Sophie, l'assistante téléphonique de Plomberie Express.
[... prompt de base avec variables remplacées ...]
[... SYSTEM_PROMPT_ADDON plomberie ...]
[... KNOWLEDGE_BASE plomberie ...]
```

---

## Étape 6 : Activer et tester

### 6.1 Activer le workflow
Dans n8n : ouvrir le workflow → Toggle "Active" en haut à droite.

### 6.2 Test rapide
Appeler votre numéro Twilio depuis un téléphone mobile.

### 6.3 Checklist de test

- [ ] L'appel est décroché avec un message d'accueil
- [ ] La voix est naturelle et en français
- [ ] La reconnaissance vocale fonctionne
- [ ] Claude répond de manière pertinente et concise
- [ ] La boucle de conversation fonctionne (plusieurs tours)
- [ ] Le silence est géré (message de relance)
- [ ] La fin de conversation raccroche proprement
- [ ] Le SMS de suivi est envoyé
- [ ] La notification Telegram est reçue
- [ ] Le lead est créé dans la BDD
- [ ] Le call_log est enregistré

---

## Étape 7 : Appels sortants (optionnel)

Pour déclencher un appel sortant (rappel client) :

```bash
curl -X POST "https://n8n.talosprimes.com/webhook/twilio-voice-outbound" \
  -H "Content-Type: application/json" \
  -d '{"to": "+33612345678", "reason": "Rappel suite à demande de devis"}'
```

---

## Coûts estimés

| Service | Coût | Détail |
|---------|------|--------|
| Twilio numéro FR | ~1 EUR/mois | Numéro local |
| Twilio appel entrant | ~0.01 EUR/min | Réception |
| Twilio SMS sortant | ~0.07 EUR/SMS | SMS de suivi |
| Claude API | ~0.003 EUR/appel | Sonnet, ~300 tokens/tour |
| **Total par appel (3 min)** | **~0.10 EUR** | Tout compris |

---

## Troubleshooting

### Pas de son / voix robotique
- Vérifier que `voice="Google.fr-FR-Wavenet-A"` est bien dans les nodes TwiML
- Alternative : `voice="Polly.Lea"` (Amazon, bonne qualité FR)

### Reconnaissance vocale mauvaise
- Augmenter `speechTimeout` de 3 à 5 secondes
- Vérifier que `language="fr-FR"` est bien défini dans `<Gather>`

### Claude répond trop lentement
- Réduire `max_tokens` de 300 à 150
- Utiliser `claude-haiku` pour des réponses plus rapides (moins cher aussi)

### Le SMS n'est pas envoyé
- Vérifier les credentials Twilio
- Le numéro destinataire doit être au format international (+33...)

### Le webhook ne reçoit rien
- Vérifier que le workflow est actif dans n8n
- Vérifier l'URL dans la config Twilio
- Tester : `curl -X POST https://n8n.talosprimes.com/webhook/twilio-voice-incoming -d "test=1"`
