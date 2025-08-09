import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { logger } from './utils/logger.js';

// Import routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import proprietairesRoutes from './routes/proprietaires.js';
import biensRoutes from './routes/biens.js';
import biensDetailsRoutes from './routes/biens-details.js';
import contratsDetailsRoutes from './routes/contrats-details.js';
import locatairesRoutes from './routes/locataires.js';
import loyersRoutes from './routes/loyers.js';
import loyersGenerationRoutes from './routes/loyers-generation.js';
import paiementsRoutes from './routes/paiements.js';
import rappelsRoutes from './routes/rappels.js';
import quittancesRoutes from './routes/quittances.js';
import contratsRoutes from './routes/contrats.js';
import emailsRoutes from './routes/emails.js';
import chargesRoutes from './routes/charges.js';
import garantsRoutes from './routes/garants.js';
import fiscaliteRoutes from './routes/fiscalite.js';
import documentsRoutes from './routes/documents.js';
import schedulerRoutes from './routes/scheduler.js';

// Import scheduler
import { taskScheduler } from './services/scheduler.js';

const app = express();
const PORT = parseInt(process.env.PORT || '7000', 10);

// Trust proxy for Railway deployment - more secure configuration
app.set('trust proxy', 1);

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Rate limiting - configured for Railway with proper proxy trust
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1000, // 1000 requests per 5 minutes
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
  trustProxy: 1, // Trust first proxy (Railway)
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http://localhost:7000", "https://localhost:7000"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
    },
  },
}));
// Configuration CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://loc-frontend.onrender.com',
        'https://loc-frontend-production.up.railway.app',
        /\.onrender\.com$/,  // Accepter tous les sous-domaines Render
        /\.up\.railway\.app$/  // Accepter tous les domaines Railway
      ]
    : [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000'
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(compression());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (signatures, factures, quittances) avec en-têtes CORS
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cache-Control', 'public, max-age=86400'); // Cache 24h
  next();
}, express.static('uploads'));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.1'
  });
});

// Test endpoint for rent generation - completely separate
app.post('/test-generate-rents', async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const currentDate = new Date();
    const currentDay = currentDate.getDate();

    const results = {
      loyersCrees: [],
      contratsTraites: 0,
      contratsActifsTotal: 0,
      erreurs: []
    };

    await prisma.$transaction(async (tx) => {
      const contratsActifs = await tx.contrat.findMany({
        where: {
          statut: 'ACTIF',
          dateDebut: { lte: currentDate },
          OR: [
            { dateFin: null },
            { dateFin: { gte: currentDate } }
          ]
        },
        include: {
          bien: {
            select: { id: true, adresse: true, ville: true }
          },
          locataires: {
            include: {
              locataire: {
                select: { id: true, nom: true, prenom: true, email: true }
              }
            }
          }
        }
      });

      results.contratsActifsTotal = contratsActifs.length;

      const getPeriodsToCheck = (contrat) => {
        const periods = [];
        const contratDebut = new Date(contrat.dateDebut);
        const contratFin = contrat.dateFin ? new Date(contrat.dateFin) : null;
        let checkDate = new Date(contratDebut.getFullYear(), contratDebut.getMonth(), contrat.jourPaiement);
        
        if (contratDebut.getDate() > contrat.jourPaiement) {
          checkDate.setMonth(checkDate.getMonth() + 1);
        }

        while (checkDate <= currentDate) {
          const mois = checkDate.getMonth() + 1;
          const annee = checkDate.getFullYear();
          
          if (contratFin && checkDate > contratFin) break;

          const shouldCreate = checkDate.getMonth() < currentDate.getMonth() ||
            checkDate.getFullYear() < currentDate.getFullYear() ||
            (checkDate.getMonth() === currentDate.getMonth() && 
             checkDate.getFullYear() === currentDate.getFullYear());

          if (shouldCreate) {
            periods.push({ mois, annee, dateEcheance: new Date(checkDate) });
          }
          checkDate.setMonth(checkDate.getMonth() + 1);
        }
        return periods;
      };

      for (const contrat of contratsActifs) {
        try {
          results.contratsTraites++;
          const periodsToCheck = getPeriodsToCheck(contrat);

          for (const period of periodsToCheck) {
            const loyerExiste = await tx.loyer.findFirst({
              where: {
                contratId: contrat.id,
                mois: period.mois,
                annee: period.annee
              }
            });

            if (!loyerExiste) {
              let statutInitial = 'EN_ATTENTE';
              if (period.dateEcheance < currentDate) {
                statutInitial = 'RETARD';
              }

              const nouveauLoyer = await tx.loyer.create({
                data: {
                  contratId: contrat.id,
                  mois: period.mois,
                  annee: period.annee,
                  montantDu: contrat.loyer + contrat.chargesMensuelles,
                  montantPaye: 0,
                  dateEcheance: period.dateEcheance,
                  statut: statutInitial,
                  commentaires: `Loyer généré automatiquement (test) le ${currentDate.toISOString()}`
                }
              });

              results.loyersCrees.push({
                loyerId: nouveauLoyer.id,
                contratId: contrat.id,
                mois: period.mois,
                annee: period.annee,
                montantDu: nouveauLoyer.montantDu,
                dateEcheance: period.dateEcheance,
                statut: statutInitial,
                adresse: contrat.bien.adresse,
                locataires: contrat.locataires.map(cl => 
                  `${cl.locataire.prenom} ${cl.locataire.nom}`
                ).join(', ')
              });
            }
          }
        } catch (error) {
          results.erreurs.push({
            contratId: contrat.id,
            adresse: contrat.bien?.adresse || 'Adresse inconnue',
            erreur: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      }
    });

    await prisma.$disconnect();

    res.json({
      success: true,
      message: `✅ TEST RÉUSSI - ${results.loyersCrees.length} loyers créés sur ${results.contratsActifsTotal} contrats actifs.`,
      data: results,
      testInfo: {
        endpoint: '/test-generate-rents',
        dateExecution: currentDate.toISOString(),
        note: "Endpoint de test temporaire - sera supprimé après validation"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Erreur serveur' },
      timestamp: new Date().toISOString()
    });
  }
});

// Routes publiques pour les signatures
app.get('/public/signatures/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(process.cwd(), 'uploads', 'signatures', filename);
  
  // Vérifier que le fichier existe
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fichier non trouvé' });
  }
  
  // Définir les en-têtes appropriés
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Envoyer le fichier
  res.sendFile(filePath);
});

// Routes publiques de test (temporaire) - AVANT l'authentification
app.post('/api/loyers/generer-loyers-manquants-public', async (req, res) => {
  try {
    // Importer directement la logique depuis le router
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const currentDate = new Date();
    const currentDay = currentDate.getDate();

    const results = {
      loyersCrees: [],
      contratsTraites: 0,
      contratsActifsTotal: 0,
      erreurs: []
    };

    await prisma.$transaction(async (tx) => {
      const contratsActifs = await tx.contrat.findMany({
        where: {
          statut: 'ACTIF',
          dateDebut: { lte: currentDate },
          OR: [
            { dateFin: null },
            { dateFin: { gte: currentDate } }
          ]
        },
        include: {
          bien: {
            select: { id: true, adresse: true, ville: true }
          },
          locataires: {
            include: {
              locataire: {
                select: { id: true, nom: true, prenom: true, email: true }
              }
            }
          }
        }
      });

      results.contratsActifsTotal = contratsActifs.length;

      const getPeriodsToCheck = (contrat) => {
        const periods = [];
        const contratDebut = new Date(contrat.dateDebut);
        const contratFin = contrat.dateFin ? new Date(contrat.dateFin) : null;
        let checkDate = new Date(contratDebut.getFullYear(), contratDebut.getMonth(), contrat.jourPaiement);
        
        if (contratDebut.getDate() > contrat.jourPaiement) {
          checkDate.setMonth(checkDate.getMonth() + 1);
        }

        while (checkDate <= currentDate) {
          const mois = checkDate.getMonth() + 1;
          const annee = checkDate.getFullYear();
          
          if (contratFin && checkDate > contratFin) break;

          const shouldCreate = checkDate.getMonth() < currentDate.getMonth() ||
            checkDate.getFullYear() < currentDate.getFullYear() ||
            (checkDate.getMonth() === currentDate.getMonth() && 
             checkDate.getFullYear() === currentDate.getFullYear());

          if (shouldCreate) {
            periods.push({ mois, annee, dateEcheance: new Date(checkDate) });
          }
          checkDate.setMonth(checkDate.getMonth() + 1);
        }
        return periods;
      };

      for (const contrat of contratsActifs) {
        try {
          results.contratsTraites++;
          const periodsToCheck = getPeriodsToCheck(contrat);

          for (const period of periodsToCheck) {
            const loyerExiste = await tx.loyer.findFirst({
              where: {
                contratId: contrat.id,
                mois: period.mois,
                annee: period.annee
              }
            });

            if (!loyerExiste) {
              let statutInitial = 'EN_ATTENTE';
              if (period.dateEcheance < currentDate) {
                statutInitial = 'RETARD';
              }

              const nouveauLoyer = await tx.loyer.create({
                data: {
                  contratId: contrat.id,
                  mois: period.mois,
                  annee: period.annee,
                  montantDu: contrat.loyer + contrat.chargesMensuelles,
                  montantPaye: 0,
                  dateEcheance: period.dateEcheance,
                  statut: statutInitial,
                  commentaires: `Loyer généré automatiquement (test public) le ${currentDate.toISOString()}`
                }
              });

              results.loyersCrees.push({
                loyerId: nouveauLoyer.id,
                contratId: contrat.id,
                mois: period.mois,
                annee: period.annee,
                montantDu: nouveauLoyer.montantDu,
                dateEcheance: period.dateEcheance,
                statut: statutInitial,
                adresse: contrat.bien.adresse,
                locataires: contrat.locataires.map(cl => 
                  `${cl.locataire.prenom} ${cl.locataire.nom}`
                ).join(', ')
              });
            }
          }
        } catch (error) {
          results.erreurs.push({
            contratId: contrat.id,
            adresse: contrat.bien?.adresse || 'Adresse inconnue',
            erreur: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      }
    });

    res.json({
      success: true,
      message: `TEST - Génération automatique terminée. ${results.loyersCrees.length} loyers créés sur ${results.contratsActifsTotal} contrats actifs.`,
      data: results,
      note: "⚠️ Endpoint de test public - à supprimer après validation"
    });
    
    await prisma.$disconnect();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Erreur inconnue' },
      timestamp: new Date().toISOString()
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, usersRoutes);
app.use('/api/proprietaires', authMiddleware, proprietairesRoutes);
app.use('/api/biens', authMiddleware, biensDetailsRoutes);
app.use('/api/biens', authMiddleware, biensRoutes);
app.use('/api/contrats', authMiddleware, contratsDetailsRoutes);
app.use('/api/contrats', authMiddleware, contratsRoutes);
app.use('/api/locataires', authMiddleware, locatairesRoutes);
app.use('/api/loyers', authMiddleware, loyersGenerationRoutes);
app.use('/api/loyers', authMiddleware, loyersRoutes);
app.use('/api/paiements', authMiddleware, paiementsRoutes);
app.use('/api/rappels', authMiddleware, rappelsRoutes);
app.use('/api/quittances', authMiddleware, quittancesRoutes);
app.use('/api/emails', authMiddleware, emailsRoutes);
app.use('/api/charges', authMiddleware, chargesRoutes);
app.use('/api/garants', authMiddleware, garantsRoutes);
app.use('/api/fiscalite', authMiddleware, fiscaliteRoutes);
app.use('/api/documents', authMiddleware, documentsRoutes);
app.use('/api/scheduler', authMiddleware, schedulerRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Arrêt du serveur en cours...');
  taskScheduler.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Signal SIGTERM reçu, arrêt du serveur...');
  taskScheduler.stop();
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Serveur démarré sur le port ${PORT}`);
  logger.info(`📊 Dashboard (Local): http://localhost:${PORT}/health`);
  logger.info(`📊 Dashboard (Réseau): http://192.168.1.51:${PORT}/health`);
  logger.info(`📊 Dashboard (Entreprise): http://10.81.234.10:${PORT}/health`);
  logger.info(`🗄️  Base de données: PostgreSQL avec Prisma ORM`);
  
  // Démarrer le planificateur de tâches
  try {
    taskScheduler.start();
    logger.info(`⏰ Planificateur de tâches démarré`);
  } catch (error) {
    logger.error('Erreur lors du démarrage du planificateur:', error);
  }
});

export default app;