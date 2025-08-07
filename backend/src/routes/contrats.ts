import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { createError, asyncHandler } from '../middleware/errorHandler.js';
import { validateData } from '../middleware/validation.js';
import { successResponse } from '../utils/response.js';
import { prisma } from '../server.js';

const router = Router();

// Validation schemas
const contratSchema = z.object({
  bienId: z.string().min(1, 'Le bien est requis'),
  dateDebut: z.string().transform((str) => new Date(str)),
  dateFin: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  duree: z.number().int().min(1, 'La durée doit être d\'au moins 1 mois').default(12),
  loyer: z.number().positive('Le loyer doit être positif'),
  chargesMensuelles: z.number().min(0, 'Les charges ne peuvent pas être négatives').default(0),
  depotGarantie: z.number().min(0, 'Le dépôt de garantie ne peut pas être négatif').default(0),
  jourPaiement: z.number().int().min(1).max(31, 'Le jour de paiement doit être entre 1 et 31').default(1),
  fraisNotaire: z.number().min(0, 'Les frais de notaire ne peuvent pas être négatifs').default(0),
  fraisHuissier: z.number().min(0, 'Les frais d\'huissier ne peuvent pas être négatifs').default(0),
  type: z.enum(['HABITATION', 'COMMERCIAL', 'SAISONNIER', 'ETUDIANT']).default('HABITATION'),
  statut: z.enum(['ACTIF', 'RESILIE', 'EXPIRE', 'SUSPENDU']).default('ACTIF'),
  clausesParticulieres: z.string().optional(),
  documents: z.array(z.string()).optional().transform((arr) => arr ? JSON.stringify(arr) : undefined),
  commentaires: z.string().optional(),
  locataires: z.array(z.string()).min(1, 'Au moins un locataire est requis'),
});

const contratUpdateSchema = contratSchema.partial().omit({ locataires: true });

const contratQuerySchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 10),
  search: z.string().optional(),
  statut: z.string().optional(),
  bienId: z.string().optional(),
  locataireId: z.string().optional(),
});

// Appliquer le middleware d'authentification à toutes les routes
router.use(authMiddleware);

// GET /api/contrats - Lister les contrats avec filtres
router.get('/', validateData(contratQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, search, statut, bienId, locataireId } = req.query as any;
    const offset = (page - 1) * limit;

    // Construire les conditions de filtrage
    const where: any = {};
    
    if (statut) {
      where.statut = statut;
    }
    
    if (bienId) {
      where.bienId = bienId;
    }
    
    if (locataireId) {
      where.locataires = {
        some: {
          locataireId: locataireId,
        },
      };
    }

    if (search) {
      where.OR = [
        {
          bien: {
            adresse: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          locataires: {
            some: {
              locataire: {
                OR: [
                  {
                    nom: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    prenom: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            },
          },
        },
      ];
    }

    // Compter le total
    const total = await prisma.contrat.count({ where });

    // Récupérer les contrats avec leurs relations
    const contrats = await prisma.contrat.findMany({
      where,
      include: {
        bien: {
          select: {
            id: true,
            adresse: true,
            ville: true,
            codePostal: true,
            type: true,
            surface: true,
            nbPieces: true,
          },
        },
        locataires: {
          include: {
            locataire: {
              select: {
                id: true,
                civilite: true,
                nom: true,
                prenom: true,
                email: true,
                telephone: true,
              },
            },
          },
        },
        _count: {
          select: {
            loyers: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    res.json(
      successResponse({
        contrats,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
        },
      })
    );
  } catch (error) {
    next(error);
  }
});

// GET /api/contrats/stats - Statistiques des contrats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await prisma.contrat.groupBy({
      by: ['statut'],
      _count: {
        id: true,
      },
    });

    const totalContrats = await prisma.contrat.count();
    const contratActifs = await prisma.contrat.count({
      where: { statut: 'ACTIF' },
    });
    
    const loyerMoyenData = await prisma.contrat.aggregate({
      where: { statut: 'ACTIF' },
      _avg: {
        loyer: true,
      },
      _sum: {
        loyer: true,
      },
    });

    const contratsByType = await prisma.contrat.groupBy({
      by: ['type'],
      _count: {
        id: true,
      },
    });

    res.json(
      successResponse({
        total: totalContrats,
        actifs: contratActifs,
        par_statut: stats,
        par_type: contratsByType,
        loyer_moyen: loyerMoyenData._avg.loyer || 0,
        loyer_total: loyerMoyenData._sum.loyer || 0,
      })
    );
  } catch (error) {
    next(error);
  }
});

// GET /api/contrats/:id - Récupérer un contrat spécifique
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const contrat = await prisma.contrat.findUnique({
      where: { id },
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
        loyers: {
          orderBy: {
            dateEcheance: 'desc',
          },
          take: 12, // Derniers 12 loyers
        },
        historique: {
          orderBy: {
            dateAction: 'desc',
          },
          take: 10, // 10 dernières actions
        },
        _count: {
          select: {
            loyers: true,
          },
        },
      },
    });

    if (!contrat) {
      throw createError('Contrat non trouvé', 404);
    }

    res.json(successResponse(contrat));
  } catch (error) {
    next(error);
  }
});

