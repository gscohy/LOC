import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import * as XLSX from 'xlsx';
import multer from 'multer';
import path from 'path';

const prisma = new PrismaClient();
const router = express.Router();

// Configuration multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    // Créer le dossier s'il n'existe pas
    import('fs').then(fs => {
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log('📁 Dossier uploads créé');
      }
    });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accepter seulement les fichiers Excel
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers Excel (.xlsx, .xls) sont autorisés'), false);
    }
  }
});

// Schémas de validation
const pretSchema = z.object({
  bienId: z.string().min(1, 'Le bien est requis'),
  nom: z.string().min(1, 'Le nom du prêt est requis'),
  banque: z.string().min(1, 'Le nom de la banque est requis'),
  numeroPret: z.string().optional(),
  montantEmprunte: z.number().positive('Le montant emprunté doit être positif'),
  tauxInteret: z.number().positive('Le taux d\'intérêt doit être positif'),
  dureeAnnees: z.number().int().positive('La durée doit être un nombre d\'années positif'),
  dateDebut: z.string().transform((str) => new Date(str)),
  dateFin: z.string().transform((str) => new Date(str)),
  mensualiteBase: z.number().positive('La mensualité de base doit être positive'),
  mensualiteAssurance: z.number().min(0, 'La mensualité d\'assurance doit être positive ou nulle').default(0),
  statut: z.enum(['ACTIF', 'SOLDE', 'SUSPENDU']).default('ACTIF'),
  commentaires: z.string().optional(),
});

// @route   GET /api/prets
// @desc    Get all loans
// @access  Private
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const {
    page = '1',
    limit = '10',
    statut,
    bienId,
    search,
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (statut && statut !== '') {
    where.statut = statut;
  }

  if (bienId && bienId !== '') {
    where.bienId = bienId;
  }

  if (search && search !== '') {
    where.OR = [
      { nom: { contains: search, mode: 'insensitive' } },
      { banque: { contains: search, mode: 'insensitive' } },
      { numeroPret: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [prets, total] = await Promise.all([
      prisma.pretImmobilier.findMany({
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
              proprietaires: {
                include: {
                  proprietaire: {
                    select: {
                      id: true,
                      nom: true,
                      prenom: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              echeances: true,
            },
          },
        },
        orderBy: {
          dateDebut: 'desc',
        },
      }),
      prisma.pretImmobilier.count({ where }),
    ]);

    const pages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: {
        prets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages,
        },
      },
    });
  } catch (error: any) {
    // If tables don't exist, return empty response
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      res.json({
        success: true,
        data: {
          prets: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            pages: 0,
          },
        },
        message: "Tables de prêts non créées - veuillez exécuter les CREATE TABLE manuellement"
      });
    } else {
      throw error;
    }
  }
}));

// @route   GET /api/prets/:id
// @desc    Get single loan with payment schedule
// @access  Private
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const pret = await prisma.pretImmobilier.findUnique({
      where: { id: req.params.id },
      include: {
        bien: {
          select: {
            id: true,
            adresse: true,
            ville: true,
            codePostal: true,
            proprietaires: {
              include: {
                proprietaire: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                  },
                },
              },
            },
          },
        },
        echeances: {
          orderBy: {
            rang: 'asc',
          },
        },
      },
    });

    if (!pret) {
      throw createError('Prêt non trouvé', 404);
    }

    res.json({
      success: true,
      data: pret,
    });
  } catch (error: any) {
    // If tables don't exist, return specific error
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      res.status(500).json({
        success: false,
        error: { 
          message: "Tables de prêts non créées - veuillez exécuter les CREATE TABLE manuellement" 
        },
        timestamp: new Date().toISOString()
      });
    } else {
      throw error;
    }
  }
}));

