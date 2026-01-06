# Commandes Git à exécuter

## 🚀 Commandes rapides (copier-coller)

**Assurez-vous d'être dans le bon dossier :**
```bash
cd "/Users/giiz_mo_o/Desktop/devellopement application/talosprimes"
```

**1. Initialiser Git :**
```bash
git init
```

**2. Configurer votre identité (une seule fois) :**
```bash
git config user.name "Votre Nom"
git config user.email "votre.email@example.com"
```

**3. Vérifier que .env est ignoré :**
```bash
git check-ignore -v packages/platform/.env || echo "⚠️ .env n'est PAS ignoré!"
```

**4. Ajouter tous les fichiers :**
```bash
git add .
```

**5. Vérifier ce qui va être commité :**
```bash
git status
```

**6. Premier commit :**
```bash
git commit -m "Initial commit: Architecture complète avec Fastify, Next.js, Prisma et Supabase"
```

**7. Ajouter le remote GitHub (remplacez VOTRE_USERNAME) :**
```bash
git remote add origin https://github.com/VOTRE_USERNAME/talosprimes.git
```

**8. Renommer la branche en 'main' :**
```bash
git branch -M main
```

**9. Pousser sur GitHub :**
```bash
git push -u origin main
```

## 📝 Après avoir créé le repo sur GitHub

1. Allez sur [github.com/new](https://github.com/new)
2. Nom : `talosprimes`
3. **Ne cochez PAS** "Initialize with README"
4. Créez le repo
5. **Puis exécutez les commandes ci-dessus**

## 🔐 Personal Access Token

Si GitHub vous demande un mot de passe :
1. Allez sur [github.com/settings/tokens](https://github.com/settings/tokens)
2. Generate new token (classic)
3. Cochez `repo`
4. Generate
5. **Copiez le token** et utilisez-le comme mot de passe

