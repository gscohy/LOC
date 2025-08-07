import React, { useState, useRef } from 'react';
import { Upload, X, File, Image } from 'lucide-react';
import Button from './Button';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // en bytes
  currentFile?: string; // URL du fichier actuel
  label?: string;
  description?: string;
  preview?: boolean; // Afficher l'aperçu d'image
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB par défaut
  currentFile,
  label = 'Choisir un fichier',
  description,
  preview = true,
  className = '',
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    try {
      if (maxSize && file.size > maxSize) {
        return `Le fichier est trop volumineux. Taille maximum: ${Math.round(maxSize / 1024 / 1024)}MB`;
      }

      // Validation simplifiée pour éviter les erreurs
      if (accept && file.name) {
        const fileExtension = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
        const mimeType = file.type || '';
        
        // Extensions acceptées basiques
        const commonImageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        const commonDocExtensions = ['.pdf', '.doc', '.docx'];
        const allAcceptedExtensions = [...commonImageExtensions, ...commonDocExtensions];
        
        // Vérification simplifiée
        const hasValidExtension = allAcceptedExtensions.includes(fileExtension);
        const isImage = mimeType.startsWith('image/') || commonImageExtensions.includes(fileExtension);
        const isDocument = mimeType.includes('pdf') || mimeType.includes('document') || commonDocExtensions.includes(fileExtension);
        
        if (!hasValidExtension && !isImage && !isDocument) {
          return `Type de fichier non supporté: ${fileExtension}`;
        }
      }

      return null;
    } catch (error) {
      console.error('Erreur validation fichier:', error);
      return null; // En cas d'erreur, on accepte le fichier
    }
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError('');
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getFilePreview = () => {
    try {
      if (selectedFile) {
        return URL.createObjectURL(selectedFile);
      }
      return currentFile;
    } catch (error) {
      console.error('Erreur création URL fichier:', error);
      return null;
    }
  };

  const isImage = (file: string | File | null | undefined): boolean => {
    try {
      if (!file) return false;
      if (file instanceof File) {
        return file.type?.startsWith('image/') || false;
      }
      return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file);
    } catch (error) {
      console.error('Erreur vérification type image:', error);
      return false;
    }
  };

  try {
    return (
      <div className={`space-y-3 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}

      {/* Zone de drop */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Fichier sélectionné ou existant */}
        {(selectedFile || currentFile) ? (
          <div className="space-y-3">
            {/* Aperçu */}
            {preview && getFilePreview() && isImage(selectedFile || currentFile!) && (
              <div className="flex justify-center">
                <img
                  src={getFilePreview()}
                  alt="Aperçu"
                  className="max-w-32 max-h-32 object-contain rounded-lg border"
                />
              </div>
            )}

            {/* Info fichier */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center space-x-3">
                {isImage(selectedFile || currentFile!) ? (
                  <Image className="h-8 w-8 text-green-500" />
                ) : (
                  <File className="h-8 w-8 text-blue-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedFile ? selectedFile.name : 'Fichier actuel'}
                  </p>
                  {selectedFile && (
                    <p className="text-xs text-gray-500">
                      {Math.round(selectedFile.size / 1024)} KB
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openFileDialog}
                >
                  Changer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFile}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Zone de drop vide */
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={openFileDialog}
                className="inline-flex items-center"
              >
                <Upload className="h-4 w-4 mr-2" />
                {label}
              </Button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              ou glissez-déposez votre fichier ici
            </p>
            {maxSize && (
              <p className="mt-1 text-xs text-gray-400">
                Taille maximum: {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            )}
          </div>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Erreur rendu FileUpload:', error);
    return (
      <div className={`space-y-3 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="border-2 border-red-300 border-dashed rounded-lg p-6 bg-red-50">
          <div className="text-center text-red-600">
            <p className="text-sm">Erreur lors du chargement du composant de téléchargement</p>
            <p className="text-xs mt-1">Veuillez rafraîchir la page</p>
          </div>
        </div>
      </div>
    );
  }
};

export default FileUpload;