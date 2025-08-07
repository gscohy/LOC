// Script pour créer des données de test
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('🔧 Création des données de test...');

    // 1. Créer un utilisateur de test
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const user = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        password: hashedPassword,
        nom: 'Admin',
        prenom: 'Test',
        role: 'GESTIONNAIRE'
      }
    });
    console.log('✅ Utilisateur créé:', user.email);

    // 2. Créer un propriétaire de test
    const proprietaire = await prisma.proprietaire.upsert({
      where: { email: 'proprietaire@test.com' },
      update: {},
      create: {
        nom: 'Martin',
        prenom: 'Jean',
        email: 'proprietaire@test.com',
        telephone: '0123456789',
        adresse: '123 rue de la Paix',
        ville: 'Paris',
        codePostal: '75001'
      }
    });
    console.log('✅ Propriétaire créé:', proprietaire.id);

    // 3. Créer un bien de test
    const bien = await prisma.bien.upsert({
      where: { id: 'test-bien-id' },
      update: {},
      create: {
        id: 'test-bien-id',
        adresse: '456 Avenue des Tests',
        ville: 'Paris',
        codePostal: '75002',
        type: 'APPARTEMENT',
        surface: 50.0,
        nbPieces: 2,
        loyer: 1200.0,
        chargesMensuelles: 150.0,
        depotGarantie: 1200.0,
        statut: 'LOUE'
      }
    });
    console.log('✅ Bien créé:', bien.id);

    // 4. Lier le propriétaire au bien
    await prisma.bienProprietaire.upsert({
      where: {
        bienId_proprietaireId: {
          bienId: bien.id,
          proprietaireId: proprietaire.id
        }
      },
      update: {},
      create: {
        bienId: bien.id,
        proprietaireId: proprietaire.id,
        quotePart: 100.0
      }
    });
    console.log('✅ Propriétaire lié au bien');

    // 5. Créer un locataire de test
    const locataire = await prisma.locataire.upsert({
      where: { email: 'locataire@test.com' },
      update: {},
      create: {
        nom: 'Dupont',
        prenom: 'Marie',
        email: 'locataire@test.com',
        telephone: '0987654321',
        adresse: '789 rue du Locataire',
        ville: 'Paris',
        codePostal: '75003'
      }
    });
    console.log('✅ Locataire créé:', locataire.id);

    console.log('\n🎉 Données de test créées avec succès !');
    console.log('📧 Email de connexion: admin@test.com');
    console.log('🔑 Mot de passe: admin123');
    console.log('🏠 ID du bien de test:', bien.id);

  } catch (error) {
    console.error('❌ Erreur lors de la création des données:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();