import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

const router = express.Router();

// Configuration multer pour l'upload de signatures
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'signatures');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `signature-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Accepter seulement les images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  }
});

// Validation schema
const proprietaireSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  codePostal: z.string().optional(),
  signature: z.string().optional(),
});

// @route   GET /api/proprietaires
// @desc    Get all proprietaires
// @access  Private
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = '1', limit = '10', search } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where = search
    ? {
        OR: [
          { nom: { contains: search as string, mode: 'insensitive' as const } },
          { prenom: { contains: search as string, mode: 'insensitive' as const } },
          { email: { contains: search as string, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [proprietaires, total] = await Promise.all([
    prisma.proprietaire.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        biens: {
          include: {
            bien: {
              select: {
                id: true,
                adresse: true,
                ville: true,
                loyer: true,
              },
            },
          },
        },
        _count: {
          select: {
            biens: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.proprietaire.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      proprietaires,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
}));

// @route   GET /api/proprietaires/:id
// @desc    Get single proprietaire
// @access  Private
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const proprietaire = await prisma.proprietaire.findUnique({
    where: { id: req.params.id },
    include: {
      biens: {
        include: {
          bien: {
            include: {
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
            },
          },
        },
      },
    },
  });

  if (!proprietaire) {
    throw createError('Propriétaire non trouvé', 404);
  }

  res.json({
    success: true,
    data: proprietaire,
  });
}));

// @route   POST /api/proprietaires
// @desc    Create proprietaire
// @access  Private
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = proprietaireSchema.parse(req.body);

  // Check if email already exists
  const existing = await prisma.proprietaire.findFirst({
    where: { email: validatedData.email },
  });

  if (existing) {
    throw createError('Un propriétaire avec cet email existe déjà', 400);
  }

  const proprietaire = await prisma.proprietaire.create({
    data: validatedData,
    include: {
      _count: {
        select: {
          biens: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    data: proprietaire,
    message: 'Propriétaire créé avec succès',
  });
}));

// @route   PUT /api/proprietaires/:id
// @desc    Update proprietaire
// @access  Private
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = proprietaireSchema.partial().parse(req.body);

  // Check if proprietaire exists
  const existing = await prisma.proprietaire.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw createError('Propriétaire non trouvé', 404);
  }

  // Check if email already exists for another proprietaire
  if (validatedData.email) {
    const emailExists = await prisma.proprietaire.findFirst({
      where: {
        email: validatedData.email,
        id: { not: req.params.id },
      },
    });

    if (emailExists) {
      throw createError('Un propriétaire avec cet email existe déjà', 400);
    }
  }

  const proprietaire = await prisma.proprietaire.update({
    where: { id: req.params.id },
    data: validatedData,
    include: {
      _count: {
        select: {
          biens: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: proprietaire,
    message: 'Propriétaire mis à jour avec succès',
  });
}));

// @route   POST /api/proprietaires/:id/signature
// @desc    Upload signature for proprietaire
// @access  Private
router.post('/:id/signature', upload.single('signature'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const proprietaireId = req.params.id;

  console.log(`📝 Upload signature pour propriétaire ${proprietaireId}`);

  // Vérifier que le propriétaire existe
  const proprietaire = await prisma.proprietaire.findUnique({
    where: { id: proprietaireId },
  });

  if (!proprietaire) {
    // Supprimer le fichier uploadé si le propriétaire n'existe pas
    if (req.file) {
      console.log(`❌ Propriétaire non trouvé, suppression du fichier ${req.file.path}`);
      fs.unlinkSync(req.file.path);
    }
    throw createError('Propriétaire non trouvé', 404);
  }

  if (!req.file) {
    throw createError('Aucun fichier de signature fourni', 400);
  }

  console.log(`📁 Nouveau fichier uploadé: ${req.file.path}`);
  console.log(`📁 Ancienne signature en base: ${proprietaire.signature}`);

  // Supprimer l'ancienne signature si elle existe ET qu'elle est différente du nouveau fichier
  if (proprietaire.signature && proprietaire.signature !== req.file.path && fs.existsSync(proprietaire.signature)) {
    try {
      console.log(`🗑️ Suppression de l'ancienne signature: ${proprietaire.signature}`);
      fs.unlinkSync(proprietaire.signature);
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'ancienne signature:', error);
    }
  }

  // Mettre à jour le propriétaire avec le nouveau chemin de signature
  const updatedProprietaire = await prisma.proprietaire.update({
    where: { id: proprietaireId },
    data: {
      signature: req.file.path,
    },
  });

  console.log(`✅ Signature mise à jour pour ${proprietaire.prenom} ${proprietaire.nom}`);

  res.json({
    success: true,
    message: 'Signature uploadée avec succès',
    data: {
      signature: req.file.path,
      filename: req.file.filename,
    },
  });
}));

// @route   DELETE /api/proprietaires/:id/signature
// @desc    Delete signature for proprietaire
// @access  Private
router.delete('/:id/signature', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const proprietaireId = req.params.id;

  const proprietaire = await prisma.proprietaire.findUnique({
    where: { id: proprietaireId },
  });

  if (!proprietaire) {
    throw createError('Propriétaire non trouvé', 404);
  }

  // Supprimer le fichier de signature
  if (proprietaire.signature && fs.existsSync(proprietaire.signature)) {
    try {
      fs.unlinkSync(proprietaire.signature);
    } catch (error) {
      console.error('Erreur lors de la suppression de la signature:', error);
    }
  }

  // Mettre à jour le propriétaire
  await prisma.proprietaire.update({
    where: { id: proprietaireId },
    data: {
      signature: null,
    },
  });

  res.json({
    success: true,
    message: 'Signature supprimée avec succès',
  });
}));

// @route   DELETE /api/proprietaires/:id
// @desc    Delete proprietaire
// @access  Private
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Check if proprietaire exists
  const existing = await prisma.proprietaire.findUnique({
    where: { id: req.params.id },
    include: {
      _count: {
        select: {
          biens: true,
        },
      },
    },
  });

  if (!existing) {
    throw createError('Propriétaire non trouvé', 404);
  }

  // Check if proprietaire has associated biens
  if (existing._count.biens > 0) {
    throw createError('Impossible de supprimer un propriétaire ayant des biens associés', 400);
  }

  await prisma.proprietaire.delete({
    where: { id: req.params.id },
  });

  res.json({
    success: true,
    message: 'Propriétaire supprimé avec succès',
  });
}));

// @route   GET /api/proprietaires/:id/stats
// @desc    Get proprietaire statistics
// @access  Private
router.get('/:id/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const proprietaire = await prisma.proprietaire.findUnique({
    where: { id: req.params.id },
  });

  if (!proprietaire) {
    throw createError('Propriétaire non trouvé', 404);
  }

  // Get stats
  const [
    totalBiens,
    biensLoues,
    totalLoyers,
    totalCharges,
  ] = await Promise.all([
    // Total biens
    prisma.bienProprietaire.count({
      where: { proprietaireId: req.params.id },
    }),
    
    // Biens loués
    prisma.bienProprietaire.count({
      where: {
        proprietaireId: req.params.id,
        bien: {
          statut: 'LOUE',
        },
      },
    }),
    
    // Total loyers encaissés cette année
    prisma.loyer.aggregate({
      where: {
        contrat: {
          bien: {
            proprietaires: {
              some: {
                proprietaireId: req.params.id,
              },
            },
          },
        },
        annee: new Date().getFullYear(),
      },
      _sum: {
        montantPaye: true,
      },
    }),
    
    // Total charges cette année
    prisma.charge.aggregate({
      where: {
        bien: {
          proprietaires: {
            some: {
              proprietaireId: req.params.id,
            },
          },
        },
        date: {
          gte: new Date(new Date().getFullYear(), 0, 1),
          lt: new Date(new Date().getFullYear() + 1, 0, 1),
        },
      },
      _sum: {
        montant: true,
      },
    }),
  ]);

  const stats = {
    totalBiens,
    biensLoues,
    biensVacants: totalBiens - biensLoues,
    tauxOccupation: totalBiens > 0 ? Math.round((biensLoues / totalBiens) * 100) : 0,
    revenusAnnee: totalLoyers._sum.montantPaye || 0,
    chargesAnnee: totalCharges._sum.montant || 0,
    beneficeAnnee: (totalLoyers._sum.montantPaye || 0) - (totalCharges._sum.montant || 0),
  };

  res.json({
    success: true,
    data: stats,
  });
}));

// @route   GET /api/proprietaires/:id/signature/view
// @desc    Serve signature image with proper headers
// @access  Private
router.get('/:id/signature/view', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const proprietaireId = req.params.id;

  const proprietaire = await prisma.proprietaire.findUnique({
    where: { id: proprietaireId },
    select: { signature: true }
  });

  if (!proprietaire || !proprietaire.signature) {
    throw createError('Signature non trouvée', 404);
  }

  if (!fs.existsSync(proprietaire.signature)) {
    throw createError('Fichier signature non trouvé', 404);
  }

  // Définir les en-têtes appropriés
  const ext = path.extname(proprietaire.signature).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24h
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Lire et envoyer le fichier
  const fileStream = fs.createReadStream(proprietaire.signature);
  fileStream.pipe(res);
}));

export default router;