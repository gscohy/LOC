import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { CloudIcon, CheckCircle, AlertCircle, Loader2, Settings, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { googleDriveService, GoogleDriveConfig } from '@/services/googleDrive';

const GoogleDriveSettings: React.FC = () => {
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [config, setConfig] = useState<GoogleDriveConfig>({
    clientId: '',
    clientSecret: '',
    redirectUri: window.location.origin + '/settings/google-drive/callback'
  });

  const queryClient = useQueryClient();

  // Récupérer le statut Google Drive
  const { data: status, isLoading: statusLoading } = useQuery(
    'googleDriveStatus',
    () => googleDriveService.getStatus(),
    { refetchInterval: 30000 } // Actualiser toutes les 30 secondes
  );

  // Configuration Google Drive
  const configureMutation = useMutation(googleDriveService.configure, {
    onSuccess: (data) => {
      setAuthUrl(data.authUrl);
      toast.success('Configuration créée ! Veuillez autoriser l\'accès à Google Drive');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur de configuration');
    },
  });

  // Traitement du code d'autorisation
  const callbackMutation = useMutation(googleDriveService.handleCallback, {
    onSuccess: () => {
      queryClient.invalidateQueries('googleDriveStatus');
      setAuthCode('');
      setAuthUrl('');
      setConfigModalOpen(false);
      toast.success('Google Drive configuré avec succès !');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur d\'autorisation');
    },
  });

  // Synchronisation des fichiers existants
  const syncMutation = useMutation(googleDriveService.syncExisting, {
    onSuccess: () => {
      toast.success('Synchronisation des fichiers existants lancée');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur de synchronisation');
    },
  });

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    configureMutation.mutate(config);
  };

  const handleAuthCallback = (e: React.FormEvent) => {
    e.preventDefault();
    if (authCode.trim()) {
      callbackMutation.mutate(authCode.trim());
    }
  };

  const openGoogleDrive = () => {
    window.open('https://drive.google.com', '_blank');
  };

  const formatStorageSize = (bytes: string): string => {
    const size = parseInt(bytes);
    if (size >= 1e12) return `${(size / 1e12).toFixed(1)} TB`;
    if (size >= 1e9) return `${(size / 1e9).toFixed(1)} GB`;
    if (size >= 1e6) return `${(size / 1e6).toFixed(1)} MB`;
    return `${(size / 1e3).toFixed(1)} KB`;
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
            <CloudIcon className="h-6 w-6 mr-3 text-blue-600" />
            Google Drive
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Sauvegardez automatiquement vos documents, quittances et rappels sur Google Drive
          </p>
        </div>
        {!status?.isConfigured && (
          <Button
            onClick={() => setConfigModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurer
          </Button>
        )}
      </div>

      {/* Statut de la configuration */}
      <div className="card">
        <div className="p-6">
          {statusLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Vérification du statut...</span>
            </div>
          ) : status?.isConfigured ? (
            <div className="space-y-4">
              <div className="flex items-center">
                <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Google Drive configuré</h3>
                  <p className="text-sm text-gray-600">
                    La sauvegarde automatique est active
                  </p>
                </div>
              </div>

              {status.accountInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Compte Google</h4>
                    <p className="text-sm text-gray-600">{status.accountInfo.user.displayName}</p>
                    <p className="text-sm text-gray-500">{status.accountInfo.user.emailAddress}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Stockage</h4>
                    <p className="text-sm text-gray-600">
                      Utilisé: {formatStorageSize(status.accountInfo.storageQuota.usage)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Limite: {formatStorageSize(status.accountInfo.storageQuota.limit)}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{
                          width: `${(parseInt(status.accountInfo.storageQuota.usage) / parseInt(status.accountInfo.storageQuota.limit)) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={openGoogleDrive}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Ouvrir Google Drive
                </Button>
                <Button
                  variant="outline"
                  onClick={() => syncMutation.mutate()}
                  loading={syncMutation.isLoading}
                >
                  <CloudIcon className="h-4 w-4 mr-2" />
                  Synchroniser les fichiers existants
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfigModalOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Reconfigurer
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Google Drive non configuré
              </h3>
              <p className="text-gray-600 mb-4">
                Configurez Google Drive pour sauvegarder automatiquement vos documents
              </p>
              <Button
                onClick={() => setConfigModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurer maintenant
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de configuration */}
      <Modal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        title="Configurer Google Drive"
        size="lg"
      >
        <div className="space-y-6">
          {!authUrl ? (
            <form onSubmit={handleConfigSubmit} className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  Étape 1: Créer une application Google
                </h4>
                <p className="text-sm text-blue-800 mb-2">
                  Rendez-vous sur <a href="https://console.developers.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a> et suivez ces étapes :
                </p>
                <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                  <li>Créez un nouveau projet ou sélectionnez-en un</li>
                  <li>Activez l'API Google Drive</li>
                  <li>Créez des identifiants OAuth 2.0</li>
                  <li>Ajoutez cette URL de redirection : <code className="bg-blue-200 px-1 rounded">{config.redirectUri}</code></li>
                </ol>
              </div>

              <Input
                label="Client ID"
                value={config.clientId}
                onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                placeholder="Votre Client ID Google"
                required
              />

              <Input
                label="Client Secret"
                type="password"
                value={config.clientSecret}
                onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                placeholder="Votre Client Secret Google"
                required
              />

              <Input
                label="URL de redirection"
                value={config.redirectUri}
                onChange={(e) => setConfig({ ...config, redirectUri: e.target.value })}
                placeholder="URL de redirection"
                required
                readOnly
              />

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfigModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  loading={configureMutation.isLoading}
                >
                  Configurer
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">
                  Étape 2: Autoriser l'accès
                </h4>
                <p className="text-sm text-green-800 mb-3">
                  Cliquez sur le lien ci-dessous pour autoriser l'accès à votre Google Drive :
                </p>
                <a
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Autoriser Google Drive
                </a>
              </div>

              <form onSubmit={handleAuthCallback} className="space-y-4">
                <Input
                  label="Code d'autorisation"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Collez le code d'autorisation ici"
                  required
                />

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAuthUrl('');
                      setAuthCode('');
                    }}
                  >
                    Retour
                  </Button>
                  <Button
                    type="submit"
                    loading={callbackMutation.isLoading}
                  >
                    Finaliser la configuration
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default GoogleDriveSettings;