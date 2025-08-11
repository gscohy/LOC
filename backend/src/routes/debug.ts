import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
const prisma = new PrismaClient();

// @route   GET /api/debug/tables
// @desc    Check if tables exist
// @access  Private
router.get('/tables', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    // Test direct SQL query
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('PretImmobilier', 'EcheancePret');
    `;

    // Test Prisma model access
    let prismaTest = null;
    try {
      await prisma.pretImmobilier.findMany({ take: 1 });
      prismaTest = "PretImmobilier model accessible";
    } catch (error: any) {
      prismaTest = `PretImmobilier model error: ${error.message}`;
    }

    res.json({
      success: true,
      data: {
        tablesInDb: tables,
        prismaTest,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        meta: error.meta
      }
    });
  }
}));

// @route   GET /api/debug/schema
// @desc    Check Prisma schema info
// @access  Private
router.get('/schema', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    // Get Prisma version and config
    const version = process.env.npm_package_dependencies_prisma || 'unknown';
    
    res.json({
      success: true,
      data: {
        prismaVersion: version,
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message
      }
    });
  }
}));

export default router;