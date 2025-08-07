import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function rebuildDatabase() {
  try {
    console.log('🔧 Reconstruction de la base de données...');
    
    // Nettoyer toutes les chaînes qui pourraient causer des problèmes
    console.log('1️⃣ Nettoyage des champs texte avec caractères spéciaux...');
    
    const cleanQueries = [
      // Nettoyer les commentaires de paiements
      `UPDATE paiements SET commentaire = REPLACE(commentaire, '€', 'EUR') WHERE commentaire LIKE '%€%'`,
      
      // Nettoyer les références de paiements
      `UPDATE paiements SET reference = REPLACE(reference, '€', 'EUR') WHERE reference LIKE '%€%'`,
      
      // Nettoyer les commentaires de loyers
      `UPDATE loyers SET commentaires = REPLACE(commentaires, '€', 'EUR') WHERE commentaires LIKE '%€%'`,
      
      // Nettoyer les descriptions de contrats
      `UPDATE contrats SET clausesParticulieres = REPLACE(clausesParticulieres, '€', 'EUR') WHERE clausesParticulieres LIKE '%€%'`,
      `UPDATE contrats SET commentaires = REPLACE(commentaires, '€', 'EUR') WHERE commentaires LIKE '%€%'`,
      
      // Nettoyer les descriptions de charges
      `UPDATE charges SET description = REPLACE(description, '€', 'EUR') WHERE description LIKE '%€%'`,
      `UPDATE charges SET commentaires = REPLACE(commentaires, '€', 'EUR') WHERE commentaires LIKE '%€%'`,
      
      // Nettoyer les adresses qui pourraient avoir des caractères étranges
      `UPDATE locataires SET adresse = TRIM(adresse) WHERE adresse IS NOT NULL`,
      `UPDATE proprietaires SET adresse = TRIM(adresse) WHERE adresse IS NOT NULL`,
      `UPDATE biens SET adresse = TRIM(adresse) WHERE adresse IS NOT NULL`
    ];
    
    for (const query of cleanQueries) {
      try {
        const result = await prisma.$executeRawUnsafe(query);
        console.log(`   ✅ Nettoyage effectué: ${result} ligne(s) affectée(s)`);
      } catch (error) {
        console.log(`   ⚠️  Requête ignorée: ${error.message}`);
      }
    }
    
    // Force un VACUUM sur la base
    console.log('2️⃣ Optimisation de la base de données...');
    await prisma.$executeRawUnsafe('VACUUM');
    console.log('   ✅ Base optimisée');
    
    // Test final du locataire
    console.log('3️⃣ Test final du locataire...');
    const locataire = await prisma.locataire.findUnique({
      where: { id: 'cmdt7nkiz00ygyuxgvfkplwv6' },
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true
      }
    });
    
    if (locataire) {
      console.log('✅ Locataire accessible:', locataire.prenom, locataire.nom);
      
      // Test avec les contrats
      const contrats = await prisma.contratLocataire.findMany({
        where: { locataireId: locataire.id },
        select: {
          contratId: true,
          contrat: {
            select: {
              id: true,
              loyer: true,
              bien: {
                select: {
                  adresse: true
                }
              }
            }
          }
        }
      });
      
      console.log(`✅ ${contrats.length} contrat(s) accessible(s)`);
      
      // Test avec les loyers (limité)
      for (const c of contrats.slice(0, 1)) {
        const loyers = await prisma.loyer.findMany({
          where: { contratId: c.contratId },
          select: {
            id: true,
            mois: true,
            annee: true,
            montantDu: true,
            montantPaye: true
          },
          take: 3,
          orderBy: { dateEcheance: 'desc' }
        });
        
        console.log(`✅ ${loyers.length} loyer(s) accessible(s) pour le contrat ${c.contratId}`);
        
        // Test avec les paiements (très limité)
        for (const l of loyers.slice(0, 1)) {
          const paiements = await prisma.paiement.findMany({
            where: { loyerId: l.id },
            select: {
              id: true,
              montant: true,
              payeur: true
            },
            take: 2
          });
          
          console.log(`✅ ${paiements.length} paiement(s) accessible(s) pour le loyer ${l.id}`);
        }
      }
      
    } else {
      console.log('❌ Locataire toujours inaccessible');
    }
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

rebuildDatabase();