import express from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const router = express.Router();

// Fonction utilitaire pour générer le PDF de la quittance
async function generateQuittancePDF(quittance: any): Promise<string> {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'quittances');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = `quittance_${quittance.id}.pdf`;
  const filePath = path.join(uploadsDir, fileName);

  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50
    }
  });
  
  doc.pipe(fs.createWriteStream(filePath));

  // Variables de position
  let currentY = 50;
  const pageWidth = 595.28;
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);

  // En-tête avec bordure
  doc.rect(margin, currentY, contentWidth, 80)
     .stroke('#cccccc');
  
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .text('QUITTANCE DE LOYER', margin + 20, currentY + 25, {
       align: 'center',
       width: contentWidth - 40
     });

  currentY += 100;

  // Récupérer les informations du propriétaire
  const proprietaire = quittance.loyer.contrat.bien.proprietaires?.[0]?.proprietaire;
  
  if (proprietaire) {
    // Section Propriétaire (à gauche)
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('PROPRIÉTAIRE', margin, currentY);
    
    currentY += 20;
    doc.font('Helvetica')
       .text(`${proprietaire.prenom} ${proprietaire.nom}`, margin, currentY);
    currentY += 15;
    doc.text(proprietaire.adresse, margin, currentY);
    currentY += 15;
    doc.text(`${proprietaire.codePostal} ${proprietaire.ville}`, margin, currentY);
    currentY += 15;
    if (proprietaire.email) {
      doc.text(`Email: ${proprietaire.email}`, margin, currentY);
      currentY += 15;
    }
    if (proprietaire.telephone) {
      doc.text(`Tél: ${proprietaire.telephone}`, margin, currentY);
    }
  }

  // Section Locataire (à droite)
  const locataireStartY = currentY - (proprietaire ? 80 : 0);
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('LOCATAIRE', margin + 280, locataireStartY);
  
  let locataireY = locataireStartY + 20;
  quittance.loyer.contrat.locataires.forEach((cl: any, index: number) => {
    if (index > 0) {
      doc.text(' et ', margin + 280, locataireY, { continued: true });
    }
    doc.font('Helvetica')
       .text(`${cl.locataire.prenom} ${cl.locataire.nom}`, margin + 280, locataireY);
    locataireY += 15;
    if (index === 0) { // Afficher l'adresse seulement pour le premier
      doc.text(quittance.loyer.contrat.bien.adresse, margin + 280, locataireY);
      locataireY += 15;
      doc.text(`${quittance.loyer.contrat.bien.codePostal} ${quittance.loyer.contrat.bien.ville}`, margin + 280, locataireY);
      locataireY += 15;
    }
  });

  currentY = Math.max(currentY + 40, locataireY + 20);

  // Ligne de séparation
  doc.moveTo(margin, currentY)
     .lineTo(pageWidth - margin, currentY)
     .stroke('#cccccc');

  currentY += 30;

  // Informations de la quittance dans un tableau
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('DÉTAILS DE LA QUITTANCE', margin, currentY);

  currentY += 30;

  // Tableau des détails
  const tableData = [
    ['Période', quittance.periode],
    ['Bien loué', quittance.loyer.contrat.bien.adresse],
    ['Montant du loyer', `${quittance.montant.toFixed(2)} €`],
    ['Date de paiement', new Date(quittance.dateGeneration).toLocaleDateString('fr-FR')],
    ['Mode de paiement', 'Virement bancaire'] // À adapter selon vos données
  ];

  tableData.forEach(([label, value]) => {
    doc.rect(margin, currentY, contentWidth, 25)
       .stroke('#cccccc');
    
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text(label, margin + 10, currentY + 8);
    
    doc.font('Helvetica')
       .text(value, margin + 200, currentY + 8);
    
    currentY += 25;
  });

  currentY += 30;

  // Texte de certification
  doc.fontSize(11)
     .font('Helvetica')
     .text('Je soussigné(e), propriétaire du logement désigné ci-dessus, certifie avoir reçu de la part du (des) locataire(s) la somme indiquée ci-dessus pour le paiement du loyer et des charges de la période mentionnée.', 
           margin, currentY, { 
             width: contentWidth,
             align: 'justify'
           });

  currentY += 60;

  // Date et lieu
  doc.text(`Fait à ${proprietaire?.ville || 'Paris'}, le ${new Date().toLocaleDateString('fr-FR')}`, 
           margin, currentY);

  currentY += 40;

  // Signature
  doc.text('Signature du propriétaire :', margin, currentY);
  
  // Ajouter la signature si elle existe
  if (proprietaire?.signature && fs.existsSync(proprietaire.signature)) {
    try {
      doc.image(proprietaire.signature, margin + 150, currentY - 10, {
        width: 120,
        height: 60
      });
    } catch (error) {
      console.error('Erreur chargement signature:', error);
      // Espace pour signature manuelle si l'image ne charge pas
      doc.rect(margin + 150, currentY, 120, 60)
         .stroke('#cccccc');
    }
  } else {
    // Espace pour signature manuelle
    doc.rect(margin + 150, currentY, 120, 60)
       .stroke('#cccccc');
  }

  currentY += 80;

  // Nom du propriétaire sous la signature
  if (proprietaire) {
    doc.fontSize(10)
       .text(`${proprietaire.prenom} ${proprietaire.nom}`, margin + 150, currentY, {
         width: 120,
         align: 'center'
       });
  }

  // Pied de page
  doc.fontSize(8)
     .fillColor('#666666')
     .text('Cette quittance est générée automatiquement par le système de gestion locative', 
           margin, 750, {
             width: contentWidth,
             align: 'center'
           });

  doc.end();

  return filePath;
}

// Fonction utilitaire pour envoyer la quittance par email
async function sendQuittanceByEmail(quittance: any, pdfPath: string): Promise<void> {
  // Récupérer la configuration email
  const emailConfig = await prisma.emailConfig.findFirst({
    where: { 
      parDefaut: true, 
      actif: true 
    }
  });

  if (!emailConfig) {
    throw new Error('Aucune configuration email trouvée');
  }

  // Créer le transporteur
  const transporter = nodemailer.createTransport({
    host: emailConfig.serveurSMTP,
    port: emailConfig.portSMTP,
    secure: emailConfig.securite === 'SSL',
    auth: {
      user: emailConfig.email,
      pass: emailConfig.motDePasse,
    },
  });

  // Préparer les destinataires
  const destinataires = quittance.loyer.contrat.locataires
    .map((cl: any) => cl.locataire.email)
    .filter((email: string) => email);

  const locataires = quittance.loyer.contrat.locataires
    .map((cl: any) => `${cl.locataire.prenom} ${cl.locataire.nom}`)
    .join(' et ');

  // Message de l'email
  const message = `Bonjour ${locataires},

Veuillez trouver ci-joint votre quittance de loyer pour la période ${quittance.periode}.

Bien: ${quittance.loyer.contrat.bien.adresse}
Montant payé: ${quittance.montant.toFixed(2)} €

Cordialement,
La gestion locative`;

  // Options de l'email
  const mailOptions = {
    from: emailConfig.email,
    to: destinataires.join(', '),
    subject: `Quittance de loyer - ${quittance.periode}`,
    text: message,
    attachments: [
      {
        filename: `Quittance_${quittance.periode.replace(' ', '_')}.pdf`,
        path: pdfPath,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
}

// Fonction utilitaire pour générer automatiquement une quittance
async function genererQuittanceAutomatique(tx: any, loyerId: string, loyer: any, nouveauStatut: string) {
  // Si le loyer devient complètement payé, générer automatiquement la quittance
  if (nouveauStatut === 'PAYE' && loyer.statut !== 'PAYE') {
    console.log('🧾 Loyer complètement payé - génération automatique de quittance pour:', loyerId);
    
    try {
      // Vérifier s'il n'existe pas déjà une quittance
      const quittanceExistante = await tx.quittance.findFirst({
        where: { loyerId: loyerId },
      });

      if (!quittanceExistante) {
        // Générer la période
        const moisNoms = [
          'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        const periode = `${moisNoms[loyer.mois - 1]} ${loyer.annee}`;

        // Créer la quittance
        const quittance = await tx.quittance.create({
          data: {
            loyerId: loyerId,
            periode: periode,
            montant: loyer.montantDu, // Utiliser le montant dû complet
            statut: 'GENEREE',
            modeEnvoi: 'EMAIL',
            emailEnvoye: false,
          },
        });

        console.log('✅ Quittance créée:', quittance.id);

        // Récupérer la quittance avec toutes les relations nécessaires pour le PDF et l'email
        const quittanceComplete = await tx.quittance.findUnique({
          where: { id: quittance.id },
          include: {
            loyer: {
              include: {
                contrat: {
                  include: {
                    bien: {
                      include: {
                        proprietaires: {
                          include: {
                            proprietaire: true,
                          },
                        },
                      },
                    },
                    locataires: {
                      include: {
                        locataire: true,
                      },
                    },
                  },
                },
                paiements: true,
              },
            },
          },
        });

        if (quittanceComplete) {
          // Traitement asynchrone du PDF et email (en dehors de la transaction)
          setImmediate(async () => {
            try {
              // Générer le PDF
              console.log('📄 Génération du PDF...');
              const pdfPath = await generateQuittancePDF(quittanceComplete);
              
              // Mettre à jour avec le chemin du PDF
              await prisma.quittance.update({
                where: { id: quittanceComplete.id },
                data: { pdfPath: pdfPath },
              });

              console.log('✅ Quittance générée (prête pour envoi manuel)');
            } catch (emailError) {
              console.error('❌ Erreur traitement quittance automatique:', emailError);
              
              // Marquer comme erreur
              await prisma.quittance.update({
                where: { id: quittanceComplete.id },
                data: {
                  statut: 'ERREUR',
                },
              });
            }
          });
        }

        console.log('✅ Quittance générée automatiquement - PDF en cours de génération...');
      }
    } catch (quittanceError) {
      console.error('❌ Erreur génération quittance automatique:', quittanceError);
      // Ne pas faire échouer le paiement si la quittance échoue
    }
  }
}

// @route   POST /api/paiements
// @desc    Enregistrer un nouveau paiement de loyer
// @access  Private
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  let {
    loyerId,
    montant,
    date,
    mode,
    payeur,
    reference,
    commentaires
  } = req.body;

  // Nettoyer et valider le montant
  if (typeof montant === 'string') {
    montant = montant.replace(/,/g, '.').replace(/[^\d.-]/g, '');
  }
  montant = parseFloat(montant);
  
  if (isNaN(montant) || montant <= 0) {
    throw createError('Montant invalide', 400);
  }

  // Validation des données requises
  if (!loyerId || !montant || !date || !mode || !payeur) {
    throw createError('Données manquantes : loyerId, montant, date, mode et payeur sont requis', 400);
  }

  // Vérifier que le loyer existe
  const loyer = await prisma.loyer.findUnique({
    where: { id: loyerId },
    include: {
      contrat: {
        include: {
          bien: true,
          locataires: {
            include: {
              locataire: true,
            },
          },
        },
      },
    },
  });

  if (!loyer) {
    throw createError('Loyer non trouvé', 404);
  }

  // Vérification du dépassement (avertissement seulement, pas de blocage)
  const montantRestant = loyer.montantDu - loyer.montantPaye;
  if (montant > montantRestant) {
    console.warn(`⚠️ Paiement en excédent détecté: montant (${montant}€) > montant restant dû (${montantRestant}€) - Loyer ${loyerId}`);
  }

  // Créer le paiement dans une transaction
  const result = await prisma.$transaction(async (tx) => {
    // Créer le paiement
    const paiement = await tx.paiement.create({
      data: {
        loyerId,
        montant: parseFloat(montant.toString()),
        date: new Date(date),
        mode,
        payeur,
        reference: reference || null,
        commentaire: commentaires || null,
      },
    });

    // Calculer le nouveau montant payé
    const nouveauMontantPaye = loyer.montantPaye + parseFloat(montant.toString());
    
    // Déterminer le nouveau statut
    let nouveauStatut = loyer.statut;
    if (nouveauMontantPaye >= loyer.montantDu) {
      nouveauStatut = 'PAYE';
    } else if (nouveauMontantPaye > 0) {
      nouveauStatut = 'PARTIEL';
    }

    // Mettre à jour le loyer
    const loyerMisAJour = await tx.loyer.update({
      where: { id: loyerId },
      data: {
        montantPaye: nouveauMontantPaye,
        statut: nouveauStatut,
      },
    });

    // Générer automatiquement la quittance si nécessaire
    await genererQuittanceAutomatique(tx, loyerId, loyer, nouveauStatut);

    // Créer une entrée dans l'historique du contrat
    await tx.contratHistorique.create({
      data: {
        contratId: loyer.contratId,
        action: 'PAIEMENT_ENREGISTRE',
        description: `Paiement de ${montant}€ enregistré pour ${getMonthName(loyer.mois)} ${loyer.annee}`,
        dateAction: new Date(),
        metadata: JSON.stringify({
          paiementId: paiement.id,
          montant,
          mode,
          payeur,
          nouveauStatut,
        }),
      },
    });

    return { paiement, loyerMisAJour };
  });

  res.status(201).json({
    success: true,
    message: 'Paiement enregistré avec succès',
    data: result,
  });
}));

// @route   GET /api/paiements/:id
// @desc    Récupérer les détails d'un paiement
// @access  Private
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const paiementId = req.params.id;

  const paiement = await prisma.paiement.findUnique({
    where: { id: paiementId },
    include: {
      loyer: {
        include: {
          contrat: {
            include: {
              bien: true,
              locataires: {
                include: {
                  locataire: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!paiement) {
    throw createError('Paiement non trouvé', 404);
  }

  res.json({
    success: true,
    data: paiement,
  });
}));

// @route   PUT /api/paiements/:id
// @desc    Modifier un paiement existant
// @access  Private
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const paiementId = req.params.id;
  const {
    montant,
    date,
    mode,
    payeur,
    reference,
    commentaires
  } = req.body;

  // Vérifier que le paiement existe
  const paiementExistant = await prisma.paiement.findUnique({
    where: { id: paiementId },
    include: {
      loyer: true,
    },
  });

  if (!paiementExistant) {
    throw createError('Paiement non trouvé', 404);
  }

  const loyer = paiementExistant.loyer;

  // Si le montant change, vérifier les contraintes
  if (montant && montant !== paiementExistant.montant) {
    const montantAutresPaiements = loyer.montantPaye - paiementExistant.montant;
    const nouveauMontantTotal = montantAutresPaiements + parseFloat(montant.toString());
    
    if (nouveauMontantTotal > loyer.montantDu) {
      console.warn(`⚠️ Mise à jour créant un excédent: nouveau total (${nouveauMontantTotal}€) > montant dû (${loyer.montantDu}€) - Paiement ${paiementId}`);
    }
  }

  // Mettre à jour le paiement dans une transaction
  const result = await prisma.$transaction(async (tx) => {
    // Mettre à jour le paiement
    const paiementMisAJour = await tx.paiement.update({
      where: { id: paiementId },
      data: {
        ...(montant && { montant: parseFloat(montant.toString()) }),
        ...(date && { date: new Date(date) }),
        ...(mode && { mode }),
        ...(payeur && { payeur }),
        ...(reference !== undefined && { reference: reference || null }),
        ...(commentaires !== undefined && { commentaire: commentaires || null }),
      },
    });

    // Recalculer le montant total payé pour le loyer
    const paiements = await tx.paiement.findMany({
      where: { loyerId: loyer.id },
    });

    const nouveauMontantPaye = paiements.reduce((sum, p) => sum + p.montant, 0);
    
    // Déterminer le nouveau statut
    let nouveauStatut = 'EN_ATTENTE';
    if (nouveauMontantPaye >= loyer.montantDu) {
      nouveauStatut = 'PAYE';
    } else if (nouveauMontantPaye > 0) {
      nouveauStatut = 'PARTIEL';
    } else {
      // Calculer le statut en fonction du jour de paiement du contrat
      const contrat = await tx.contrat.findUnique({
        where: { id: loyer.contratId },
        select: { jourPaiement: true }
      });

      if (!contrat) {
        throw createError(404, 'Contrat non trouvé');
      }

      // Calculer la date limite de paiement pour ce mois
      const dateLimitePaiement = new Date(loyer.annee, loyer.mois - 1, contrat.jourPaiement);
      const maintenant = new Date();
      
      if (maintenant > dateLimitePaiement) {
        nouveauStatut = 'RETARD';
      } else {
        nouveauStatut = 'EN_ATTENTE';
      }
    }

    // Mettre à jour le loyer
    const loyerMisAJour = await tx.loyer.update({
      where: { id: loyer.id },
      data: {
        montantPaye: nouveauMontantPaye,
        statut: nouveauStatut,
      },
    });

    // Créer une entrée dans l'historique
    await tx.contratHistorique.create({
      data: {
        contratId: loyer.contratId,
        action: 'PAIEMENT_MODIFIE',
        description: `Paiement modifié pour ${getMonthName(loyer.mois)} ${loyer.annee}`,
        dateAction: new Date(),
        metadata: JSON.stringify({
          paiementId: paiementMisAJour.id,
          ancienMontant: paiementExistant.montant,
          nouveauMontant: paiementMisAJour.montant,
          nouveauStatut,
        }),
      },
    });

    return { paiement: paiementMisAJour, loyer: loyerMisAJour };
  });

  res.json({
    success: true,
    message: 'Paiement modifié avec succès',
    data: result,
  });
}));

// @route   DELETE /api/paiements/:id
// @desc    Supprimer un paiement
// @access  Private
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const paiementId = req.params.id;

  // Vérifier que le paiement existe
  const paiement = await prisma.paiement.findUnique({
    where: { id: paiementId },
    include: {
      loyer: true,
    },
  });

  if (!paiement) {
    throw createError('Paiement non trouvé', 404);
  }

  const loyer = paiement.loyer;

  // Supprimer le paiement dans une transaction
  await prisma.$transaction(async (tx) => {
    // Supprimer le paiement
    await tx.paiement.delete({
      where: { id: paiementId },
    });

    // Recalculer le montant total payé pour le loyer
    const paiementsRestants = await tx.paiement.findMany({
      where: { loyerId: loyer.id },
    });

    const nouveauMontantPaye = paiementsRestants.reduce((sum, p) => sum + p.montant, 0);
    
    // Déterminer le nouveau statut
    let nouveauStatut = 'EN_ATTENTE';
    if (nouveauMontantPaye >= loyer.montantDu) {
      nouveauStatut = 'PAYE';
    } else if (nouveauMontantPaye > 0) {
      nouveauStatut = 'PARTIEL';
    } else {
      // Calculer le statut en fonction du jour de paiement du contrat
      const contrat = await tx.contrat.findUnique({
        where: { id: loyer.contratId },
        select: { jourPaiement: true }
      });

      if (!contrat) {
        throw createError(404, 'Contrat non trouvé');
      }

      // Calculer la date limite de paiement pour ce mois
      const dateLimitePaiement = new Date(loyer.annee, loyer.mois - 1, contrat.jourPaiement);
      const maintenant = new Date();
      
      if (maintenant > dateLimitePaiement) {
        nouveauStatut = 'RETARD';
      } else {
        nouveauStatut = 'EN_ATTENTE';
      }
    }

    // Mettre à jour le loyer
    await tx.loyer.update({
      where: { id: loyer.id },
      data: {
        montantPaye: nouveauMontantPaye,
        statut: nouveauStatut,
      },
    });

    // Créer une entrée dans l'historique
    await tx.contratHistorique.create({
      data: {
        contratId: loyer.contratId,
        action: 'PAIEMENT_SUPPRIME',
        description: `Paiement de ${paiement.montant}€ supprimé pour ${getMonthName(loyer.mois)} ${loyer.annee}`,
        dateAction: new Date(),
        metadata: JSON.stringify({
          montantSupprime: paiement.montant,
          nouveauStatut,
        }),
      },
    });
  });

  res.json({
    success: true,
    message: 'Paiement supprimé avec succès',
  });
}));

