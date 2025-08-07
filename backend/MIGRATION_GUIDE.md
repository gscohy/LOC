# Guide de Migration vers PostgreSQL

Ce guide vous accompagne dans la migration de votre base de données SQLite vers PostgreSQL tout en préservant vos données.

## 📋 Prérequis

1. **PostgreSQL installé et démarré**
   ```bash
   # Vérifiez que PostgreSQL fonctionne
   psql --version
   ```

2. **Créer la base de données PostgreSQL**
   ```sql
   -- Connectez-vous à PostgreSQL
   psql -U postgres
   
   -- Créez la base de données
   CREATE DATABASE gestion_locative;
   CREATE USER votre_utilisateur WITH PASSWORD 'votre_mot_de_passe';
   GRANT ALL PRIVILEGES ON DATABASE gestion_locative TO votre_utilisateur;
   ```

## 🔧 Configuration

### 1. Mettre à jour le fichier .env

```env
# Remplacez par vos vrais paramètres
DATABASE_URL="postgresql://votre_utilisateur:votre_mot_de_passe@localhost:5432/gestion_locative"
```

### 2. Modifier le script de migration

Éditez `migrate-to-postgresql.js` et mettez à jour la configuration PostgreSQL :

```javascript
const pgConfig = {
  user: 'votre_utilisateur',
  host: 'localhost',
  database: 'gestion_locative',
  password: 'votre_mot_de_passe',
  port: 5432,
};
```

## 🚀 Processus de Migration

### Étape 1: Générer le schéma PostgreSQL

```bash
# Génère le client Prisma pour PostgreSQL
npm run db:generate

# Applique les migrations sur PostgreSQL (crée les tables)
npm run db:migrate
```

### Étape 2: Migrer les données

```bash
# Lance la migration des données de SQLite vers PostgreSQL
npm run migrate:to-postgres
```

### Étape 3: Vérifier la migration

```bash
# Vérifie que toutes les données ont été migrées
npm run migrate:verify
```

## 📊 Données Migrées

Le script migre les tables dans cet ordre (pour respecter les contraintes) :

1. **users** - Utilisateurs du système
2. **proprietaires** - Propriétaires des biens
3. **garants** - Garants des locataires
4. **locataires** - Locataires
5. **biens** - Biens immobiliers
6. **bien_proprietaires** - Associations biens-propriétaires
7. **lots** - Lots de copropriété
8. **locataire_garants** - Associations locataires-garants
9. **contrats** - Contrats de location
10. **contrat_locataires** - Associations contrats-locataires
11. **contrat_historique** - Historique des contrats
12. **loyers** - Loyers dus
13. **paiements** - Paiements effectués
14. **quittances** - Quittances générées
15. **rappels** - Rappels envoyés
16. **charges** - Charges locatives
17. **settings** - Paramètres système
18. **email_configs** - Configurations email
19. **email_templates** - Modèles d'email
20. **documents** - Documents uploadés

## ⚠️ Points d'Attention

### Sauvegarde

**TOUJOURS** faire une sauvegarde avant la migration :

```bash
# Copiez votre base SQLite
cp prisma/gestion-locative.db prisma/gestion-locative.db.backup

# Ou exportez via Prisma Studio
npm run db:studio
```

### Gestion des Conflits

Le script utilise `ON CONFLICT DO NOTHING` pour éviter les doublons si vous relancez la migration.

### Types de Données

- Les booléens SQLite (0/1) sont convertis en vrais booléens PostgreSQL
- Les dates sont préservées
- Les IDs CUID sont conservés

## 🔍 Vérifications Post-Migration

### 1. Vérifiez les comptes

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM proprietaires;
SELECT COUNT(*) FROM locataires;
```

### 2. Vérifiez l'intégrité des relations

```sql
-- Tous les biens ont des propriétaires
SELECT b.id, b.adresse FROM biens b 
LEFT JOIN bien_proprietaires bp ON b.id = bp."bienId" 
WHERE bp."bienId" IS NULL;

-- Tous les contrats ont des locataires
SELECT c.id FROM contrats c 
LEFT JOIN contrat_locataires cl ON c.id = cl."contratId" 
WHERE cl."contratId" IS NULL;
```

### 3. Testez l'application

```bash
# Démarrez le serveur avec PostgreSQL
npm run dev
```

## 🐛 Dépannage

### Erreur de connexion PostgreSQL

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution :** Vérifiez que PostgreSQL est démarré :
```bash
# Windows
net start postgresql-x64-14

# Linux/Mac
sudo systemctl start postgresql
```

### Erreur d'authentification

```
Error: password authentication failed
```

**Solution :** Vérifiez vos identifiants dans `.env` et `migrate-to-postgresql.js`

### Tables manquantes

```
Error: relation "users" does not exist
```

**Solution :** Exécutez d'abord les migrations Prisma :
```bash
npm run db:migrate
```

## 📈 Après la Migration

### 1. Performance

PostgreSQL offre de meilleures performances pour les grosses bases de données. Pensez à :

- Créer des index supplémentaires si nécessaire
- Analyser les requêtes lentes avec `EXPLAIN ANALYZE`

### 2. Monitoring

- Activez les logs PostgreSQL pour surveiller les requêtes
- Utilisez `npm run db:studio` pour explorer vos données

### 3. Sauvegarde

Mettez en place une stratégie de sauvegarde PostgreSQL :

```bash
# Sauvegarde complète
pg_dump gestion_locative > backup_$(date +%Y%m%d).sql

# Restauration
psql gestion_locative < backup_20240807.sql
```

## 🎯 Prochaines Étapes

1. Testez toutes les fonctionnalités de votre application
2. Supprimez l'ancienne base SQLite une fois que tout fonctionne
3. Mettez à jour vos scripts de déploiement pour PostgreSQL
4. Documentez la nouvelle configuration pour votre équipe

---

**Note :** Gardez ce guide et le script de migration. Ils pourront servir pour d'autres projets ou pour des migrations partielles.