import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = express.Router();

// Validation schemas
const locataireSchema = z.object({
  civilite: z.enum(['M', 'MME', 'MLLE']).default('M'),
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(1, 'Le téléphone est requis'),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  codePostal: z.string().optional(),
  dateNaissance: z.string().transform((str) => str ? new Date(str) : undefined).optional(),
  profession: z.string().optional(),
  revenus: z.number().min(0, 'Les revenus ne peuvent pas être négatifs').default(0),
});

// @route   GET /api/locataires
// @desc    Get all locataires
// @access  Private
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = '1', limit = '10', search, statut } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (search) {
    where.OR = [
      { nom: { contains: search as string } },
      { prenom: { contains: search as string } },
      { email: { contains: search as string } },
      { telephone: { contains: search as string } },
    ];
  }

  const [locataires, total] = await Promise.all([
    prisma.locataire.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        contrats: {
          include: {
            contrat: {
              include: {
                bien: {
                  select: {
                    id: true,
                    adresse: true,
                    ville: true,
                    loyer: true,
                    statut: true,
                  },
                },
              },
            },
          },
        },
        garants: {
          include: {
            garant: {
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
        _count: {
          select: {
            contrats: true,
            garants: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.locataire.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      locataires,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
}));

// @route   GET /api/locataires/:id
// @desc    Get single locataire
// @access  Private
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const locataire = await prisma.locataire.findUnique({
    where: { id: req.params.id },
    include: {
      contrats: {
        include: {
          contrat: {
            include: {
              bien: true,
              loyers: {
                orderBy: {
                  dateEcheance: 'desc',
                },
                take: 24, // 24 derniers loyers
              },
            },
          },
        },
      },
      garants: {
        include: {
          garant: true,
        },
      },
    },
  });

  if (!locataire) {
    throw createError('Locataire non trouvé', 404);
  }

  res.json({
    success: true,
    data: locataire,
  });
}));

// @route   GET /api/locataires/:id/details
// @desc    Get complete locataire details with stats
// @access  Private
router.get('/:id/details', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const locataire = await prisma.locataire.findUnique({
    where: { id: req.params.id },
    include: {
      contrats: {
        include: {
          contrat: {
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
              loyers: {
                include: {
                  paiements: {
                    orderBy: {
                      date: 'desc',
                    },
                  },
                },
                orderBy: {
                  dateEcheance: 'desc',
                },
              },
            },
          },
        },
      },
      garants: {
        include: {
          garant: true,
        },
      },
    },
  });

  if (!locataire) {
    throw createError('Locataire non trouvé', 404);
  }

  // Calculer les statistiques
  let totalLoyers = 0;
  let totalPaye = 0;
  let nombreContrats = locataire.contrats.length;
  let contratsActifs = 0;

  locataire.contrats.forEach(cl => {
    if (cl.contrat.statut === 'ACTIF') {
      contratsActifs++;
    }
    
    cl.contrat.loyers.forEach(loyer => {
      totalLoyers += loyer.montantDu;
      totalPaye += loyer.montantPaye;
    });
  });

  const stats = {
    nombreContrats,
    contratsActifs,
    totalLoyers,
    totalPaye,
    soldeRestant: totalLoyers - totalPaye,
  };

  const result = {
    ...locataire,
    stats,
  };

  res.json({
    success: true,
    data: result,
  });
}));

// @route   POST /api/locataires
// @desc    Create locataire
// @access  Private
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = locataireSchema.parse(req.body);

  // Vérifier que l'email n'existe pas déjà
  const existing = await prisma.locataire.findFirst({
    where: { email: validatedData.email },
  });

  if (existing) {
    throw createError('Un locataire avec cet email existe déjà', 400);
  }

  const locataire = await prisma.locataire.create({
    data: {
      ...validatedData,
      documents: null,
    },
    include: {
      _count: {
        select: {
          contrats: true,
          garants: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    data: locataire,
    message: 'Locataire créé avec succès',
  });
}));

