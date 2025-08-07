import express from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../server.js';
import nodemailer from 'nodemailer';
const router = express.Router();

// Debug route to test if server is updated
router.get('/debug-test', (req, res) => {
  res.json({ message: 'Server updated successfully', timestamp: new Date().toISOString() });
});

// @route   POST /api/rappels
// @desc    Créer un nouveau rappel de paiement
// @access  Private
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  console.log('=== CREATION RAPPEL ===');
  console.log('Body reçu:', JSON.stringify(req.body, null, 2));
  
  const {
    loyerId,
    type,
    destinataires,
    message,
    dateEnvoi,
    modeEnvoi = 'EMAIL'
  } = req.body;

  console.log('Paramètres extraits:', { loyerId, type, destinataires, message, dateEnvoi, modeEnvoi });

  // Validation des données requises
  if (!loyerId || !type || !destinataires || !message) {
    console.log('❌ Validation échouée - données manquantes');
    throw createError(400, 'Données manquantes : loyerId, type, destinataires et message sont requis');
  }

  // Vérifier que le loyer existe
  console.log('🔍 Recherche du loyer:', loyerId);
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
    console.log('❌ Loyer non trouvé:', loyerId);
    throw createError(404, 'Loyer non trouvé');
  }

  console.log('✅ Loyer trouvé:', loyer.id);

  // Créer le rappel
  console.log('📝 Création du rappel...');
  try {
    const rappel = await prisma.rappel.create({
      data: {
        loyerId,
        type,
        destinataires: Array.isArray(destinataires) ? destinataires.join(', ') : destinataires,
        message,
        dateEnvoi: dateEnvoi ? new Date(dateEnvoi) : new Date(),
        modeEnvoi,
        envoye: false,
      },
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

    console.log('✅ Rappel créé avec succès:', rappel.id);

    // Créer une entrée dans l'historique du contrat
    await prisma.contratHistorique.create({
      data: {
        contratId: loyer.contratId,
        action: 'RAPPEL_CREE',
        description: `Rappel ${type.toLowerCase()} créé pour ${getMonthName(loyer.mois)} ${loyer.annee}`,
        dateAction: new Date(),
        metadata: JSON.stringify({
          rappelId: rappel.id,
          type,
          destinataires,
          modeEnvoi,
        }),
      },
    });

    console.log('✅ Historique créé');

    // Envoyer automatiquement l'email
    try {
      console.log('📧 Tentative d\'envoi automatique de l\'email...');
      
      // Récupérer la configuration email par défaut
      const emailConfig = await prisma.emailConfig.findFirst({
        where: { 
          parDefaut: true, 
          actif: true 
        }
      });

      if (!emailConfig) {
        console.log('⚠️ Aucune configuration email trouvée - rappel créé mais pas envoyé');
      } else {
        console.log('✅ Configuration email trouvée:', emailConfig.email);
        
        // Créer le transporteur nodemailer
        const transporter = nodemailer.createTransport({
          host: emailConfig.serveurSMTP,
          port: emailConfig.portSMTP,
          secure: emailConfig.securite === 'SSL',
          auth: {
            user: emailConfig.email,
            pass: emailConfig.motDePasse,
          },
        });

        // Préparer l'email
        const destinatairesArray = Array.isArray(destinataires) 
          ? destinataires 
          : destinataires.split(',').map(email => email.trim());
        const mailOptions = {
          from: emailConfig.email,
          to: destinatairesArray.join(', '),
          subject: `Rappel de loyer - ${rappel.type}`,
          text: message,
        };

        console.log('📮 Envoi de l\'email à:', destinatairesArray);
        
        // Envoyer l'email
        await transporter.sendMail(mailOptions);
        
        console.log('✅ Email envoyé avec succès');
        
        // Marquer le rappel comme envoyé
        await prisma.rappel.update({
          where: { id: rappel.id },
          data: {
            envoye: true,
            dateEnvoiEffective: new Date(),
            commentaires: 'Envoyé automatiquement lors de la création'
          }
        });
        
        console.log('✅ Rappel marqué comme envoyé');
      }
    } catch (emailError) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', emailError);
      // Ne pas faire échouer la création du rappel si l'email échoue
    }

    console.log('📤 Réponse envoyée au frontend:', {
      success: true,
      message: 'Rappel créé avec succès',
      data: rappel,
    });
    
    res.status(200).json({
      success: true,
      message: 'Rappel créé avec succès',
      data: rappel,
    });
  } catch (error) {
    console.error('❌ Erreur lors de la création du rappel:', error);
    throw createError(500, `Erreur lors de la création du rappel: ${error.message}`);
  }
}));

// @route   GET /api/rappels
// @desc    Récupérer tous les rappels avec filtres
// @access  Private
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { 
    page = '1', 
    limit = '20', 
    type, 
    envoye, 
    loyerId, 
    contratId,
    dateDebut,
    dateFin 
  } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (type) {
    where.type = type;
  }

  if (envoye !== undefined) {
    where.envoye = envoye === 'true';
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
    where.dateEnvoi = {};
    if (dateDebut) {
      where.dateEnvoi.gte = new Date(dateDebut as string);
    }
    if (dateFin) {
      where.dateEnvoi.lte = new Date(dateFin as string);
    }
  }

  const [rappels, total] = await Promise.all([
    prisma.rappel.findMany({
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
                        telephone: true,
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
        dateEnvoi: 'desc',
      },
    }),
    prisma.rappel.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      rappels,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
}));

// @route   GET /api/rappels/stats
// @desc    Récupérer les statistiques des rappels
// @access  Private
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const currentMonth = new Date();
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const [
    totalRappels,
    rappelsEnvoyes,
    rappelsEnAttente,
    rappelsCeMois,
    rappelsMoisDernier,
    rappelsParType,
    rappelsParMode,
  ] = await Promise.all([
    // Total des rappels
    prisma.rappel.count(),

    // Rappels envoyés
    prisma.rappel.count({
      where: { envoye: true },
    }),

    // Rappels en attente
    prisma.rappel.count({
      where: { envoye: false },
    }),

    // Rappels ce mois
    prisma.rappel.count({
      where: {
        dateEnvoi: {
          gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
        },
      },
    }),

    // Rappels mois dernier
    prisma.rappel.count({
      where: {
        dateEnvoi: {
          gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
          lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
        },
      },
    }),

    // Rappels par type
    prisma.rappel.groupBy({
      by: ['type'],
      _count: {
        type: true,
      },
    }),

    // Rappels par mode d'envoi
    prisma.rappel.groupBy({
      by: ['modeEnvoi'],
      _count: {
        modeEnvoi: true,
      },
    }),
  ]);

  const tauxEnvoi = totalRappels > 0 ? Math.round((rappelsEnvoyes / totalRappels) * 100) : 0;

  res.json({
    success: true,
    data: {
      totaux: {
        total: totalRappels,
        envoyes: rappelsEnvoyes,
        enAttente: rappelsEnAttente,
        tauxEnvoi,
      },
      evolution: {
        ceMois: rappelsCeMois,
        moisDernier: rappelsMoisDernier,
        evolution: rappelsMoisDernier > 0 
          ? Math.round(((rappelsCeMois - rappelsMoisDernier) / rappelsMoisDernier) * 100)
          : 0,
      },
      repartition: {
        parType: rappelsParType,
        parMode: rappelsParMode,
      },
    },
  });
}));

// @route   GET /api/rappels/:id
// @desc    Récupérer un rappel spécifique
// @access  Private
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const rappelId = req.params.id;

  const rappel = await prisma.rappel.findUnique({
    where: { id: rappelId },
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

  if (!rappel) {
    throw createError(404, 'Rappel non trouvé');
  }

  res.json({
    success: true,
    data: rappel,
  });
}));

// @route   GET /api/rappels/:id/test-email
// @desc    Test email configuration
// @access  Private  
router.get('/:id/test-email', asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const emailConfig = await prisma.emailConfig.findFirst({
      where: { parDefaut: true, actif: true }
    });
    
    res.json({
      success: true,
      data: {
        configFound: !!emailConfig,
        configId: emailConfig?.id,
        configName: emailConfig?.nom
      }
    });
  } catch (error: any) {
    res.json({
      success: false,
      error: error.message
    });
  }
}));

// @route   PUT /api/rappels/:id/envoyer
// @desc    Envoyer effectivement un rappel par email
// @access  Private
router.put('/:id/envoyer', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const rappelId = req.params.id;
  const { dateEnvoiEffective, commentaires } = req.body;
  
  console.log('=== DEBUT ENVOI RAPPEL ===');
  console.log('Rappel ID:', rappelId);
  console.log('Body:', req.body);

  // Test simple d'abord - juste mettre à jour sans envoyer d'email
  try {
    const rappel = await prisma.rappel.findUnique({
      where: { id: rappelId },
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

    if (!rappel) {
      throw createError(404, 'Rappel non trouvé');
    }

    if (rappel.envoye) {
      throw createError(400, 'Ce rappel a déjà été envoyé');
    }

    console.log('Rappel trouvé:', rappel.id);

    // Mettre à jour le rappel comme envoyé (sans envoyer d'email pour l'instant)
    const rappelMisAJour = await prisma.rappel.update({
      where: { id: rappelId },
      data: {
        envoye: true,
        dateEnvoiEffective: dateEnvoiEffective ? new Date(dateEnvoiEffective) : new Date(),
        commentaires: commentaires || 'Marqué comme envoyé (test mode)',
      },
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

    console.log('Rappel mis à jour:', rappelMisAJour.id);

    res.json({
      success: true,
      message: 'Rappel marqué comme envoyé (mode test)',
      data: rappelMisAJour,
    });

  } catch (error: any) {
    console.error('Erreur dans l\'endpoint envoyer:', error);
    throw createError(500, `Erreur: ${error.message}`);
  }
}));

// @route   DELETE /api/rappels/:id
// @desc    Supprimer un rappel
// @access  Private
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const rappelId = req.params.id;

  const rappel = await prisma.rappel.findUnique({
    where: { id: rappelId },
    include: {
      loyer: true,
    },
  });

  if (!rappel) {
    throw createError(404, 'Rappel non trouvé');
  }

  if (rappel.envoye) {
    throw createError(400, 'Impossible de supprimer un rappel déjà envoyé');
  }

  await prisma.rappel.delete({
    where: { id: rappelId },
  });

  // Créer une entrée dans l'historique du contrat
  await prisma.contratHistorique.create({
    data: {
      contratId: rappel.loyer.contratId,
      action: 'RAPPEL_SUPPRIME',
      description: `Rappel ${rappel.type.toLowerCase()} supprimé pour ${getMonthName(rappel.loyer.mois)} ${rappel.loyer.annee}`,
      dateAction: new Date(),
      metadata: JSON.stringify({
        rappelId: rappel.id,
        type: rappel.type,
      }),
    },
  });

  res.json({
    success: true,
    message: 'Rappel supprimé avec succès',
  });
}));

