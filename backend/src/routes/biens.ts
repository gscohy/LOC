import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();

const router = express.Router();

// Validation schema
const bienSchema = z.object({
  adresse: z.string().min(1, 'L\'adresse est requise'),
  ville: z.string().min(1, 'La ville est requise'),
  codePostal: z.string().min(1, 'Le code postal est requis'),
  type: z.enum(['APPARTEMENT', 'MAISON', 'STUDIO', 'LOCAL', 'GARAGE']).default('APPARTEMENT'),
  surface: z.number().positive('La surface doit être positive'),
  nbPieces: z.number().int().positive().default(1),
  nbChambres: z.number().int().min(0).default(0),
  loyer: z.number().min(0, 'Le loyer ne peut pas être négatif'),
  chargesMensuelles: z.number().min(0).default(0),
  depotGarantie: z.number().min(0).default(0),
  description: z.string().optional(),
  proprietaires: z.array(z.object({
    id: z.string(),
    quotePart: z.number().min(0).max(100).default(100),
  })).min(1, 'Au moins un propriétaire est requis'),
});

// @route   GET /api/biens
// @desc    Get all biens
// @access  Private
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = '1', limit = '10', search, type, statut } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (search) {
    where.OR = [
      { adresse: { contains: search as string } },
      { ville: { contains: search as string } },
      { codePostal: { contains: search as string } },
    ];
  }

  if (type) {
    where.type = type;
  }

  if (statut) {
    where.statut = statut;
  }

  const [biens, total] = await Promise.all([
    prisma.bien.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        proprietaires: {
          include: {
            proprietaire: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                email: true,
              },
            },
          },
        },
        contrats: {
          where: {
            statut: 'ACTIF',
          },
          include: {
            locataires: {
              include: {
                locataire: {
                  select: {
                    nom: true,
                    prenom: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            contrats: true,
            charges: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.bien.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      biens,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
}));

// @route   GET /api/biens/:id
// @desc    Get single bien
// @access  Private
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const bien = await prisma.bien.findUnique({
    where: { id: req.params.id },
    include: {
      proprietaires: {
        include: {
          proprietaire: true,
        },
      },
      contrats: {
        include: {
          locataires: {
            include: {
              locataire: true,
            },
          },
          loyers: {
            orderBy: { createdAt: 'desc' },
            take: 12,
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      charges: {
        orderBy: { date: 'desc' },
        take: 20,
      },
      lots: true,
    },
  });

  if (!bien) {
    throw createError('Bien non trouvé', 404);
  }

  res.json({
    success: true,
    data: bien,
  });
}));

// @route   POST /api/biens
// @desc    Create bien
// @access  Private
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = bienSchema.parse(req.body);
  const { proprietaires, ...bienData } = validatedData;

  // Verify all proprietaires exist
  const proprietaireIds = proprietaires.map(p => p.id);
  const existingProprietaires = await prisma.proprietaire.findMany({
    where: { id: { in: proprietaireIds } },
  });

  if (existingProprietaires.length !== proprietaireIds.length) {
    throw createError('Un ou plusieurs propriétaires n\'existent pas', 400);
  }

  // Validate quote parts sum to 100
  const totalQuotePart = proprietaires.reduce((sum, p) => sum + p.quotePart, 0);
  if (Math.abs(totalQuotePart - 100) > 0.01) {
    throw createError('La somme des quotes-parts doit être égale à 100%', 400);
  }

  const bien = await prisma.bien.create({
    data: {
      ...bienData,
      proprietaires: {
        create: proprietaires.map(p => ({
          proprietaireId: p.id,
          quotePart: p.quotePart,
        })),
      },
    },
    include: {
      proprietaires: {
        include: {
          proprietaire: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    data: bien,
    message: 'Bien créé avec succès',
  });
}));

// @route   PUT /api/biens/:id
// @desc    Update bien
// @access  Private
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const updateSchema = bienSchema.partial();
  const validatedData = updateSchema.parse(req.body);

  // Check if bien exists
  const existing = await prisma.bien.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw createError('Bien non trouvé', 404);
  }

  const { proprietaires, ...bienData } = validatedData;

  // Handle proprietaires update if provided
  if (proprietaires) {
    // Verify all proprietaires exist
    const proprietaireIds = proprietaires.map(p => p.id);
    const existingProprietaires = await prisma.proprietaire.findMany({
      where: { id: { in: proprietaireIds } },
    });

    if (existingProprietaires.length !== proprietaireIds.length) {
      throw createError('Un ou plusieurs propriétaires n\'existent pas', 400);
    }

    // Validate quote parts sum to 100
    const totalQuotePart = proprietaires.reduce((sum, p) => sum + p.quotePart, 0);
    if (Math.abs(totalQuotePart - 100) > 0.01) {
      throw createError('La somme des quotes-parts doit être égale à 100%', 400);
    }

    // Update with transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing proprietaires relationships
      await tx.bienProprietaire.deleteMany({
        where: { bienId: req.params.id },
      });

      // Create new relationships
      await tx.bienProprietaire.createMany({
        data: proprietaires.map(p => ({
          bienId: req.params.id,
          proprietaireId: p.id,
          quotePart: p.quotePart,
        })),
      });

      // Update bien data
      if (Object.keys(bienData).length > 0) {
        await tx.bien.update({
          where: { id: req.params.id },
          data: bienData,
        });
      }
    });
  } else if (Object.keys(bienData).length > 0) {
    // Update only bien data
    await prisma.bien.update({
      where: { id: req.params.id },
      data: bienData,
    });
  }

  // Fetch updated bien
  const bien = await prisma.bien.findUnique({
    where: { id: req.params.id },
    include: {
      proprietaires: {
        include: {
          proprietaire: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: bien,
    message: 'Bien mis à jour avec succès',
  });
}));