// @route   POST /api/prets
// @desc    Create new loan
// @access  Private
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const validatedData = pretSchema.parse(req.body);

    // Vérifier que le bien existe
    const bien = await prisma.bien.findUnique({
      where: { id: validatedData.bienId },
    });

    if (!bien) {
      throw createError('Bien non trouvé', 404);
    }

    const pret = await prisma.pretImmobilier.create({
      data: validatedData,
      include: {
        bien: {
          select: {
            adresse: true,
            ville: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: pret,
      message: 'Prêt créé avec succès',
    });
  } catch (error: any) {
    // If tables don't exist, return specific error
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      res.status(500).json({
        success: false,
        error: { 
          message: "Tables de prêts non créées - veuillez exécuter les CREATE TABLE manuellement" 
        },
        timestamp: new Date().toISOString()
      });
    } else {
      throw error;
    }
  }
}));

// @route   POST /api/prets/:id/upload-tableau
// @desc    Upload and parse Excel amortization schedule
// @access  Private
router.post('/:id/upload-tableau', upload.single('tableau'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  console.log('🔄 Upload tableau - Début:', {
    params: req.params,
    file: req.file ? { name: req.file.originalname, size: req.file.size } : 'No file'
  });

  if (!req.file) {
    throw createError('Fichier Excel requis', 400);
  }

  try {
    // Vérifier que le prêt existe
    const pret = await prisma.pretImmobilier.findUnique({
      where: { id: req.params.id },
    });

    if (!pret) {
      throw createError('Prêt non trouvé', 404);
    }

    // Lire le fichier Excel
    console.log('📄 Lecture du fichier Excel:', req.file.path);
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log('📊 Feuille Excel:', sheetName);
    
    // Convertir en JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log('📋 Données JSON extraites:', jsonData.length, 'lignes');
    
    // Parser les données selon le format fourni
    const echeances = [];
    
    for (let i = 1; i < jsonData.length; i++) { // Commencer à 1 pour ignorer l'en-tête
      const row = jsonData[i] as any[];
      
      // Ignorer les lignes vides
      if (!row || row.length === 0 || !row[0]) continue;
      
      try {
        console.log(`📊 Parsing ligne ${i}:`, row);
        
        const rang = parseInt(row[0]);
        const dateStr = row[1];
        const montantRecouvrer = parseFloat(row[2]);
        const capitalAmorti = parseFloat(row[3]);
        const partInterets = parseFloat(row[4]);
        const partAccessoires = parseFloat(row[5]);
        const capitalRestant = parseFloat(row[6]);
        
        console.log(`🔢 Données parsées ligne ${i}:`, {
          rang, dateStr, montantRecouvrer, capitalAmorti, 
          partInterets, partAccessoires, capitalRestant
        });
        
        // Valider les données
        if (isNaN(rang) || isNaN(montantRecouvrer) || isNaN(capitalAmorti) || 
            isNaN(partInterets) || isNaN(partAccessoires) || isNaN(capitalRestant)) {
          console.log(`⚠️ Ligne ${i} ignorée - données invalides`);
          continue; // Ignorer les lignes avec des données invalides
        }
        
        // Parser la date (format DD/MM/YYYY)
        let dateEcheance: Date;
        console.log(`📅 Parsing date ligne ${i}:`, typeof dateStr, dateStr);
        
        if (typeof dateStr === 'string') {
          const [day, month, year] = dateStr.split('/');
          dateEcheance = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          console.log(`📅 Date string parsée:`, { day, month, year, result: dateEcheance });
        } else if (typeof dateStr === 'number') {
          // Date Excel (nombre de jours depuis 1900)
          dateEcheance = new Date((dateStr - 25569) * 86400 * 1000);
          console.log(`📅 Date Excel parsée:`, dateStr, '->', dateEcheance);
        } else {
          console.log(`⚠️ Ligne ${i} ignorée - format de date non reconnu:`, typeof dateStr, dateStr);
          continue; // Ignorer si impossible de parser la date
        }
        
        // Vérifier que la date est valide
        if (isNaN(dateEcheance.getTime())) {
          console.log(`⚠️ Ligne ${i} ignorée - date invalide:`, dateEcheance);
          continue;
        }
        
        echeances.push({
          pretId: pret.id,
          rang,
          dateEcheance,
          montantRecouvrer,
          capitalAmorti,
          partInterets,
          partAccessoires,
          capitalRestant,
        });
      } catch (error) {
        console.warn(`Erreur lors du parsing de la ligne ${i}:`, error);
        continue; // Continuer avec les autres lignes
      }
    }
    
    if (echeances.length === 0) {
      throw createError('Aucune échéance valide trouvée dans le fichier', 400);
    }
    
    console.log('💾 Sauvegarde des échéances:', echeances.length, 'échéances');
    console.log('📝 Première échéance exemple:', echeances[0]);
    
    try {
      // Supprimer les anciennes échéances s'il y en a
      await prisma.echeancePret.deleteMany({
        where: { pretId: pret.id },
      });
      
      console.log('🗑️ Anciennes échéances supprimées');
      
      // Insérer les nouvelles échéances
      await prisma.echeancePret.createMany({
        data: echeances,
      });
      
      console.log('✅ Nouvelles échéances insérées');
    } catch (dbError: any) {
      console.error('❌ Erreur base de données:', dbError);
      throw new Error(`Erreur sauvegarde BDD: ${dbError.message}`);
    }
    
    // Mettre à jour le prêt avec le nom du fichier
    await prisma.pretImmobilier.update({
      where: { id: pret.id },
      data: {
        fichierOriginal: req.file.originalname,
        dateImport: new Date(),
      },
    });
    
    // Supprimer le fichier temporaire
    const fs = await import('fs');
    fs.unlinkSync(req.file.path);
    
    console.log('✅ Upload terminé avec succès');
    
    res.json({
      success: true,
      message: `Tableau d'amortissement importé avec succès`,
      data: {
        nombreEcheances: echeances.length,
        fichier: req.file.originalname,
      },
    });
    
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'upload:', error);
    
    // Supprimer le fichier temporaire en cas d'erreur
    try {
      const fs = await import('fs');
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.warn('Erreur lors de la suppression du fichier temporaire:', cleanupError);
    }
    
    throw createError('Erreur lors du traitement du fichier Excel: ' + error.message, 400);
  }
  } catch (error: any) {
    // Gestion globale des erreurs (tables manquantes, etc.)
    console.error('❌ Erreur globale upload:', error);
    
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      res.status(500).json({
        success: false,
        error: { 
          message: "Tables de prêts non créées - veuillez exécuter les CREATE TABLE manuellement" 
        },
        timestamp: new Date().toISOString()
      });
    } else {
      throw error;
    }
  }
}));

