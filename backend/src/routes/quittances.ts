import express from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../server.js';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// @route   POST /api/quittances
// @desc    Générer et envoyer une quittance pour un loyer payé
// @access  Private
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { loyerId } = req.body;

  if (!loyerId) {
    throw createError(400, 'Le loyer ID est requis');
  }

  console.log('🧾 Génération de quittance pour loyer:', loyerId);

  // Vérifier que le loyer existe et est payé
  const loyer = await prisma.loyer.findUnique({
    where: { id: loyerId },
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
      paiements: {
        orderBy: {
          date: 'desc',
        },
      },
    },
  });

  if (!loyer) {
    throw createError(404, 'Loyer non trouvé');
  }

  if (loyer.statut !== 'PAYE') {
    throw createError(400, 'Une quittance ne peut être générée que pour un loyer payé');
  }

  // Vérifier s'il existe déjà une quittance pour ce loyer
  const quittanceExistante = await prisma.quittance.findFirst({
    where: { loyerId: loyerId },
  });

  if (quittanceExistante) {
    console.log('⚠️ Quittance existante trouvée:', quittanceExistante.id);
    
    // Au lieu d'erreur, retourner la quittance existante et la renvoyer par email si besoin
    try {
      if (!quittanceExistante.emailEnvoye && quittanceExistante.pdfPath) {
        await sendQuittanceByEmail(quittanceExistante, quittanceExistante.pdfPath);
        
        // Marquer comme envoyée
        await prisma.quittance.update({
          where: { id: quittanceExistante.id },
          data: {
            emailEnvoye: true,
            dateEnvoi: new Date(),
            statut: 'ENVOYEE',
          },
        });
        
        console.log('✅ Quittance existante renvoyée par email');
      }
      
      // Récupérer la quittance mise à jour avec toutes ses relations
      const quittanceFinal = await prisma.quittance.findUnique({
        where: { id: quittanceExistante.id },
        include: {
          loyer: {
            include: {
              contrat: {
                include: {
                  bien: {
                    include: {
                      proprietaires: {
                        include: {
                          proprietaire: {
                            select: {
                              id: true,
                              nom: true,
                              prenom: true,
                              email: true,
                              telephone: true,
                              adresse: true,
                              ville: true,
                              codePostal: true,
                              signature: true,
                            }
                          },
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
      
      return res.status(200).json({
        success: true,
        data: quittanceFinal,
        message: 'Quittance existante renvoyée avec succès',
      });
      
    } catch (emailError) {
      console.error('❌ Erreur envoi email quittance existante:', emailError);
      return res.status(200).json({
        success: true,
        data: quittanceExistante,
        message: 'Quittance existante trouvée (email non envoyé)',
      });
    }
  }

  // Générer la période (ex: "Juillet 2025")
  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const periode = `${moisNoms[loyer.mois - 1]} ${loyer.annee}`;

  // Créer la quittance en base
  const quittance = await prisma.quittance.create({
    data: {
      loyerId: loyerId,
      periode: periode,
      montant: loyer.montantPaye,
      statut: 'GENEREE',
      modeEnvoi: 'EMAIL',
      emailEnvoye: false,
    },
    include: {
      loyer: {
        include: {
          contrat: {
            include: {
              bien: {
                include: {
                  proprietaires: {
                    include: {
                      proprietaire: {
                        select: {
                          id: true,
                          nom: true,
                          prenom: true,
                          email: true,
                          telephone: true,
                          adresse: true,
                          ville: true,
                          codePostal: true,
                          signature: true, // Inclure explicitement la signature
                        }
                      },
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

  console.log('✅ Quittance créée:', quittance.id);

  // Générer le PDF de la quittance
  const pdfPath = await generateQuittancePDF(quittance);
  
  // Mettre à jour avec le chemin du PDF
  await prisma.quittance.update({
    where: { id: quittance.id },
    data: { pdfPath: pdfPath },
  });

  // Envoyer automatiquement par email
  try {
    await sendQuittanceByEmail(quittance, pdfPath);
    
    // Marquer comme envoyée
    await prisma.quittance.update({
      where: { id: quittance.id },
      data: {
        emailEnvoye: true,
        dateEnvoi: new Date(),
        statut: 'ENVOYEE',
      },
    });

    console.log('✅ Quittance envoyée par email');
  } catch (emailError) {
    console.error('❌ Erreur envoi email quittance:', emailError);
    // La quittance est créée même si l'email échoue
  }

  // Récupérer la quittance mise à jour
  const quittanceFinal = await prisma.quittance.findUnique({
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
                      proprietaire: {
                        select: {
                          id: true,
                          nom: true,
                          prenom: true,
                          email: true,
                          telephone: true,
                          adresse: true,
                          ville: true,
                          codePostal: true,
                          signature: true, // Inclure explicitement la signature
                        }
                      },
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
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    message: 'Quittance générée et envoyée avec succès',
    data: quittanceFinal,
  });
}));

// @route   GET /api/quittances
// @desc    Récupérer toutes les quittances avec filtres
// @access  Private
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { 
    page = '1', 
    limit = '20', 
    statut, 
    loyerId, 
    contratId,
    dateDebut,
    dateFin 
  } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (statut) {
    where.statut = statut;
  }

  if (loyerId) {
    where.loyerId = loyerId;
  }

  if (contratId) {
    where.loyer = {
      contratId: contratId,
    };
  }

  if (dateDebut || dateFin) {
    where.dateGeneration = {};
    if (dateDebut) {
      where.dateGeneration.gte = new Date(dateDebut as string);
    }
    if (dateFin) {
      where.dateGeneration.lte = new Date(dateFin as string);
    }
  }

  const [quittances, total] = await Promise.all([
    prisma.quittance.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        loyer: {
          include: {
            contrat: {
              include: {
                bien: {
                  select: {
                    id: true,
                    adresse: true,
                    ville: true,
                    codePostal: true,
                  },
                },
                locataires: {
                  include: {
                    locataire: {
                      select: {
                        id: true,
                        nom: true,
                        prenom: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        dateGeneration: 'desc',
      },
    }),
    prisma.quittance.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      quittances,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
}));

// @route   GET /api/quittances/:id
// @desc    Récupérer une quittance spécifique
// @access  Private
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const quittanceId = req.params.id;

  const quittance = await prisma.quittance.findUnique({
    where: { id: quittanceId },
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
          paiements: true,
        },
      },
    },
  });

  if (!quittance) {
    throw createError(404, 'Quittance non trouvée');
  }

  res.json({
    success: true,
    data: quittance,
  });
}));

// @route   POST /api/quittances/:id/resend
// @desc    Renvoyer une quittance par email
// @access  Private
router.post('/:id/resend', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const quittanceId = req.params.id;

  const quittance = await prisma.quittance.findUnique({
    where: { id: quittanceId },
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

  if (!quittance) {
    throw createError(404, 'Quittance non trouvée');
  }

  if (!quittance.pdfPath || !fs.existsSync(quittance.pdfPath)) {
    throw createError(400, 'Fichier PDF de la quittance introuvable');
  }

  try {
    await sendQuittanceByEmail(quittance, quittance.pdfPath);
    
    // Mettre à jour la date d'envoi
    await prisma.quittance.update({
      where: { id: quittanceId },
      data: {
        dateEnvoi: new Date(),
        statut: 'ENVOYEE',
      },
    });

    res.json({
      success: true,
      message: 'Quittance renvoyée par email avec succès',
    });
  } catch (error) {
    console.error('Erreur renvoi quittance:', error);
    throw createError(500, 'Erreur lors du renvoi de la quittance');
  }
}));

// Fonction pour générer le PDF de la quittance
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
  
  console.log(`🖋️ Signature du propriétaire ${proprietaire?.prenom} ${proprietaire?.nom}:`);
  console.log(`   - Chemin en base: ${proprietaire?.signature || 'null'}`);
  console.log(`   - Fichier existe: ${proprietaire?.signature ? fs.existsSync(proprietaire.signature) : false}`);
  
  // Ajouter la signature si elle existe
  if (proprietaire?.signature && fs.existsSync(proprietaire.signature)) {
    try {
      console.log(`   ✅ Ajout de la signature dans le PDF: ${proprietaire.signature}`);
      doc.image(proprietaire.signature, margin + 150, currentY - 10, {
        width: 120,
        height: 60
      });
    } catch (error) {
      console.error('❌ Erreur chargement signature dans PDF:', error);
      // Espace pour signature manuelle si l'image ne charge pas
      doc.rect(margin + 150, currentY, 120, 60)
         .stroke('#cccccc');
      doc.fontSize(8)
         .fillColor('#999999')
         .text('Erreur signature', margin + 150, currentY + 25, { width: 120, align: 'center' })
         .fillColor('#000000');
    }
  } else {
    console.log(`   ❌ Pas de signature valide - affichage d'un cadre vide`);
    // Espace pour signature manuelle
    doc.rect(margin + 150, currentY, 120, 60)
       .stroke('#cccccc');
    doc.fontSize(8)
       .fillColor('#999999')
       .text('Signature manuelle', margin + 150, currentY + 25, { width: 120, align: 'center' })
       .fillColor('#000000');
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

  // Retourner seulement le nom du fichier relatif au dossier uploads/quittances
  return fileName;
}

// Fonction pour envoyer la quittance par email
async function sendQuittanceByEmail(quittance: any, pdfFileName: string): Promise<void> {
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

  // Construire le chemin complet pour l'attachement
  const fullPdfPath = path.join(process.cwd(), 'uploads', 'quittances', pdfFileName);
  
  // Options de l'email
  const mailOptions = {
    from: emailConfig.email,
    to: destinataires.join(', '),
    subject: `Quittance de loyer - ${quittance.periode}`,
    text: message,
    attachments: [
      {
        filename: `Quittance_${quittance.periode.replace(' ', '_')}.pdf`,
        path: fullPdfPath,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
}

export default router;