import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Fonction pour nettoyer et parser les montants
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  
  // Supprimer les symboles € et espaces, remplacer virgules par points
  const cleaned = amountStr.toString()
    .replace(/€/g, '')
    .replace(/\s+/g, '')
    .replace(/,/g, '.');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Fonction pour convertir les timestamps Excel en dates
function excelTimestampToDate(timestamp) {
  if (!timestamp) return new Date();
  
  // Les timestamps Excel sont en millisecondes depuis 1970 ou jours depuis 1900
  const timestampNum = parseFloat(timestamp.toString().replace(/,/g, ''));
  
  // Si c'est un grand nombre (> 1000000000000), c'est en millisecondes
  if (timestampNum > 1000000000000) {
    return new Date(timestampNum);
  }
  
  // Sinon, c'est probablement des jours depuis 1900 (format Excel classique)
  const excelEpoch = new Date(1900, 0, 1);
  const days = timestampNum - 2; // Excel compte mal les jours
  return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
}

// Données directement structurées pour test
const loyersToInsert = [
  {
    id: 'cmdt7u5fe00ypyuxg79es7h6s',
    contratId: 'cmdt7u5f300yjyuxgine1hlcv',
    mois: 12,
    annee: 2012,
    montantDu: 0,
    montantPaye: 0,
    statut: 'PAYE',
    commentaires: 'Loyer prorata 25/12/2012 - 31/12/2012'
  },
  {
    id: 'cmdt7u5ff00yryuxgx9qmh2jz',
    contratId: 'cmdt7u5f300yjyuxgine1hlcv',
    mois: 1,
    annee: 2013,
    montantDu: 300.00,
    montantPaye: 300.00,
    statut: 'PAYE',
    commentaires: 'Loyer janvier 2013'
  }
  // Ajoutez le reste des données ici...
];

async function insertLoyers() {
  try {
    console.log('🚀 Début de l\'insertion des loyers...');
    console.log(`📊 ${loyersToInsert.length} loyers à insérer`);
    
    let inserted = 0;
    let errors = 0;
    
    for (const loyerData of loyersToInsert) {
      try {
        // Vérifier si le loyer existe déjà
        const existingLoyer = await prisma.loyer.findUnique({
          where: { id: loyerData.id }
        });
        
        if (existingLoyer) {
          console.log(`⏭️  Loyer ${loyerData.id} existe déjà, ignoré`);
          continue;
        }
        
        // Vérifier si le contrat existe
        const contratExists = await prisma.contrat.findUnique({
          where: { id: loyerData.contratId }
        });
        
        if (!contratExists) {
          console.warn(`⚠️  Contrat ${loyerData.contratId} non trouvé pour le loyer ${loyerData.id}`);
          errors++;
          continue;
        }
        
        // Calculer la date d'échéance (le 1er du mois par défaut)
        const dateEcheance = new Date(loyerData.annee, loyerData.mois - 1, 1);
        
        // Créer le loyer
        const newLoyer = {
          id: loyerData.id,
          contratId: loyerData.contratId,
          mois: loyerData.mois,
          annee: loyerData.annee,
          montantDu: loyerData.montantDu,
          montantPaye: loyerData.montantPaye,
          statut: loyerData.statut,
          dateEcheance: dateEcheance,
          commentaires: loyerData.commentaires || null
        };
        
        await prisma.loyer.create({
          data: newLoyer
        });
        
        inserted++;
        console.log(`✅ Loyer ${loyerData.id} créé: ${loyerData.mois}/${loyerData.annee} - ${loyerData.montantDu}€`);
        
      } catch (error) {
        console.error(`❌ Erreur pour ${loyerData.id}:`, error.message);
        errors++;
      }
    }
    
    console.log('\\n🎉 Insertion terminée !');
    console.log(`   - ${inserted} loyers créés`);
    console.log(`   - ${errors} erreurs`);
    
  } catch (error) {
    console.error('💥 Erreur fatale:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

insertLoyers();