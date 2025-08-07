import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const router = express.Router();

// Validation schemas
const userSchema = z.object({
  email: z.string().email('Email invalide'),
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  role: z.enum(['ADMIN', 'GESTIONNAIRE', 'LECTEUR']).default('GESTIONNAIRE'),
  structure: z.string().optional(),
  typeCollab: z.string().optional(),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  codePostal: z.string().optional(),
  dateEmbauche: z.string().transform((str) => str ? new Date(str) : undefined).optional(),
  statut: z.enum(['ACTIF', 'INACTIF', 'SUSPENDU']).default('ACTIF'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères').optional(),
});

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Vérifier les permissions admin
  if (req.user?.role !== 'ADMIN') {
    throw createError('Accès non autorisé', 403);
  }

  const { page = '1', limit = '10', search, role, structure, typeCollab, statut } = req.query;
  
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

  if (role) {
    where.role = role;
  }

  if (structure) {
    where.structure = structure;
  }

  if (typeCollab) {
    where.typeCollab = typeCollab;
  }

  if (statut) {
    where.statut = statut;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limitNum,
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        structure: true,
        typeCollab: true,
        telephone: true,
        adresse: true,
        ville: true,
        codePostal: true,
        dateEmbauche: true,
        statut: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
}));

// @route   GET /api/users/stats
// @desc    Get users statistics
// @access  Private (Admin only)
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'ADMIN') {
    throw createError('Accès non autorisé', 403);
  }

  const [
    totalUsers,
    usersByRole,
    usersByStructure,
    usersByTypeCollab,
    usersByStatut,
    recentUsers,
  ] = await Promise.all([
    // Total des utilisateurs
    prisma.user.count(),

    // Utilisateurs par rôle
    prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    }),

    // Utilisateurs par structure
    prisma.user.groupBy({
      by: ['structure'],
      _count: { structure: true },
      where: {
        structure: { not: null },
      },
    }),

    // Utilisateurs par type collaborateur
    prisma.user.groupBy({
      by: ['typeCollab'],
      _count: { typeCollab: true },
      where: {
        typeCollab: { not: null },
      },
    }),

    // Utilisateurs par statut
    prisma.user.groupBy({
      by: ['statut'],
      _count: { statut: true },
    }),

    // Utilisateurs récents (30 derniers jours)
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  const stats = {
    total: totalUsers,
    recent: recentUsers,
    parRole: usersByRole,
    parStructure: usersByStructure,
    parTypeCollab: usersByTypeCollab,
    parStatut: usersByStatut,
  };

  res.json({
    success: true,
    data: stats,
  });
}));

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Les utilisateurs peuvent voir leur propre profil, les admins peuvent voir tous les profils
  if (req.user?.role !== 'ADMIN' && req.user?.id !== req.params.id) {
    throw createError('Accès non autorisé', 403);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      role: true,
      structure: true,
      typeCollab: true,
      telephone: true,
      adresse: true,
      ville: true,
      codePostal: true,
      dateEmbauche: true,
      statut: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw createError('Utilisateur non trouvé', 404);
  }

  res.json({
    success: true,
    data: user,
  });
}));

// @route   POST /api/users
// @desc    Create user
// @access  Private (Admin only)
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'ADMIN') {
    throw createError('Accès non autorisé', 403);
  }

  const validatedData = userSchema.parse(req.body);

  // Vérifier que l'email n'existe pas déjà
  const existing = await prisma.user.findUnique({
    where: { email: validatedData.email },
  });

  if (existing) {
    throw createError('Un utilisateur avec cet email existe déjà', 400);
  }

  // Hash du mot de passe si fourni, sinon générer un mot de passe temporaire
  const password = validatedData.password || 'temp123456';
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const { password: _, ...userData } = validatedData;

  const user = await prisma.user.create({
    data: {
      ...userData,
      password: hashedPassword,
    },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      role: true,
      structure: true,
      typeCollab: true,
      telephone: true,
      adresse: true,
      ville: true,
      codePostal: true,
      dateEmbauche: true,
      statut: true,
      createdAt: true,
    },
  });

  res.status(201).json({
    success: true,
    data: user,
    message: 'Utilisateur créé avec succès',
  });
}));

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Les utilisateurs peuvent modifier leur propre profil, les admins peuvent modifier tous les profils
  if (req.user?.role !== 'ADMIN' && req.user?.id !== req.params.id) {
    throw createError('Accès non autorisé', 403);
  }

  const validatedData = userSchema.partial().parse(req.body);

  // Vérifier que l'utilisateur existe
  const existing = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw createError('Utilisateur non trouvé', 404);
  }

  // Vérifier que l'email n'est pas déjà utilisé par un autre utilisateur
  if (validatedData.email) {
    const emailExists = await prisma.user.findFirst({
      where: {
        email: validatedData.email,
        id: { not: req.params.id },
      },
    });

    if (emailExists) {
      throw createError('Un utilisateur avec cet email existe déjà', 400);
    }
  }

  // Si un mot de passe est fourni, le hasher
  let updateData = { ...validatedData };
  if (validatedData.password) {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);
    updateData.password = hashedPassword;
  } else {
    delete updateData.password;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      role: true,
      structure: true,
      typeCollab: true,
      telephone: true,
      adresse: true,
      ville: true,
      codePostal: true,
      dateEmbauche: true,
      statut: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    data: user,
    message: 'Utilisateur mis à jour avec succès',
  });
}));

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'ADMIN') {
    throw createError('Accès non autorisé', 403);
  }

  // Empêcher la suppression de son propre compte
  if (req.user?.id === req.params.id) {
    throw createError('Vous ne pouvez pas supprimer votre propre compte', 400);
  }

  // Vérifier que l'utilisateur existe
  const existing = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw createError('Utilisateur non trouvé', 404);
  }

  await prisma.user.delete({
    where: { id: req.params.id },
  });

  res.json({
    success: true,
    message: 'Utilisateur supprimé avec succès',
  });
}));

// @route   GET /api/users/filters/options
// @desc    Get filter options (structures, types collaborateurs, etc.)
// @access  Private (Admin only)
router.get('/filters/options', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'ADMIN') {
    throw createError('Accès non autorisé', 403);
  }

  const [structures, typesCollab, roles, statuts] = await Promise.all([
    // Structures distinctes
    prisma.user.findMany({
      where: { structure: { not: null } },
      select: { structure: true },
      distinct: ['structure'],
    }),

    // Types collaborateurs distincts
    prisma.user.findMany({
      where: { typeCollab: { not: null } },
      select: { typeCollab: true },
      distinct: ['typeCollab'],
    }),

    // Rôles possibles
    Promise.resolve(['ADMIN', 'GESTIONNAIRE', 'LECTEUR']),

    // Statuts possibles
    Promise.resolve(['ACTIF', 'INACTIF', 'SUSPENDU']),
  ]);

  const options = {
    structures: structures.map(s => s.structure).filter(Boolean),
    typesCollab: typesCollab.map(t => t.typeCollab).filter(Boolean),
    roles,
    statuts,
  };

  res.json({
    success: true,
    data: options,
  });
}));

export default router;