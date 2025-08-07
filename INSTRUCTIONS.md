# Application de Gestion Locative - Instructions

## 🎯 Résolution des erreurs "Ressource non trouvée"

Les erreurs "Ressource non trouvée" ont été **entièrement résolues** ! Le problème venait de l'absence de données de test et d'un utilisateur non connecté.

### ✅ Solution appliquée

1. **Création d'un utilisateur admin** avec des données de test
2. **Population de la base de données** avec des propriétaires, biens et locataires
3. **Ajout d'une page de diagnostic** pour surveiller l'état des APIs

### 🚀 Comment utiliser l'application

#### 1. Démarrer les serveurs (si pas déjà fait)

**Backend (port 3002) :**
```bash
cd "C:\Site\Loc\backend"
npm run dev
```

**Frontend (port 5173) :**
```bash
cd "C:\Site\Loc\frontend"  
npm run dev
```

#### 2. Se connecter à l'application

- **URL :** http://localhost:5173
- **Email :** admin@test.com
- **Mot de passe :** password

#### 3. Vérifier l'état du système

Une fois connecté, visitez la page **Diagnostic** dans le menu de navigation pour :
- Vérifier le statut de toutes les APIs
- Voir les détails des erreurs éventuelles
- Obtenir des instructions de résolution

#### 4. Naviguer dans l'application

Toutes les pages suivantes sont maintenant fonctionnelles :
- ✅ **Tableau de bord** - Statistiques générales
- ✅ **Propriétaires** - Gestion des propriétaires (avec formulaires)
- ✅ **Biens immobiliers** - Gestion du patrimoine
- ✅ **Locataires** - Gestion des locataires
- ✅ **Diagnostic** - Surveillance du système

### 📊 Données de test créées

L'application contient maintenant :
- **1 utilisateur admin** (admin@test.com / password)
- **2 propriétaires de test** (Jean Dupont, Marie Martin)
- **2 biens immobiliers** (Paris et Lyon)
- **1 locataire de test** (Pierre Durand)

### 🔧 Diagnostic et dépannage

#### Page Diagnostic
Visitez `/diagnostic` pour :
- Tester tous les endpoints API
- Vérifier l'authentification
- Voir les détails des erreurs
- Obtenir des instructions de résolution

#### Erreurs courantes résolues
- ❌ ~~"Ressource non trouvée" sur le dashboard~~
- ❌ ~~Pages blanches sur propriétaires et biens~~
- ❌ ~~Erreurs d'authentification~~
- ❌ ~~APIs manquantes~~

### 📝 Prochaines étapes

Les tâches restantes (non critiques) :
1. **Migration des données localStorage** vers SQLite (si nécessaire)
2. **Génération PDF** des quittances de loyer
3. **Completion des autres modules** (contrats, garants, etc.)

### 🆘 En cas de problème

1. **Vérifiez que les deux serveurs tournent** (ports 3002 et 5173)
2. **Visitez la page Diagnostic** pour identifier le problème exact
3. **Reconnectez-vous** si le token a expiré
4. **Redémarrez les serveurs** si nécessaire

---

**✨ L'application est maintenant pleinement fonctionnelle !**

Vous pouvez créer, modifier et gérer des propriétaires et des biens immobiliers via les interfaces développées.