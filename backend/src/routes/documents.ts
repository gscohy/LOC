import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { googleDriveService } from '../services/googleDriveService.js';

// Créer une instance Prisma locale pour les documents
const prisma = new PrismaClient();

const router = express.Router();

// Configuration multer pour l'upload de documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Types de fichiers autorisés
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'), false);
    }
  }
});

// Schémas de validation
const uploadDocumentSchema = z.object({
  categorie: z.enum(['CONTRAT', 'LOCATAIRE', 'GARANT', 'BIEN']),
  typeDoc: z.string().min(1),
  contratId: z.string().optional(),
  locataireId: z.string().optional(),
  garantId: z.string().optional(),
  bienId: z.string().optional(),
  description: z.string().optional()
});

// POST /api/documents/upload - Upload d'un document
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier fourni'
      });
    }

    const validatedData = uploadDocumentSchema.parse(req.body);
    
    // Vérifier que l'entité existe
    if (validatedData.contratId) {
      const contrat = await prisma.contrat.findUnique({ where: { id: validatedData.contratId } });
      if (!contrat) {
        return res.status(404).json({ success: false, error: 'Contrat non trouvé' });
      }
    }
    
    if (validatedData.locataireId) {
      const locataire = await prisma.locataire.findUnique({ where: { id: validatedData.locataireId } });
      if (!locataire) {
        return res.status(404).json({ success: false, error: 'Locataire non trouvé' });
      }
    }
    
    if (validatedData.garantId) {
      const garant = await prisma.garant.findUnique({ where: { id: validatedData.garantId } });
      if (!garant) {
        return res.status(404).json({ success: false, error: 'Garant non trouvé' });
      }
    }
    
    if (validatedData.bienId) {
      const bien = await prisma.bien.findUnique({ where: { id: validatedData.bienId } });
      if (!bien) {
        return res.status(404).json({ success: false, error: 'Bien non trouvé' });
      }
    }

    // Créer l'enregistrement du document
    const document = await prisma.document.create({
      data: {
        nom: req.file.originalname,
        nomFichier: req.file.filename,
        chemin: `/uploads/documents/${req.file.filename}`,
        taille: req.file.size,
        type: req.file.mimetype,
        extension: path.extname(req.file.originalname),
        categorie: validatedData.categorie,
        typeDoc: validatedData.typeDoc,
        contratId: validatedData.contratId,
        locataireId: validatedData.locataireId,
        garantId: validatedData.garantId,
        bienId: validatedData.bienId,
        description: validatedData.description
      }
    });

    // Sauvegarder automatiquement sur Google Drive (asynchrone)
    setImmediate(async () => {
      try {
        await googleDriveService.initialize();
        if (googleDriveService.isConfigured()) {
          const filePath = path.join(process.cwd(), 'uploads', 'documents', req.file.filename);
          const driveResult = await googleDriveService.uploadFile(
            filePath, 
            req.file.originalname,
            'Documents',
            {
              entityType: validatedData.categorie,
              entityId: document.id,
              originalName: req.file.originalname
            }
          );
          
          // Mettre à jour le document avec l'ID Google Drive
          await prisma.document.update({
            where: { id: document.id },
            data: { 
              googleDriveFileId: driveResult.fileId,
              googleDriveUrl: driveResult.webViewLink
            }
          });

          logger.info(`Document sauvegardé sur Google Drive: ${req.file.originalname} (${driveResult.fileId})`);
        }
      } catch (driveError) {
        logger.warn(`Échec sauvegarde Google Drive pour ${req.file.originalname}:`, driveError);
      }
    });

    res.json({
      success: true,
      data: document
    });

    logger.info(`Document uploadé: ${req.file.originalname} (${validatedData.categorie})`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.errors
      });
    }

    logger.error('Erreur upload document:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de l\'upload du document'
    });
  }
});

// GET /api/documents - Récupérer les documents avec filtres
router.get('/', async (req, res) => {
  try {
    const { 
      categorie, 
      typeDoc, 
      contratId, 
      locataireId, 
      garantId, 
      bienId,
      page = '1',
      limit = '20'
    } = req.query;

    const where: any = {};
    
    if (categorie) where.categorie = categorie;
    if (typeDoc) where.typeDoc = typeDoc;
    if (contratId) where.contratId = contratId;
    if (locataireId) where.locataireId = locataireId;
    if (garantId) where.garantId = garantId;
    if (bienId) where.bienId = bienId;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          contrat: {
            select: { id: true, dateDebut: true, bien: { select: { adresse: true } } }
          },
          locataire: {
            select: { id: true, nom: true, prenom: true }
          },
          garant: {
            select: { id: true, nom: true, prenom: true }
          },
          bien: {
            select: { id: true, adresse: true, ville: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.document.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Erreur récupération documents:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des documents'
    });
  }
});

// GET /api/documents/:id - Récupérer un document par ID
router.get('/:id', async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: {
        contrat: {
          select: { id: true, dateDebut: true, bien: { select: { adresse: true } } }
        },
        locataire: {
          select: { id: true, nom: true, prenom: true }
        },
        garant: {
          select: { id: true, nom: true, prenom: true }
        },
        bien: {
          select: { id: true, adresse: true, ville: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document non trouvé'
      });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    logger.error('Erreur récupération document:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération du document'
    });
  }
});

// DELETE /api/documents/:id - Supprimer un document
router.delete('/:id', async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document non trouvé'
      });
    }

    // Supprimer le fichier physique
    const filePath = path.join(process.cwd(), 'uploads', 'documents', document.nomFichier);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Supprimer l'enregistrement en base
    await prisma.document.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Document supprimé avec succès'
    });

    logger.info(`Document supprimé: ${document.nom}`);
  } catch (error) {
    logger.error('Erreur suppression document:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la suppression du document'
    });
  }
});

// PUT /api/documents/:id - Mettre à jour les métadonnées d'un document
router.put('/:id', async (req, res) => {
  try {
    const updateSchema = z.object({
      description: z.string().optional(),
      typeDoc: z.string().optional()
    });

    const validatedData = updateSchema.parse(req.body);

    const document = await prisma.document.findUnique({
      where: { id: req.params.id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document non trouvé'
      });
    }

    const updatedDocument = await prisma.document.update({
      where: { id: req.params.id },
      data: validatedData,
      include: {
        contrat: {
          select: { id: true, dateDebut: true, bien: { select: { adresse: true } } }
        },
        locataire: {
          select: { id: true, nom: true, prenom: true }
        },
        garant: {
          select: { id: true, nom: true, prenom: true }
        },
        bien: {
          select: { id: true, adresse: true, ville: true }
        }
      }
    });

    res.json({
      success: true,
      data: updatedDocument
    });

    logger.info(`Document mis à jour: ${document.nom}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.errors
      });
    }

    logger.error('Erreur mise à jour document:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la mise à jour du document'
    });
  }
});

export default router;