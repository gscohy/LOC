import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function corrigerLoyerGregLeroy() {
  try {
    const loyerId = 'cmdt47hff00cxyuxgvzq7wcho';
    const nouveauMontant = 53.47;
    
    console.log('🔧 Correction du loyer de Greg Leroy...');
    console.log(`   Ancien montant: 63.23€`);
    console.log(`   Nouveau montant: ${nouveauMontant}€`);
    
    const result = await prisma.loyer.update({
      where: { id: loyerId },
      data: {
        montantDu: nouveauMontant
      }
    });
    
    console.log('✅ Montant corrigé avec succès !');
    console.log(`   Montant mis à jour: ${result.montantDu}€`);
    
    // Ajouter un historique
    await prisma.contratHistorique.create({
      data: {
        contratId: 'cmdt47heu00byyuxgu9e94efa',
        action: 'CORRECTION_LOYER_PRORATA',
        description: 'Correction du loyer de juillet 2020 au prorata (3 jours): 63.23€ → 53.47€',
        dateAction: new Date(),
        metadata: JSON.stringify({
          ancienMontant: 63.23,
          nouveauMontant: nouveauMontant,
          joursOccupation: 3,
          raisonCorrection: 'Calcul prorata résiliation 03/07/2020'
        })
      }
    });
    
    console.log('📝 Historique ajouté au contrat');
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

corrigerLoyerGregLeroy();