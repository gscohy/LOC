import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testAuth() {
  try {
    console.log('🔧 Création utilisateur de test...');

    // Créer un utilisateur de test
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: { password: hashedPassword },
      create: {
        email: 'admin@test.com',
        password: hashedPassword,
        nom: 'Admin',
        prenom: 'Test',
        role: 'GESTIONNAIRE'
      }
    });

    console.log('✅ Utilisateur créé: admin@test.com / admin123');

    // Créer un bien de test
    await prisma.bien.upsert({
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
        statut: 'VACANT'
      }
    });

    console.log('✅ Bien de test créé: test-bien-id');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();