# Format DATABASE_URL pour Supabase

## Format complet

```env
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@db.PROJECT_REF.supabase.co:5432/postgres"
```

## Comment obtenir les valeurs

### 1. Allez sur votre projet Supabase
- Connectez-vous sur [supabase.com](https://supabase.com)
- Ouvrez votre projet `talosprimes-dev` (ou le nom que vous avez donné)

### 2. Récupérez la connection string
1. Allez dans **Settings** (⚙️) → **Database**
2. Descendez jusqu'à la section **Connection string**
3. Sélectionnez l'onglet **URI** (pas "Transaction" ni "Session")
4. Vous verrez quelque chose comme :

```
postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
```

### 3. Remplacez `[YOUR-PASSWORD]`
Remplacez `[YOUR-PASSWORD]` par le mot de passe que vous avez défini lors de la création du projet Supabase.

**⚠️ Important :** Si vous avez oublié le mot de passe, vous pouvez le réinitialiser dans Settings → Database → Reset database password.

## Exemple complet

```env
DATABASE_URL="postgresql://postgres:MonMotDePasse123!@db.abcdefghijklmnop.supabase.co:5432/postgres"
```

## Caractères spéciaux dans le mot de passe

Si votre mot de passe contient des caractères spéciaux, vous devez les encoder en URL :

| Caractère | Encodé |
|-----------|--------|
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |
| `=` | `%3D` |
| `?` | `%3F` |
| `/` | `%2F` |
| ` ` (espace) | `%20` |

**Exemple :** Si votre mot de passe est `Mon@Pass#123`, utilisez :
```
DATABASE_URL="postgresql://postgres:Mon%40Pass%23123@db.xxxxx.supabase.co:5432/postgres"
```

## Vérification

Pour tester la connection string, vous pouvez utiliser :

```bash
# Via psql (si installé)
psql "postgresql://postgres:VOTRE_MDP@db.xxxxx.supabase.co:5432/postgres"

# Via Prisma
cd packages/platform
pnpm db:push
```

Si ça fonctionne, vous verrez les tables créées dans Supabase !

## Sécurité

⚠️ **NE COMMITEZ JAMAIS** le fichier `.env` avec votre mot de passe réel dans Git !

Le `.gitignore` est déjà configuré pour exclure `.env`.

