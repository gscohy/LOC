import express from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = express.Router();

// Fonction utilitaire pour générer les loyers manquants d'un contrat
async function genererLoyersManquants(contratId: string) {
  try {
    const contrat = await prisma.contrat.findUnique({
      where: { id: contratId },
      select: {
        id: true,
        dateDebut: true,
        dateFin: true,
        statut: true,
        loyer: true,
        chargesMensuelles: true,
        jourPaiement: true,
      },
    });

    if (!contrat || contrat.statut !== 'ACTIF') {
      return;
    }

    const dateDebut = new Date(contrat.dateDebut);
    const maintenant = new Date();
    const dateFin = contrat.dateFin ? new Date(contrat.dateFin) : maintenant;

    // Calculer les mois à générer depuis le début du contrat jusqu'à maintenant
    const moisAGenerer = [];
    const dateIterateur = new Date(dateDebut.getFullYear(), dateDebut.getMonth(), 1);

    while (dateIterateur <= maintenant && dateIterateur <= dateFin) {
      moisAGenerer.push({
        mois: dateIterateur.getMonth() + 1,
        annee: dateIterateur.getFullYear(),
      });
      dateIterateur.setMonth(dateIterateur.getMonth() + 1);
    }

    // Vérifier quels loyers existent déjà
    const loyersExistants = await prisma.loyer.findMany({
      where: {
        contratId,
        OR: moisAGenerer.map(({ mois, annee }) => ({ mois, annee })),
      },
      select: { mois: true, annee: true },
    });

    const loyersExistantsSet = new Set(
      loyersExistants.map(l => `${l.mois}-${l.annee}`)
    );

    // Générer les loyers manquants
    const loyersACreer = moisAGenerer
      .filter(({ mois, annee }) => !loyersExistantsSet.has(`${mois}-${annee}`))
      .map(({ mois, annee }) => {
        const dateEcheance = new Date(annee, mois - 1, contrat.jourPaiement);
        const montantDu = contrat.loyer + contrat.chargesMensuelles;

        return {
          contratId,
          mois,
          annee,
          montantDu,
          montantPaye: 0,
          dateEcheance,
          statut: 'EN_ATTENTE' as const,
          commentaires: `Loyer généré automatiquement pour ${mois}/${annee}`,
        };
      });

    if (loyersACreer.length > 0) {
      await prisma.loyer.createMany({
        data: loyersACreer,
      });
      console.log(`✅ ${loyersACreer.length} loyers générés automatiquement pour le contrat ${contratId}`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la génération automatique des loyers pour le contrat ${contratId}:`, error);
  }
}

// @route   GET /api/contrats/:id/details
// @desc    Get complete details of a contrat including tenants, rent history, and payments
// @access  Private
router.get('/:id/details', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const contratId = req.params.id;

  // Générer automatiquement les loyers manquants pour ce contrat
  await genererLoyersManquants(contratId);

  // Récupérer toutes les informations du contrat
  const contrat = await prisma.contrat.findUnique({
    where: { id: contratId },
    include: {
      // Bien associé
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
                  type: true,
                },
              },
            },
            orderBy: {
              quotePart: 'desc',
            },
          },
        },
      },
      
      // Locataires du contrat
      locataires: {
        include: {
          locataire: {
            include: {
              garants: {
                include: {
                  garant: {
                    select: {
                      id: true,
                      civilite: true,
                      nom: true,
                      prenom: true,
                      email: true,
                      telephone: true,
                      profession: true,
                      revenus: true,
                      typeGarantie: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      
      // Loyers du contrat avec paiements détaillés
      loyers: {
        include: {
          paiements: {
            orderBy: {
              date: 'desc',
            },
          },
          quittances: {
            select: {
              id: true,
              periode: true,
              montant: true,
              statut: true,
              dateGeneration: true,
              dateEnvoi: true,
              modeEnvoi: true,
              emailEnvoye: true,
            },
            orderBy: {
              dateGeneration: 'desc',
            },
          },
          rappels: {
            select: {
              id: true,
              type: true,
              dateEnvoi: true,
              destinataires: true,
              envoye: true,
            },
            orderBy: {
              dateEnvoi: 'desc',
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
        ],
      },
      
      // Historique du contrat
      historique: {
        orderBy: {
          dateAction: 'desc',
        },
      },
      
      // Compteurs
      _count: {
        select: {
          locataires: true,
          loyers: true,
          historique: true,
        },
      },
    },
  });

  if (!contrat) {
    throw createError('Contrat non trouvé', 404);
  }

  // Calculer les statistiques du contrat
  const stats = await calculateContratStats(contratId);
  
  // Récupérer les loyers groupés par statut
  const loyersGroupes = await prisma.loyer.groupBy({
    by: ['statut'],
    where: { contratId },
    _count: {
      statut: true,
    },
    _sum: {
      montantDu: true,
      montantPaye: true,
    },
  });

  // Calculer les totaux de paiements par mode
  const paiementsParMode = await prisma.paiement.groupBy({
    by: ['mode'],
    where: {
      loyer: {
        contratId,
      },
    },
    _count: {
      mode: true,
    },
    _sum: {
      montant: true,
    },
    orderBy: {
      _sum: {
        montant: 'desc',
      },
    },
  });

  const result = {
    contrat,
    stats,
    loyersGroupes,
    paiementsParMode,
  };

  res.json({
    success: true,
    data: result,
  });
}));

// Fonction utilitaire pour calculer les statistiques d'un contrat
async function calculateContratStats(contratId: string) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [
    totalLoyers,
    loyersPayes,
    loyersEnRetard,
    loyersPartiels,
    montantTotal,
    montantPaye,
    dernierPaiement,
    prochainLoyer,
    quittancesGenerees,
    rappelsEnvoyes,
  ] = await Promise.all([
    // Total des loyers
    prisma.loyer.count({
      where: { contratId },
    }),

    // Loyers payés
    prisma.loyer.count({
      where: {
        contratId,
        statut: 'PAYE',
      },
    }),

    // Loyers en retard
    prisma.loyer.count({
      where: {
        contratId,
        statut: 'RETARD',
      },
    }),

    // Loyers partiels
    prisma.loyer.count({
      where: {
        contratId,
        statut: 'PARTIEL',
      },
    }),

    // Montant total dû
    prisma.loyer.aggregate({
      where: { contratId },
      _sum: {
        montantDu: true,
      },
    }),

    // Montant total payé
    prisma.loyer.aggregate({
      where: { contratId },
      _sum: {
        montantPaye: true,
      },
    }),

    // Dernier paiement
    prisma.paiement.findFirst({
      where: {
        loyer: { contratId },
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        loyer: {
          select: {
            mois: true,
            annee: true,
          },
        },
      },
    }),

    // Prochain loyer à payer
    prisma.loyer.findFirst({
      where: {
        contratId,
        statut: {
          in: ['EN_ATTENTE', 'RETARD', 'PARTIEL'],
        },
      },
      orderBy: [
        { annee: 'asc' },
        { mois: 'asc' },
      ],
    }),

    // Quittances générées
    prisma.quittance.count({
      where: {
        loyer: { contratId },
      },
    }),

    // Rappels envoyés
    prisma.rappel.count({
      where: {
        loyer: { contratId },
        envoye: true,
      },
    }),
  ]);

  const montantTotalDu = montantTotal._sum.montantDu || 0;
  const montantTotalPaye = montantPaye._sum.montantPaye || 0;
  const tauxPaiement = montantTotalDu > 0 ? Math.round((montantTotalPaye / montantTotalDu) * 100) : 0;

  return {
    loyers: {
      total: totalLoyers,
      payes: loyersPayes,
      enRetard: loyersEnRetard,
      partiels: loyersPartiels,
      enAttente: totalLoyers - loyersPayes - loyersEnRetard - loyersPartiels,
      tauxPaiement,
    },
    finances: {
      montantTotalDu: montantTotalDu,
      montantTotalPaye: montantTotalPaye,
      resteAPayer: montantTotalDu - montantTotalPaye,
      pourcentagePaye: tauxPaiement,
    },
    activite: {
      dernierPaiement,
      prochainLoyer,
      quittancesGenerees,
      rappelsEnvoyes,
    },
  };
}

// @route   GET /api/contrats/:id/loyers
// @desc    Get detailed rent history for a specific contrat
// @access  Private
router.get('/:id/loyers', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const contratId = req.params.id;
  const { page = '1', limit = '12', annee, statut } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = { contratId };

  if (annee) {
    where.annee = parseInt(annee as string);
  }

  if (statut) {
    where.statut = statut;
  }

  const [loyers, total] = await Promise.all([
    prisma.loyer.findMany({
      where,
      skip,
      take: limitNum,
      include: {
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
            dateEnvoi: true,
            modeEnvoi: true,
          },
        },
        rappels: {
          select: {
            id: true,
            type: true,
            dateEnvoi: true,
            envoye: true,
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

// @route   GET /api/contrats/:id/paiements
// @desc    Get payment history for a specific contrat
// @access  Private
router.get('/:id/paiements', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const contratId = req.params.id;
  const { page = '1', limit = '20', mode, annee } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {
    loyer: { contratId },
  };

  if (mode) {
    where.mode = mode;
  }

  if (annee) {
    where.loyer.annee = parseInt(annee as string);
  }

  const [paiements, total] = await Promise.all([
    prisma.paiement.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        loyer: {
          select: {
            id: true,
            mois: true,
            annee: true,
            montantDu: true,
            statut: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    }),
    prisma.paiement.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      paiements,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
}));

// @route   GET /api/contrats/:id/quittances
// @desc    Get receipt history for a specific contrat
// @access  Private
router.get('/:id/quittances', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const contratId = req.params.id;
  const { page = '1', limit = '20', statut } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {
    loyer: { contratId },
  };

  if (statut) {
    where.statut = statut;
  }

  const [quittances, total] = await Promise.all([
    prisma.quittance.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        loyer: {
          select: {
            id: true,
            mois: true,
            annee: true,
            montantDu: true,
            montantPaye: true,
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

// @route   POST /api/contrats/:id/generer-loyers-manquants
// @desc    Generate missing rent entries for a specific contract
// @access  Private
router.post('/:id/generer-loyers-manquants', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const contratId = req.params.id;

  // Vérifier que le contrat existe
  const contrat = await prisma.contrat.findUnique({
    where: { id: contratId },
    select: { id: true, statut: true },
  });

  if (!contrat) {
    throw createError('Contrat non trouvé', 404);
  }

  if (contrat.statut !== 'ACTIF') {
    throw createError('Seuls les contrats actifs peuvent avoir des loyers générés', 400);
  }

  // Générer les loyers manquants
  await genererLoyersManquants(contratId);

  // Récupérer les loyers nouvellement créés
  const loyersGeneres = await prisma.loyer.findMany({
    where: {
      contratId,
      commentaires: {
        contains: 'généré automatiquement',
      },
    },
    orderBy: [{ annee: 'asc' }, { mois: 'asc' }],
  });

  res.json({
    success: true,
    data: loyersGeneres,
    message: `${loyersGeneres.length} loyers générés pour le contrat`,
  });
}));

export default router;