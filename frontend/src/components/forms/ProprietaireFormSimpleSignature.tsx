import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, MapPin, Building } from 'lucide-react';
import toast from 'react-hot-toast';

import { Proprietaire } from '@/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { proprietairesService } from '@/services/proprietaires';

const proprietaireSchema = z.object({
  type: z.enum(['PHYSIQUE', 'MORALE']),
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().optional(),
  adresse: z.string().min(1, 'L\'adresse est requise'),
  codePostal: z.string().min(1, 'Le code postal est requis'),
  ville: z.string().min(1, 'La ville est requise'),
  entreprise: z.string().optional(),
  siret: z.string().optional(),
});

type ProprietaireFormData = z.infer<typeof proprietaireSchema>;

interface ProprietaireFormSimpleSignatureProps {
  initialData?: Proprietaire;
  onSubmit: (data: Omit<Proprietaire, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Proprietaire | void>;
  onCancel: () => void;
  loading?: boolean;
  onSignatureUploaded?: () => void; // Callback après upload signature
}

const typeOptions = [
  { value: 'PHYSIQUE', label: 'Personne physique' },
  { value: 'MORALE', label: 'Personne morale' },
];

const ProprietaireFormSimpleSignature: React.FC<ProprietaireFormSimpleSignatureProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  onSignatureUploaded,
}) => {
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureLoading, setSignatureLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProprietaireFormData>({
    resolver: zodResolver(proprietaireSchema),
    defaultValues: initialData
      ? {
          type: initialData.type,
          nom: initialData.nom,
          prenom: initialData.prenom,
          email: initialData.email,
          telephone: initialData.telephone || '',
          adresse: initialData.adresse,
          codePostal: initialData.codePostal,
          ville: initialData.ville,
          entreprise: initialData.entreprise || '',
          siret: initialData.siret || '',
        }
      : {
          type: 'PHYSIQUE',
          nom: '',
          prenom: '',
          email: '',
          telephone: '',
          adresse: '',
          codePostal: '',
          ville: '',
          entreprise: '',
          siret: '',
        },
  });

  const watchedType = watch('type');

  const handleFormSubmit = async (data: ProprietaireFormData) => {
    try {
      const submitData = {
        ...data,
        telephone: data.telephone || null,
        entreprise: data.entreprise || null,
        siret: data.siret || null,
      };
      
      // Soumettre les données du propriétaire
      const result = await onSubmit(submitData as Omit<Proprietaire, 'id' | 'createdAt' | 'updatedAt'>);
      
      // Si c'est une création et qu'on a une signature, uploader après création
      if (signatureFile && !initialData && result && 'id' in result) {
        setUploadingSignature(true);
        try {
          await proprietairesService.uploadSignature(result.id, signatureFile);
          toast.success('Propriétaire créé et signature uploadée avec succès !');
          if (onSignatureUploaded) onSignatureUploaded();
        } catch (error) {
          console.error('Erreur upload signature:', error);
          toast.error('Propriétaire créé mais erreur lors de l\'upload de la signature');
        } finally {
          setUploadingSignature(false);
        }
      } else if (signatureFile && initialData?.id) {
        // Cas de modification
        setUploadingSignature(true);
        try {
          await proprietairesService.uploadSignature(initialData.id, signatureFile);
          toast.success('Propriétaire modifié et signature uploadée avec succès !');
          if (onSignatureUploaded) onSignatureUploaded();
        } catch (error) {
          console.error('Erreur upload signature:', error);
          toast.error('Propriétaire modifié mais erreur lors de l\'upload de la signature');
        } finally {
          setUploadingSignature(false);
        }
      }
    } catch (error) {
      console.error('Erreur soumission formulaire:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validation simple
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux (max 5MB)');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Seules les images sont acceptées');
        return;
      }
      
      setSignatureFile(file);
      console.log('Fichier sélectionné:', file.name);
    }
  };

  const getSignatureUrl = () => {
    if (initialData?.signature) {
      // Extraire le nom du fichier du chemin complet
      let filename = '';
      if (initialData.signature.includes('\\') || initialData.signature.includes('/')) {
        filename = initialData.signature.split(/[/\\]/).pop() || '';
      } else {
        filename = initialData.signature;
      }
      
      // Utiliser la route publique pour servir la signature
      return `http://localhost:3002/public/signatures/${filename}`;
    }
    return undefined;
  };

  // Charger la signature en tant que Data URL
  useEffect(() => {
    const loadSignature = async () => {
      if (initialData?.signature && !signatureFile) {
        setSignatureLoading(true);
        try {
          const url = getSignatureUrl();
          if (url) {
            const response = await fetch(url);
            if (response.ok) {
              const blob = await response.blob();
              const reader = new FileReader();
              reader.onloadend = () => {
                setSignatureDataUrl(reader.result as string);
              };
              reader.readAsDataURL(blob);
            } else {
              console.error('Erreur lors du chargement de la signature:', response.status);
            }
          }
        } catch (error) {
          console.error('Erreur lors du chargement de la signature:', error);
        } finally {
          setSignatureLoading(false);
        }
      }
    };

    loadSignature();
  }, [initialData?.signature, signatureFile]);

  const handleDeleteSignature = async () => {
    if (!initialData?.id) return;
    
    if (window.confirm('Êtes-vous sûr de vouloir supprimer la signature ?')) {
      try {
        await proprietairesService.deleteSignature(initialData.id);
        setSignatureDataUrl(null); // Nettoyer la Data URL
        toast.success('Signature supprimée avec succès');
        if (onSignatureUploaded) onSignatureUploaded();
      } catch (error) {
        console.error('Erreur suppression signature:', error);
        toast.error('Erreur lors de la suppression de la signature');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Type */}
        <Select
          label="Type de propriétaire"
          options={typeOptions}
          error={errors.type?.message}
          {...register('type')}
        />

        {/* Informations personnelles */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Informations personnelles
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prénom"
              type="text"
              icon={<User className="h-4 w-4" />}
              placeholder="Jean"
              error={errors.prenom?.message}
              {...register('prenom')}
            />

            <Input
              label="Nom"
              type="text"
              icon={<User className="h-4 w-4" />}
              placeholder="Dupont"
              error={errors.nom?.message}
              {...register('nom')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              icon={<Mail className="h-4 w-4" />}
              placeholder="jean.dupont@email.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Téléphone"
              type="tel"
              icon={<Phone className="h-4 w-4" />}
              placeholder="06 12 34 56 78"
              error={errors.telephone?.message}
              {...register('telephone')}
            />
          </div>
        </div>

        {/* Informations professionnelles (si personne morale) */}
        {watchedType === 'MORALE' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Informations professionnelles
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Entreprise"
                type="text"
                icon={<Building className="h-4 w-4" />}
                placeholder="Nom de l'entreprise"
                error={errors.entreprise?.message}
                {...register('entreprise')}
              />

              <Input
                label="SIRET"
                type="text"
                placeholder="12345678901234"
                error={errors.siret?.message}
                {...register('siret')}
              />
            </div>
          </div>
        )}

        {/* Adresse */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Adresse</h3>
          
          <Input
            label="Adresse"
            type="text"
            icon={<MapPin className="h-4 w-4" />}
            placeholder="123 rue de la République"
            error={errors.adresse?.message}
            {...register('adresse')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code postal"
              type="text"
              placeholder="75001"
              error={errors.codePostal?.message}
              {...register('codePostal')}
            />

            <Input
              label="Ville"
              type="text"
              placeholder="Paris"
              error={errors.ville?.message}
              {...register('ville')}
            />
          </div>
        </div>

        {/* Signature */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Signature (optionnel)</h3>
          
          {/* Signature existante */}
          {initialData?.signature && !signatureFile && (
            <div className="mb-4 p-4 bg-gray-50 border rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Signature actuelle : 
                    {signatureLoading ? (
                      <span className="text-blue-600 ml-1">Chargement...</span>
                    ) : signatureDataUrl ? (
                      <span className="text-green-600 ml-1">Trouvée</span>
                    ) : (
                      <span className="text-red-600 ml-1">Non trouvée</span>
                    )}
                  </p>
                  
                  {signatureLoading ? (
                    <div className="flex items-center space-x-2 p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-gray-600">Chargement de la signature...</span>
                    </div>
                  ) : signatureDataUrl ? (
                    <div>
                      <img 
                        src={signatureDataUrl} 
                        alt="Signature actuelle" 
                        className="max-w-48 max-h-24 object-contain border rounded p-2 bg-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Chemin: {initialData.signature}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        ✅ Signature chargée avec succès
                      </p>
                    </div>
                  ) : (
                    <div className="text-red-600 text-sm p-2 border border-red-300 rounded bg-red-50">
                      ❌ Impossible de charger la signature
                      <br /><small>Chemin: {initialData.signature}</small>
                      <br /><a href={getSignatureUrl()} target="_blank" className="text-blue-600 underline">Tester le lien direct</a>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteSignature}
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  Supprimer
                </Button>
              </div>
            </div>
          )}
          
          {/* Upload zone */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Formats acceptés: PNG, JPG, GIF (max 5MB)
            </p>
            
            {signatureFile && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-700">
                  ✓ Nouvelle signature sélectionnée: {signatureFile.name}
                </p>
                <p className="text-xs text-green-600">
                  Sera uploadée après {initialData ? 'modification' : 'création'} du propriétaire
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading || uploadingSignature}
        >
          Annuler
        </Button>
        <Button 
          type="submit" 
          loading={loading}
          disabled={uploadingSignature}
        >
          {uploadingSignature 
            ? 'Upload signature...'
            : initialData ? 'Modifier' : 'Créer'
          }
        </Button>
      </div>
      
      {/* Indication upload en cours */}
      {uploadingSignature && (
        <div className="text-center py-2">
          <p className="text-sm text-blue-600">
            Upload de la signature en cours...
          </p>
        </div>
      )}
    </form>
  );
};

export default ProprietaireFormSimpleSignature;