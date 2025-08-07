import React, { useState, useCallback, useEffect } from 'react';
import { Upload, X, FileText, Loader } from 'lucide-react';
import documentService, { DocumentUploadData } from '../../services/documentService';

interface DocumentUploadProps {
  categorie: 'CONTRAT' | 'LOCATAIRE' | 'GARANT' | 'BIEN';
  entityId: string;
  onUploadSuccess?: (document: any) => void;
  onError?: (error: string) => void;
  className?: string;
  multiple?: boolean;
  acceptedTypes?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  categorie,
  entityId,
  onUploadSuccess,
  onError,
  className = '',
  multiple = false,
  acceptedTypes = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.txt'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Force reset state on mount pour éviter les états bloqués
  useEffect(() => {
    setIsUploading(false);
    setSelectedFiles([]);
    setUploadProgress({});
  }, []);

  // Types de documents selon la catégorie
  const documentTypes = documentService.getDocumentTypes(categorie);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (multiple) {
      setSelectedFiles(prev => [...prev, ...files]);
    } else {
      setSelectedFiles(files.slice(0, 1));
    }
  }, [multiple]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (multiple) {
      setSelectedFiles(prev => [...prev, ...files]);
    } else {
      setSelectedFiles(files.slice(0, 1));
    }
  }, [multiple]);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const getEntityIdField = () => {
    switch (categorie) {
      case 'CONTRAT': return 'contratId';
      case 'LOCATAIRE': return 'locataireId';
      case 'GARANT': return 'garantId';
      case 'BIEN': return 'bienId';
      default: return 'contratId';
    }
  };

  const uploadFile = async (file: File, typeDoc: string, description?: string) => {
    const uploadData: DocumentUploadData = {
      categorie,
      typeDoc,
      [getEntityIdField()]: entityId,
      description
    } as DocumentUploadData;

    try {
      const response = await documentService.uploadDocument(file, uploadData);
      return response.data;
    } catch (error: any) {
      console.error('Erreur upload:', error);
      throw new Error(error.response?.data?.error || 'Erreur lors de l\'upload');
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setIsUploading(true);
      const uploadedDocuments = [];
      const errors = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileId = `${file.name}-${i}`;
        
        try {
          setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
          
          // Pour la démo, on utilise le premier type de document disponible
          // Dans une vraie interface, l'utilisateur pourrait choisir
          const defaultType = documentTypes[0]?.value || 'AUTRE';
          
          const document = await uploadFile(file, defaultType);
          uploadedDocuments.push(document);
          
          setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
          
          if (onUploadSuccess) {
            onUploadSuccess(document);
          }
        } catch (error: any) {
          console.error('Erreur upload fichier:', error);
          errors.push(`${file.name}: ${error.message}`);
          setUploadProgress(prev => ({ ...prev, [fileId]: -1 }));
        }
      }

      if (errors.length > 0 && onError) {
        onError(errors.join('\n'));
      }

      // Reset après quelques secondes
      setTimeout(() => {
        setSelectedFiles([]);
        setUploadProgress({});
        setIsUploading(false);
      }, 2000);

    } catch (error: any) {
      console.error('Erreur générale upload:', error);
      
      // Force reset en cas d'erreur générale
      setSelectedFiles([]);
      setUploadProgress({});
      setIsUploading(false);
      
      if (onError) {
        onError('Erreur générale lors de l\'upload');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    return documentService.formatFileSize(bytes);
  };

  // Debug temporaire
  console.log('DocumentUpload Debug:', {
    isDragging,
    isUploading,
    selectedFiles: selectedFiles.length,
    entityId,
    categorie
  });

  return (
    <div className={`document-upload ${className}`}>
      {/* Debug info (temporary) */}
      <div style={{background: '#ffe0e0', padding: '8px', marginBottom: '8px', fontSize: '11px'}}>
        <strong>Upload Debug:</strong><br/>
        Is Uploading: {isUploading ? 'OUI (grisé)' : 'Non'}<br/>
        Selected Files: {selectedFiles.length}<br/>
        Entity ID: {entityId}<br/>
        Category: {categorie}<br/>
        <button 
          onClick={() => {
            setIsUploading(false);
            setSelectedFiles([]);
            setUploadProgress({});
          }}
          style={{marginTop: '4px', padding: '2px 6px', fontSize: '10px', background: '#fff', border: '1px solid #ccc'}}
        >
          Reset État
        </button>
      </div>
      
      {/* Zone de drop */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : 'pointer-events-auto'}
        `}
        style={{ 
          pointerEvents: isUploading ? 'none' : 'auto'
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-2">
          <Upload className="w-8 h-8 text-gray-400" />
          <div className="text-sm text-gray-600">
            <label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:text-blue-700">
              Cliquez pour sélectionner
            </label>
            {' '}ou glissez-déposez vos fichiers ici
          </div>
          <div className="text-xs text-gray-500">
            Formats acceptés: PDF, Word, Images, Texte (max 10MB)
          </div>
        </div>

        <input
          id="file-upload"
          type="file"
          multiple={multiple}
          accept={acceptedTypes}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
          style={{ 
            pointerEvents: isUploading ? 'none' : 'auto'
          }}
        />
      </div>

      {/* Liste des fichiers sélectionnés */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-900">
            Fichiers sélectionnés ({selectedFiles.length})
          </h4>
          
          <div className="space-y-2">
            {selectedFiles.map((file, index) => {
              const fileId = `${file.name}-${index}`;
              const progress = uploadProgress[fileId];
              
              return (
                <div key={fileId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3 flex-1">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </div>
                      
                      {/* Barre de progression */}
                      {progress !== undefined && progress >= 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              progress === 100 
                                ? 'bg-green-500' 
                                : progress === -1 
                                ? 'bg-red-500' 
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {!isUploading && (
                    <button
                      onClick={() => removeFile(index)}
                      className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {progress === 100 && (
                    <div className="ml-2 text-green-500">
                      ✓
                    </div>
                  )}

                  {progress === -1 && (
                    <div className="ml-2 text-red-500">
                      ✗
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bouton d'upload */}
          <div className="flex justify-end mt-4">
            <button
              onClick={handleUpload}
              disabled={isUploading || selectedFiles.length === 0}
              className="
                inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md
                text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isUploading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
              {isUploading ? 'Upload en cours...' : `Uploader ${selectedFiles.length} fichier(s)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;