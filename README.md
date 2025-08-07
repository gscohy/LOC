# 🏠 Gestion Locative - Application Moderne

Application web moderne de gestion locative développée avec React, Node.js, TypeScript et SQLite.

## 🚀 Technologies

### Backend
- **Node.js** + **Express** + **TypeScript**
- **SQLite** avec **Prisma ORM**
- **JWT** pour l'authentification
- **Zod** pour la validation des données
- **Winston** pour le logging

### Frontend
- **React 18** + **TypeScript**
- **Vite** pour le build ultra-rapide
- **Tailwind CSS** pour le styling
- **React Query** pour la gestion d'état serveur
- **React Hook Form** + **Zod** pour les formulaires

## 📋 Fonctionnalités

- ✅ **Gestion des propriétaires** (CRUD complet)
- ✅ **Gestion des biens immobiliers** (avec quotes-parts)
- ✅ **Gestion des locataires et garants**
- ✅ **Contrats de location** (avec historique)
- ✅ **Suivi des loyers** (paiements multiples, statuts)
- ✅ **Génération de quittances** (PDF à venir)
- ✅ **Gestion des charges** (ponctuelles/récurrentes)
- ✅ **Tableau de bord** avec statistiques
- ✅ **Authentification sécurisée** (JWT)
- ✅ **Interface responsive** (mobile/desktop)

## 🛠️ Installation

### Prérequis
- Node.js >= 18
- npm ou yarn

### 1. Installation des dépendances
```bash
npm run install:all
```

### 2. Configuration de la base de données
```bash
npm run db:setup
```

### 3. Démarrage en mode développement
```bash
npm run dev
```

L'application sera accessible sur :
- **Frontend** : http://localhost:5173
- **Backend** : http://localhost:3001

## 🔑 Compte de démonstration

Pour tester l'application, utilisez :
- **Email** : admin@demo.com
- **Mot de passe** : demo123

## 📁 Structure du projet

```
├── backend/                 # API Node.js + TypeScript
│   ├── prisma/             # Schéma de base de données
│   ├── src/
│   │   ├── routes/         # Routes API
│   │   ├── middleware/     # Middleware Express
│   │   ├── services/       # Logique métier
│   │   └── utils/          # Utilitaires
│   └── logs/               # Fichiers de logs
├── frontend/               # Application React
│   ├── src/
│   │   ├── components/     # Composants React
│   │   ├── pages/          # Pages de l'application
│   │   ├── services/       # Services API
│   │   ├── types/          # Types TypeScript
│   │   └── lib/            # Utilitaires
│   └── dist/               # Build de production
└── package.json            # Scripts globaux
```

## 🗄️ Base de données

L'application utilise SQLite avec Prisma ORM. La base de données est créée automatiquement au premier démarrage.

### Commandes utiles :
```bash
# Visualiser la base de données
npm run db:studio

# Créer une migration
npm run db:migrate

# Réinitialiser la base
cd backend && npx prisma db push --force-reset
```

## 🚀 Déploiement

### Build de production
```bash
npm run build
npm start
```

### Variables d'environnement
Configurez les variables dans `backend/.env` :
- `JWT_SECRET` : Clé secrète JWT
- `DATABASE_URL` : URL de la base de données
- `PORT` : Port du serveur

## 🆕 Nouveautés v2.0

- ✨ **Stack moderne** : React 18 + Node.js + TypeScript
- ✨ **Interface redessinée** avec Tailwind CSS
- ✨ **Base de données SQLite** persistante
- ✨ **API REST complète** avec validation
- ✨ **Authentification sécurisée** avec JWT
- ✨ **Performance optimisée** avec React Query
- ✨ **Responsive design** mobile-first

## 🤝 Contribution

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commitez vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🔧 Support

Pour toute question ou problème :
- Ouvrez une issue sur GitHub
- Consultez la documentation Prisma : https://prisma.io/docs
- Documentation React : https://react.dev