// @route   DELETE /api/biens/:id
// @desc    Delete bien
// @access  Private
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Check if bien exists
  const existing = await prisma.bien.findUnique({
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
    throw createError('Bien non trouvé', 404);
  }

  // Check if bien has associated contrats
  if (existing._count.contrats > 0) {
    throw createError('Impossible de supprimer un bien ayant des contrats associés', 400);
  }

  await prisma.bien.delete({
    where: { id: req.params.id },
  });

  res.json({
    success: true,
    message: 'Bien supprimé avec succès',
  });
}));

// @route   GET /api/biens/:id/stats
// @desc    Get bien statistics
// @access  Private
router.get('/:id/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const bien = await prisma.bien.findUnique({
    where: { id: req.params.id },
  });

  if (!bien) {
    throw createError('Bien non trouvé', 404);
  }

  const currentYear = new Date().getFullYear();

  // Get stats
  const [
    totalLoyers,
    totalCharges,
    loyersEnRetard,
    contratActif,
    moyenneLoyerMensuel,
  ] = await Promise.all([
    // Total loyers encaissés cette année
    prisma.loyer.aggregate({
      where: {
        contrat: { bienId: req.params.id },
        annee: currentYear,
      },
      _sum: { montantPaye: true },
    }),
    
    // Total charges cette année
    prisma.charge.aggregate({
      where: {
        bienId: req.params.id,
        date: {
          gte: new Date(currentYear, 0, 1),
          lt: new Date(currentYear + 1, 0, 1),
        },
      },
      _sum: { montant: true },
    }),
    
    // Loyers en retard
    prisma.loyer.count({
      where: {
        contrat: { bienId: req.params.id },
        statut: 'RETARD',
      },
    }),
    
    // Contrat actif
    prisma.contrat.findFirst({
      where: {
        bienId: req.params.id,
        statut: 'ACTIF',
      },
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
    
    // Moyenne des loyers mensuels sur 12 mois
    prisma.loyer.aggregate({
      where: {
        contrat: { bienId: req.params.id },
        annee: currentYear,
      },
      _avg: { montantPaye: true },
    }),
  ]);

  const stats = {
    revenusAnnee: totalLoyers._sum.montantPaye || 0,
    chargesAnnee: totalCharges._sum.montant || 0,
    beneficeAnnee: (totalLoyers._sum.montantPaye || 0) - (totalCharges._sum.montant || 0),
    loyersEnRetard,
    contratActif,
    moyenneLoyerMensuel: moyenneLoyerMensuel._avg.montantPaye || 0,
    tauxOccupation: contratActif ? 100 : 0,
  };

  res.json({
    success: true,
    data: stats,
  });
}));

// @route   PUT /api/biens/:id/photos
// @desc    Update bien photos
// @access  Private
router.put('/:id/photos', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const photosSchema = z.object({
    photos: z.array(z.string().url()).max(10, 'Maximum 10 photos autorisées'),
  });

  const { photos } = photosSchema.parse(req.body);

  const bien = await prisma.bien.update({
    where: { id: req.params.id },
    data: { photos: JSON.stringify(photos) },
  });

  res.json({
    success: true,
    data: bien,
    message: 'Photos mises à jour avec succès',
  });
}));

// @route   PUT /api/biens/:id/documents
// @desc    Update bien documents
// @access  Private
router.put('/:id/documents', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const documentsSchema = z.object({
    documents: z.array(z.string().url()).max(20, 'Maximum 20 documents autorisés'),
  });

  const { documents } = documentsSchema.parse(req.body);

  const bien = await prisma.bien.update({
    where: { id: req.params.id },
    data: { documents: JSON.stringify(documents) },
  });

  res.json({
    success: true,
    data: bien,
    message: 'Documents mis à jour avec succès',
  });
}));

export default router;