// @route   POST /api/paiements/bulk
// @desc    Enregistrer plusieurs paiements en une fois
// @access  Private
router.post('/bulk', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { paiements } = req.body;

  if (!paiements || !Array.isArray(paiements) || paiements.length === 0) {
    throw createError('Liste de paiements manquante ou vide', 400);
  }

  // Valider chaque paiement
  for (const paiement of paiements) {
    if (!paiement.loyerId || !paiement.montant || !paiement.date || !paiement.mode || !paiement.payeur) {
      throw createError('Données manquantes dans un des paiements', 400);
    }
  }

  // Vérifier d'abord que tous les paiements concernent le même loyer
  const loyerIds = [...new Set(paiements.map(p => p.loyerId))];
  if (loyerIds.length !== 1) {
    throw createError('Tous les paiements doivent concerner le même loyer', 400);
  }

  const loyerId = loyerIds[0];

  // Vérifier que le loyer existe
  const loyer = await prisma.loyer.findUnique({
    where: { id: loyerId },
    include: {
      contrat: true,
    },
  });

  if (!loyer) {
    throw createError(`Loyer ${loyerId} non trouvé`, 404);
  }

  // Calculer le total des paiements à enregistrer
  const totalPaiements = paiements.reduce((sum, p) => sum + parseFloat(p.montant.toString()), 0);
  const montantRestant = loyer.montantDu - loyer.montantPaye;

  // Vérification du dépassement (avertissement seulement, pas de blocage)
  if (totalPaiements > montantRestant) {
    console.warn(`⚠️ Paiement en excédent détecté: total (${totalPaiements}€) > montant restant dû (${montantRestant}€) - Loyer ${loyerId}`);
  }

  const resultats = await prisma.$transaction(async (tx) => {
    const paiementsCrees = [];
    let montantPayeActuel = loyer.montantPaye;

    for (const paiementData of paiements) {
      const { montant, date, mode, payeur, reference, commentaires } = paiementData;

      // Créer le paiement
      const paiement = await tx.paiement.create({
        data: {
          loyerId,
          montant: parseFloat(montant.toString()),
          date: new Date(date),
          mode,
          payeur,
          reference: reference || null,
          commentaire: commentaires || null,
        },
      });

      montantPayeActuel += parseFloat(montant.toString());
      paiementsCrees.push(paiement);
    }
    
    // Déterminer le nouveau statut
    let nouveauStatut = loyer.statut;
    if (montantPayeActuel >= loyer.montantDu) {
      nouveauStatut = 'PAYE';
    } else if (montantPayeActuel > 0) {
      nouveauStatut = 'PARTIEL';
    }

    // Mettre à jour le loyer une seule fois avec le nouveau total
    await tx.loyer.update({
      where: { id: loyerId },
      data: {
        montantPaye: montantPayeActuel,
        statut: nouveauStatut,
      },
    });

    // Générer automatiquement la quittance si nécessaire
    await genererQuittanceAutomatique(tx, loyerId, loyer, nouveauStatut);

    // Créer une entrée dans l'historique du contrat
    await tx.contratHistorique.create({
      data: {
        contratId: loyer.contratId,
        action: 'PAIEMENTS_MULTIPLES',
        description: `${paiements.length} paiement(s) enregistré(s) pour un total de ${totalPaiements}€ - ${getMonthName(loyer.mois)} ${loyer.annee}`,
        dateAction: new Date(),
        metadata: JSON.stringify({
          nombrePaiements: paiements.length,
          montantTotal: totalPaiements,
          payeurs: paiements.map(p => p.payeur),
          nouveauStatut,
        }),
      },
    });

    return paiementsCrees;
  });

  res.status(201).json({
    success: true,
    message: `${resultats.length} paiement(s) enregistré(s) avec succès`,
    data: resultats,
  });
}));

// Fonction utilitaire pour obtenir le nom du mois
function getMonthName(mois: number): string {
  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return moisNoms[mois - 1] || `Mois ${mois}`;
}

export default router;