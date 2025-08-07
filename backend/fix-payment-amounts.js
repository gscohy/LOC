import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixPaymentAmounts() {
  try {
    console.log('🔍 Recherche des paiements avec des montants mal formatés...');
    
    // D'abord, regardons tous les paiements pour identifier le problème
    const allPayments = await prisma.paiement.findMany({
      select: {
        id: true,
        montant: true,
        loyerId: true
      }
    });
    
    console.log(`📊 ${allPayments.length} paiements trouvés`);
    
    let problematicPayments = [];
    let fixedCount = 0;
    
    // Identifier les paiements problématiques
    for (const payment of allPayments) {
      const montantStr = payment.montant.toString();
      
      // Vérifier si le montant contient des virgules ou des formats étranges
      if (montantStr.includes(',') || montantStr.includes('€') || 
          isNaN(parseFloat(montantStr)) || montantStr.includes(' ')) {
        problematicPayments.push(payment);
        console.log(`❌ Paiement ${payment.id}: montant problématique "${payment.montant}"`);
      }
    }
    
    console.log(`🔧 ${problematicPayments.length} paiements à corriger`);
    
    if (problematicPayments.length === 0) {
      console.log('✅ Aucun paiement problématique trouvé');
      return;
    }
    
    // Corriger les paiements problématiques
    for (const payment of problematicPayments) {
      try {
        // Nettoyer le montant
        let cleanAmount = payment.montant.toString()
          .replace(/€/g, '')           // Supprimer €
          .replace(/\s+/g, '')         // Supprimer espaces
          .replace(/,/g, '.')          // Remplacer virgules par points
          .trim();
        
        const parsedAmount = parseFloat(cleanAmount);
        
        if (isNaN(parsedAmount)) {
          console.error(`❌ Impossible de parser le montant "${payment.montant}" pour le paiement ${payment.id}`);
          continue;
        }
        
        console.log(`🔧 Correction paiement ${payment.id}: "${payment.montant}" → ${parsedAmount}`);
        
        // Mettre à jour le paiement
        await prisma.paiement.update({
          where: { id: payment.id },
          data: { montant: parsedAmount }
        });
        
        fixedCount++;
        
      } catch (error) {
        console.error(`❌ Erreur correction paiement ${payment.id}:`, error.message);
      }
    }
    
    console.log(`\n✅ Correction terminée: ${fixedCount} paiements corrigés`);
    
    // Vérifier que les loyers associés ont des totaux cohérents
    console.log('\n🔍 Vérification des totaux des loyers...');
    
    const loyersToCheck = [...new Set(problematicPayments.map(p => p.loyerId))];
    
    for (const loyerId of loyersToCheck) {
      try {
        // Recalculer le montant payé pour ce loyer
        const paiements = await prisma.paiement.findMany({
          where: { loyerId: loyerId }
        });
        
        const totalPaye = paiements.reduce((sum, p) => sum + parseFloat(p.montant), 0);
        
        // Mettre à jour le loyer
        const loyer = await prisma.loyer.findUnique({
          where: { id: loyerId }
        });
        
        if (loyer && Math.abs(loyer.montantPaye - totalPaye) > 0.01) {
          console.log(`🔧 Correction loyer ${loyerId}: ${loyer.montantPaye}€ → ${totalPaye}€`);
          
          // Déterminer le nouveau statut
          let nouveauStatut = 'EN_ATTENTE';
          if (totalPaye >= loyer.montantDu) {
            nouveauStatut = 'PAYE';
          } else if (totalPaye > 0) {
            nouveauStatut = 'PARTIEL';
          }
          
          await prisma.loyer.update({
            where: { id: loyerId },
            data: {
              montantPaye: totalPaye,
              statut: nouveauStatut
            }
          });
        }
        
      } catch (error) {
        console.error(`❌ Erreur vérification loyer ${loyerId}:`, error.message);
      }
    }
    
    // Vérifier aussi les montants dans la table loyers
    console.log('\n🔍 Vérification des montants dans la table loyers...');
    
    const allLoyers = await prisma.loyer.findMany({
      select: {
        id: true,
        montantDu: true,
        montantPaye: true
      }
    });
    
    let loyersFixed = 0;
    
    for (const loyer of allLoyers) {
      let needsUpdate = false;
      let updateData = {};
      
      // Vérifier montantDu
      const montantDuStr = loyer.montantDu.toString();
      if (montantDuStr.includes(',')) {
        const cleanMontantDu = parseFloat(montantDuStr.replace(/,/g, '.'));
        if (!isNaN(cleanMontantDu)) {
          updateData.montantDu = cleanMontantDu;
          needsUpdate = true;
          console.log(`🔧 Correction loyer ${loyer.id} montantDu: "${loyer.montantDu}" → ${cleanMontantDu}`);
        }
      }
      
      // Vérifier montantPaye
      const montantPayeStr = loyer.montantPaye.toString();
      if (montantPayeStr.includes(',')) {
        const cleanMontantPaye = parseFloat(montantPayeStr.replace(/,/g, '.'));
        if (!isNaN(cleanMontantPaye)) {
          updateData.montantPaye = cleanMontantPaye;
          needsUpdate = true;
          console.log(`🔧 Correction loyer ${loyer.id} montantPaye: "${loyer.montantPaye}" → ${cleanMontantPaye}`);
        }
      }
      
      if (needsUpdate) {
        await prisma.loyer.update({
          where: { id: loyer.id },
          data: updateData
        });
        loyersFixed++;
      }
    }
    
    console.log(`\n🎉 Correction globale terminée:`);
    console.log(`   - ${fixedCount} paiements corrigés`);
    console.log(`   - ${loyersFixed} loyers corrigés`);
    console.log(`   - Totaux des loyers recalculés`);
    
  } catch (error) {
    console.error('💥 Erreur fatale:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixPaymentAmounts();