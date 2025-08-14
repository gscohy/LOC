import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = express.Router();

// Fonction utilitaire pour calculer le statut d'un loyer
function calculateLoyerStatut(
  montantDu: number, 
  montantPaye: number, 
  mois: number, 
  annee: number, 
  jourPaiement: number
): string {
  // Si complètement payé
  if (montantPaye >= montantDu) {
    return 'PAYE';
  }
  
  // Calculer la date limite de paiement pour ce mois
  const dateLimitePaiement = new Date(annee, mois - 1, jourPaiement);
  const maintenant = new Date();
  
  // Si la date limite est dépassée
  if (maintenant > dateLimitePaiement) {
    return montantPaye > 0 ? 'PARTIEL' : 'RETARD';
  }
  
  // Sinon, c'est en attente (même si partiellement payé)
  return montantPaye > 0 ? 'PARTIEL' : 'EN_ATTENTE';
}

// Validation schemas
const loyerSchema = z.object({
  contratId: z.string().min(1, 'Le contrat est requis'),
  mois: z.number().int().min(1).max(12, 'Le mois doit être entre 1 et 12'),
  annee: z.number().int().min(2020).max(2050, 'L\'année doit être entre 2020 et 2050'),
  montantDu: z.number().positive('Le montant dû doit être positif'),
  dateEcheance: z.string().transform((str) => new Date(str)),
  commentaires: z.string().optional(),
});

const paiementSchema = z.object({
  loyerId: z.string().min(1, 'Le loyer est requis'),
  montant: z.number().positive('Le montant doit être positif'),
  date: z.string().transform((str) => new Date(str)),
  mode: z.enum(['VIREMENT', 'CHEQUE', 'ESPECES', 'CAF', 'PRELEVEMENT']).default('VIREMENT'),
  payeur: z.string().min(1, 'Le payeur est requis').default('Locataire'),
  reference: z.string().optional(),
  commentaire: z.string().optional(),
});

// @route   GET /api/loyers
// @desc    Get all loyers
// @access  Private
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = '1', limit = '10', search, statut, mois, annee, contratId } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (statut) {
    where.statut = statut;
  }

  if (mois) {
    where.mois = parseInt(mois as string);
  }

  if (annee) {
    where.annee = parseInt(annee as string);
  }

  if (contratId) {
    where.contratId = contratId;
  }

  if (search) {
    where.OR = [
      { commentaires: { contains: search as string } },
      { 
        contrat: {
          bien: {
            adresse: { contains: search as string },
          },
        },
      },
      {
        contrat: {
          locataires: {
            some: {
              locataire: {
                OR: [
                  { nom: { contains: search as string } },
                  { prenom: { contains: search as string } },
                ],
              },
            },
          },
        },
      },
    ];
  }

  const [loyers, total] = await Promise.all([
    prisma.loyer.findMany({
      where,
      skip,
      take: limitNum,
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
        paiements: {
          orderBy: {
            date: 'desc',
          },
        },
        quittances: {
          select: {
            id: true,
            statut: true,
            dateGeneration: true,
          },
        },
        _count: {
          select: {
            paiements: true,
            quittances: true,
            rappels: true,
          },
        },
      },
      orderBy: [
        { annee: 'desc' },
        { mois: 'desc' },
        { dateEcheance: 'desc' },
      ],
    }),
    prisma.loyer.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      loyers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
}));

