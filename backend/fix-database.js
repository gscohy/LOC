import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDatabase() {
  try {
    console.log('🔧 Recherche et correction des données corrompues...');
    
    // SQLite ne peut pas faire une requête directe avec LIKE sur les Float corrompus
    // On va utiliser une requête SQL raw pour trouver et fixer les données
    
    console.log('🔍 Recherche des valeurs avec virgules dans montantDu...');
    
    // 1. Utiliser SQL brut pour identifier les problèmes
    const result = await prisma.$queryRaw`
      SELECT id, contratId, mois, annee, montantDu, montantPaye 
      FROM loyers 
      WHERE typeof(montantDu) = 'text' OR typeof(montantPaye) = 'text'
      LIMIT 10
    `;
    
    console.log('📋 Données corrompues trouvées:', result.length);
    result.forEach(row => {
      console.log(`   - ID ${row.id}: montantDu="${row.montantDu}" (${typeof row.montantDu}), montantPaye="${row.montantPaye}" (${typeof row.montantPaye})`);
    });
    
    if (result.length > 0) {
      console.log('🔧 Correction des données...');
      
      // 2. Corriger les valeurs avec virgules
      for (const row of result) {
        let montantDuFixed = row.montantDu;
        let montantPayeFixed = row.montantPaye;
        
        // Remplacer virgules par points
        if (typeof montantDuFixed === 'string') {
          montantDuFixed = parseFloat(montantDuFixed.replace(',', '.'));
        }
        if (typeof montantPayeFixed === 'string') {
          montantPayeFixed = parseFloat(montantPayeFixed.replace(',', '.'));
        }
        
        console.log(`   Correction ${row.id}: ${row.montantDu} -> ${montantDuFixed}, ${row.montantPaye} -> ${montantPayeFixed}`);
        
        await prisma.loyer.update({
          where: { id: row.id },
          data: {
            montantDu: montantDuFixed,
            montantPaye: montantPayeFixed
          }
        });
      }
      
      console.log('✅ Correction terminée');
    }
    
    // 3. Test après correction
    console.log('🧪 Test après correction...');
    const testLoyers = await prisma.loyer.findMany({
      where: { contratId: 'cmdsvzoyf00046a28q31h8r5z' },
      take: 3,
      select: {
        id: true,
        mois: true,
        annee: true,
        montantDu: true,
        montantPaye: true
      }
    });
    
    console.log('✅ Test réussi, exemples de loyers:');
    testLoyers.forEach(l => {
      console.log(`   - ${l.mois}/${l.annee}: ${l.montantDu}€ payé ${l.montantPaye}€`);
    });
    
  } catch (error) {
    console.error('🚨 Erreur lors de la correction:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixDatabase();