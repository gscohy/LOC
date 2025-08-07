import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DocumentManager from '@/components/Documents/DocumentManager';

const locataireSchema = z.object({
  civilite: z.enum(['M', 'MME', 'MLLE']),
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(1, 'Le téléphone est requis'),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  codePostal: z.string().optional(),
  dateNaissance: z.string().optional(),
  profession: z.string().optional(),
  revenus: z.number().min(0, 'Les revenus ne peuvent pas être négatifs').optional(),
});

type LocataireFormData = z.infer<typeof locataireSchema>;

interface LocataireFormProps {
  initialData?: Partial<LocataireFormData>;
  locataireId?: string; // ID du locataire pour l'édition et les documents
  onSubmit: (data: LocataireFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  isEditing?: boolean;
}

const LocataireForm: React.FC<LocataireFormProps> = ({
  initialData,
  locataireId,
  onSubmit,
  onCancel,
  loading = false,
  isEditing = false,
}) => {
  const [showDocuments, setShowDocuments] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LocataireFormData>({
    resolver: zodResolver(locataireSchema),
    defaultValues: {
      civilite: 'M',
      revenus: 0,
      ...initialData,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Informations personnelles */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Informations personnelles</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Civilité *
            </label>
            <select
              {...register('civilite')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="M">Monsieur</option>
              <option value="MME">Madame</option>
              <option value="MLLE">Mademoiselle</option>
            </select>
            {errors.civilite && (
              <p className="mt-1 text-sm text-red-600">{errors.civilite.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom *
            </label>
            <Input
              {...register('nom')}
              error={errors.nom?.message}
              placeholder="Dupont"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prénom *
            </label>
            <Input
              {...register('prenom')}
              error={errors.prenom?.message}
              placeholder="Jean"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <Input
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="jean.dupont@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone *
            </label>
            <Input
              type="tel"
              {...register('telephone')}
              error={errors.telephone?.message}
              placeholder="06 12 34 56 78"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date de naissance
          </label>
          <Input
            type="date"
            {...register('dateNaissance')}
            error={errors.dateNaissance?.message}
          />
        </div>
      </div>

      {/* Adresse */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Adresse</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adresse
          </label>
          <Input
            {...register('adresse')}
            error={errors.adresse?.message}
            placeholder="123 rue de la Paix"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ville
            </label>
            <Input
              {...register('ville')}
              error={errors.ville?.message}
              placeholder="Paris"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code postal
            </label>
            <Input
              {...register('codePostal')}
              error={errors.codePostal?.message}
              placeholder="75001"
            />
          </div>
        </div>
      </div>

      {/* Informations professionnelles */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Informations professionnelles</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profession
            </label>
            <Input
              {...register('profession')}
              error={errors.profession?.message}
              placeholder="Ingénieur"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Revenus mensuels (€)
            </label>
            <Input
              type="number"
              step="0.01"
              {...register('revenus', { valueAsNumber: true })}
              error={errors.revenus?.message}
              placeholder="3500"
            />
          </div>
        </div>
      </div>

      {/* Section Documents */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Upload className="h-5 w-5 mr-2 text-orange-500" />
            Documents du locataire
          </h3>
          <button
            type="button"
            onClick={() => setShowDocuments(!showDocuments)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showDocuments ? 'Masquer' : 'Afficher'} les documents
          </button>
        </div>
        
        {locataireId && showDocuments && (
          <DocumentManager
            categorie="LOCATAIRE"
            entityId={locataireId}
            entityName={`${initialData?.prenom || ''} ${initialData?.nom || ''}`.trim() || 'Nouveau locataire'}
            allowUpload={true}
            allowDelete={true}
            allowEdit={true}
          />
        )}
        
        {!locataireId && (
          <div className="text-center py-6 text-gray-500">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">
              Les documents pourront être ajoutés après la création du locataire
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Exemples: fiches de paie, CNI, justificatifs de revenus, etc.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          loading={loading}
        >
          {isEditing ? 'Modifier' : 'Créer'} le locataire
        </Button>
      </div>
    </form>
  );
};

export default LocataireForm;