// POST /api/contrats - Créer un nouveau contrat
router.post('/', validateData(contratSchema), async (req, res, next) => {
  try {
    const validatedData = req.body;
    const { locataires, ...contratData } = validatedData;

    // Vérifier que le bien existe et est disponible
    const bien = await prisma.bien.findUnique({
      where: { id: contratData.bienId },
    });

    if (!bien) {
      throw createError('Bien non trouvé', 404);
    }

    // Vérifier qu'il n'y a pas déjà un contrat actif pour ce bien
    const contratExistant = await prisma.contrat.findFirst({
      where: {
        bienId: contratData.bienId,
        statut: 'ACTIF',
      },
    });

    if (contratExistant) {
      throw createError('Ce bien a déjà un contrat actif', 400);
    }

    // Vérifier que tous les locataires existent
    const locatairesExistants = await prisma.locataire.findMany({
      where: {
        id: {
          in: locataires,
        },
      },
    });

    if (locatairesExistants.length !== locataires.length) {
      throw createError('Un ou plusieurs locataires sont introuvables', 400);
    }

    // Créer le contrat avec les relations dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer le contrat
      const contrat = await tx.contrat.create({
        data: contratData,
        include: {
          bien: true,
        },
      });

      // Créer les relations avec les locataires
      await tx.contratLocataire.createMany({
        data: locataires.map((locataireId: string) => ({
          contratId: contrat.id,
          locataireId,
        })),
      });

      // Mettre à jour le statut du bien
      await tx.bien.update({
        where: { id: contratData.bienId },
        data: { statut: 'LOUE' },
      });

      // Créer une entrée d'historique
      await tx.contratHistorique.create({
        data: {
          contratId: contrat.id,
          action: 'CREATION',
          description: 'Contrat créé',
          metadata: JSON.stringify({
            locataires: locatairesExistants.map(l => ({ id: l.id, nom: l.nom, prenom: l.prenom })),
          }),
        },
      });

      // Génération automatique des loyers avec prorata et détection des retards
      try {
        const dateDebut = new Date(contratData.dateDebut);
        const maintenant = new Date();
        const jourPaiement = contratData.jourPaiement;
        
        // Générer tous les loyers depuis la date de début jusqu'à maintenant
        let dateCourante = new Date(dateDebut);
        let premierMois = true;
        
        while (dateCourante <= maintenant) {
          const mois = dateCourante.getMonth() + 1; // 1-12
          const annee = dateCourante.getFullYear();
          
          let montantLoyer = contratData.loyer;
          let commentaire = `Loyer ${dateCourante.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
          
          // Calcul du prorata pour le premier mois seulement
          if (premierMois && dateDebut.getDate() > 1) {
            const dernierJourMois = new Date(annee, mois, 0).getDate();
            const joursRestants = dernierJourMois - dateDebut.getDate() + 1;
            montantLoyer = Math.round((contratData.loyer * joursRestants) / dernierJourMois * 100) / 100;
            commentaire = `Loyer prorata ${dateDebut.toLocaleDateString('fr-FR')} - ${new Date(annee, mois, 0).toLocaleDateString('fr-FR')}`;
          }
          
          // Calculer la date d'échéance (le loyer du mois se paie généralement le jour J de ce mois)
          let dateEcheance = new Date(annee, mois - 1, jourPaiement);
          
          // Si le premier mois et que la date d'échéance est avant la date de début,
          // reporter au mois suivant
          if (premierMois && dateEcheance <= dateDebut) {
            dateEcheance = new Date(annee, mois, jourPaiement);
          }
          
          // Déterminer le statut en fonction de la date d'échéance
          let statut = 'EN_ATTENTE';
          const aujourdhui = new Date();
          aujourdhui.setHours(23, 59, 59, 999); // Fin de la journée courante
          
          if (dateEcheance < aujourdhui) {
            statut = 'RETARD';
          }
          
          // Log pour déboguer
          console.log(`Loyer ${mois}/${annee}: échéance=${dateEcheance.toLocaleDateString('fr-FR')}, aujourd'hui=${aujourdhui.toLocaleDateString('fr-FR')}, statut=${statut}`);
          
          // Créer l'entrée loyer
          await tx.loyer.create({
            data: {
              contratId: contrat.id,
              mois: mois,
              annee: annee,
              montantDu: montantLoyer + contratData.chargesMensuelles,
              dateEcheance: dateEcheance,
              statut: statut,
              commentaires: commentaire,
            },
          });
          
          // Passer au mois suivant
          dateCourante = new Date(dateCourante.getFullYear(), dateCourante.getMonth() + 1, 1);
          premierMois = false;
        }
      } catch (loyerError) {
        console.error('Erreur lors de la génération des loyers:', loyerError);
        throw createError('Erreur lors de la génération automatique des loyers', 500);
      }

      return contrat;
    });

    // Récupérer le contrat complet avec les relations
    const contratComplet = await prisma.contrat.findUnique({
      where: { id: result.id },
      include: {
        bien: true,
        locataires: {
          include: {
            locataire: true,
          },
        },
      },
    });

    res.status(201).json(successResponse(contratComplet));
  } catch (error) {
    next(error);
  }
});

// PUT /api/contrats/:id - Mettre à jour un contrat
router.put('/:id', validateData(contratUpdateSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = req.body;

    // Vérifier que le contrat existe
    const contratExistant = await prisma.contrat.findUnique({
      where: { id },
    });

    if (!contratExistant) {
      throw createError('Contrat non trouvé', 404);
    }

    // Mettre à jour le contrat dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      const contrat = await tx.contrat.update({
        where: { id },
        data: validatedData,
        include: {
          bien: true,
          locataires: {
            include: {
              locataire: true,
            },
          },
        },
      });

      // Créer une entrée d'historique
      await tx.contratHistorique.create({
        data: {
          contratId: id,
          action: 'MODIFICATION',
          description: 'Contrat modifié',
          metadata: JSON.stringify({
            modifications: validatedData,
          }),
        },
      });

      return contrat;
    });

    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

// PUT /api/contrats/:id/statut - Changer le statut d'un contrat
router.put('/:id/statut', validateData(z.object({
  statut: z.enum(['ACTIF', 'RESILIE', 'EXPIRE', 'SUSPENDU']),
  motif: z.string().optional(),
})), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { statut, motif } = req.body;

    const contratExistant = await prisma.contrat.findUnique({
      where: { id },
      include: { bien: true },
    });

    if (!contratExistant) {
      throw createError('Contrat non trouvé', 404);
    }

    // Mettre à jour dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      const contrat = await tx.contrat.update({
        where: { id },
        data: { statut },
        include: {
          bien: true,
          locataires: {
            include: {
              locataire: true,
            },
          },
        },
      });

      // Mettre à jour le statut du bien si nécessaire
      if (statut === 'RESILIE' || statut === 'EXPIRE') {
        await tx.bien.update({
          where: { id: contratExistant.bienId },
          data: { statut: 'LIBRE' },
        });
      } else if (statut === 'ACTIF') {
        await tx.bien.update({
          where: { id: contratExistant.bienId },
          data: { statut: 'LOUE' },
        });
      }

      // Créer une entrée d'historique
      await tx.contratHistorique.create({
        data: {
          contratId: id,
          action: 'CHANGEMENT_STATUT',
          description: `Statut changé vers ${statut}${motif ? ` - ${motif}` : ''}`,
          metadata: JSON.stringify({
            ancien_statut: contratExistant.statut,
            nouveau_statut: statut,
            motif,
          }),
        },
      });

      return contrat;
    });

    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/contrats/:id - Supprimer un contrat
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const contratExistant = await prisma.contrat.findUnique({
      where: { id },
      include: {
        bien: true,
        _count: {
          select: {
            loyers: true,
          },
        },
      },
    });

    if (!contratExistant) {
      throw createError('Contrat non trouvé', 404);
    }

    // Vérifier qu'il n'y a pas de loyers associés
    if (contratExistant._count.loyers > 0) {
      throw createError('Impossible de supprimer un contrat avec des loyers associés', 400);
    }

    // Supprimer dans une transaction
    await prisma.$transaction(async (tx) => {
      // Supprimer les relations avec les locataires
      await tx.contratLocataire.deleteMany({
        where: { contratId: id },
      });

      // Supprimer l'historique
      await tx.contratHistorique.deleteMany({
        where: { contratId: id },
      });

      // Supprimer le contrat
      await tx.contrat.delete({
        where: { id },
      });

      // Mettre à jour le statut du bien
      await tx.bien.update({
        where: { id: contratExistant.bienId },
        data: { statut: 'LIBRE' },
      });
    });

    res.json(successResponse({ message: 'Contrat supprimé avec succès' }));
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/contrats/:id/resiliation
// @desc    Demander la résiliation anticipée d'un contrat
// @access  Private
router.put('/:id/resiliation', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const contratId = req.params.id;
  const {
    dateFinReelle,
    raisonResiliation,
    dateDemandeResiliation,
    preavisRespect,
    commentairesResiliation
  } = req.body;

  if (!dateFinReelle) {
    throw createError('La date de fin réelle est requise', 400);
  }

  if (!raisonResiliation) {
    throw createError('La raison de résiliation est requise', 400);
  }

  const contrat = await prisma.contrat.findUnique({
    where: { id: contratId },
    include: {
      bien: true,
      locataires: {
        include: {
          locataire: true,
        },
      },
      loyers: {
        orderBy: {
          dateEcheance: 'desc',
        },
        take: 1,
      },
    },
  });

  if (!contrat) {
    throw createError(404, 'Contrat non trouvé');
  }

  if (contrat.statut === 'RESILIE') {
    throw createError('Ce contrat est déjà résilié', 400);
  }

  const dateFinRealleDate = new Date(dateFinReelle);
  
  // Vérifier que la date de fin est postérieure à la date de demande si celle-ci est fournie
  if (dateDemandeResiliation) {
    const dateDemandeDate = new Date(dateDemandeResiliation);
    if (dateFinRealleDate < dateDemandeDate) {
      throw createError('La date de fin réelle doit être postérieure ou égale à la date de demande', 400);
    }
  }

  // Calculer si un prorata du loyer est nécessaire
  const moisResiliation = dateFinRealleDate.getMonth() + 1;
  const anneeResiliation = dateFinRealleDate.getFullYear();
  const jourResiliation = dateFinRealleDate.getDate();

  let prorataLoyer = 0;
  let loyerAProrata = null;

  // Si la résiliation n'est pas à la fin du mois, calculer le prorata
  const dernierJourMois = new Date(anneeResiliation, moisResiliation, 0).getDate();
  if (jourResiliation < dernierJourMois) {
    const joursOccupes = jourResiliation;
    const prorataCoeff = joursOccupes / dernierJourMois;
    prorataLoyer = Math.round((contrat.loyer * prorataCoeff) * 100) / 100; // Arrondir à 2 décimales

    // Chercher le loyer du mois de résiliation
    loyerAProrata = await prisma.loyer.findFirst({
      where: {
        contratId: contrat.id,
        mois: moisResiliation,
        annee: anneeResiliation,
      },
    });
  }

  // Mettre à jour le contrat
  const contratMisAJour = await prisma.contrat.update({
    where: { id: contratId },
    data: {
      dateFinReelle: dateFinRealleDate,
      raisonResiliation,
      dateDemandeResiliation: dateDemandeResiliation ? new Date(dateDemandeResiliation) : new Date(),
      preavisRespect: preavisRespect ?? true,
      commentairesResiliation,
      statut: 'RESILIE',
    },
    include: {
      bien: true,
      locataires: {
        include: {
          locataire: true,
        },
      },
    },
  });

  // Si un prorata est nécessaire, mettre à jour le loyer
  if (loyerAProrata && prorataLoyer > 0) {
    await prisma.loyer.update({
      where: { id: loyerAProrata.id },
      data: {
        montantDu: prorataLoyer + contrat.chargesMensuelles, // Ajouter les charges
        commentaires: `Prorata pour résiliation le ${dateFinRealleDate.toLocaleDateString('fr-FR')} - ${jourResiliation}/${dernierJourMois} jours`,
      },
    });
  }

  // Supprimer tous les loyers futurs (après la date de résiliation)
  const loyersFutursSupprimes = await prisma.loyer.deleteMany({
    where: {
      contratId: contrat.id,
      OR: [
        // Supprimer les loyers des mois suivants
        {
          annee: { gt: anneeResiliation }
        },
        {
          annee: anneeResiliation,
          mois: { gt: moisResiliation }
        }
      ]
    }
  });

  console.log(`Résiliation contrat ${contratId}: ${loyersFutursSupprimes.count} loyers futurs supprimés`);

  // Créer une entrée dans l'historique
  await prisma.contratHistorique.create({
    data: {
      contratId: contrat.id,
      action: 'RESILIATION_DEMANDEE',
      description: `Résiliation anticipée demandée pour le ${dateFinRealleDate.toLocaleDateString('fr-FR')}`,
      dateAction: new Date(),
      metadata: JSON.stringify({
        dateFinReelle: dateFinReelle,
        raisonResiliation,
        preavisRespect,
        prorataLoyer: prorataLoyer > 0 ? prorataLoyer : null,
        loyerProrata: loyerAProrata?.id || null,
        loyersFutursSupprimes: loyersFutursSupprimes.count,
      }),
    },
  });

  // Mettre à jour le statut du bien si nécessaire
  await prisma.bien.update({
    where: { id: contrat.bienId },
    data: {
      statut: 'VACANT',
    },
  });

  res.json({
    success: true,
    message: 'Résiliation anticipée enregistrée avec succès',
    data: {
      contrat: contratMisAJour,
      prorataLoyer: prorataLoyer > 0 ? prorataLoyer : null,
      loyerAffecte: loyerAProrata?.id || null,
    },
  });
}));

// @route   GET /api/contrats/:id/resiliation-details
// @desc    Calculer les détails de résiliation pour une date donnée
// @access  Private
router.get('/:id/resiliation-details', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const contratId = req.params.id;
  const { dateFinProposee } = req.query;

  if (!dateFinProposee) {
    throw createError('La date de fin proposée est requise', 400);
  }

  const contrat = await prisma.contrat.findUnique({
    where: { id: contratId },
    include: {
      bien: true,
      locataires: {
        include: {
          locataire: true,
        },
      },
    },
  });

  if (!contrat) {
    throw createError(404, 'Contrat non trouvé');
  }

  const dateFinProposeeDate = new Date(dateFinProposee as string);
  const moisResiliation = dateFinProposeeDate.getMonth() + 1;
  const anneeResiliation = dateFinProposeeDate.getFullYear();
  const jourResiliation = dateFinProposeeDate.getDate();

  // Calculer le prorata
  const dernierJourMois = new Date(anneeResiliation, moisResiliation, 0).getDate();
  let prorataLoyer = 0;
  let joursOccupes = jourResiliation;
  let prorataCoeff = joursOccupes / dernierJourMois;

  if (jourResiliation < dernierJourMois) {
    prorataLoyer = contrat.loyer * prorataCoeff;
  } else {
    prorataLoyer = contrat.loyer; // Mois complet
    prorataCoeff = 1;
  }

  // Vérifier s'il y a déjà un loyer pour ce mois
  const loyerExistant = await prisma.loyer.findFirst({
    where: {
      contratId: contrat.id,
      mois: moisResiliation,
      annee: anneeResiliation,
    },
  });

  res.json({
    success: true,
    data: {
      contrat: {
        id: contrat.id,
        loyer: contrat.loyer,
        adresseBien: contrat.bien.adresse,
      },
      resiliationDetails: {
        dateFinProposee: dateFinProposeeDate,
        moisResiliation,
        anneeResiliation,
        jourResiliation,
        dernierJourMois,
        joursOccupes,
        prorataCoeff: Math.round(prorataCoeff * 100) / 100,
        loyerComplet: contrat.loyer,
        prorataLoyer: Math.round(prorataLoyer * 100) / 100,
        economie: Math.round((contrat.loyer - prorataLoyer) * 100) / 100,
        loyerExistant: loyerExistant ? {
          id: loyerExistant.id,
          montantActuel: loyerExistant.montantDu,
          montantPaye: loyerExistant.montantPaye,
          statut: loyerExistant.statut,
        } : null,
      },
    },
  });
}));

export default router;