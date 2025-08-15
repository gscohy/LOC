import express from 'express';
import { z } from 'zod';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { googleDriveService } from '../services/googleDriveService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Schema de validation pour la configuration Google Drive
const configSchema = z.object({
  clientId: z.string().min(1, 'Client ID requis'),
  clientSecret: z.string().min(1, 'Client Secret requis'),
  redirectUri: z.string().url('URL de redirection invalide')
});

// @route   POST /api/google-drive/configure
// @desc    Configurer Google Drive et obtenir l'URL d'autorisation
// @access  Private
router.post('/configure', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = configSchema.parse(req.body);

  try {
    const authUrl = await googleDriveService.configure(validatedData);

    res.json({
      success: true,
      data: {
        authUrl,
        message: 'Veuillez visiter cette URL pour autoriser l\'accès à Google Drive'
      }
    });
  } catch (error) {
    logger.error('Erreur configuration Google Drive:', error);
    throw createError(500, 'Erreur lors de la configuration Google Drive');
  }
}));

// @route   POST /api/google-drive/callback
// @desc    Traiter le callback d'autorisation Google
// @access  Private
router.post('/callback', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { code } = req.body;

  if (!code) {
    throw createError(400, 'Code d\'autorisation manquant');
  }

  try {
    await googleDriveService.handleAuthCallback(code);

    res.json({
      success: true,
      message: 'Google Drive configuré avec succès'
    });
  } catch (error) {
    logger.error('Erreur callback Google Drive:', error);
    throw createError(500, 'Erreur lors de l\'autorisation Google Drive');
  }
}));

// @route   GET /api/google-drive/status
// @desc    Vérifier le statut de la configuration Google Drive
// @access  Private
router.get('/status', asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const isConfigured = googleDriveService.isConfigured();
    let accountInfo = null;

    if (isConfigured) {
      try {
        accountInfo = await googleDriveService.getAccountInfo();
      } catch (error) {
        logger.warn('Impossible de récupérer les infos compte Google Drive:', error);
      }
    }

    res.json({
      success: true,
      data: {
        isConfigured,
        accountInfo
      }
    });
  } catch (error) {
    logger.error('Erreur vérification statut Google Drive:', error);
    throw createError(500, 'Erreur lors de la vérification du statut');
  }
}));

// @route   POST /api/google-drive/upload
// @desc    Upload manuel d'un fichier vers Google Drive
// @access  Private
router.post('/upload', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { filePath, fileName, category, metadata } = req.body;

  if (!filePath || !fileName) {
    throw createError(400, 'Chemin du fichier et nom requis');
  }

  try {
    if (!googleDriveService.isConfigured()) {
      throw createError(400, 'Google Drive non configuré');
    }

    const result = await googleDriveService.uploadFile(filePath, fileName, category, metadata);

    res.json({
      success: true,
      data: result,
      message: 'Fichier uploadé sur Google Drive avec succès'
    });
  } catch (error) {
    logger.error('Erreur upload Google Drive:', error);
    throw createError(500, 'Erreur lors de l\'upload vers Google Drive');
  }
}));

// @route   DELETE /api/google-drive/file/:fileId
// @desc    Supprimer un fichier de Google Drive
// @access  Private
router.delete('/file/:fileId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { fileId } = req.params;

  try {
    if (!googleDriveService.isConfigured()) {
      throw createError(400, 'Google Drive non configuré');
    }

    await googleDriveService.deleteFile(fileId);

    res.json({
      success: true,
      message: 'Fichier supprimé de Google Drive avec succès'
    });
  } catch (error) {
    logger.error('Erreur suppression Google Drive:', error);
    throw createError(500, 'Erreur lors de la suppression sur Google Drive');
  }
}));

// @route   POST /api/google-drive/sync-existing
// @desc    Synchroniser les fichiers existants vers Google Drive
// @access  Private
router.post('/sync-existing', asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    if (!googleDriveService.isConfigured()) {
      throw createError(400, 'Google Drive non configuré');
    }

    // Cette fonctionnalité sera implémentée pour synchroniser les fichiers existants
    // Pour l'instant, on retourne un message d'information
    
    res.json({
      success: true,
      message: 'Synchronisation en cours de développement'
    });
  } catch (error) {
    logger.error('Erreur synchronisation Google Drive:', error);
    throw createError(500, 'Erreur lors de la synchronisation');
  }
}));

export default router;