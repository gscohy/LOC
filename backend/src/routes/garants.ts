import express from 'express';
import { z } from 'zod';
import { prisma } from '../server.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Schémas de validation
const garantSchema = z.object({
  civilite: z.enum(['M', 'Mme', 'Dr', 'Me']).default('M'),
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(1, 'Le téléphone est requis'),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  codePostal: z.string().optional(),
  profession: z.string().optional(),
  revenus: z.number().optional().default(0),
  typeGarantie: z.enum(['PHYSIQUE', 'MORALE', 'BANCAIRE', 'ASSURANCE']).default('PHYSIQUE'),
  documents: z.string().optional()
});

const updateGarantSchema = garantSchema.partial();

// GET /api/garants - Liste des garants
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const typeGarantie = req.query.typeGarantie as string;

    const offset = (page - 1) * limit;

    const where: any = {};

    // Recherche
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search } }
      ];
    }

    // Filtre par type de garantie
    if (typeGarantie) {
      where.typeGarantie = typeGarantie;
    }

    const [garants, total] = await Promise.all([
      prisma.garant.findMany({
        where,
        include: {
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
        },
        orderBy: { nom: 'asc' },
        take: limit,
        skip: offset
      }),
      prisma.garant.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        garants,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

    logger.info(`Liste des garants récupérée: ${garants.length} résultats`);
  } catch (error) {
    logger.error('Erreur lors de la récupération des garants:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des garants'
    });
  }
});

// GET /api/garants/:id - Détail d'un garant
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const garant = await prisma.garant.findUnique({
      where: { id },
      include: {
        locataires: {
          include: {
            locataire: {
              include: {
                contrats: {
                  include: {
                    contrat: {
                      include: {
                        bien: {
                          select: {
                            id: true,
                            adresse: true,
                            ville: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!garant) {
      return res.status(404).json({
        success: false,
        error: 'Garant non trouvé'
      });
    }

    res.json({
      success: true,
      data: garant
    });

    logger.info(`Détail du garant ${id} récupéré`);
  } catch (error) {
    logger.error('Erreur lors de la récupération du garant:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération du garant'
    });
  }
});

// POST /api/garants - Créer un garant
router.post('/', async (req, res) => {
  try {
    const validatedData = garantSchema.parse(req.body);

    // Vérifier si l'email existe déjà
    const existingGarant = await prisma.garant.findFirst({
      where: { email: validatedData.email }
    });

    if (existingGarant) {
      return res.status(400).json({
        success: false,
        error: 'Un garant avec cet email existe déjà'
      });
    }

    const garant = await prisma.garant.create({
      data: validatedData,
      include: {
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

    res.status(201).json({
      success: true,
      data: garant
    });

    logger.info(`Nouveau garant créé: ${garant.nom} ${garant.prenom}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.errors
      });
    }

    logger.error('Erreur lors de la création du garant:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la création du garant'
    });
  }
});

// PUT /api/garants/:id - Modifier un garant
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateGarantSchema.parse(req.body);

    // Vérifier si le garant existe
    const existingGarant = await prisma.garant.findUnique({
      where: { id }
    });

    if (!existingGarant) {
      return res.status(404).json({
        success: false,
        error: 'Garant non trouvé'
      });
    }

    // Vérifier si l'email existe déjà (sauf pour ce garant)
    if (validatedData.email) {
      const emailExists = await prisma.garant.findFirst({
        where: {
          email: validatedData.email,
          id: { not: id }
        }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Un garant avec cet email existe déjà'
        });
      }
    }

    const garant = await prisma.garant.update({
      where: { id },
      data: validatedData,
      include: {
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

    res.json({
      success: true,
      data: garant
    });

    logger.info(`Garant ${id} modifié`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.errors
      });
    }

    logger.error('Erreur lors de la modification du garant:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la modification du garant'
    });
  }
});

// DELETE /api/garants/:id - Supprimer un garant
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si le garant existe
    const existingGarant = await prisma.garant.findUnique({
      where: { id },
      include: {
        locataires: true
      }
    });

    if (!existingGarant) {
      return res.status(404).json({
        success: false,
        error: 'Garant non trouvé'
      });
    }

    // Vérifier si le garant a des locataires associés
    if (existingGarant.locataires.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de supprimer un garant associé à des locataires'
      });
    }

    await prisma.garant.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Garant supprimé avec succès'
    });

    logger.info(`Garant ${id} supprimé`);
  } catch (error) {
    logger.error('Erreur lors de la suppression du garant:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la suppression du garant'
    });
  }
});

// POST /api/garants/:id/associate - Associer un garant à un locataire
router.post('/:id/associate', async (req, res) => {
  try {
    const { id } = req.params;
    const { locataireId } = req.body;


    if (!locataireId) {
      return res.status(400).json({
        success: false,
        error: 'L\'ID du locataire est requis'
      });
    }


    // Vérifier si le garant existe
    const garant = await prisma.garant.findUnique({
      where: { id }
    });

    if (!garant) {
      return res.status(404).json({
        success: false,
        error: 'Garant non trouvé'
      });
    }

    // Vérifier si le locataire existe
    const locataire = await prisma.locataire.findUnique({
      where: { id: locataireId }
    });

    if (!locataire) {
      return res.status(404).json({
        success: false,
        error: 'Locataire non trouvé'
      });
    }

    // Vérifier si l'association existe déjà
    const existingAssociation = await prisma.locataireGarant.findUnique({
      where: {
        locataireId_garantId: {
          locataireId,
          garantId: id
        }
      }
    });

    if (existingAssociation) {
      return res.status(400).json({
        success: false,
        error: 'Cette association existe déjà'
      });
    }

    const association = await prisma.locataireGarant.create({
      data: {
        locataireId,
        garantId: id
      },
      include: {
        locataire: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        garant: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: association
    });

    logger.info(`Garant ${id} associé au locataire ${locataireId}`);
  } catch (error) {
    logger.error('Erreur lors de l\'association garant-locataire:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de l\'association'
    });
  }
});

// DELETE /api/garants/:id/dissociate - Dissocier un garant d'un locataire
router.delete('/:id/dissociate', async (req, res) => {
  try {
    const { id } = req.params;
    const { locataireId } = req.body;

    if (!locataireId) {
      return res.status(400).json({
        success: false,
        error: 'L\'ID du locataire est requis'
      });
    }

    // Vérifier si l'association existe
    const existingAssociation = await prisma.locataireGarant.findUnique({
      where: {
        locataireId_garantId: {
          locataireId,
          garantId: id
        }
      }
    });

    if (!existingAssociation) {
      return res.status(404).json({
        success: false,
        error: 'Association non trouvée'
      });
    }

    await prisma.locataireGarant.delete({
      where: {
        locataireId_garantId: {
          locataireId,
          garantId: id
        }
      }
    });

    res.json({
      success: true,
      message: 'Association supprimée avec succès'
    });

    logger.info(`Garant ${id} dissocié du locataire ${locataireId}`);
  } catch (error) {
    logger.error('Erreur lors de la dissociation garant-locataire:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la dissociation'
    });
  }
});

export default router;