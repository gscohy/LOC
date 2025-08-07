# Configuration Supabase pour votre projet

## 🚀 Étapes de configuration Supabase

### 1. Créer un compte Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un compte (GitHub recommandé)
3. Cliquez sur "New Project"

### 2. Configurer le projet

```
Organization: Votre nom/organisation
Project Name: gestion-locative-loc
Database Password: [Notez-le bien - vous en aurez besoin !]
Region: Europe (Germany) [le plus proche de la France]
```

### 3. Récupérer les informations de connexion

Une fois le projet créé (2-3 minutes) :

1. Allez dans **Settings → Database**
2. Dans "Connection parameters", vous trouverez :
   - Host : `db.xxx.supabase.co`
   - Database name : `postgres`
   - Port : `5432`
   - User : `postgres`
   - Password : [celui que vous avez défini]

3. Dans "Connection string", copiez l'URL complète :
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```

### 4. Mettre à jour votre .env

```env
DATABASE_URL="postgresql://postgres:VOTRE_PASSWORD@db.xxx.supabase.co:5432/postgres"
```

## 🛠️ Migration vers Supabase

### 1. Testez la connexion

```bash
cd backend
npm run db:generate
npm run db:push  # Crée les tables sur Supabase
```

### 2. Migrez vos données

```bash
# Modifiez les paramètres dans migrate-to-postgresql.js :
const pgConfig = {
  user: 'postgres',
  host: 'db.xxx.supabase.co',  // Votre host Supabase
  database: 'postgres',
  password: 'votre_password',   // Votre password Supabase
  port: 5432,
};
```

```bash
npm run migrate:to-postgres
npm run migrate:verify
npm run test:postgres
```

### 3. Déployez sur Render

Dans Render, ajoutez la variable d'environnement :
```
DATABASE_URL = postgresql://postgres:VOTRE_PASSWORD@db.xxx.supabase.co:5432/postgres
```

## 🎯 Avantages Supabase

### Dashboard intégré
- Interface graphique pour vos données
- Éditeur SQL intégré
- Logs en temps réel
- Métriques d'utilisation

### Sauvegardes automatiques
- Snapshots quotidiens (plan gratuit)
- Restauration point-in-time (plans payants)

### API REST automatique
- Endpoints REST générés automatiquement
- Authentification intégrée
- Filtrage et tri avancés

### Monitoring
- Métriques CPU, RAM, Storage
- Alertes par email
- Logs d'activité

## 📊 Limites du plan gratuit

- **2 projets maximum**
- **500 MB de stockage par projet**
- **50 MB de transfert de données/jour**
- **Pauses après 7 jours d'inactivité** (réveil automatique)

## 🚨 Conseils de sécurité

### 1. Utilisez des variables d'environnement
Ne jamais exposer votre `service_role_key` côté client.

### 2. Configurez les RLS (Row Level Security)
```sql
-- Activez RLS sur vos tables sensibles
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Créez des politiques d'accès
CREATE POLICY "Users can only see own data" ON users
FOR ALL USING (auth.uid() = id);
```

### 3. Limitez les connexions
Supabase limite automatiquement les connexions concurrentes.

## 🔄 Alternative : Plusieurs comptes

Si vous avez besoin de plus d'espace :

1. **Compte principal** : Projet KLS
2. **Compte secondaire** : Projet Loc  
3. **Compte tertiaire** : Projet OnBoarding

Chaque compte Gmail peut avoir un compte Supabase gratuit.

## 📞 Support

- Documentation : [supabase.com/docs](https://supabase.com/docs)
- Discord : [discord.supabase.com](https://discord.supabase.com)
- GitHub : [github.com/supabase](https://github.com/supabase)

---

**Prêt à migrer ?** Suivez les étapes ci-dessus et votre base PostgreSQL sera hébergée gratuitement sur Supabase !