import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, MapPin, Building } from 'lucide-react';

import { Proprietaire } from '@/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

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

interface ProprietaireFormFixedProps {
  initialData?: Proprietaire;
  onSubmit: (data: Omit<Proprietaire, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

const ProprietaireFormFixed: React.FC<ProprietaireFormFixedProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
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

  const onFormSubmit = (data: ProprietaireFormData) => {
    onSubmit(data as any);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Type de propriétaire */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <User className="inline h-4 w-4 mr-1" />
          Type de propriétaire *
        </label>
        <select
          {...register('type')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="PHYSIQUE">Personne physique</option>
          <option value="MORALE">Personne morale</option>
        </select>
        {errors.type && (
          <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
        )}
      </div>

      {/* Informations personnelles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nom *"
          {...register('nom')}
          error={errors.nom?.message}
          icon={<User className="h-4 w-4" />}
        />
        <Input
          label="Prénom *"
          {...register('prenom')}
          error={errors.prenom?.message}
          icon={<User className="h-4 w-4" />}
        />
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Email *"
          type="email"
          {...register('email')}
          error={errors.email?.message}
          icon={<Mail className="h-4 w-4" />}
        />
        <Input
          label="Téléphone"
          type="tel"
          {...register('telephone')}
          error={errors.telephone?.message}
          icon={<Phone className="h-4 w-4" />}
        />
      </div>

      {/* Adresse */}
      <div className="space-y-4">
        <Input
          label="Adresse *"
          {...register('adresse')}
          error={errors.adresse?.message}
          icon={<MapPin className="h-4 w-4" />}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Code postal *"
            {...register('codePostal')}
            error={errors.codePostal?.message}
          />
          <Input
            label="Ville *"
            {...register('ville')}
            error={errors.ville?.message}
          />
        </div>
      </div>

      {/* Informations entreprise (si personne morale) */}
      {watchedType === 'MORALE' && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 flex items-center">
            <Building className="h-4 w-4 mr-2" />
            Informations entreprise
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nom de l'entreprise"
              {...register('entreprise')}
              error={errors.entreprise?.message}
            />
            <Input
              label="Numéro SIRET"
              {...register('siret')}
              error={errors.siret?.message}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
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
          {initialData ? 'Modifier' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};

export default ProprietaireFormFixed;