// @route   POST /api/rappels/generer-automatiques
// @desc    Générer automatiquement des rappels pour les loyers en retard
// @access  Private
router.post('/generer-automatiques', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { 
    joursRetard = 5, 
    typeRappel = 'RETARD',
    modeEnvoi = 'EMAIL',
    messagePersonnalise 
  } = req.body;

  // Récupérer les loyers en retard sans rappel récent
  const dateRetard = new Date();
  dateRetard.setDate(dateRetard.getDate() - joursRetard);

  const loyersEnRetard = await prisma.loyer.findMany({
    where: {
      statut: {
        in: ['RETARD', 'PARTIEL'],
      },
      dateEcheance: {
        lte: dateRetard,
      },
    },
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
      rappels: {
        where: {
          type: typeRappel,
          dateEnvoi: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Derniers 7 jours
          },
        },
      },
    },
  });

  // Filtrer les loyers qui n'ont pas eu de rappel récent
  const loyersSansRappelRecent = loyersEnRetard.filter(loyer => loyer.rappels.length === 0);

  const rappelsCrees = [];

  for (const loyer of loyersSansRappelRecent) {
    // Récupérer les emails des locataires
    const emailsLocataires = loyer.contrat.locataires
      .map(cl => cl.locataire.email)
      .filter(email => email);

    if (emailsLocataires.length === 0) {
      continue; // Skip si aucun email
    }

    // Générer le message par défaut si non fourni
    const message = messagePersonnalise || generateDefaultRappelMessage(loyer, typeRappel);

    // Créer le rappel
    const rappel = await prisma.rappel.create({
      data: {
        loyerId: loyer.id,
        type: typeRappel,
        destinataires: emailsLocataires.join(', '),
        message,
        dateEnvoi: new Date(),
        modeEnvoi,
        envoye: false,
      },
    });

    // Créer une entrée dans l'historique du contrat
    await prisma.contratHistorique.create({
      data: {
        contratId: loyer.contratId,
        action: 'RAPPEL_AUTOMATIQUE',
        description: `Rappel automatique généré pour ${getMonthName(loyer.mois)} ${loyer.annee}`,
        dateAction: new Date(),
        metadata: JSON.stringify({
          rappelId: rappel.id,
          type: typeRappel,
          joursRetard,
        }),
      },
    });

    rappelsCrees.push(rappel);
  }

  res.json({
    success: true,
    message: `${rappelsCrees.length} rappel(s) automatique(s) généré(s)`,
    data: {
      rappelsCrees,
      loyersTraites: loyersSansRappelRecent.length,
      loyersEnRetardTotal: loyersEnRetard.length,
    },
  });
}));


// Fonctions utilitaires
function getMonthName(mois: number): string {
  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return moisNoms[mois - 1] || `Mois ${mois}`;
}

function generateDefaultRappelMessage(loyer: any, typeRappel: string): string {
  const montantRestant = loyer.montantDu - loyer.montantPaye;
  const moisAnnee = `${getMonthName(loyer.mois)} ${loyer.annee}`;
  const adresse = loyer.contrat.bien.adresse;
  
  const locataires = loyer.contrat.locataires
    .map((cl: any) => `${cl.locataire.prenom} ${cl.locataire.nom}`)
    .join(' et ');

  switch (typeRappel) {
    case 'RETARD':
      return `Cher(e) ${locataires},

Nous vous informons que le loyer de ${moisAnnee} pour le logement situé ${adresse} n'a pas été réglé à ce jour.

Montant dû : ${loyer.montantDu.toLocaleString()}€
Montant payé : ${loyer.montantPaye.toLocaleString()}€
Reste à payer : ${montantRestant.toLocaleString()}€

Nous vous remercions de bien vouloir régulariser cette situation dans les plus brefs délais.

Cordialement,
La gestion locative`;

    case 'RELANCE':
      return `Cher(e) ${locataires},

Malgré notre précédent courrier, nous constatons que le loyer de ${moisAnnee} pour le logement situé ${adresse} demeure impayé.

Montant restant dû : ${montantRestant.toLocaleString()}€

Nous vous demandons de procéder au règlement immédiat de cette somme, faute de quoi nous serions contraints d'engager des poursuites.

Cordialement,
La gestion locative`;

    case 'MISE_EN_DEMEURE':
      return `MISE EN DEMEURE

${locataires}
${adresse}

Nous vous mettons en demeure de régler immédiatement le loyer impayé de ${moisAnnee} d'un montant de ${montantRestant.toLocaleString()}€.

À défaut de paiement sous 8 jours, nous engagerons sans autre préavis les poursuites judiciaires nécessaires.

La gestion locative`;

    default:
      return `Cher(e) ${locataires},

Nous vous contactons concernant le loyer de ${moisAnnee} pour le logement situé ${adresse}.

Montant concerné : ${montantRestant.toLocaleString()}€

Merci de nous contacter pour régulariser la situation.

Cordialement,
La gestion locative`;
  }
}

export default router;