import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { Upload, X, Check, FileImage } from 'lucide-react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface SignatureUploadProps {
  proprietaireId: string;
  currentSignature?: string;
  isOpen: boolean;
  onClose: () => void;
}

const SignatureUpload: React.FC<SignatureUploadProps> = ({
  proprietaireId,
  currentSignature,
  isOpen,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const queryClient = useQueryClient();

  const uploadMutation = useMutation(
    async (file: File) => {
      const formData = new FormData();
      formData.append('signature', file);
      const response = await api.post(`/proprietaires/${proprietaireId}/signature`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['proprietaire', proprietaireId]);
        queryClient.invalidateQueries('proprietaires');
        toast.success('Signature uploadée avec succès');
        onClose();
        setSelectedFile(null);
        setPreview(null);
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error?.message || 'Erreur lors de l\'upload');
      },
    }
  );

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Seules les images sont autorisées');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 5MB');
      return;
    }

    setSelectedFile(file);

    // Créer un aperçu
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleSubmit = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Uploader une signature"
      size="md"
    >
      <div className="space-y-6">
        {/* Signature actuelle */}
        {currentSignature && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Signature actuelle
            </label>
            <div className="p-4 border rounded-lg bg-gray-50">
              <img 
                src={currentSignature} 
                alt="Signature actuelle"
                className="max-h-20 border rounded"
                style={{ maxWidth: '200px' }}
              />
            </div>
          </div>
        )}

        {/* Zone de drop */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Nouvelle signature
          </label>
          
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {!preview ? (
              <div className="space-y-2">
                <FileImage className="mx-auto h-8 w-8 text-gray-400" />
                <div className="text-sm text-gray-600">
                  <label className="cursor-pointer">
                    <span className="font-medium text-blue-600 hover:text-blue-500">
                      Cliquez pour sélectionner
                    </span>
                    <span> ou glissez-déposez</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG jusqu'à 5MB
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative inline-block">
                  <img 
                    src={preview} 
                    alt="Aperçu"
                    className="max-h-32 border rounded shadow-sm"
                    style={{ maxWidth: '250px' }}
                  />
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  {selectedFile?.name}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={uploadMutation.isLoading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || uploadMutation.isLoading}
            loading={uploadMutation.isLoading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Uploader
          </Button>
        </div>

        {/* Informations */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <Check className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                À propos des signatures
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>La signature sera automatiquement ajoutée aux quittances</li>
                  <li>Format recommandé : PNG avec fond transparent</li>
                  <li>Taille idéale : 200x80 pixels maximum</li>
                  <li>La signature remplacera l'ancienne version</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SignatureUpload;