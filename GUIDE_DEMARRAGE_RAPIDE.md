# 🚀 Guide de Démarrage Rapide - TalosPrimes

Ce guide vous permet de faire fonctionner l'application rapidement.

---

## ⚡ Démarrage Ultra-Rapide (5 minutes)

### 1. Installer pnpm (si pas déjà fait)
```bash
npm install -g pnpm@8.15.0
```

### 2. Exécuter le script de setup
```bash
cd "/Users/giiz_mo_o/Desktop/devellopement application/talosprimes"
./scripts/setup-complete.sh
```

**C'est tout !** Le script fait tout automatiquement.

---

## 📋 Démarrage Manuel (si le script ne fonctionne pas)

### Étape 1: Installer les dépendances
```bash
cd "/Users/giiz_mo_o/Desktop/devellopement application/talosprimes"
pnpm install
```

### Étape 2: Builder le package shared (OBLIGATOIRE en premier)
```bash
cd packages/shared
pnpm build
cd ../..
```

### Étape 3: Générer Prisma Client
```bash
cd packages/platform
pnpm prisma generate
cd ../..
```

### Étape 4: Builder les packages
```bash
# Builder platform
cd packages/platform
pnpm build
cd ../..

# Builder client (optionnel pour le dev)
cd packages/client
# pnpm build  # Pas nécessaire en dev, Next.js compile à la volée
cd ../..
```

---

## ⚙️ Configuration

### Backend (packages/platform/.env)

Créez le fichier `.env` dans `packages/platform/` :

```env
# OBLIGATOIRE
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
JWT_SECRET="votre-secret-jwt-tres-long-et-securise-minimum-32-caracteres"
JWT_REFRESH_SECRET="votre-secret-refresh-tres-long-et-securise-minimum-32-caracteres"

# OPTIONNEL (valeurs par défaut)
PORT=3001
NODE_ENV=development
```

### Frontend (packages/client/.env.local)

Créez le fichier `.env.local` dans `packages/client/` :

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## 🏃 Démarrer l'application

### Terminal 1: Backend
```bash
cd packages/platform
pnpm dev
```

Le backend démarre sur `http://localhost:3001`

### Terminal 2: Frontend
```bash
cd packages/client
pnpm dev
```

Le frontend démarre sur `http://localhost:3000`

---

## ✅ Vérification

### Tester le backend
```bash
curl http://localhost:3001/health
```

Réponse attendue:
```json
{"status":"ok","database":"connected"}
```

### Tester le frontend
Ouvrez `http://localhost:3000` dans votre navigateur.

---

## 🔧 Problèmes Courants

### Erreur: "Cannot find module '@talosprimes/shared'"
**Solution:** Builder le package shared en premier
```bash
cd packages/shared && pnpm build && cd ../..
```

### Erreur: "Prisma Client not generated"
**Solution:** Générer le client Prisma
```bash
cd packages/platform && pnpm prisma generate && cd ../..
```

### Erreur: "DATABASE_URL is required"
**Solution:** Créer le fichier `.env` dans `packages/platform/` avec `DATABASE_URL`

### Erreur: "Port 3001 already in use"
**Solution:** Changer le port dans `.env` ou arrêter le processus qui utilise le port
```bash
# Trouver le processus
lsof -i :3001
# Tuer le processus
kill -9 <PID>
```

---

## 📚 Documentation Complète

- [DIAGNOSTIC_COMPLET.md](./DIAGNOSTIC_COMPLET.md) - Diagnostic détaillé
- [ETAT_APPLICATION.md](./ETAT_APPLICATION.md) - État actuel de l'application
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture technique

---

## 🆘 Besoin d'aide ?

Si vous rencontrez des erreurs :
1. Vérifiez que vous avez suivi toutes les étapes
2. Consultez [DIAGNOSTIC_COMPLET.md](./DIAGNOSTIC_COMPLET.md)
3. Vérifiez les logs dans la console
