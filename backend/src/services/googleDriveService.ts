import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken?: string;
  accessToken?: string;
  folderId?: string; // ID du dossier racine sur Drive
}

export class GoogleDriveService {
  private drive: any;
  private auth: any;
  private config: GoogleDriveConfig | null = null;
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
    // N'initialise pas automatiquement, on le fera lors du premier appel
  }

  private async initializeService() {
    try {
      // Récupérer la configuration depuis la base de données
      const driveConfig = await this.prisma.configuration.findFirst({
        where: { cle: 'google_drive_config' }
      });

      if (driveConfig && driveConfig.valeur) {
        this.config = JSON.parse(driveConfig.valeur as string);
        await this.setupAuth();
      }
    } catch (error) {
      logger.warn('Configuration Google Drive non trouvée ou invalide:', error);
    }
  }

  // Méthode publique pour initialiser le service à la demande
  async initialize(): Promise<void> {
    if (!this.config) {
      await this.initializeService();
    }
  }

  private async setupAuth() {
    if (!this.config) return;

    this.auth = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );

    if (this.config.refreshToken) {
      this.auth.setCredentials({
        refresh_token: this.config.refreshToken,
        access_token: this.config.accessToken
      });
    }

    this.drive = google.drive({ version: 'v3', auth: this.auth });
  }

  // Configurer Google Drive avec les clés API
  async configure(config: GoogleDriveConfig): Promise<string> {
    this.config = config;
    await this.setupAuth();

    // Générer l'URL d'autorisation
    const authUrl = this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file'],
      prompt: 'consent'
    });

    return authUrl;
  }

  // Échanger le code d'autorisation contre un refresh token
  async handleAuthCallback(code: string): Promise<void> {
    if (!this.auth) throw new Error('Service non configuré');

    const { tokens } = await this.auth.getAccessToken(code);
    
    if (!this.config) throw new Error('Configuration manquante');

    this.config.refreshToken = tokens.refresh_token;
    this.config.accessToken = tokens.access_token;

    // Sauvegarder la configuration en base
    await this.prisma.configuration.upsert({
      where: { cle: 'google_drive_config' },
      create: {
        cle: 'google_drive_config',
        valeur: JSON.stringify(this.config),
        description: 'Configuration Google Drive'
      },
      update: {
        valeur: JSON.stringify(this.config)
      }
    });

    this.auth.setCredentials(tokens);

    // Créer la structure de dossiers si elle n'existe pas
    await this.createFolderStructure();
  }

  // Créer la structure de dossiers sur Google Drive
  private async createFolderStructure(): Promise<void> {
    if (!this.drive || !this.config) return;

    try {
      const rootFolderName = 'Gestion Locative';
      
      // Vérifier si le dossier racine existe
      let rootFolder = await this.findFolder(rootFolderName);
      
      if (!rootFolder) {
        rootFolder = await this.createFolder(rootFolderName);
        logger.info(`Dossier racine créé: ${rootFolder.name} (${rootFolder.id})`);
      }

      this.config.folderId = rootFolder.id;

      // Créer les sous-dossiers
      const subFolders = [
        'Documents',
        'Quittances', 
        'Rappels',
        'Contrats',
        'Factures',
        'Signatures'
      ];

      for (const folderName of subFolders) {
        const existingFolder = await this.findFolder(folderName, rootFolder.id);
        if (!existingFolder) {
          const newFolder = await this.createFolder(folderName, rootFolder.id);
          logger.info(`Sous-dossier créé: ${newFolder.name} (${newFolder.id})`);
        }
      }

      // Mettre à jour la configuration
      await this.prisma.configuration.upsert({
        where: { cle: 'google_drive_config' },
        create: {
          cle: 'google_drive_config',
          valeur: JSON.stringify(this.config),
          description: 'Configuration Google Drive'
        },
        update: {
          valeur: JSON.stringify(this.config)
        }
      });

    } catch (error) {
      logger.error('Erreur création structure dossiers:', error);
      throw error;
    }
  }

  // Rechercher un dossier par nom
  private async findFolder(name: string, parentId?: string): Promise<any> {
    if (!this.drive) return null;

    const query = parentId 
      ? `name='${name}' and parents in '${parentId}' and mimeType='application/vnd.google-apps.folder'`
      : `name='${name}' and mimeType='application/vnd.google-apps.folder'`;

    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id, name)'
    });

    return response.data.files?.[0] || null;
  }

  // Créer un dossier
  private async createFolder(name: string, parentId?: string): Promise<any> {
    if (!this.drive) throw new Error('Service non initialisé');

    const folderMetadata: any = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder'
    };

    if (parentId) {
      folderMetadata.parents = [parentId];
    }

    const response = await this.drive.files.create({
      requestBody: folderMetadata,
      fields: 'id, name'
    });

    return response.data;
  }

  // Uploader un fichier vers Google Drive
  async uploadFile(
    filePath: string, 
    fileName: string, 
    category: 'Documents' | 'Quittances' | 'Rappels' | 'Contrats' | 'Factures' | 'Signatures' = 'Documents',
    metadata?: {
      entityType?: string;
      entityId?: string;
      originalName?: string;
    }
  ): Promise<{ fileId: string; webViewLink: string }> {
    if (!this.drive || !this.config?.folderId) {
      throw new Error('Google Drive non configuré');
    }

    // Trouver le dossier de catégorie
    const categoryFolder = await this.findFolder(category, this.config.folderId);
    if (!categoryFolder) {
      throw new Error(`Dossier ${category} non trouvé`);
    }

    // Préparer les métadonnées du fichier
    const fileMetadata: any = {
      name: fileName,
      parents: [categoryFolder.id]
    };

    // Ajouter des propriétés personnalisées si fournies
    if (metadata) {
      fileMetadata.properties = {
        entityType: metadata.entityType || '',
        entityId: metadata.entityId || '',
        originalName: metadata.originalName || fileName,
        uploadDate: new Date().toISOString()
      };
    }

    // Upload du fichier
    const media = {
      mimeType: this.getMimeType(filePath),
      body: fs.createReadStream(filePath)
    };

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink'
    });

    logger.info(`Fichier uploadé sur Drive: ${fileName} (${response.data.id})`);

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink
    };
  }

  // Supprimer un fichier de Google Drive
  async deleteFile(fileId: string): Promise<void> {
    if (!this.drive) throw new Error('Service non initialisé');

    await this.drive.files.delete({
      fileId: fileId
    });

    logger.info(`Fichier supprimé de Drive: ${fileId}`);
  }

  // Obtenir le type MIME d'un fichier
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Vérifier si le service est configuré
  isConfigured(): boolean {
    return !!(this.config && this.config.refreshToken && this.drive);
  }

  // Obtenir les informations du compte
  async getAccountInfo(): Promise<any> {
    if (!this.drive) throw new Error('Service non configuré');

    const response = await this.drive.about.get({
      fields: 'user, storageQuota'
    });

    return response.data;
  }
}

// Instance singleton
export const googleDriveService = new GoogleDriveService();