import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verifierImport() {
  try {
    const paiements = await prisma.paiement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        loyer: {
          include: {
            contrat: {
              include: {
                bien: true
              }
            }
          }
        }
      }
    });
    
    console.log('📊 Résultats de l\'import:');
    console.log('Nombre de paiements récents:', paiements.length);
    
    if (paiements.length > 0) {
      console.log('\n🔍 Détails des 10 derniers paiements:');
      paiements.forEach((p, i) => {
        console.log(`${i+1}. ${p.montant}€ - ${p.payeur} - ${p.date.toISOString().split('T')[0]} - ${p.loyer.contrat.bien.adresse}`);
      });
    }
    
    // Statistiques par bien
    const stats = await prisma.paiement.groupBy({
      by: ['loyerId'],
      _count: { id: true },
      _sum: { montant: true }
    });
    
    console.log('\n📈 Statistiques par loyer:');
    console.log('Nombre de loyers ayant reçu des paiements:', stats.length);
    
    const totalMontant = stats.reduce((sum, s) => sum + (s._sum.montant || 0), 0);
    const totalPaiements = stats.reduce((sum, s) => sum + s._count.id, 0);
    
    console.log(`Total des paiements importés: ${totalPaiements}`);
    console.log(`Montant total importé: ${totalMontant}€`);
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifierImport();