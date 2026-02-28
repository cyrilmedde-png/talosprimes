# Configuration complète - Frontend (packages/client/.env.local)

## 📝 Fichier à créer : `/var/www/talosprimes/packages/client/.env.local`

```env
# ============================================
# URL DU BACKEND API
# ============================================
# Option 1 : Si vous avez un sous-domaine API
NEXT_PUBLIC_API_URL="https://api.talosprimes.com"

# Option 2 : Si vous utilisez le même domaine avec un port (non recommandé pour production)
# NEXT_PUBLIC_API_URL="https://talosprimes.com:3001"

# Option 3 : Si vous utilisez un chemin sur le même domaine (ex: /api)
# NEXT_PUBLIC_API_URL="https://talosprimes.com/api"
```

## 🔧 Configuration selon votre architecture

### Architecture recommandée (avec sous-domaine)

```
talosprimes.com          → Frontend (port 3000)
api.talosprimes.com      → Backend API (port 3001)
n8n.talosprimes.com      → n8n (port 5678)
```

Dans ce cas, utilisez :
```env
NEXT_PUBLIC_API_URL="https://api.talosprimes.com"
```

### Architecture simple (même domaine)

Si vous n'avez qu'un seul domaine, configurez Nginx pour router :

```
talosprimes.com          → Frontend (port 3000)
talosprimes.com/api      → Backend API (port 3001)
```

Dans ce cas, utilisez :
```env
NEXT_PUBLIC_API_URL="https://talosprimes.com/api"
```

## 📋 Checklist

- [ ] Remplacer `https://api.talosprimes.com` par votre vrai domaine backend
- [ ] Utiliser `https://` (pas `http://`) en production
- [ ] Vérifier que le fichier `.env.local` n'est pas commité dans Git (déjà dans .gitignore)
- [ ] Rebuild le frontend après modification : `pnpm build && pm2 restart talosprimes-client`

## ⚠️ Important

- `NEXT_PUBLIC_*` signifie que cette variable sera accessible côté client (dans le navigateur)
- Ne mettez JAMAIS de secrets dans ce fichier
- Utilisez toujours HTTPS en production
- Après modification, vous DEVEZ rebuild le frontend pour que les changements prennent effet

