# 🔧 Fix : Erreur "JSON parameter needs to be valid JSON"

## ❌ Erreur rencontrée

```
Problem in node '12. Créer notification'
JSON parameter needs to be valid JSON
```

## 🔍 Cause

Le `jsonBody` du node "12. Créer notification" mélangeait des expressions n8n `{{ }}` avec du JavaScript, ce qui créait un JSON invalide :

```json
{
  "tenantId": "{{ ... }}",
  "titre": "Espace client créé" + ({{ ... }} ? " (Stripe)" : "")
}
```

La partie `+ ({{ ... }} ? " (Stripe)" : "")` ne peut pas être évaluée dans un JSON direct.

## ✅ Solution

Ajout d'un **node Code intermédiaire** "11b. Préparer notification" qui construit correctement le JSON en JavaScript, puis passage de ce JSON au node HTTP Request.

### Nouveau flux :
1. **11. Formater réponse** → Prépare la réponse finale
2. **11b. Préparer notification** → Prépare le JSON pour l'API notifications (NOUVEAU)
3. **12. Créer notification** → Envoie le JSON préparé
4. **13. Répondre au webhook** → Retourne la réponse

## 📝 Modifications appliquées

Le node "11b. Préparer notification" :
- Extrait les données nécessaires
- Construit le JSON correctement avec toutes les conditions
- Inclut `tenantId` dans `donnees.tenantId` (requis par l'API pour les requêtes n8n)

Le node "12. Créer notification" utilise maintenant :
- `jsonBody: "={{ JSON.stringify($json) }}"` → Utilise directement le JSON préparé

## 🔄 Action à faire

1. **Réimporter le workflow** dans n8n
2. **Tester à nouveau** la création d'un espace client

