import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../server.js';

const router = express.Router();

// Configuration multer pour l'upload de factures
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'factures');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `facture-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Types MIME autorisés
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    // Extensions autorisées
    const allowedExtensions = /\.(jpeg|jpg|png|gif|webp|pdf|doc|docx)$/i;
    const hasValidExtension = allowedExtensions.test(file.originalname);
    const hasValidMimeType = allowedMimeTypes.includes(file.mimetype);

    console.log('📄 Validation fichier:', {
      filename: file.originalname,
      mimetype: file.mimetype,
      hasValidExtension,
      hasValidMimeType
    });

    if (hasValidExtension && hasValidMimeType) {
      return cb(null, true);
    } else {
      const error = new Error(`Type de fichier non supporté: ${file.mimetype} (${file.originalname})`);
      console.error('❌ Fichier rejeté:', error.message);
      cb(error);
    }
  }
});

// @route   GET /api/charges
// @desc    Récupérer toutes les charges avec filtres
// @access  Private
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { 
    page = '1', 
    limit = '20', 
    bienId, 
    categorie, 
    type,
    payee,
    dateDebut,
    dateFin,
    annee,
    search
  } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (bienId) {
    where.bienId = bienId;
  }

  if (categorie) {
    where.categorie = categorie;
  }

  if (type) {
    where.type = type;
  }

  if (payee !== undefined) {
    where.payee = payee === 'true';
  }

  if (dateDebut || dateFin) {
    where.date = {};
    if (dateDebut) {
      where.date.gte = new Date(dateDebut as string);
    }
    if (dateFin) {
      where.date.lte = new Date(dateFin as string);
    }
  } else if (annee) {
    // Filtrer par année si pas de dates spécifiques
    const year = parseInt(annee as string);
    where.date = {
      gte: new Date(year, 0, 1),
      lt: new Date(year + 1, 0, 1),
    };
  }

  // Ajouter la recherche textuelle
  if (search) {
    where.OR = [
      { description: { contains: search as string, mode: 'insensitive' } },
      { commentaires: { contains: search as string, mode: 'insensitive' } },
      { 
        bien: {
          OR: [
            { adresse: { contains: search as string, mode: 'insensitive' } },
            { ville: { contains: search as string, mode: 'insensitive' } },
            { codePostal: { contains: search as string, mode: 'insensitive' } },
          ]
        }
      }
    ];
  }

  const [charges, total] = await Promise.all([
    prisma.charge.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        bien: {
          select: {
            id: true,
            adresse: true,
            ville: true,
            codePostal: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    }),
    prisma.charge.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      charges,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
}));

// Fonction pour calculer les occurrences de charges récurrentes
function generateRecurringCharges(charge: any, year: number) {
  if (charge.type === 'PONCTUELLE') return [];
  
  const occurrences = [];
  const startDate = charge.dateDebut ? new Date(charge.dateDebut) : new Date(charge.date);
  const endDate = charge.dateFin ? new Date(charge.dateFin) : new Date(year, 11, 31); // Fin d'année si pas de fin
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  
  // Déterminer l'intervalle selon le type
  let intervalMonths = 0;
  switch (charge.type) {
    case 'MENSUELLE': intervalMonths = 1; break;
    case 'TRIMESTRIELLE': intervalMonths = 3; break;
    case 'SEMESTRIELLE': intervalMonths = 6; break;
    case 'ANNUELLE': intervalMonths = 12; break;
  }
  
  if (intervalMonths === 0) return [];
  
  // Générer les occurrences pour l'année demandée
  let currentDate = new Date(Math.max(startDate.getTime(), yearStart.getTime()));
  
  while (currentDate <= endDate && currentDate <= yearEnd) {
    if (currentDate >= yearStart) {
      occurrences.push({
        ...charge,
        date: new Date(currentDate),
        montantProjecte: charge.montant
      });
    }
    currentDate.setMonth(currentDate.getMonth() + intervalMonths);
  }
  
  return occurrences;
}

// @route   GET /api/charges/stats
// @desc    Récupérer les statistiques des charges (incluant les projections récurrentes)
// @access  Private
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { bienId, annee } = req.query;
  const year = annee ? parseInt(annee as string) : new Date().getFullYear();

  const where: any = {};
  if (bienId) {
    where.bienId = bienId;
  }
  
  // Récupérer les charges ponctuelles de l'année
  const whereYear = {
    ...where,
    date: {
      gte: new Date(year, 0, 1),
      lt: new Date(year + 1, 0, 1),
    }
  };
  
  // Récupérer aussi les charges récurrentes actives
  const whereRecurrent = {
    ...where,
    type: { not: 'PONCTUELLE' },
    OR: [
      { dateFin: null }, // Pas de date de fin
      { dateFin: { gte: new Date(year, 0, 1) } }, // Fin après le début de l'année
    ],
    AND: [
      {
        OR: [
          { dateDebut: null }, // Pas de date de début
          { dateDebut: { lte: new Date(year, 11, 31) } }, // Début avant la fin de l'année
        ]
      }
    ]
  };

  const [
    chargesPonctuelles,
    chargesRecurrentes
  ] = await Promise.all([
    // Charges ponctuelles de l'année
    prisma.charge.findMany({
      where: { ...whereYear, type: 'PONCTUELLE' },
      select: {
        id: true,
        montant: true,
        date: true,
        categorie: true,
        payee: true,
        type: true,
      },
    }),
    
    // Charges récurrentes actives
    prisma.charge.findMany({
      where: whereRecurrent,
      select: {
        id: true,
        montant: true,
        date: true,
        categorie: true,
        payee: true,
        type: true,
        dateDebut: true,
        dateFin: true,
      },
    })
  ]);

  // Générer les occurrences des charges récurrentes pour l'année
  const chargesRecurrentesProjectees = chargesRecurrentes.flatMap(charge => 
    generateRecurringCharges(charge, year)
  );

  // Combiner toutes les charges (ponctuelles + récurrentes projetées)
  const toutesLesCharges = [
    ...chargesPonctuelles,
    ...chargesRecurrentesProjectees
  ];

  // Calculer les statistiques à partir des charges combinées
  const totalMontant = toutesLesCharges.reduce((sum, charge) => sum + charge.montant, 0);
  const totalNombre = toutesLesCharges.length;
  
  const chargesPayeesFiltrees = toutesLesCharges.filter(charge => charge.payee);
  const chargesNonPayeesFiltrees = toutesLesCharges.filter(charge => !charge.payee);
  
  const montantPayees = chargesPayeesFiltrees.reduce((sum, charge) => sum + charge.montant, 0);
  const montantNonPayees = chargesNonPayeesFiltrees.reduce((sum, charge) => sum + charge.montant, 0);

  // Grouper par catégorie
  const groupedByCategory: { [key: string]: { montant: number; nombre: number } } = {};
  toutesLesCharges.forEach(charge => {
    if (!groupedByCategory[charge.categorie]) {
      groupedByCategory[charge.categorie] = { montant: 0, nombre: 0 };
    }
    groupedByCategory[charge.categorie].montant += charge.montant;
    groupedByCategory[charge.categorie].nombre += 1;
  });

  // Grouper par mois
  const groupedByMonth: { [key: string]: { total: number; nombre: number } } = {};
  toutesLesCharges.forEach(charge => {
    const date = new Date(charge.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!groupedByMonth[monthKey]) {
      groupedByMonth[monthKey] = { total: 0, nombre: 0 };
    }
    
    groupedByMonth[monthKey].total += charge.montant;
    groupedByMonth[monthKey].nombre += 1;
  });

  const stats = {
    total: {
      montant: totalMontant,
      nombre: totalNombre,
    },
    payees: {
      montant: montantPayees,
      nombre: chargesPayeesFiltrees.length,
    },
    nonPayees: {
      montant: montantNonPayees,
      nombre: chargesNonPayeesFiltrees.length,
    },
    parCategorie: Object.keys(groupedByCategory).map(categorie => ({
      categorie,
      montant: groupedByCategory[categorie].montant,
      nombre: groupedByCategory[categorie].nombre,
    })),
    parMois: Object.keys(groupedByMonth).map(mois => ({
      mois,
      total: groupedByMonth[mois].total,
      nombre: groupedByMonth[mois].nombre,
    })),
  };

  res.json({
    success: true,
    data: stats,
  });
}));

// @route   GET /api/charges/financial-table
// @desc    Récupérer les charges pour le tableau financier (incluant récurrentes projetées)
// @access  Private
router.get('/financial-table', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { bienId, annee } = req.query;
  const year = annee ? parseInt(annee as string) : new Date().getFullYear();

  const where: any = {};
  if (bienId) {
    where.bienId = bienId;
  }
  
  // Récupérer les charges ponctuelles de l'année
  const whereYear = {
    ...where,
    date: {
      gte: new Date(year, 0, 1),
      lt: new Date(year + 1, 0, 1),
    }
  };
  
  // Récupérer aussi les charges récurrentes actives
  const whereRecurrent = {
    ...where,
    type: { not: 'PONCTUELLE' },
    OR: [
      { dateFin: null },
      { dateFin: { gte: new Date(year, 0, 1) } },
    ],
    AND: [
      {
        OR: [
          { dateDebut: null },
          { dateDebut: { lte: new Date(year, 11, 31) } },
        ]
      }
    ]
  };

  const [chargesPonctuelles, chargesRecurrentes] = await Promise.all([
    prisma.charge.findMany({
      where: { ...whereYear, type: 'PONCTUELLE' },
      select: {
        id: true,
        bienId: true,
        montant: true,
        date: true,
        categorie: true,
        type: true,
      },
    }),
    
    prisma.charge.findMany({
      where: whereRecurrent,
      select: {
        id: true,
        bienId: true,
        montant: true,
        date: true,
        categorie: true,
        type: true,
        dateDebut: true,
        dateFin: true,
      },
    })
  ]);

  // Générer les occurrences des charges récurrentes pour l'année
  const chargesRecurrentesProjectees = chargesRecurrentes.flatMap(charge => 
    generateRecurringCharges(charge, year)
  );

  // Combiner toutes les charges
  const toutesLesCharges = [
    ...chargesPonctuelles,
    ...chargesRecurrentesProjectees
  ];

  res.json({
    success: true,
    data: {
      charges: toutesLesCharges
    },
  });
}));

// @route   GET /api/charges/:id
// @desc    Récupérer une charge spécifique
// @access  Private
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const chargeId = req.params.id;

  const charge = await prisma.charge.findUnique({
    where: { id: chargeId },
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
                },
              },
            },
          },
        },
      },
    },
  });

  if (!charge) {
    throw createError('Charge non trouvée', 404);
  }

  res.json({
    success: true,
    data: charge,
  });
}));

// @route   POST /api/charges
// @desc    Créer une nouvelle charge
// @access  Private
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const {
    bienId,
    categorie,
    description,
    montant,
    date,
    type,
    frequence,
    dateDebut,
    dateFin,
    facture,
    payee,
    commentaires,
  } = req.body;

  // Validations
  if (!bienId) {
    throw createError('Le bien est requis', 400);
  }
  if (!categorie) {
    throw createError('La catégorie est requise', 400);
  }
  if (!description) {
    throw createError('La description est requise', 400);
  }
  if (!montant || montant <= 0) {
    throw createError('Le montant doit être positif', 400);
  }
  if (!date) {
    throw createError('La date est requise', 400);
  }

  // Vérifier que le bien existe
  const bien = await prisma.bien.findUnique({
    where: { id: bienId },
  });

  if (!bien) {
    throw createError('Bien non trouvé', 404);
  }

  const charge = await prisma.charge.create({
    data: {
      bienId,
      categorie,
      description,
      montant: parseFloat(montant),
      date: new Date(date),
      type: type || 'PONCTUELLE',
      frequence,
      dateDebut: dateDebut ? new Date(dateDebut) : null,
      dateFin: dateFin ? new Date(dateFin) : null,
      facture,
      payee: payee || false,
      commentaires,
    },
    include: {
      bien: {
        select: {
          id: true,
          adresse: true,
          ville: true,
          codePostal: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Charge créée avec succès',
    data: charge,
  });
}));

// @route   PUT /api/charges/:id
// @desc    Mettre à jour une charge
// @access  Private
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const chargeId = req.params.id;
  const {
    bienId,
    categorie,
    description,
    montant,
    date,
    type,
    frequence,
    dateDebut,
    dateFin,
    facture,
    payee,
    commentaires,
  } = req.body;

  // Vérifier que la charge existe
  const existingCharge = await prisma.charge.findUnique({
    where: { id: chargeId },
  });

  if (!existingCharge) {
    throw createError('Charge non trouvée', 404);
  }

  // Si le bienId est modifié, vérifier qu'il existe
  if (bienId && bienId !== existingCharge.bienId) {
    const bien = await prisma.bien.findUnique({
      where: { id: bienId },
    });

    if (!bien) {
      throw createError('Bien non trouvé', 404);
    }
  }

  const updatedData: any = {};
  
  if (bienId !== undefined) updatedData.bienId = bienId;
  if (categorie !== undefined) updatedData.categorie = categorie;
  if (description !== undefined) updatedData.description = description;
  if (montant !== undefined) updatedData.montant = parseFloat(montant);
  if (date !== undefined) updatedData.date = new Date(date);
  if (type !== undefined) updatedData.type = type;
  if (frequence !== undefined) updatedData.frequence = frequence;
  if (dateDebut !== undefined) updatedData.dateDebut = dateDebut ? new Date(dateDebut) : null;
  if (dateFin !== undefined) updatedData.dateFin = dateFin ? new Date(dateFin) : null;
  if (facture !== undefined) updatedData.facture = facture;
  if (payee !== undefined) updatedData.payee = payee;
  if (commentaires !== undefined) updatedData.commentaires = commentaires;

  const charge = await prisma.charge.update({
    where: { id: chargeId },
    data: updatedData,
    include: {
      bien: {
        select: {
          id: true,
          adresse: true,
          ville: true,
          codePostal: true,
        },
      },
    },
  });

  res.json({
    success: true,
    message: 'Charge mise à jour avec succès',
    data: charge,
  });
}));

// @route   DELETE /api/charges/:id
// @desc    Supprimer une charge
// @access  Private
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const chargeId = req.params.id;

  const charge = await prisma.charge.findUnique({
    where: { id: chargeId },
  });

  if (!charge) {
    throw createError('Charge non trouvée', 404);
  }

  await prisma.charge.delete({
    where: { id: chargeId },
  });

  res.json({
    success: true,
    message: 'Charge supprimée avec succès',
  });
}));

// @route   GET /api/charges/stats/summary
// @desc    Récupérer les statistiques des charges (version détaillée)
// @access  Private
router.get('/stats/summary', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { bienId, annee } = req.query;
  console.log('📊 Stats Summary - Params:', { bienId, annee });

  try {
    const where: any = {};
    if (bienId) {
      where.bienId = bienId;
    }
    if (annee) {
      const year = parseInt(annee as string);
      where.date = {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      };
    }
    console.log('📊 Stats Summary - Where clause:', where);

  const [
    totalCharges,
    chargesPayees,
    chargesNonPayees,
    chargesParCategorie,
    chargesParMois
  ] = await Promise.all([
    // Total des charges
    prisma.charge.aggregate({
      where,
      _sum: { montant: true },
      _count: true,
    }),
    
    // Charges payées
    prisma.charge.aggregate({
      where: { ...where, payee: true },
      _sum: { montant: true },
      _count: true,
    }),
    
    // Charges non payées
    prisma.charge.aggregate({
      where: { ...where, payee: false },
      _sum: { montant: true },
      _count: true,
    }),
    
    // Charges par catégorie
    prisma.charge.groupBy({
      by: ['categorie'],
      where,
      _sum: { montant: true },
      _count: true,
    }),
    
    // Charges par mois (si année spécifiée) - Version corrigée
    annee ? (async () => {
      try {
        if (bienId) {
          return await prisma.$queryRaw`
            SELECT 
              EXTRACT(MONTH FROM date)::text as mois,
              SUM(montant) as total,
              COUNT(*) as nombre
            FROM "charges" 
            WHERE "bienId" = ${bienId} AND EXTRACT(YEAR FROM date) = ${parseInt(annee as string)}
            GROUP BY EXTRACT(MONTH FROM date)
            ORDER BY mois
          `;
        } else {
          return await prisma.$queryRaw`
            SELECT 
              EXTRACT(MONTH FROM date)::text as mois,
              SUM(montant) as total,
              COUNT(*) as nombre
            FROM "charges" 
            WHERE EXTRACT(YEAR FROM date) = ${parseInt(annee as string)}
            GROUP BY EXTRACT(MONTH FROM date)
            ORDER BY mois
          `;
        }
      } catch (error) {
        console.error('Erreur requête charges par mois:', error);
        return [];
      }
    })() : Promise.resolve([])
  ]);

  console.log('📊 Stats Summary - Results:', {
    totalCharges: totalCharges?._sum?.montant,
    chargesPayees: chargesPayees?._sum?.montant,
    chargesNonPayees: chargesNonPayees?._sum?.montant,
    chargesParCategorie: chargesParCategorie?.length,
    chargesParMois: chargesParMois?.length
  });

    res.json({
      success: true,
      data: {
        total: {
          montant: totalCharges?._sum?.montant || 0,
          nombre: totalCharges?._count || 0,
        },
        payees: {
          montant: chargesPayees?._sum?.montant || 0,
          nombre: chargesPayees?._count || 0,
        },
        nonPayees: {
          montant: chargesNonPayees?._sum?.montant || 0,
          nombre: chargesNonPayees?._count || 0,
        },
        parCategorie: chargesParCategorie?.map(cat => ({
          categorie: cat.categorie,
          montant: cat._sum?.montant || 0,
          nombre: cat._count || 0,
        })) || [],
        parMois: chargesParMois || [],
      },
    });
  } catch (error) {
    console.error('❌ Erreur Stats Summary:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur lors du calcul des statistiques'
      }
    });
  }
}));

// @route   POST /api/charges/:id/toggle-payee
// @desc    Basculer le statut payé/non payé d'une charge
// @access  Private
router.post('/:id/toggle-payee', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const chargeId = req.params.id;

  const charge = await prisma.charge.findUnique({
    where: { id: chargeId },
  });

  if (!charge) {
    throw createError('Charge non trouvée', 404);
  }

  const updatedCharge = await prisma.charge.update({
    where: { id: chargeId },
    data: { payee: !charge.payee },
    include: {
      bien: {
        select: {
          id: true,
          adresse: true,
          ville: true,
          codePostal: true,
        },
      },
    },
  });

  res.json({
    success: true,
    message: `Charge marquée comme ${updatedCharge.payee ? 'payée' : 'non payée'}`,
    data: updatedCharge,
  });
}));

// @route   POST /api/charges/upload-facture
// @desc    Upload d'une facture
// @access  Private
router.post('/upload-facture', upload.single('facture'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    throw createError('Aucun fichier téléchargé', 400);
  }

  const fileName = req.file.filename;
  const filePath = req.file.path;

  console.log('📄 Facture uploadée:', {
    filename: fileName,
    originalname: req.file.originalname,
    size: req.file.size,
    path: filePath
  });

  res.json({
    success: true,
    message: 'Facture uploadée avec succès',
    data: {
      filename: fileName,
      originalname: req.file.originalname,
      size: req.file.size,
      url: `/uploads/factures/${fileName}`
    }
  });
}));

export default router;