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

const app = express();
const PORT = parseInt(process.env.PORT || '7000', 10);

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Rate limiting - Plus permissif en développement
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes (plus court)
  max: 1000, // 1000 requêtes par 5 minutes (plus élevé)
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
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
        /\.onrender\.com$/  // Accepter tous les sous-domaines Render
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
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Signal SIGTERM reçu, arrêt du serveur...');
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
});

export default app;