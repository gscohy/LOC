import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixAmountsWithSQL() {
  try {
    console.log('🔧 Correction des montants avec requêtes SQL directes...');
    
    // Corriger les montants dans la table paiements
    console.log('📊 Correction de la table paiements...');
    
    const updatePaiements = await prisma.$executeRaw`
      UPDATE paiements 
      SET montant = CAST(REPLACE(CAST(montant AS TEXT), ',', '.') AS REAL)
      WHERE CAST(montant AS TEXT) LIKE '%,%'
    `;
    
    console.log(`✅ ${updatePaiements} paiements corrigés`);
    
    // Corriger les montantDu dans la table loyers
    console.log('📊 Correction des montantDu dans la table loyers...');
    
    const updateLoyersDu = await prisma.$executeRaw`
      UPDATE loyers 
      SET montantDu = CAST(REPLACE(CAST(montantDu AS TEXT), ',', '.') AS REAL)
      WHERE CAST(montantDu AS TEXT) LIKE '%,%'
    `;
    
    console.log(`✅ ${updateLoyersDu} loyers (montantDu) corrigés`);
    
    // Corriger les montantPaye dans la table loyers
    console.log('📊 Correction des montantPaye dans la table loyers...');
    
    const updateLoyersPaye = await prisma.$executeRaw`
      UPDATE loyers 
      SET montantPaye = CAST(REPLACE(CAST(montantPaye AS TEXT), ',', '.') AS REAL)
      WHERE CAST(montantPaye AS TEXT) LIKE '%,%'
    `;
    
    console.log(`✅ ${updateLoyersPaye} loyers (montantPaye) corrigés`);
    
    // Corriger les montants dans la table contrats (loyer et charges)
    console.log('📊 Correction de la table contrats...');
    
    const updateContratsLoyer = await prisma.$executeRaw`
      UPDATE contrats 
      SET loyer = CAST(REPLACE(CAST(loyer AS TEXT), ',', '.') AS REAL)
      WHERE CAST(loyer AS TEXT) LIKE '%,%'
    `;
    
    const updateContratsCharges = await prisma.$executeRaw`
      UPDATE contrats 
      SET chargesMensuelles = CAST(REPLACE(CAST(chargesMensuelles AS TEXT), ',', '.') AS REAL)
      WHERE CAST(chargesMensuelles AS TEXT) LIKE '%,%'
    `;
    
    const updateContratsDepot = await prisma.$executeRaw`
      UPDATE contrats 
      SET depotGarantie = CAST(REPLACE(CAST(depotGarantie AS TEXT), ',', '.') AS REAL)
      WHERE CAST(depotGarantie AS TEXT) LIKE '%,%'
    `;
    
    console.log(`✅ ${updateContratsLoyer} contrats (loyer) corrigés`);
    console.log(`✅ ${updateContratsCharges} contrats (charges) corrigés`);
    console.log(`✅ ${updateContratsDepot} contrats (dépôt) corrigés`);
    
    // Corriger les montants dans la table charges
    console.log('📊 Correction de la table charges...');
    
    const updateCharges = await prisma.$executeRaw`
      UPDATE charges 
      SET montant = CAST(REPLACE(CAST(montant AS TEXT), ',', '.') AS REAL)
      WHERE CAST(montant AS TEXT) LIKE '%,%'
    `;
    
    console.log(`✅ ${updateCharges} charges corrigées`);
    
    // Corriger les montants dans la table locataires (revenus)
    console.log('📊 Correction de la table locataires...');
    
    const updateLocataires = await prisma.$executeRaw`
      UPDATE locataires 
      SET revenus = CAST(REPLACE(CAST(revenus AS TEXT), ',', '.') AS REAL)
      WHERE CAST(revenus AS TEXT) LIKE '%,%'
    `;
    
    console.log(`✅ ${updateLocataires} locataires corrigés`);
    
    // Corriger les montants dans la table garants (revenus)
    console.log('📊 Correction de la table garants...');
    
    const updateGarants = await prisma.$executeRaw`
      UPDATE garants 
      SET revenus = CAST(REPLACE(CAST(revenus AS TEXT), ',', '.') AS REAL)
      WHERE CAST(revenus AS TEXT) LIKE '%,%'
    `;
    
    console.log(`✅ ${updateGarants} garants corrigés`);
    
    // Recalculer les totaux des loyers pour s'assurer de la cohérence
    console.log('🔄 Recalcul des totaux des loyers...');
    
    const loyersToRecalculate = await prisma.$queryRaw`
      SELECT DISTINCT loyerId FROM paiements
    `;
    
    let loyersRecalculated = 0;
    
    for (const { loyerId } of loyersToRecalculate) {
      try {
        const totalPaiements = await prisma.$queryRaw`
          SELECT COALESCE(SUM(montant), 0) as total FROM paiements WHERE loyerId = ${loyerId}
        `;
        
        const total = totalPaiements[0].total;
        
        const loyer = await prisma.loyer.findUnique({
          where: { id: loyerId }
        });
        
        if (loyer && Math.abs(loyer.montantPaye - total) > 0.01) {
          // Déterminer le nouveau statut
          let nouveauStatut = 'EN_ATTENTE';
          if (total >= loyer.montantDu) {
            nouveauStatut = 'PAYE';
          } else if (total > 0) {
            nouveauStatut = 'PARTIEL';
          }
          
          await prisma.loyer.update({
            where: { id: loyerId },
            data: {
              montantPaye: total,
              statut: nouveauStatut
            }
          });
          
          loyersRecalculated++;
        }
      } catch (error) {
        console.error(`❌ Erreur recalcul loyer ${loyerId}:`, error.message);
      }
    }
    
    console.log(`✅ ${loyersRecalculated} loyers recalculés`);
    
    console.log(`\n🎉 Correction globale terminée !`);
    console.log(`   - Paiements: ${updatePaiements} corrigés`);
    console.log(`   - Loyers: ${updateLoyersDu + updateLoyersPaye} montants corrigés`);
    console.log(`   - Contrats: ${updateContratsLoyer + updateContratsCharges + updateContratsDepot} montants corrigés`);
    console.log(`   - Charges: ${updateCharges} corrigées`);
    console.log(`   - Locataires: ${updateLocataires} corrigés`);
    console.log(`   - Garants: ${updateGarants} corrigés`);
    console.log(`   - ${loyersRecalculated} totaux recalculés`);
    
    // Test final - essayer de lire quelques paiements
    console.log('\n🧪 Test de lecture des paiements...');
    const testPaiements = await prisma.paiement.findMany({
      take: 5,
      select: {
        id: true,
        montant: true,
        payeur: true
      }
    });
    
    console.log('✅ Premiers paiements après correction:');
    testPaiements.forEach(p => {
      console.log(`   - ${p.id}: ${p.montant}€ (${p.payeur})`);
    });
    
  } catch (error) {
    console.error('💥 Erreur fatale:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAmountsWithSQL();