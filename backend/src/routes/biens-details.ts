import express from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = express.Router();

// @route   GET /api/biens/:id/details
// @desc    Get complete details of a bien including contracts, tenants, and rent history
// @access  Private
router.get('/:id/details', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const bienId = req.params.id;

  // Récupérer toutes les informations du bien
  const bien = await prisma.bien.findUnique({
    where: { id: bienId },
    include: {
      // Propriétaires
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
      
      // Contrats (historique complet)
      contrats: {
        include: {
          // Locataires du contrat
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
                  profession: true,
                  revenus: true,
                },
              },
            },
          },
          // Loyers du contrat
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
                  statut: true,
                  dateGeneration: true,
                  dateEnvoi: true,
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
        orderBy: [
          { dateDebut: 'desc' },
        ],
      },
      
      // Charges du bien
      charges: {
        orderBy: {
          date: 'desc',
        },
        take: 50, // Limiter aux 50 charges les plus récentes
      },
      
      // Compteurs globaux
      _count: {
        select: {
          contrats: true,
          charges: true,
        },
      },
    },
  });

  if (!bien) {
    throw createError('Bien non trouvé', 404);
  }

  // Calculer les statistiques du bien
  const stats = await calculateBienStats(bienId);
  
  // Récupérer les contrats groupés par statut
  const contratsGroupes = {
    actuel: bien.contrats.find(c => c.statut === 'ACTIF') || null,
    precedents: bien.contrats.filter(c => c.statut !== 'ACTIF'),
  };

  // Récupérer les loyers récents (6 derniers mois)
  const loyersRecents = await prisma.loyer.findMany({
    where: {
      contrat: {
        bienId: bienId,
      },
    },
    include: {
      contrat: {
        include: {
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
      paiements: {
        orderBy: {
          date: 'desc',
        },
      },
    },
    orderBy: [
      { annee: 'desc' },
      { mois: 'desc' },
    ],
    take: 12, // 12 derniers mois
  });

  const result = {
    bien: {
      ...bien,
      contrats: contratsGroupes,
    },
    stats,
    loyersRecents,
  };

  res.json({
    success: true,
    data: result,
  });
}));

// Fonction utilitaire pour calculer les statistiques d'un bien
async function calculateBienStats(bienId: string) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [
    totalLoyers,
    loyersPayes,
    loyersEnRetard,
    revenus12Mois,
    chargesAnnee,
    tauxOccupation,
    dernierContrat,
  ] = await Promise.all([
    // Total des loyers dus
    prisma.loyer.count({
      where: {
        contrat: { bienId },
      },
    }),

    // Loyers payés
    prisma.loyer.count({
      where: {
        contrat: { bienId },
        statut: 'PAYE',
      },
    }),

    // Loyers en retard
    prisma.loyer.count({
      where: {
        contrat: { bienId },
        statut: 'RETARD',
      },
    }),

    // Revenus des 12 derniers mois
    prisma.loyer.aggregate({
      where: {
        contrat: { bienId },
        OR: [
          { annee: currentYear },
          { annee: currentYear - 1, mois: { gte: currentMonth } },
        ],
        statut: 'PAYE',
      },
      _sum: {
        montantPaye: true,
      },
    }),

    // Charges de l'année en cours
    prisma.charge.aggregate({
      where: {
        bienId,
        date: {
          gte: new Date(currentYear, 0, 1),
          lt: new Date(currentYear + 1, 0, 1),
        },
      },
      _sum: {
        montant: true,
      },
    }),

    // Calculer le taux d'occupation (mois avec contrat actif / 12)
    prisma.contrat.findMany({
      where: {
        bienId,
        statut: 'ACTIF',
      },
      select: {
        dateDebut: true,
        dateFin: true,
      },
    }),

    // Dernier contrat
    prisma.contrat.findFirst({
      where: { bienId },
      orderBy: { dateDebut: 'desc' },
      include: {
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
    }),
  ]);

  // Calculer le taux d'occupation approximatif
  let moisOccupes = 0;
  if (tauxOccupation.length > 0) {
    // Logique simplifiée : si il y a un contrat actif, considérer 12 mois
    // En réalité, il faudrait calculer plus précisément selon les dates
    moisOccupes = tauxOccupation.some(c => c.dateFin === null || new Date(c.dateFin) > new Date()) ? 12 : 0;
  }

  const revenus = revenus12Mois._sum.montantPaye || 0;
  const charges = chargesAnnee._sum.montant || 0;
  const benefice = revenus - charges;

  return {
    loyers: {
      total: totalLoyers,
      payes: loyersPayes,
      enRetard: loyersEnRetard,
      tauxPaiement: totalLoyers > 0 ? Math.round((loyersPayes / totalLoyers) * 100) : 0,
    },
    finances: {
      revenus12Mois: revenus,
      chargesAnnee: charges,
      beneficeAnnee: benefice,
      rentabilite: revenus > 0 ? Math.round((benefice / revenus) * 100) : 0,
    },
    occupation: {
      tauxOccupation: Math.round((moisOccupes / 12) * 100),
      moisOccupes,
      moisLibres: 12 - moisOccupes,
    },
    dernierContrat,
  };
}

// @route   GET /api/biens/:id/loyers
// @desc    Get rent history for a specific bien
// @access  Private
router.get('/:id/loyers', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const bienId = req.params.id;
  const { page = '1', limit = '20', annee, statut } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {
    contrat: { bienId },
  };

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
        contrat: {
          include: {
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

// @route   GET /api/biens/:id/contrats
// @desc    Get contract history for a specific bien
// @access  Private
router.get('/:id/contrats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const bienId = req.params.id;

  const contrats = await prisma.contrat.findMany({
    where: { bienId },
    include: {
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
              profession: true,
            },
          },
        },
      },
      historique: {
        orderBy: {
          dateAction: 'desc',
        },
      },
      _count: {
        select: {
          locataires: true,
          loyers: true,
          historique: true,
        },
      },
    },
    orderBy: [
      { dateDebut: 'desc' },
    ],
  });

  // Grouper par statut
  const contratsGroupes = {
    actuel: contrats.find(c => c.statut === 'ACTIF') || null,
    precedents: contrats.filter(c => c.statut !== 'ACTIF'),
    total: contrats.length,
  };

  res.json({
    success: true,
    data: contratsGroupes,
  });
}));

export default router;