import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, MapPin, Building, FileSignature } from 'lucide-react';
import toast from 'react-hot-toast';

import { Proprietaire } from '@/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import FileUpload from '@/components/ui/FileUpload';
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

interface ProprietaireFormWithSignatureProps {
  initialData?: Proprietaire;
  onSubmit: (data: Omit<Proprietaire, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Proprietaire | void>;
  onCancel: () => void;
  loading?: boolean;
}

const typeOptions = [
  { value: 'PHYSIQUE', label: 'Personne physique' },
  { value: 'MORALE', label: 'Personne morale' },
];

const ProprietaireFormWithSignature: React.FC<ProprietaireFormWithSignatureProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);

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
          toast.success('Propriétaire créé et signature uploadée avec succès');
        } catch (error) {
          console.error('Erreur upload signature:', error);
          toast.error('Propriétaire créé mais erreur lors de l\'upload de la signature');
        } finally {
          setUploadingSignature(false);
        }
      }
    } catch (error) {
      console.error('Erreur soumission formulaire:', error);
    }
  };

  const handleUploadSignature = async () => {
    if (!signatureFile || !initialData?.id) return;

    setUploadingSignature(true);
    try {
      await proprietairesService.uploadSignature(initialData.id, signatureFile);
      toast.success('Signature uploadée avec succès');
      setSignatureFile(null);
    } catch (error) {
      console.error('Erreur upload signature:', error);
      toast.error('Erreur lors de l\'upload de la signature');
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleDeleteSignature = async () => {
    if (!initialData?.id) return;

    try {
      await proprietairesService.deleteSignature(initialData.id);
      toast.success('Signature supprimée avec succès');
    } catch (error) {
      console.error('Erreur suppression signature:', error);
      toast.error('Erreur lors de la suppression de la signature');
    }
  };

  const getSignatureUrl = () => {
    if (initialData?.signature) {
      // Construire l'URL pour accéder à la signature
      const filename = initialData.signature.split('/').pop() || initialData.signature.split('\\').pop();
      return `http://localhost:3002/uploads/signatures/${filename}`;
    }
    return undefined;
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
          <div className="flex items-center space-x-2">
            <FileSignature className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">Signature</h3>
          </div>
          
          <FileUpload
            label="Choisir une image de signature"
            description="Formats acceptés: PNG, JPG, GIF (max 5MB)"
            accept="image/*"
            maxSize={5 * 1024 * 1024}
            onFileSelect={setSignatureFile}
            currentFile={getSignatureUrl()}
            preview={true}
          />

          {/* Actions signature pour modification */}
          {initialData?.id && (
            <div className="flex space-x-3">
              {signatureFile && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUploadSignature}
                  loading={uploadingSignature}
                  className="text-green-600 hover:text-green-700"
                >
                  Uploader la signature
                </Button>
              )}
              
              {initialData.signature && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDeleteSignature}
                  className="text-red-600 hover:text-red-700"
                >
                  Supprimer la signature
                </Button>
              )}
            </div>
          )}

          {!initialData?.id && signatureFile && (
            <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded">
              La signature sera uploadée après la création du propriétaire.
            </div>
          )}
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
          {initialData ? 'Modifier' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};

export default ProprietaireFormWithSignature;