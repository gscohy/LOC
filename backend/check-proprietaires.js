import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProprietaires() {
  try {
    console.log('🔍 Vérification des propriétaires en base...');
    
    const proprietaires = await prisma.proprietaire.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        createdAt: true,
      }
    });
    
    console.log(`📊 Nombre total de propriétaires: ${proprietaires.length}`);
    
    if (proprietaires.length > 0) {
      console.log('\n📋 Liste des propriétaires:');
      proprietaires.forEach((prop, index) => {
        console.log(`   ${index + 1}. ${prop.nom} ${prop.prenom} (${prop.email}) - ID: ${prop.id}`);
      });
    } else {
      console.log('❌ Aucun propriétaire trouvé en base de données');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProprietaires();