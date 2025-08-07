# 🚀 Guide de Déploiement : LOC sur Render + Neon

Configuration complète pour héberger votre application de gestion locative.

## 📋 Architecture

- **Frontend** : Render Static Site
- **Backend** : Render Web Service  
- **Base PostgreSQL** : Neon (gratuit)

---

## 🎯 ÉTAPE 1 : Créer la base Neon

### 1.1 Création du compte
1. Allez sur **[neon.tech](https://neon.tech)**
2. Cliquez sur "Sign Up" → **"Continue with GitHub"** (recommandé)
3. Autorisez Neon à accéder à votre compte GitHub

### 1.2 Créer le projet
1. Cliquez sur **"Create your first project"**
2. Configurez :
   ```
   Project Name: gestion-locative-loc
   PostgreSQL Version: 16 (latest)
   Region: Frankfurt (Europe) - le plus proche
   ```
3. Cliquez sur **"Create Project"**

### 1.3 Récupérer la chaîne de connexion
1. Dans le dashboard Neon, allez dans **"Dashboard"**
2. Dans la section **"Connection Details"**
3. Copiez la **"Connection string"** qui ressemble à :
   ```
   postgresql://username:password@ep-xxx-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

---

## 🔧 ÉTAPE 2 : Configuration locale

### 2.1 Mettre à jour .env
```env
# Database Neon PostgreSQL
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=7000
NODE_ENV="development"

# Logging
LOG_LEVEL="info"
```

### 2.2 Mettre à jour le script de migration
Dans `migrate-to-postgresql.js`, remplacez la configuration :

```javascript
// Configuration Neon PostgreSQL
const pgConfig = {
  user: 'username',                    // Votre username Neon
  host: 'ep-xxx-xxx.eu-central-1.aws.neon.tech',  // Votre host Neon
  database: 'neondb',                  // Database par défaut
  password: 'password',                // Votre password Neon
  port: 5432,
  ssl: { rejectUnauthorized: false }
};
```

---

## 📦 ÉTAPE 3 : Migration des données

```bash
cd backend

# 1. Installer les dépendances (si pas déjà fait)
npm install

# 2. Générer le client Prisma pour PostgreSQL
npm run db:generate

# 3. Créer les tables sur Neon
npm run db:push

# 4. Migrer toutes vos données SQLite → Neon
npm run migrate:to-postgres

# 5. Vérifier que tout est migré correctement
npm run migrate:verify

# 6. Tester la connexion et l'intégrité
npm run test:postgres
```

Si tout est ✅, vos données sont migrées !

---

## 🌐 ÉTAPE 4 : Déploiement Backend sur Render

### 4.1 Préparer le repository
```bash
# Si pas encore fait, initialisez git
git init
git add .
git commit -m "Initial commit with Neon PostgreSQL"

# Pushez sur GitHub
git remote add origin https://github.com/votre-username/LOC.git
git push -u origin main
```

### 4.2 Créer le Web Service sur Render
1. Allez sur **[render.com](https://render.com)**
2. Cliquez sur **"New +" → "Web Service"**
3. Connectez votre repository GitHub **LOC**
4. Configurez :

```yaml
Name: loc-backend
Runtime: Node
Region: Frankfurt (Europe)
Branch: main
Root Directory: backend
Build Command: npm install && npm run build
Start Command: npm start
```

### 4.3 Variables d'environnement
Dans **"Environment"**, ajoutez :

```env
NODE_ENV=production
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-please
JWT_EXPIRES_IN=7d
LOG_LEVEL=info
PORT=7000
```

⚠️ **Remplacez** `DATABASE_URL` par votre vraie chaîne Neon !

### 4.4 Déployer
1. Cliquez sur **"Create Web Service"**
2. Attendez le build (2-3 minutes)
3. Votre backend sera accessible sur : `https://loc-backend.onrender.com`

---

## 🎨 ÉTAPE 5 : Déploiement Frontend sur Render

### 5.1 Mettre à jour l'API URL du frontend
Dans `frontend/src/lib/api.ts` :

```typescript
// URL de votre backend Render
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://loc-backend.onrender.com'  // Votre URL Render
  : 'http://localhost:7000';
```

### 5.2 Créer le Static Site sur Render
1. Sur Render, cliquez sur **"New +" → "Static Site"**
2. Connectez le même repository GitHub **LOC**
3. Configurez :

```yaml
Name: loc-frontend
Branch: main
Root Directory: frontend
Build Command: npm install && npm run build
Publish Directory: dist
```

### 5.3 Variables d'environnement frontend
```env
NODE_ENV=production
VITE_API_URL=https://loc-backend.onrender.com
```

### 5.4 Déployer
1. Cliquez sur **"Create Static Site"**
2. Votre frontend sera accessible sur : `https://loc-frontend.onrender.com`

---

## 🔗 ÉTAPE 6 : Configuration CORS

Mettez à jour votre backend pour accepter les requêtes du frontend.

Dans `backend/src/server.ts` :

```typescript
import cors from 'cors';

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',           // Dev local
    'https://loc-frontend.onrender.com' // Production
  ],
  credentials: true
};

app.use(cors(corsOptions));
```

Committez et poussez cette modification pour redéployer automatiquement.

---

## ✅ ÉTAPE 7 : Tests finaux

### 7.1 Vérifiez le backend
- Allez sur `https://loc-backend.onrender.com/health` (si vous avez une route health)
- Testez une API : `https://loc-backend.onrender.com/api/users`

### 7.2 Vérifiez le frontend  
- Allez sur `https://loc-frontend.onrender.com`
- Connectez-vous avec vos données migrées
- Testez les fonctionnalités principales

### 7.3 Vérifiez la base Neon
- Allez sur le dashboard Neon
- Consultez **"Tables"** → vous devriez voir toutes vos tables
- Vérifiez les **"Metrics"** pour voir l'activité

---

## 📊 Monitoring et Maintenance

### Limites Neon (gratuit)
- **512 MB de stockage**
- **3 GB de transfert/mois** 
- **1 projet**
- **Pas de pause** (contrairement à Supabase)

### Limites Render (gratuit)
- **Sleep après 15min d'inactivité**
- **Réveil automatique** à la première requête
- **512 MB RAM**

### Surveillance
- **Neon Dashboard** : Métriques de base
- **Render Dashboard** : Logs et performance
- **Uptime monitoring** : [uptimerobot.com](https://uptimerobot.com) (gratuit)

---

## 🆘 Dépannage

### Backend ne démarre pas
1. Vérifiez les logs Render
2. Vérifiez que `DATABASE_URL` est correcte
3. Testez la connexion Neon depuis votre local

### Frontend ne se connecte pas au backend
1. Vérifiez la configuration CORS
2. Vérifiez l'URL de l'API dans le frontend
3. Testez directement l'API backend

### Migration échoue
1. Vérifiez que Neon est accessible
2. Vérifiez les credentials dans `migrate-to-postgresql.js`
3. Re-tentez avec `npm run migrate:to-postgres`

---

## 🎉 Félicitations !

Votre application de gestion locative est maintenant déployée :

- **Frontend** : `https://loc-frontend.onrender.com`
- **Backend** : `https://loc-backend.onrender.com`  
- **Base** : Neon PostgreSQL (Europe)

**Prochaines étapes** :
1. Configurez un nom de domaine personnalisé (optionnel)
2. Ajoutez un monitoring d'uptime
3. Configurez les sauvegardes Neon (plans payants)
4. Optimisez les performances

---

**Support** :
- Neon : [neon.tech/docs](https://neon.tech/docs)
- Render : [render.com/docs](https://render.com/docs)