// @route   PUT /api/locataires/:id
// @desc    Update locataire
// @access  Private
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = locataireSchema.partial().parse(req.body);

  // Vérifier que le locataire existe
  const existing = await prisma.locataire.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw createError('Locataire non trouvé', 404);
  }

  // Vérifier que l'email n'est pas déjà utilisé par un autre locataire
  if (validatedData.email) {
    const emailExists = await prisma.locataire.findFirst({
      where: {
        email: validatedData.email,
        id: { not: req.params.id },
      },
    });

    if (emailExists) {
      throw createError('Un locataire avec cet email existe déjà', 400);
    }
  }

  const locataire = await prisma.locataire.update({
    where: { id: req.params.id },
    data: validatedData,
    include: {
      _count: {
        select: {
          contrats: true,
          garants: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: locataire,
    message: 'Locataire mis à jour avec succès',
  });
}));

// @route   DELETE /api/locataires/:id
// @desc    Delete locataire
// @access  Private
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Vérifier que le locataire existe
  const existing = await prisma.locataire.findUnique({
    where: { id: req.params.id },
    include: {
      _count: {
        select: {
          contrats: true,
        },
      },
    },
  });

  if (!existing) {
    throw createError('Locataire non trouvé', 404);
  }

  // Vérifier qu'il n'y a pas de contrats actifs
  const contratsActifs = await prisma.contrat.count({
    where: {
      locataires: {
        some: {
          locataireId: req.params.id,
        },
      },
      statut: 'ACTIF',
    },
  });

  if (contratsActifs > 0) {
    throw createError('Impossible de supprimer un locataire ayant des contrats actifs', 400);
  }

  await prisma.locataire.delete({
    where: { id: req.params.id },
  });

  res.json({
    success: true,
    message: 'Locataire supprimé avec succès',
  });
}));

// @route   GET /api/locataires/:id/stats
// @desc    Get locataire statistics
// @access  Private
router.get('/:id/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const locataire = await prisma.locataire.findUnique({
    where: { id: req.params.id },
  });

  if (!locataire) {
    throw createError('Locataire non trouvé', 404);
  }

  const currentYear = new Date().getFullYear();

  // Calculer les statistiques
  const [
    totalLoyers,
    loyersEnRetard,
    contratsActifs,
    moyennePaiement,
  ] = await Promise.all([
    // Total loyers payés cette année
    prisma.loyer.aggregate({
      where: {
        contrat: {
          locataires: {
            some: {
              locataireId: req.params.id,
            },
          },
        },
        annee: currentYear,
        statut: 'PAYE',
      },
      _sum: {
        montantPaye: true,
      },
    }),
    
    // Loyers en retard
    prisma.loyer.count({
      where: {
        contrat: {
          locataires: {
            some: {
              locataireId: req.params.id,
            },
          },
        },
        statut: 'RETARD',
      },
    }),

    // Contrats actifs
    prisma.contrat.count({
      where: {
        locataires: {
          some: {
            locataireId: req.params.id,
          },
        },
        statut: 'ACTIF',
      },
    }),

    // Moyenne des paiements
    prisma.loyer.aggregate({
      where: {
        contrat: {
          locataires: {
            some: {
              locataireId: req.params.id,
            },
          },
        },
        annee: currentYear,
      },
      _avg: {
        montantPaye: true,
      },
    }),
  ]);

  const stats = {
    totalLoyersPayes: totalLoyers._sum.montantPaye || 0,
    loyersEnRetard,
    contratsActifs,
    moyennePaiement: moyennePaiement._avg.montantPaye || 0,
    anciennete: locataire.createdAt,
  };

  res.json({
    success: true,
    data: stats,
  });
}));

// @route   PUT /api/locataires/:id/documents
// @desc    Update locataire documents
// @access  Private
router.put('/:id/documents', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const documentsSchema = z.object({
    documents: z.array(z.string().url()).max(20, 'Maximum 20 documents autorisés'),
  });

  const { documents } = documentsSchema.parse(req.body);

  const locataire = await prisma.locataire.update({
    where: { id: req.params.id },
    data: { documents: JSON.stringify(documents) },
  });

  res.json({
    success: true,
    data: locataire,
    message: 'Documents mis à jour avec succès',
  });
}));

export default router;