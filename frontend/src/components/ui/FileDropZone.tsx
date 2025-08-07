import React, { useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile?: File | null;
  onFileRemove?: () => void;
  accept?: string;
  maxSize?: number; // en bytes
  className?: string;
  label?: string;
  description?: string;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFileSelect,
  selectedFile,
  onFileRemove,
  accept = "image/*,.pdf,.doc,.docx",
  maxSize = 10 * 1024 * 1024, // 10MB par défaut
  className = "",
  label = "Fichier",
  description = "Glissez-déposez votre fichier ici ou cliquez pour parcourir"
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `Fichier trop volumineux (max ${Math.round(maxSize / (1024 * 1024))}MB)`;
    }

    // Validation du type si accept est spécifié
    if (accept) {
      const acceptTypes = accept.split(',').map(type => type.trim());
      const isValid = acceptTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        } else {
          return file.type.match(type.replace('*', '.*'));
        }
      });

      if (!isValid) {
        return `Format de fichier non supporté. Formats acceptés: ${accept}`;
      }
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }
    onFileSelect(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const inputId = `file-input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={className}>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer ${
          isDragOver 
            ? 'border-blue-400 bg-blue-50 scale-105' 
            : selectedFile
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileSelect(file);
            }
          }}
          className="hidden"
        />
        
        {!selectedFile ? (
          <div className="space-y-3">
            <div className="flex justify-center">
              {isDragOver ? (
                <Upload className="h-12 w-12 text-blue-500 animate-bounce" />
              ) : (
                <FileText className="h-12 w-12 text-gray-400" />
              )}
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-medium text-base">
                {isDragOver ? 'Déposez le fichier ici' : label}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {description}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-3">
              <FileText className="h-10 w-10 text-green-500" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex justify-center space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById(inputId)?.click();
                }}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                Changer
              </button>
              {onFileRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileRemove();
                  }}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center space-x-1"
                >
                  <X className="h-3 w-3" />
                  <span>Supprimer</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileDropZone;