import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBien() {
  try {
    console.log('🔍 Recherche du bien cmdnmshqf000010xwu1cebqas...');
    
    const bien = await prisma.bien.findUnique({
      where: { id: 'cmdnmshqf000010xwu1cebqas' },
      include: {
        proprietaires: {
          include: {
            proprietaire: true
          }
        },
        contrats: {
          include: {
            locataires: {
              include: {
                locataire: true
              }
            }
          }
        }
      }
    });

    if (bien) {
      console.log('✅ Bien trouvé:');
      console.log(`📍 Adresse: ${bien.adresse}, ${bien.ville}`);
      console.log(`🏠 Type: ${bien.type}, ${bien.surface}m²`);
      console.log(`💰 Loyer: ${bien.loyer}€`);
      console.log(`📋 Statut: ${bien.statut}`);
      console.log(`👥 Propriétaires: ${bien.proprietaires.length}`);
      console.log(`📄 Contrats: ${bien.contrats.length}`);
    } else {
      console.log('❌ Bien non trouvé');
      
      // Chercher tous les biens pour voir les IDs disponibles
      const allBiens = await prisma.bien.findMany({
        select: {
          id: true,
          adresse: true,
          ville: true
        },
        take: 10
      });
      
      console.log('📋 Biens disponibles:');
      allBiens.forEach(b => {
        console.log(`  - ${b.id}: ${b.adresse}, ${b.ville}`);
      });
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBien();