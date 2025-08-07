import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createUser() {
  try {
    console.log('🔐 Création de l\'utilisateur...');
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    // Créer l'utilisateur
    const user = await prisma.user.upsert({
      where: { email: 'gscohy@orange.fr' },
      update: {
        password: hashedPassword,
        nom: 'Scohy',
        prenom: 'Guillaume',
        role: 'GESTIONNAIRE',
        statut: 'ACTIF',
      },
      create: {
        email: 'gscohy@orange.fr',
        password: hashedPassword,
        nom: 'Scohy',
        prenom: 'Guillaume',
        role: 'GESTIONNAIRE',
        statut: 'ACTIF',
      },
    });
    
    console.log('✅ Utilisateur créé avec succès:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Nom: ${user.nom} ${user.prenom}`);
    console.log(`   Rôle: ${user.role}`);
    console.log(`   ID: ${user.id}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'utilisateur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();