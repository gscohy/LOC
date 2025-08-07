import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

/**
 * Fonction principale d'import adaptée à votre structure Excel
 */
async function importerPaiementsExcel(cheminFichier) {
  try {
    console.log('🚀 Début de l\'import des paiements depuis:', cheminFichier);
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(cheminFichier)) {
      throw new Error(`Fichier non trouvé: ${cheminFichier}`);
    }

    // Lire le fichier Excel
    console.log('📖 Lecture du fichier Excel...');
    const workbook = XLSX.readFile(cheminFichier);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir en JSON
    const donnees = XLSX.utils.sheet_to_json(worksheet);
    console.log(`📊 ${donnees.length} lignes trouvées dans le fichier`);

    if (donnees.length === 0) {
      throw new Error('Le fichier Excel est vide ou mal formaté');
    }

    console.log('Structure détectée:', Object.keys(donnees[0]));

    // Analyser et convertir les données
    console.log('🔍 Traitement des données...');
    const paiementsValides = [];
    const erreurs = [];

    for (let i = 0; i < donnees.length; i++) {
      const ligne = donnees[i];
      const resultats = await traiterLignePaiement(ligne, i + 2);
      
      if (resultats.length > 0) {
        paiementsValides.push(...resultats.filter(r => r.valide).map(r => r.paiement));
        erreurs.push(...resultats.filter(r => !r.valide).map(r => r.erreur));
      }
    }

    // Afficher les erreurs s'il y en a
    if (erreurs.length > 0) {
      console.log('❌ Erreurs trouvées:');
      erreurs.forEach(erreur => console.log(`   - ${erreur}`));
    }

    console.log(`✅ ${paiementsValides.length} paiement(s) prêt(s) à être importé(s)`);

    if (paiementsValides.length === 0) {
      console.log('❌ Aucun paiement valide trouvé.');
      return { paiementsCrees: 0, loyersMisAJour: 0, quittancesGenerees: 0 };
    }

    // Importer les paiements valides
    console.log(`💾 Import de ${paiementsValides.length} paiement(s)...`);
    const resultats = await importerPaiements(paiementsValides);

    console.log('✅ Import terminé avec succès!');
    console.log(`   - ${resultats.paiementsCrees} paiement(s) créé(s)`);
    console.log(`   - ${resultats.loyersMisAJour} loyer(s) mis à jour`);
    
    if (resultats.quittancesGenerees > 0) {
      console.log(`   - ${resultats.quittancesGenerees} quittance(s) générée(s) automatiquement`);
    }

    return resultats;

  } catch (error) {
    console.error('❌ Erreur lors de l\'import:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Traiter une ligne et créer des paiements pour chaque montant non nul
 */
async function traiterLignePaiement(ligne, numeroLigne) {
  const resultats = [];

  try {
    // Convertir la date Excel en date JavaScript
    let datePaiement;
    if (typeof ligne.Date_loyer === 'number') {
      // Date au format Excel (nombre de jours depuis 1900-01-01)
      datePaiement = new Date((ligne.Date_loyer - 25569) * 86400 * 1000);
    } else if (ligne.Date_loyer) {
      datePaiement = new Date(ligne.Date_loyer);
    } else {
      // Si pas de date, utiliser le 1er du mois/année indiqué
      datePaiement = new Date(ligne.annee, ligne.mois - 1, 1);
    }

    if (isNaN(datePaiement.getTime())) {
      resultats.push({ 
        valide: false, 
        erreur: `Ligne ${numeroLigne}: Date invalide (${ligne.Date_loyer})` 
      });
      return resultats;
    }

    // Construire l'adresse complète et la normaliser
    const adresseComplete = [
      ligne.Adresse1,
      ligne.Adresse2,
      ligne.CP,
      ligne.Ville
    ].filter(Boolean).join(' ').trim();

    // Normaliser l'adresse pour correspondre à la base (sans les codes postaux et avec la bonne casse)
    let adresseNormalisee = ligne.Adresse1?.trim() || '';
    let villeNormalisee = ligne.Ville?.trim().toLowerCase().replace(/-/g, ' ') || '';
    
    // Corrections spécifiques connues
    if (villeNormalisee.includes('ligny')) {
      villeNormalisee = 'Ligny en cambresis';
    }

    // Valider mois et année
    const mois = parseInt(ligne.mois);
    const annee = parseInt(ligne.annee);
    
    if (!mois || mois < 1 || mois > 12) {
      resultats.push({ 
        valide: false, 
        erreur: `Ligne ${numeroLigne}: Mois invalide (${mois})` 
      });
      return resultats;
    }

    if (!annee || annee < 2000 || annee > 2030) {
      resultats.push({ 
        valide: false, 
        erreur: `Ligne ${numeroLigne}: Année invalide (${annee})` 
      });
      return resultats;
    }

    // Rechercher le loyer correspondant
    const loyer = await rechercherLoyer(adresseNormalisee, villeNormalisee, mois, annee, numeroLigne);
    if (!loyer) {
      resultats.push({ 
        valide: false, 
        erreur: `Ligne ${numeroLigne}: Loyer non trouvé pour ${adresseComplete} ${mois}/${annee}` 
      });
      return resultats;
    }

    // Normaliser le mode de paiement
    let modeNormalise = 'VIREMENT';
    if (ligne.mode) {
      const modeStr = ligne.mode.toString().toUpperCase();
      if (modeStr.includes('VIREMENT')) modeNormalise = 'VIREMENT';
      else if (modeStr.includes('CHEQUE')) modeNormalise = 'CHEQUE';
      else if (modeStr.includes('ESPECES')) modeNormalise = 'ESPECES';
      else if (modeStr.includes('CARTE')) modeNormalise = 'CARTE';
      else if (modeStr.includes('PRELEVEMENT')) modeNormalise = 'PRELEVEMENT';
    }

    // Créer un paiement pour chaque montant non nul
    const montants = [
      { type: 'APL', montant: parseFloat(ligne.Montant_APL || 0) },
      { type: 'Locataire', montant: parseFloat(ligne.Montant_Locataire || 0) },
      { type: 'Autre', montant: parseFloat(ligne.Montant_Autre || 0) }
    ];

    for (const { type, montant } of montants) {
      if (montant > 0) {
        const paiement = {
          loyerId: loyer.id,
          montant: montant,
          date: datePaiement,
          mode: modeNormalise,
          payeur: type === 'APL' ? 'CAF' : (type === 'Locataire' ? 'Locataire' : 'Autre'),
          reference: null,
          commentaire: `Import Excel - ${type}`
        };

        resultats.push({ valide: true, paiement });
      }
    }

    if (resultats.length === 0) {
      resultats.push({ 
        valide: false, 
        erreur: `Ligne ${numeroLigne}: Aucun montant positif trouvé` 
      });
    }

    return resultats;

  } catch (error) {
    resultats.push({ 
      valide: false, 
      erreur: `Ligne ${numeroLigne}: Erreur de traitement - ${error.message}` 
    });
    return resultats;
  }
}

/**
 * Rechercher un loyer par adresse et période
 */
async function rechercherLoyer(adresse, ville, mois, annee, numeroLigne) {
  try {
    // Recherche par adresse partielle
    const loyer = await prisma.loyer.findFirst({
      where: {
        mois: mois,
        annee: annee,
        contrat: {
          bien: {
            AND: [
              { adresse: { contains: adresse } },
              { ville: { contains: ville } }
            ]
          }
        }
      },
      include: {
        contrat: {
          include: {
            bien: true
          }
        }
      }
    });

    if (loyer) {
      console.log(`✅ Ligne ${numeroLigne}: Loyer trouvé pour ${loyer.contrat.bien.adresse}`);
      return loyer;
    }

    // Si pas trouvé, essayer avec des parties de l'adresse
    const partiesAdresse = adresse.split(' ').filter(p => p.length > 3);
    
    for (const partie of partiesAdresse) {
      const loyerPartiel = await prisma.loyer.findFirst({
        where: {
          mois: mois,
          annee: annee,
          contrat: {
            bien: {
              adresse: { contains: partie }
            }
          }
        },
        include: {
          contrat: {
            include: {
              bien: true
            }
          }
        }
      });

      if (loyerPartiel) {
        console.log(`✅ Ligne ${numeroLigne}: Loyer trouvé (partiel) pour ${loyerPartiel.contrat.bien.adresse}`);
        return loyerPartiel;
      }
    }

    console.warn(`⚠️  Ligne ${numeroLigne}: Aucun loyer trouvé pour "${adresse}" en ${mois}/${annee}`);
    return null;

  } catch (error) {
    console.error(`Erreur recherche loyer ligne ${numeroLigne}:`, error.message);
    return null;
  }
}

/**
 * Importer les paiements validés
 */
async function importerPaiements(paiements) {
  const stats = {
    paiementsCrees: 0,
    loyersMisAJour: 0,
    quittancesGenerees: 0
  };

  // Grouper les paiements par loyer
  const paiementsParLoyer = {};
  paiements.forEach(p => {
    if (!paiementsParLoyer[p.loyerId]) {
      paiementsParLoyer[p.loyerId] = [];
    }
    paiementsParLoyer[p.loyerId].push(p);
  });

  console.log(`📋 ${Object.keys(paiementsParLoyer).length} loyer(s) différent(s) à traiter`);

  // Traiter chaque groupe de paiements
  for (const [loyerId, paiementsLoyer] of Object.entries(paiementsParLoyer)) {
    await prisma.$transaction(async (tx) => {
      // Récupérer le loyer actuel
      const loyer = await tx.loyer.findUnique({
        where: { id: loyerId },
        include: { 
          contrat: {
            include: {
              bien: true
            }
          }
        }
      });

      if (!loyer) {
        console.warn(`⚠️  Loyer ${loyerId} non trouvé, ignoré`);
        return;
      }

      console.log(`💾 Traitement loyer: ${loyer.contrat.bien.adresse} - ${getMonthName(loyer.mois)} ${loyer.annee}`);

      let montantPayeActuel = loyer.montantPaye;

      // Créer tous les paiements pour ce loyer
      for (const paiementData of paiementsLoyer) {
        await tx.paiement.create({
          data: paiementData
        });
        
        montantPayeActuel += paiementData.montant;
        stats.paiementsCrees++;
        console.log(`   + ${paiementData.montant}€ (${paiementData.payeur})`);
      }

      // Déterminer le nouveau statut
      let nouveauStatut = 'EN_ATTENTE';
      if (montantPayeActuel >= loyer.montantDu) {
        nouveauStatut = 'PAYE';
      } else if (montantPayeActuel > 0) {
        nouveauStatut = 'PARTIEL';
      }

      // Mettre à jour le loyer
      await tx.loyer.update({
        where: { id: loyerId },
        data: {
          montantPaye: montantPayeActuel,
          statut: nouveauStatut
        }
      });
      stats.loyersMisAJour++;

      console.log(`   → Statut: ${loyer.statut} → ${nouveauStatut} (${montantPayeActuel}€/${loyer.montantDu}€)`);

      // Générer quittance si payé intégralement
      if (nouveauStatut === 'PAYE' && loyer.statut !== 'PAYE') {
        const quittanceExistante = await tx.quittance.findFirst({
          where: { loyerId: loyerId }
        });

        if (!quittanceExistante) {
          const periode = `${getMonthName(loyer.mois)} ${loyer.annee}`;

          await tx.quittance.create({
            data: {
              loyerId: loyerId,
              periode: periode,
              montant: loyer.montantDu,
              statut: 'GENEREE',
              modeEnvoi: 'EMAIL',
              emailEnvoye: false
            }
          });
          stats.quittancesGenerees++;
          console.log(`   → Quittance générée pour ${periode}`);
        }
      }

      // Historique
      await tx.contratHistorique.create({
        data: {
          contratId: loyer.contratId,
          action: 'IMPORT_PAIEMENTS_EXCEL',
          description: `Import Excel: ${paiementsLoyer.length} paiement(s) pour un total de ${paiementsLoyer.reduce((sum, p) => sum + p.montant, 0)}€`,
          dateAction: new Date(),
          metadata: JSON.stringify({
            nombrePaiements: paiementsLoyer.length,
            montantTotal: paiementsLoyer.reduce((sum, p) => sum + p.montant, 0),
            nouveauStatut,
            ancienStatut: loyer.statut
          })
        }
      });
    });
  }

  return stats;
}

function getMonthName(mois) {
  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return moisNoms[mois - 1] || `Mois ${mois}`;
}

// Si le script est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  const cheminFichier = process.argv[2];
  
  if (!cheminFichier) {
    console.log('❌ Usage: node import-paiements-excel-custom.js <chemin-vers-fichier.xlsx>');
    process.exit(1);
  }

  importerPaiementsExcel(cheminFichier)
    .then(() => {
      console.log('🎉 Import terminé avec succès!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erreur fatale:', error.message);
      process.exit(1);
    });
}

export default importerPaiementsExcel;