// @route   GET /api/loyers/stats
// @desc    Get loyers statistics
// @access  Private
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [
    totalLoyersEnAttente,
    totalLoyersEnRetard,
    totalLoyersPartiels,
    totalLoyersPayes,
    revenus12Mois,
    loyersParMois,
  ] = await Promise.all([
    // Loyers en attente
    prisma.loyer.count({
      where: { statut: 'EN_ATTENTE' },
    }),

    // Loyers en retard
    prisma.loyer.count({
      where: { statut: 'RETARD' },
    }),

    // Loyers partiellement payés
    prisma.loyer.count({
      where: { statut: 'PARTIEL' },
    }),

    // Loyers payés
    prisma.loyer.count({
      where: { statut: 'PAYE' },
    }),

    // Revenus de l'année en cours (jusqu'au mois courant inclus)
    prisma.loyer.aggregate({
      where: {
        annee: currentYear,
        mois: { lte: currentMonth },
        statut: 'PAYE',
      },
      _sum: {
        montantPaye: true,
      },
    }),

    // Loyers par mois de l'année en cours
    prisma.loyer.groupBy({
      by: ['annee', 'mois'],
      where: {
        annee: currentYear,
        mois: { lte: currentMonth },
      },
      _sum: {
        montantDu: true,
        montantPaye: true,
      },
      _count: true,
      orderBy: [
        { annee: 'desc' },
        { mois: 'desc' },
      ],
    }),
  ]);

  const stats = {
    totaux: {
      enAttente: totalLoyersEnAttente,
      enRetard: totalLoyersEnRetard,
      partiels: totalLoyersPartiels,
      payes: totalLoyersPayes,
      total: totalLoyersEnAttente + totalLoyersEnRetard + totalLoyersPartiels + totalLoyersPayes,
    },
    revenus: {
      annee: revenus12Mois._sum.montantPaye || 0,
      parMois: loyersParMois,
    },
  };

  res.json({
    success: true,
    data: stats,
  });
}));

// @route   GET /api/loyers/:id
// @desc    Get single loyer
// @access  Private
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const loyer = await prisma.loyer.findUnique({
    where: { id: req.params.id },
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
      paiements: {
        orderBy: {
          date: 'desc',
        },
      },
      quittances: {
        orderBy: {
          dateGeneration: 'desc',
        },
      },
      rappels: {
        orderBy: {
          dateEnvoi: 'desc',
        },
      },
    },
  });

  if (!loyer) {
    throw createError('Loyer non trouvé', 404);
  }

  res.json({
    success: true,
    data: loyer,
  });
}));

// @route   POST /api/loyers
// @desc    Create loyer
// @access  Private
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = loyerSchema.parse(req.body);

  // Vérifier que le contrat existe
  const contrat = await prisma.contrat.findUnique({
    where: { id: validatedData.contratId },
  });

  if (!contrat) {
    throw createError('Contrat non trouvé', 404);
  }

  // Vérifier qu'un loyer n'existe pas déjà pour ce mois/année
  const existing = await prisma.loyer.findFirst({
    where: {
      contratId: validatedData.contratId,
      mois: validatedData.mois,
      annee: validatedData.annee,
    },
  });

  if (existing) {
    throw createError('Un loyer existe déjà pour ce mois et cette année', 400);
  }

  const loyer = await prisma.loyer.create({
    data: {
      ...validatedData,
      montantPaye: 0,
      statut: 'EN_ATTENTE',
    },
    include: {
      contrat: {
        include: {
          bien: {
            select: {
              adresse: true,
              ville: true,
            },
          },
          locataires: {
            include: {
              locataire: {
                select: {
                  nom: true,
                  prenom: true,
                },
              },
            },
          },
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    data: loyer,
    message: 'Loyer créé avec succès',
  });
}));

// @route   PUT /api/loyers/:id
// @desc    Update loyer
// @access  Private
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = loyerSchema.partial().parse(req.body);

  // Vérifier que le loyer existe
  const existing = await prisma.loyer.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw createError('Loyer non trouvé', 404);
  }

  const loyer = await prisma.loyer.update({
    where: { id: req.params.id },
    data: validatedData,
    include: {
      contrat: {
        include: {
          bien: {
            select: {
              adresse: true,
              ville: true,
            },
          },
        },
      },
      paiements: true,
    },
  });

  res.json({
    success: true,
    data: loyer,
    message: 'Loyer mis à jour avec succès',
  });
}));

// @route   DELETE /api/loyers/:id
// @desc    Delete loyer and all associated payments and quittances
// @access  Private
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Vérifier que le loyer existe
  const existing = await prisma.loyer.findUnique({
    where: { id: req.params.id },
    include: {
      _count: {
        select: {
          paiements: true,
          quittances: true,
          rappels: true,
        },
      },
    },
  });

  if (!existing) {
    throw createError('Loyer non trouvé', 404);
  }

  // Supprimer le loyer et tous les éléments associés dans une transaction
  await prisma.$transaction(async (tx) => {
    // Supprimer d'abord les paiements
    await tx.paiement.deleteMany({
      where: { loyerId: req.params.id },
    });

    // Supprimer les quittances
    await tx.quittance.deleteMany({
      where: { loyerId: req.params.id },
    });

    // Supprimer les rappels
    await tx.rappel.deleteMany({
      where: { loyerId: req.params.id },
    });

    // Finalement supprimer le loyer
    await tx.loyer.delete({
      where: { id: req.params.id },
    });
  });

  res.json({
    success: true,
    message: `Loyer supprimé avec succès (incluant ${existing._count.paiements} paiement(s), ${existing._count.quittances} quittance(s) et ${existing._count.rappels} rappel(s))`,
  });
}));

// @route   POST /api/loyers/:id/paiements
// @desc    Add payment to loyer
// @access  Private
router.post('/:id/paiements', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = paiementSchema.parse({
    ...req.body,
    loyerId: req.params.id,
  });

  // Vérifier que le loyer existe
  const loyer = await prisma.loyer.findUnique({
    where: { id: req.params.id },
    include: {
      paiements: true,
    },
  });

  if (!loyer) {
    throw createError('Loyer non trouvé', 404);
  }

  // Vérifier que le paiement ne dépasse pas le montant dû
  const totalPaye = loyer.paiements.reduce((sum, p) => sum + p.montant, 0);
  const nouveauTotal = totalPaye + validatedData.montant;

  if (nouveauTotal > loyer.montantDu) {
    throw createError(
      `Le montant total des paiements (${nouveauTotal}€) ne peut pas dépasser le montant dû (${loyer.montantDu}€)`,
      400
    );
  }

  // Créer le paiement dans une transaction
  const result = await prisma.$transaction(async (tx) => {
    // Créer le paiement
    const paiement = await tx.paiement.create({
      data: validatedData,
    });

    // Calculer le nouveau montant payé
    const nouveauMontantPaye = totalPaye + validatedData.montant;

    // Récupérer les informations du contrat pour le jour de paiement
    const contrat = await tx.contrat.findUnique({
      where: { id: loyer.contratId },
      select: { jourPaiement: true }
    });

    if (!contrat) {
      throw createError('Contrat non trouvé', 404);
    }

    // Calculer le nouveau statut avec la nouvelle logique
    const nouveauStatut = calculateLoyerStatut(
      loyer.montantDu,
      nouveauMontantPaye,
      loyer.mois,
      loyer.annee,
      contrat.jourPaiement
    );

    // Mettre à jour le loyer
    const loyerMisAJour = await tx.loyer.update({
      where: { id: req.params.id },
      data: {
        montantPaye: nouveauMontantPaye,
        statut: nouveauStatut,
      },
      include: {
        contrat: {
          include: {
            bien: {
              select: {
                adresse: true,
                ville: true,
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

    return { paiement, loyer: loyerMisAJour };
  });

  res.status(201).json({
    success: true,
    data: result,
    message: 'Paiement ajouté avec succès',
  });
}));

// @route   PUT /api/loyers/:loyerId/paiements/:paiementId
// @desc    Update payment
// @access  Private
router.put('/:loyerId/paiements/:paiementId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = paiementSchema.partial().parse(req.body);

  // Vérifier que le paiement existe
  const existing = await prisma.paiement.findUnique({
    where: { id: req.params.paiementId },
    include: {
      loyer: {
        include: {
          paiements: true,
        },
      },
    },
  });

  if (!existing || existing.loyerId !== req.params.loyerId) {
    throw createError('Paiement non trouvé', 404);
  }

  // Si le montant change, vérifier les contraintes
  if (validatedData.montant && validatedData.montant !== existing.montant) {
    const autresPaiements = existing.loyer.paiements.filter(p => p.id !== req.params.paiementId);
    const totalAutresPaiements = autresPaiements.reduce((sum, p) => sum + p.montant, 0);
    const nouveauTotal = totalAutresPaiements + validatedData.montant;

    if (nouveauTotal > existing.loyer.montantDu) {
      throw createError(
        `Le montant total des paiements (${nouveauTotal}€) ne peut pas dépasser le montant dû (${existing.loyer.montantDu}€)`,
        400
      );
    }
  }

  // Mettre à jour dans une transaction
  const result = await prisma.$transaction(async (tx) => {
    // Mettre à jour le paiement
    const paiement = await tx.paiement.update({
      where: { id: req.params.paiementId },
      data: validatedData,
    });

    // Recalculer le statut du loyer
    const loyer = await tx.loyer.findUnique({
      where: { id: req.params.loyerId },
      include: {
        paiements: true,
      },
    });

    if (loyer) {
      const nouveauMontantPaye = loyer.paiements.reduce((sum, p) => sum + p.montant, 0);

      // Récupérer les informations du contrat pour le jour de paiement
      const contrat = await tx.contrat.findUnique({
        where: { id: loyer.contratId },
        select: { jourPaiement: true }
      });

      if (!contrat) {
        throw createError('Contrat non trouvé', 404);
      }

      // Calculer le nouveau statut avec la nouvelle logique
      const nouveauStatut = calculateLoyerStatut(
        loyer.montantDu,
        nouveauMontantPaye,
        loyer.mois,
        loyer.annee,
        contrat.jourPaiement
      );

      const loyerMisAJour = await tx.loyer.update({
        where: { id: req.params.loyerId },
        data: {
          montantPaye: nouveauMontantPaye,
          statut: nouveauStatut,
        },
      });

      return { paiement, loyer: loyerMisAJour };
    }

    return { paiement };
  });

  res.json({
    success: true,
    data: result,
    message: 'Paiement mis à jour avec succès',
  });
}));

// @route   DELETE /api/loyers/:loyerId/paiements/:paiementId
// @desc    Delete payment
// @access  Private
router.delete('/:loyerId/paiements/:paiementId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Vérifier que le paiement existe
  const existing = await prisma.paiement.findUnique({
    where: { id: req.params.paiementId },
  });

  if (!existing || existing.loyerId !== req.params.loyerId) {
    throw createError('Paiement non trouvé', 404);
  }

  // Supprimer dans une transaction
  await prisma.$transaction(async (tx) => {
    // Supprimer le paiement
    await tx.paiement.delete({
      where: { id: req.params.paiementId },
    });

    // Recalculer le statut du loyer
    const loyer = await tx.loyer.findUnique({
      where: { id: req.params.loyerId },
      include: {
        paiements: true,
      },
    });

    if (loyer) {
      const nouveauMontantPaye = loyer.paiements.reduce((sum, p) => sum + p.montant, 0);

      // Récupérer les informations du contrat pour le jour de paiement
      const contrat = await tx.contrat.findUnique({
        where: { id: loyer.contratId },
        select: { jourPaiement: true }
      });

      if (!contrat) {
        throw createError('Contrat non trouvé', 404);
      }

      // Calculer le nouveau statut avec la nouvelle logique
      const nouveauStatut = calculateLoyerStatut(
        loyer.montantDu,
        nouveauMontantPaye,
        loyer.mois,
        loyer.annee,
        contrat.jourPaiement
      );

      await tx.loyer.update({
        where: { id: req.params.loyerId },
        data: {
          montantPaye: nouveauMontantPaye,
          statut: nouveauStatut,
        },
      });
    }
  });

  res.json({
    success: true,
    message: 'Paiement supprimé avec succès',
  });
}));

// @route   POST /api/loyers/recalculate-statuts
// @desc    Recalculate status for all rents
// @access  Private
router.post('/recalculate-statuts', asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.$transaction(async (tx) => {
    // Récupérer tous les loyers avec leurs contrats
    const loyers = await tx.loyer.findMany({
      include: {
        contrat: {
          select: { jourPaiement: true }
        }
      }
    });

    const updates = [];

    for (const loyer of loyers) {
      const nouveauStatut = calculateLoyerStatut(
        loyer.montantDu,
        loyer.montantPaye,
        loyer.mois,
        loyer.annee,
        loyer.contrat.jourPaiement
      );

      // Ne mettre à jour que si le statut a changé
      if (nouveauStatut !== loyer.statut) {
        updates.push({
          id: loyer.id,
          ancienStatut: loyer.statut,
          nouveauStatut: nouveauStatut
        });

        await tx.loyer.update({
          where: { id: loyer.id },
          data: { statut: nouveauStatut }
        });
      }
    }

    res.json({
      success: true,
      message: `${updates.length} loyers mis à jour`,
      data: { updates }
    });
  });
}));

// @route   POST /api/loyers/generer-loyers-manquants
// @desc    Generate missing rent for contracts where payment date has passed
// @access  Private
router.post('/generer-loyers-manquants', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const currentDay = currentDate.getDate();

  const results = {
    loyersCrees: [],
    contratsTraites: 0,
    contratsActifsTotal: 0,
    erreurs: []
  };

  await prisma.$transaction(async (tx) => {
    // Récupérer tous les contrats actifs
    const contratsActifs = await tx.contrat.findMany({
      where: {
        statut: 'ACTIF',
        dateDebut: {
          lte: currentDate
        },
        OR: [
          { dateFin: null },
          { dateFin: { gte: currentDate } }
        ]
      },
      include: {
        bien: {
          select: {
            id: true,
            adresse: true,
            ville: true
          }
        },
        locataires: {
          include: {
            locataire: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                email: true
              }
            }
          }
        }
      }
    });

    results.contratsActifsTotal = contratsActifs.length;

    // Fonction pour déterminer les périodes à vérifier
    const getPeriodsToCheck = (contrat: any) => {
      const periods = [];
      const contratDebut = new Date(contrat.dateDebut);
      const contratFin = contrat.dateFin ? new Date(contrat.dateFin) : null;

      // Commencer à partir de la date de début du contrat
      let checkDate = new Date(contratDebut.getFullYear(), contratDebut.getMonth(), contrat.jourPaiement);
      
      // Si la date de début est après le jour de paiement du mois, commencer le mois suivant
      if (contratDebut.getDate() > contrat.jourPaiement) {
        checkDate.setMonth(checkDate.getMonth() + 1);
      }

      // Vérifier jusqu'au mois courant (inclus si le jour de paiement est passé)
      while (checkDate <= currentDate) {
        const mois = checkDate.getMonth() + 1;
        const annee = checkDate.getFullYear();
        
        // Ne pas dépasser la date de fin du contrat
        if (contratFin && checkDate > contratFin) {
          break;
        }

        // Vérifier si nous devons créer ce loyer (créer dès le 1er du mois)
        const shouldCreate = checkDate.getMonth() < currentDate.getMonth() ||
          checkDate.getFullYear() < currentDate.getFullYear() ||
          (checkDate.getMonth() === currentDate.getMonth() && 
           checkDate.getFullYear() === currentDate.getFullYear());

        if (shouldCreate) {
          periods.push({ mois, annee, dateEcheance: new Date(checkDate) });
        }

        // Passer au mois suivant
        checkDate.setMonth(checkDate.getMonth() + 1);
      }

      return periods;
    };

    for (const contrat of contratsActifs) {
      try {
        results.contratsTraites++;

        const periodsToCheck = getPeriodsToCheck(contrat);

        for (const period of periodsToCheck) {
          // Vérifier si un loyer existe déjà pour cette période
          const loyerExiste = await tx.loyer.findFirst({
            where: {
              contratId: contrat.id,
              mois: period.mois,
              annee: period.annee
            }
          });

          if (!loyerExiste) {
            // Déterminer le statut initial selon la date d'échéance
            let statutInitial = 'EN_ATTENTE';
            if (period.dateEcheance < currentDate) {
              statutInitial = 'RETARD';
            }

            // Créer le loyer manquant
            const nouveauLoyer = await tx.loyer.create({
              data: {
                contratId: contrat.id,
                mois: period.mois,
                annee: period.annee,
                montantDu: contrat.loyer + contrat.chargesMensuelles,
                montantPaye: 0,
                dateEcheance: period.dateEcheance,
                statut: statutInitial,
                commentaires: `Loyer généré automatiquement le ${currentDate.toISOString()}`
              }
            });

            results.loyersCrees.push({
              loyerId: nouveauLoyer.id,
              contratId: contrat.id,
              mois: period.mois,
              annee: period.annee,
              montantDu: nouveauLoyer.montantDu,
              dateEcheance: period.dateEcheance,
              statut: statutInitial,
              adresse: contrat.bien.adresse,
              locataires: contrat.locataires.map(cl => 
                `${cl.locataire.prenom} ${cl.locataire.nom}`
              ).join(', ')
            });
          }
        }
      } catch (error) {
        results.erreurs.push({
          contratId: contrat.id,
          adresse: contrat.bien?.adresse || 'Adresse inconnue',
          erreur: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    }
  });

  res.json({
    success: true,
    message: `Génération automatique terminée. ${results.loyersCrees.length} loyers créés sur ${results.contratsActifsTotal} contrats actifs.`,
    data: results
  });
}));

// @route   POST /api/loyers/verifier-generation-automatique
// @desc    Check if automatic generation should run (called by cron job)
// @access  Private
router.post('/verifier-generation-automatique', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const currentDate = new Date();
  const currentDay = currentDate.getDate();
  
  // Ne lancer la génération que le 1er du mois
  if (currentDay === 1) {
    // Rediriger vers la génération automatique
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/loyers/generer-loyers-manquants`, {
      method: 'POST',
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    res.json({
      success: true,
      message: 'Vérification automatique effectuée - génération lancée',
      data: {
        dateVerification: currentDate,
        generationLancee: true,
        resultats: result.data
      }
    });
  } else {
    res.json({
      success: true,
      message: 'Vérification automatique effectuée - pas de génération nécessaire',
      data: {
        dateVerification: currentDate,
        generationLancee: false,
        prochaineLancement: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      }
    });
  }
}));

// @route   POST /api/loyers/generer-loyers-manquants-public
// @desc    Generate missing rent for contracts (PUBLIC - temporary for testing)
// @access  Public
router.post('/generer-loyers-manquants-public', asyncHandler(async (req, res) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const currentDay = currentDate.getDate();

  const results = {
    loyersCrees: [],
    contratsTraites: 0,
    contratsActifsTotal: 0,
    erreurs: []
  };

  await prisma.$transaction(async (tx) => {
    // Récupérer tous les contrats actifs
    const contratsActifs = await tx.contrat.findMany({
      where: {
        statut: 'ACTIF',
        dateDebut: {
          lte: currentDate
        },
        OR: [
          { dateFin: null },
          { dateFin: { gte: currentDate } }
        ]
      },
      include: {
        bien: {
          select: {
            id: true,
            adresse: true,
            ville: true
          }
        },
        locataires: {
          include: {
            locataire: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                email: true
              }
            }
          }
        }
      }
    });

    results.contratsActifsTotal = contratsActifs.length;

    // Fonction pour déterminer les périodes à vérifier
    const getPeriodsToCheck = (contrat: any) => {
      const periods = [];
      const contratDebut = new Date(contrat.dateDebut);
      const contratFin = contrat.dateFin ? new Date(contrat.dateFin) : null;

      // Commencer à partir de la date de début du contrat
      let checkDate = new Date(contratDebut.getFullYear(), contratDebut.getMonth(), contrat.jourPaiement);
      
      // Si la date de début est après le jour de paiement du mois, commencer le mois suivant
      if (contratDebut.getDate() > contrat.jourPaiement) {
        checkDate.setMonth(checkDate.getMonth() + 1);
      }

      // Vérifier jusqu'au mois courant (inclus si le jour de paiement est passé)
      while (checkDate <= currentDate) {
        const mois = checkDate.getMonth() + 1;
        const annee = checkDate.getFullYear();
        
        // Ne pas dépasser la date de fin du contrat
        if (contratFin && checkDate > contratFin) {
          break;
        }

        // Vérifier si nous devons créer ce loyer (créer dès le 1er du mois)
        const shouldCreate = checkDate.getMonth() < currentDate.getMonth() ||
          checkDate.getFullYear() < currentDate.getFullYear() ||
          (checkDate.getMonth() === currentDate.getMonth() && 
           checkDate.getFullYear() === currentDate.getFullYear());

        if (shouldCreate) {
          periods.push({ mois, annee, dateEcheance: new Date(checkDate) });
        }

        // Passer au mois suivant
        checkDate.setMonth(checkDate.getMonth() + 1);
      }

      return periods;
    };

    for (const contrat of contratsActifs) {
      try {
        results.contratsTraites++;

        const periodsToCheck = getPeriodsToCheck(contrat);

        for (const period of periodsToCheck) {
          // Vérifier si un loyer existe déjà pour cette période
          const loyerExiste = await tx.loyer.findFirst({
            where: {
              contratId: contrat.id,
              mois: period.mois,
              annee: period.annee
            }
          });

          if (!loyerExiste) {
            // Déterminer le statut initial selon la date d'échéance
            let statutInitial = 'EN_ATTENTE';
            if (period.dateEcheance < currentDate) {
              statutInitial = 'RETARD';
            }

            // Créer le loyer manquant
            const nouveauLoyer = await tx.loyer.create({
              data: {
                contratId: contrat.id,
                mois: period.mois,
                annee: period.annee,
                montantDu: contrat.loyer + contrat.chargesMensuelles,
                montantPaye: 0,
                dateEcheance: period.dateEcheance,
                statut: statutInitial,
                commentaires: `Loyer généré automatiquement (test public) le ${currentDate.toISOString()}`
              }
            });

            results.loyersCrees.push({
              loyerId: nouveauLoyer.id,
              contratId: contrat.id,
              mois: period.mois,
              annee: period.annee,
              montantDu: nouveauLoyer.montantDu,
              dateEcheance: period.dateEcheance,
              statut: statutInitial,
              adresse: contrat.bien.adresse,
              locataires: contrat.locataires.map(cl => 
                `${cl.locataire.prenom} ${cl.locataire.nom}`
              ).join(', ')
            });
          }
        }
      } catch (error) {
        results.erreurs.push({
          contratId: contrat.id,
          adresse: contrat.bien?.adresse || 'Adresse inconnue',
          erreur: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    }
  });

  res.json({
    success: true,
    message: `TEST - Génération automatique terminée. ${results.loyersCrees.length} loyers créés sur ${results.contratsActifsTotal} contrats actifs.`,
    data: results,
    note: "⚠️ Endpoint de test public - à supprimer après validation"
  });
}));

export default router;