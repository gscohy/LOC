import React, { useState, useEffect } from 'react';
import { Upload, X, FileText, Loader, Check, AlertCircle } from 'lucide-react';
import documentService, { DocumentUploadData } from '../../services/documentService';

interface SimpleFileUploadProps {
  categorie: 'CONTRAT' | 'LOCATAIRE' | 'GARANT' | 'BIEN';
  entityId: string;
  onUploadSuccess?: (document: any) => void;
  onError?: (error: string) => void;
  className?: string;
  multiple?: boolean;
}

const SimpleFileUpload: React.FC<SimpleFileUploadProps> = ({
  categorie,
  entityId,
  onUploadSuccess,
  onError,
  className = '',
  multiple = true
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ [key: string]: { success: boolean; message: string; document?: any } }>({});

  // Types de documents selon la catégorie
  const documentTypes = documentService.getDocumentTypes(categorie);

  // Reset à chaque changement d'entité
  useEffect(() => {
    setSelectedFiles([]);
    setUploadResults({});
    setIsUploading(false);
  }, [entityId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    setUploadResults({});
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    // Nettoyer les résultats pour ce fichier
    const fileKey = `file-${index}`;
    setUploadResults(prev => {
      const newResults = { ...prev };
      delete newResults[fileKey];
      return newResults;
    });
  };

  const getEntityIdField = () => {
    switch (categorie) {
      case 'CONTRAT': return 'contratId';
      case 'LOCATAIRE': return 'locataireId';
      case 'GARANT': return 'garantId';
      case 'BIEN': return 'bienId';
      default: return 'contratId';
    }
  };

  const uploadFile = async (file: File, typeDoc: string) => {
    const uploadData: DocumentUploadData = {
      categorie,
      typeDoc,
      [getEntityIdField()]: entityId,
      description: `${file.name} - Uploadé le ${new Date().toLocaleDateString()}`
    } as DocumentUploadData;

    return await documentService.uploadDocument(file, uploadData);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    const results: { [key: string]: { success: boolean; message: string; document?: any } } = {};

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileKey = `file-${i}`;
      
      try {
        // Utiliser le premier type de document par défaut
        const defaultType = documentTypes[0]?.value || 'AUTRE';
        
        const response = await uploadFile(file, defaultType);
        
        results[fileKey] = {
          success: true,
          message: 'Upload réussi',
          document: response.data
        };

        if (onUploadSuccess) {
          onUploadSuccess(response.data);
        }
      } catch (error: any) {
        console.error('Erreur upload:', error);
        results[fileKey] = {
          success: false,
          message: error.response?.data?.error || error.message || 'Erreur inconnue'
        };
      }
    }

    setUploadResults(results);
    setIsUploading(false);

    // Compter les erreurs
    const errors = Object.values(results).filter(r => !r.success);
    if (errors.length > 0 && onError) {
      onError(`${errors.length} fichier(s) ont échoué`);
    }
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setUploadResults({});
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const allUploaded = selectedFiles.length > 0 && Object.keys(uploadResults).length === selectedFiles.length;
  const hasErrors = Object.values(uploadResults).some(r => !r.success);
  const hasSuccess = Object.values(uploadResults).some(r => r.success);

  return (
    <div className={`simple-file-upload ${className}`}>
      {/* Sélection de fichiers */}
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          
          <div className="mb-4">
            <label htmlFor="file-input" className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer transition-colors">
              <FileText className="w-4 h-4 mr-2" />
              {selectedFiles.length > 0 ? 'Changer les fichiers' : 'Sélectionner des fichiers'}
            </label>
            <input
              id="file-input"
              type="file"
              multiple={multiple}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.txt"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
          </div>
          
          <p className="text-sm text-gray-500">
            Formats acceptés: PDF, Word, Images, Texte (max 10MB par fichier)
          </p>
        </div>
      </div>

      {/* Liste des fichiers sélectionnés */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              {selectedFiles.length} fichier(s) sélectionné(s)
            </h4>
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-gray-500 hover:text-red-600"
              disabled={isUploading}
            >
              Tout effacer
            </button>
          </div>

          <div className="space-y-2">
            {selectedFiles.map((file, index) => {
              const fileKey = `file-${index}`;
              const result = uploadResults[fileKey];
              
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-3 flex-1">
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </div>
                      {result && (
                        <div className={`text-xs mt-1 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                          {result.success ? '✅ ' : '❌ '}{result.message}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Statut */}
                    {result ? (
                      result.success ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )
                    ) : isUploading ? (
                      <Loader className="w-4 h-4 animate-spin text-blue-500" />
                    ) : null}

                    {/* Bouton supprimer */}
                    {!isUploading && (
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Boutons d'action */}
          {!allUploaded && (
            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || selectedFiles.length === 0}
                className="inline-flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                {isUploading ? 'Upload en cours...' : `Uploader ${selectedFiles.length} fichier(s)`}
              </button>
            </div>
          )}

          {/* Résumé final */}
          {allUploaded && (
            <div className={`p-3 rounded-lg border ${
              hasErrors ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
            }`}>
              <div className={`text-sm font-medium ${
                hasErrors ? 'text-yellow-800' : 'text-green-800'
              }`}>
                {hasErrors && hasSuccess ? (
                  <>⚠️ Upload partiel : {Object.values(uploadResults).filter(r => r.success).length} réussi(s), {Object.values(uploadResults).filter(r => !r.success).length} échoué(s)</>
                ) : hasSuccess ? (
                  <>✅ Tous les fichiers ont été uploadés avec succès !</>
                ) : (
                  <>❌ Tous les uploads ont échoué</>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleFileUpload;