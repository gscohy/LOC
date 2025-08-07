# 🚀 Démarrage Rapide - Migration LOC vers Neon + Render

## 📝 Checklist de Migration

### ✅ Étape 1 : Base Neon (15 min)
1. **Créer compte Neon** : [neon.tech](https://neon.tech)
2. **Nouveau projet** : `gestion-locative-loc`
3. **Copier connection string** : `postgresql://username:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`

### ✅ Étape 2 : Configuration Local (5 min)
```bash
cd backend

# Mettre à jour .env avec votre URL Neon
# DATABASE_URL="postgresql://username:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"

# Mettre à jour migrate-to-postgresql.js avec vos identifiants Neon
```

### ✅ Étape 3 : Migration Données (10 min)
```bash
npm run db:generate     # Génère client Prisma PostgreSQL
npm run db:push        # Crée tables sur Neon
npm run migrate:to-postgres  # Migre SQLite → Neon
npm run test:postgres  # Vérifie migration
```

### ✅ Étape 4 : Deploy Backend Render (10 min)
1. **Push sur GitHub** votre code mis à jour
2. **Render.com** → New Web Service
3. **Config** :
   ```
   Name: loc-backend
   Runtime: Node
   Build: cd backend && npm install && npm run build
   Start: cd backend && npm start
   ```
4. **Environment Variables** :
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://username:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   JWT_SECRET=your-secret-key
   ```

### ✅ Étape 5 : Deploy Frontend Render (5 min)
1. **Render.com** → New Static Site
2. **Config** :
   ```
   Name: loc-frontend
   Build: cd frontend && npm install && npm run build
   Publish: frontend/dist
   ```
3. **Environment Variables** :
   ```
   VITE_API_URL=https://loc-backend.onrender.com/api
   ```

## 🎯 URLs Finales

- **Frontend** : `https://loc-frontend.onrender.com`
- **Backend** : `https://loc-backend.onrender.com`
- **Base** : Neon Dashboard

## 🆘 Support Rapide

**Migration échoue ?**
```bash
npm run migrate:verify  # Voir où ça bloque
```

**Backend ne démarre pas ?**
- Vérifier DATABASE_URL dans Render
- Vérifier logs Render

**Frontend ne se connecte pas ?**
- Vérifier VITE_API_URL
- Vérifier CORS dans server.ts

---

**Temps total : ~45 minutes** ⏰