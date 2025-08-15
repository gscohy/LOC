import { api } from '../lib/api';

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleDriveStatus {
  isConfigured: boolean;
  accountInfo?: {
    user: {
      displayName: string;
      emailAddress: string;
    };
    storageQuota: {
      limit: string;
      usage: string;
      usageInDrive: string;
    };
  };
}

export const googleDriveService = {
  // Configurer Google Drive et obtenir l'URL d'autorisation
  async configure(config: GoogleDriveConfig): Promise<{ authUrl: string }> {
    const { data } = await api.post('/google-drive/configure', config);
    return data.data;
  },

  // Traiter le code d'autorisation
  async handleCallback(code: string): Promise<void> {
    await api.post('/google-drive/callback', { code });
  },

  // Obtenir le statut de la configuration
  async getStatus(): Promise<GoogleDriveStatus> {
    const { data } = await api.get('/google-drive/status');
    return data.data;
  },

  // Upload manuel d'un fichier
  async uploadFile(
    filePath: string, 
    fileName: string, 
    category?: string, 
    metadata?: any
  ): Promise<{ fileId: string; webViewLink: string }> {
    const { data } = await api.post('/google-drive/upload', {
      filePath,
      fileName,
      category,
      metadata
    });
    return data.data;
  },

  // Supprimer un fichier de Google Drive
  async deleteFile(fileId: string): Promise<void> {
    await api.delete(`/google-drive/file/${fileId}`);
  },

  // Synchroniser les fichiers existants
  async syncExisting(): Promise<void> {
    await api.post('/google-drive/sync-existing');
  }
};