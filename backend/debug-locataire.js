import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debugLocataire() {
  try {
    console.log('🔍 Debug étape par étape...');
    
    // Étape 1: Le locataire de base
    console.log('1️⃣ Récupération locataire de base...');
    const locataire = await prisma.locataire.findUnique({
      where: { id: 'cmdt7nkiz00ygyuxgvfkplwv6' }
    });
    
    if (!locataire) {
      console.log('❌ Locataire non trouvé');
      return;
    }
    
    console.log('✅ Locataire:', locataire.prenom, locataire.nom);
    
    // Étape 2: Les contrats du locataire
    console.log('2️⃣ Récupération des contrats...');
    const contrats = await prisma.contratLocataire.findMany({
      where: { locataireId: 'cmdt7nkiz00ygyuxgvfkplwv6' },
      include: {
        contrat: true
      }
    });
    
    console.log(`✅ ${contrats.length} contrat(s) trouvé(s)`);
    contrats.forEach(c => {
      console.log(`   - Contrat ${c.contratId}: loyer ${c.contrat.loyer}€`);
    });
    
    // Étape 3: Les loyers des contrats
    console.log('3️⃣ Récupération des loyers...');
    for (const contrat of contrats) {
      console.log(`   🔍 Loyers du contrat ${contrat.contratId}...`);
      
      try {
        const loyers = await prisma.loyer.findMany({
          where: { contratId: contrat.contratId },
          take: 3,
          orderBy: { dateEcheance: 'desc' }
        });
        
        console.log(`   ✅ ${loyers.length} loyer(s) trouvé(s)`);
        loyers.forEach(l => {
          console.log(`      - ${l.mois}/${l.annee}: ${l.montantDu}€ (payé: ${l.montantPaye}€)`);
        });
        
        // Étape 4: Les paiements des loyers
        console.log('4️⃣ Récupération des paiements...');
        for (const loyer of loyers.slice(0, 1)) { // Test sur 1 seul loyer
          console.log(`   🔍 Paiements du loyer ${loyer.id}...`);
          
          try {
            const paiements = await prisma.paiement.findMany({
              where: { loyerId: loyer.id },
              take: 3
            });
            
            console.log(`   ✅ ${paiements.length} paiement(s) trouvé(s)`);
            paiements.forEach(p => {
              console.log(`      - ${p.id}: ${p.montant}€ (${p.payeur})`);
            });
            
          } catch (error) {
            console.error(`   ❌ Erreur paiements loyer ${loyer.id}:`, error.message);
          }
        }
        
      } catch (error) {
        console.error(`   ❌ Erreur loyers contrat ${contrat.contratId}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('💥 Erreur globale:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugLocataire();