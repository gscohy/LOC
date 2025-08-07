import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Configuration des colonnes Excel attendues
const COLONNES_EXCEL = {
  DATE: 'date',                    // Date du paiement
  MONTANT: 'montant',             // Montant payé  
  MODE: 'mode',                   // Mode de paiement (VIREMENT, CHEQUE, ESPECES, etc.)
  PAYEUR: 'payeur',               // Nom du payeur
  REFERENCE: 'reference',         // Référence du paiement (optionnel)
  COMMENTAIRE: 'commentaire',     // Commentaire (optionnel)
  
  // Identifiants pour retrouver le loyer
  CONTRAT_ID: 'contratId',        // ID du contrat (optionnel si adresse fournie)
  ADRESSE_BIEN: 'adresseBien',    // Adresse du bien (pour retrouver le contrat)
  NOM_LOCATAIRE: 'nomLocataire',  // Nom du locataire (pour retrouver le contrat)
  MOIS: 'mois',                   // Mois du loyer (1-12)
  ANNEE: 'annee'                  // Année du loyer
};

// Modes de paiement valides
const MODES_PAIEMENT_VALIDES = [
  'VIREMENT', 'CHEQUE', 'ESPECES', 'CARTE', 'PRELEVEMENT', 'AUTRE'
];

/**
 * Fonction principale d'import
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

    // Analyser et valider les données
    console.log('🔍 Validation des données...');
    const paiementsValides = [];
    const erreurs = [];

    for (let i = 0; i < donnees.length; i++) {
      const ligne = donnees[i];
      const resultValidation = await validerLignePaiement(ligne, i + 2); // +2 car ligne 1 = headers
      
      if (resultValidation.valide) {
        paiementsValides.push(resultValidation.paiement);
      } else {
        erreurs.push(resultValidation.erreur);
      }
    }

    // Afficher les erreurs s'il y en a
    if (erreurs.length > 0) {
      console.log('❌ Erreurs de validation trouvées:');
      erreurs.forEach(erreur => console.log(`   - ${erreur}`));
      
      if (paiementsValides.length === 0) {
        throw new Error('Aucune ligne valide trouvée. Veuillez corriger les erreurs.');
      }
      
      console.log(`⚠️  ${erreurs.length} ligne(s) ignorée(s), ${paiementsValides.length} ligne(s) seront importées`);
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
 * Valider une ligne de paiement
 */
async function validerLignePaiement(ligne, numeroLigne) {
  try {
    // Extraire les données avec différents noms de colonnes possibles
    const paiement = {
      date: extraireValeur(ligne, ['date', 'Date', 'DATE', 'Date paiement']),
      montant: extraireValeur(ligne, ['montant', 'Montant', 'MONTANT', 'Somme']),
      mode: extraireValeur(ligne, ['mode', 'Mode', 'MODE', 'Mode paiement', 'Type']),
      payeur: extraireValeur(ligne, ['payeur', 'Payeur', 'PAYEUR']),
      reference: extraireValeur(ligne, ['reference', 'Reference', 'REFERENCE', 'Référence', 'Ref']),
      commentaire: extraireValeur(ligne, ['commentaire', 'Commentaire', 'COMMENTAIRE', 'Note']),
      
      // Pour identifier le loyer
      contratId: extraireValeur(ligne, ['contratId', 'ContratId', 'CONTRAT_ID', 'ID Contrat']),
      adresseBien: extraireValeur(ligne, ['adresseBien', 'AdresseBien', 'ADRESSE_BIEN', 'Adresse', 'Bien']),
      nomLocataire: extraireValeur(ligne, ['nomLocataire', 'NomLocataire', 'NOM_LOCATAIRE', 'Locataire']),
      mois: extraireValeur(ligne, ['mois', 'Mois', 'MOIS']),
      annee: extraireValeur(ligne, ['annee', 'Annee', 'ANNEE', 'Année'])
    };

    // Validations requises
    if (!paiement.date) {
      return { valide: false, erreur: `Ligne ${numeroLigne}: Date manquante` };
    }

    if (!paiement.montant || isNaN(parseFloat(paiement.montant))) {
      return { valide: false, erreur: `Ligne ${numeroLigne}: Montant invalide ou manquant` };
    }

    if (!paiement.mode) {
      return { valide: false, erreur: `Ligne ${numeroLigne}: Mode de paiement manquant` };
    }

    if (!paiement.payeur) {
      return { valide: false, erreur: `Ligne ${numeroLigne}: Payeur manquant` };
    }

    if (!paiement.mois || !paiement.annee) {
      return { valide: false, erreur: `Ligne ${numeroLigne}: Mois et année requis` };
    }

    // Valider et convertir la date
    const datePaiement = new Date(paiement.date);
    if (isNaN(datePaiement.getTime())) {
      return { valide: false, erreur: `Ligne ${numeroLigne}: Format de date invalide` };
    }

    // Valider le montant
    const montant = parseFloat(paiement.montant);
    if (montant <= 0) {
      return { valide: false, erreur: `Ligne ${numeroLigne}: Le montant doit être positif` };
    }

    // Valider le mode de paiement
    const modeUpper = paiement.mode.toUpperCase();
    if (!MODES_PAIEMENT_VALIDES.includes(modeUpper)) {
      return { valide: false, erreur: `Ligne ${numeroLigne}: Mode de paiement invalide (${paiement.mode}). Modes valides: ${MODES_PAIEMENT_VALIDES.join(', ')}` };
    }

    // Valider mois et année
    const mois = parseInt(paiement.mois);
    const annee = parseInt(paiement.annee);
    
    if (mois < 1 || mois > 12) {
      return { valide: false, erreur: `Ligne ${numeroLigne}: Mois invalide (${mois}). Doit être entre 1 et 12` };
    }

    if (annee < 2000 || annee > 2030) {
      return { valide: false, erreur: `Ligne ${numeroLigne}: Année invalide (${annee})` };
    }

    // Rechercher le loyer correspondant
    const loyer = await rechercherLoyer(paiement, numeroLigne);
    if (!loyer) {
      return { valide: false, erreur: `Ligne ${numeroLigne}: Loyer non trouvé` };
    }

    // Construire l'objet paiement final
    const paiementFinal = {
      loyerId: loyer.id,
      montant: montant,
      date: datePaiement,
      mode: modeUpper,
      payeur: paiement.payeur.trim(),
      reference: paiement.reference ? paiement.reference.trim() : null,
      commentaire: paiement.commentaire ? paiement.commentaire.trim() : null
    };

    return { valide: true, paiement: paiementFinal };

  } catch (error) {
    return { valide: false, erreur: `Ligne ${numeroLigne}: Erreur de validation - ${error.message}` };
  }
}

/**
 * Extraire une valeur en testant plusieurs noms de colonnes
 */
function extraireValeur(ligne, nomsColonnes) {
  for (const nom of nomsColonnes) {
    if (ligne[nom] !== undefined && ligne[nom] !== null && ligne[nom] !== '') {
      return ligne[nom];
    }
  }
  return null;
}

/**
 * Rechercher un loyer selon les critères fournis
 */
async function rechercherLoyer(paiement, numeroLigne) {
  try {
    let loyer = null;

    // 1. Recherche directe par ID de contrat si fourni
    if (paiement.contratId) {
      loyer = await prisma.loyer.findFirst({
        where: {
          contratId: paiement.contratId,
          mois: parseInt(paiement.mois),
          annee: parseInt(paiement.annee)
        }
      });
      
      if (loyer) return loyer;
    }

    // 2. Recherche par adresse du bien
    if (paiement.adresseBien) {
      loyer = await prisma.loyer.findFirst({
        where: {
          mois: parseInt(paiement.mois),
          annee: parseInt(paiement.annee),
          contrat: {
            bien: {
              adresse: {
                contains: paiement.adresseBien,
                mode: 'insensitive'
              }
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
      
      if (loyer) return loyer;
    }

    // 3. Recherche par nom du locataire
    if (paiement.nomLocataire) {
      loyer = await prisma.loyer.findFirst({
        where: {
          mois: parseInt(paiement.mois),
          annee: parseInt(paiement.annee),
          contrat: {
            locataires: {
              some: {
                locataire: {
                  OR: [
                    { nom: { contains: paiement.nomLocataire, mode: 'insensitive' } },
                    { prenom: { contains: paiement.nomLocataire, mode: 'insensitive' } }
                  ]
                }
              }
            }
          }
        },
        include: {
          contrat: {
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
      
      if (loyer) return loyer;
    }

    console.warn(`⚠️  Ligne ${numeroLigne}: Aucun loyer trouvé pour les critères fournis`);
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

  // Grouper les paiements par loyer pour optimiser
  const paiementsParLoyer = {};
  paiements.forEach(p => {
    if (!paiementsParLoyer[p.loyerId]) {
      paiementsParLoyer[p.loyerId] = [];
    }
    paiementsParLoyer[p.loyerId].push(p);
  });

  // Traiter chaque groupe de paiements
  for (const [loyerId, paiementsLoyer] of Object.entries(paiementsParLoyer)) {
    await prisma.$transaction(async (tx) => {
      // Récupérer le loyer actuel
      const loyer = await tx.loyer.findUnique({
        where: { id: loyerId },
        include: { contrat: true }
      });

      if (!loyer) {
        console.warn(`⚠️  Loyer ${loyerId} non trouvé, ignoré`);
        return;
      }

      let montantPayeActuel = loyer.montantPaye;

      // Créer tous les paiements pour ce loyer
      for (const paiementData of paiementsLoyer) {
        await tx.paiement.create({
          data: paiementData
        });
        
        montantPayeActuel += paiementData.montant;
        stats.paiementsCrees++;
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

      // Générer quittance si payé intégralement
      if (nouveauStatut === 'PAYE' && loyer.statut !== 'PAYE') {
        const quittanceExistante = await tx.quittance.findFirst({
          where: { loyerId: loyerId }
        });

        if (!quittanceExistante) {
          const moisNoms = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
          ];
          const periode = `${moisNoms[loyer.mois - 1]} ${loyer.annee}`;

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
            nouveauStatut
          })
        }
      });
    });
  }

  return stats;
}

/**
 * Fonction utilitaire pour afficher un exemple de fichier Excel
 */
function afficherExempleFichierExcel() {
  console.log('\n📋 Format Excel attendu:');
  console.log('Les colonnes suivantes sont recherchées (noms flexibles):');
  console.log('');
  console.log('📅 date | Date du paiement (format: YYYY-MM-DD ou DD/MM/YYYY)');
  console.log('💰 montant | Montant payé (nombre décimal)');
  console.log('💳 mode | Mode de paiement (VIREMENT, CHEQUE, ESPECES, etc.)');
  console.log('👤 payeur | Nom du payeur');
  console.log('📝 reference | Référence du paiement (optionnel)');
  console.log('💬 commentaire | Commentaire (optionnel)');
  console.log('');
  console.log('🔍 Pour identifier le loyer (au moins un requis):');
  console.log('🏠 adresseBien | Adresse du bien loué');
  console.log('👥 nomLocataire | Nom du locataire');
  console.log('🆔 contratId | ID du contrat (si connu)');
  console.log('');
  console.log('📆 Période (requis):');
  console.log('📅 mois | Mois du loyer (1-12)');
  console.log('📅 annee | Année du loyer');
  console.log('');
}

// Si le script est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  const cheminFichier = process.argv[2];
  
  if (!cheminFichier) {
    console.log('❌ Usage: node import-paiements-excel.js <chemin-vers-fichier.xlsx>');
    afficherExempleFichierExcel();
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