// @route   GET /api/prets/:id/fiscalite/:annee
// @desc    Get fiscal data for a specific year (interests and insurance)
// @access  Private
router.get('/:id/fiscalite/:annee', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const annee = parseInt(req.params.annee);
  const pretId = req.params.id;
  
  if (isNaN(annee) || annee < 2000 || annee > new Date().getFullYear() + 10) {
    throw createError('Année invalide', 400);
  }
  
  // Vérifier que le prêt existe
  const pret = await prisma.pretImmobilier.findUnique({
    where: { id: pretId },
    include: {
      bien: {
        select: {
          adresse: true,
          ville: true,
        },
      },
    },
  });
  
  if (!pret) {
    throw createError('Prêt non trouvé', 404);
  }
  
  // Récupérer les échéances de l'année demandée
  const echeances = await prisma.echeancePret.findMany({
    where: {
      pretId,
      dateEcheance: {
        gte: new Date(annee, 0, 1),
        lt: new Date(annee + 1, 0, 1),
      },
    },
    orderBy: {
      rang: 'asc',
    },
  });
  
  // Calculer les totaux
  const totalInterets = echeances.reduce((sum, e) => sum + e.partInterets, 0);
  const totalAssurance = echeances.reduce((sum, e) => sum + e.partAccessoires, 0);
  const totalCapital = echeances.reduce((sum, e) => sum + e.capitalAmorti, 0);
  const totalMensualites = echeances.reduce((sum, e) => sum + e.montantRecouvrer, 0);
  
  res.json({
    success: true,
    data: {
      pret: {
        id: pret.id,
        nom: pret.nom,
        banque: pret.banque,
        bien: pret.bien,
      },
      annee,
      totaux: {
        interets: totalInterets,
        assurance: totalAssurance,
        capital: totalCapital,
        mensualites: totalMensualites,
      },
      echeances,
      nombreEcheances: echeances.length,
    },
  });
}));

// @route   PUT /api/prets/:id
// @desc    Update loan
// @access  Private
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = pretSchema.partial().parse(req.body);

  // Vérifier que le prêt existe
  const existing = await prisma.pretImmobilier.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw createError('Prêt non trouvé', 404);
  }

  const pret = await prisma.pretImmobilier.update({
    where: { id: req.params.id },
    data: validatedData,
    include: {
      bien: {
        select: {
          adresse: true,
          ville: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: pret,
    message: 'Prêt mis à jour avec succès',
  });
}));

// @route   DELETE /api/prets/:id
// @desc    Delete loan and all its payment schedule
// @access  Private
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Vérifier que le prêt existe
  const existing = await prisma.pretImmobilier.findUnique({
    where: { id: req.params.id },
    include: {
      _count: {
        select: {
          echeances: true,
        },
      },
    },
  });

  if (!existing) {
    throw createError('Prêt non trouvé', 404);
  }

  // Supprimer le prêt (les échéances seront supprimées en cascade)
  await prisma.pretImmobilier.delete({
    where: { id: req.params.id },
  });

  res.json({
    success: true,
    message: `Prêt supprimé avec succès (${existing._count.echeances} échéances supprimées)`,
  });
}));

// @route   GET /api/prets/stats/annuelle
// @desc    Get annual statistics for all loans
// @access  Private
router.get('/stats/annuelle', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { annee } = req.query;
  const year = annee ? parseInt(annee as string) : new Date().getFullYear();
  
  // Récupérer toutes les échéances de l'année
  const echeances = await prisma.echeancePret.findMany({
    where: {
      dateEcheance: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
    include: {
      pret: {
        include: {
          bien: {
            select: {
              id: true,
              adresse: true,
              ville: true,
            },
          },
        },
      },
    },
  });
  
  // Grouper par prêt
  const statsParPret: { [key: string]: any } = {};
  
  echeances.forEach(echeance => {
    const pretId = echeance.pretId;
    
    if (!statsParPret[pretId]) {
      statsParPret[pretId] = {
        pret: echeance.pret,
        totaux: {
          interets: 0,
          assurance: 0,
          capital: 0,
          mensualites: 0,
        },
        nombreEcheances: 0,
      };
    }
    
    statsParPret[pretId].totaux.interets += echeance.partInterets;
    statsParPret[pretId].totaux.assurance += echeance.partAccessoires;
    statsParPret[pretId].totaux.capital += echeance.capitalAmorti;
    statsParPret[pretId].totaux.mensualites += echeance.montantRecouvrer;
    statsParPret[pretId].nombreEcheances++;
  });
  
  // Calculer les totaux globaux
  const totauxGlobaux = Object.values(statsParPret).reduce(
    (acc: any, stat: any) => ({
      interets: acc.interets + stat.totaux.interets,
      assurance: acc.assurance + stat.totaux.assurance,
      capital: acc.capital + stat.totaux.capital,
      mensualites: acc.mensualites + stat.totaux.mensualites,
    }),
    { interets: 0, assurance: 0, capital: 0, mensualites: 0 }
  );
  
  res.json({
    success: true,
    data: {
      annee: year,
      totauxGlobaux,
      statsParPret: Object.values(statsParPret),
      nombrePrets: Object.keys(statsParPret).length,
    },
  });
}));

export default router;