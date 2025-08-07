import { PrismaClient } from '@prisma/client';

async function checkUsers() {
  const prisma = new PrismaClient();
  
  try {
    const users = await prisma.user.findMany();
    console.log('Utilisateurs trouvés:', users.length);
    
    if (users.length === 0) {
      console.log('Aucun utilisateur trouvé.');
      console.log('Veuillez utiliser les seeds ou créer un utilisateur manuellement.');
    } else {
      users.forEach(user => {
        console.log(`- ${user.email} (${user.role}) - ${user.statut}`);
      });
    }
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();