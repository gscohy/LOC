import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, MapPin, Building } from 'lucide-react';

import { Proprietaire } from '@/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
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

interface ProprietaireFormProps {
  initialData?: Proprietaire;
  onSubmit: (data: Omit<Proprietaire, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

const typeOptions = [
  { value: 'PHYSIQUE', label: 'Personne physique' },
  { value: 'MORALE', label: 'Personne morale' },
];

const ProprietaireForm: React.FC<ProprietaireFormProps> = ({
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

  const handleFormSubmit = (data: ProprietaireFormData) => {
    const submitData = {
      ...data,
      telephone: data.telephone || null,
      entreprise: data.entreprise || null,
      siret: data.siret || null,
    };
    onSubmit(submitData as Omit<Proprietaire, 'id' | 'createdAt' | 'updatedAt'>);
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
      </div>

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
        <Button type="submit" loading={loading}>
          {initialData ? 'Modifier' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};

export default ProprietaireForm;