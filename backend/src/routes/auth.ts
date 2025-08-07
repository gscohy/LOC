import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = express.Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  role: z.enum(['ADMIN', 'GESTIONNAIRE', 'LECTEUR']).default('GESTIONNAIRE'),
});

const generateToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public (in development) / Admin only (in production)
router.post('/register', asyncHandler(async (req, res) => {
  const validatedData = registerSchema.parse(req.body);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: validatedData.email },
  });

  if (existingUser) {
    throw createError('Un utilisateur avec cet email existe déjà', 400);
  }

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

  // Create user
  const user = await prisma.user.create({
    data: {
      ...validatedData,
      password: hashedPassword,
    },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      role: true,
      createdAt: true,
    },
  });

  // Generate token
  const token = generateToken(user.id);

  res.status(201).json({
    success: true,
    data: {
      user,
      token,
    },
    message: 'Utilisateur créé avec succès',
  });
}));

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', asyncHandler(async (req, res) => {
  const validatedData = loginSchema.parse(req.body);

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: validatedData.email },
  });

  if (!user) {
    throw createError('Email ou mot de passe incorrect', 401);
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);

  if (!isPasswordValid) {
    throw createError('Email ou mot de passe incorrect', 401);
  }

  // Generate token
  const token = generateToken(user.id);

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    data: {
      user: userWithoutPassword,
      token,
    },
    message: 'Connexion réussie',
  });
}));

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      role: true,
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

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const updateSchema = z.object({
    nom: z.string().min(1, 'Le nom est requis').optional(),
    prenom: z.string().min(1, 'Le prénom est requis').optional(),
    email: z.string().email('Email invalide').optional(),
  });

  const validatedData = updateSchema.parse(req.body);

  // Check if email is already taken by another user
  if (validatedData.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser && existingUser.id !== req.user!.id) {
      throw createError('Cet email est déjà utilisé', 400);
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user!.id },
    data: validatedData,
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      role: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    data: updatedUser,
    message: 'Profil mis à jour avec succès',
  });
}));

// @route   PUT /api/auth/password
// @desc    Change user password
// @access  Private
router.put('/password', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
    newPassword: z.string().min(6, 'Le nouveau mot de passe doit contenir au moins 6 caractères'),
  });

  const validatedData = passwordSchema.parse(req.body);

  // Get current user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
  });

  if (!user) {
    throw createError('Utilisateur non trouvé', 404);
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(validatedData.currentPassword, user.password);

  if (!isCurrentPasswordValid) {
    throw createError('Mot de passe actuel incorrect', 400);
  }

  // Hash new password
  const saltRounds = 12;
  const hashedNewPassword = await bcrypt.hash(validatedData.newPassword, saltRounds);

  // Update password
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { password: hashedNewPassword },
  });

  res.json({
    success: true,
    message: 'Mot de passe modifié avec succès',
  });
}));

export default router;