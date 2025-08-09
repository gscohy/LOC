import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from 'react-query';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { contratsService } from '@/services/contrats';

const loyerSchema = z.object({
  contratId: z.string().min(1, 'Le contrat est requis'),
  mois: z.number().min(1, 'Le mois doit être entre 1 et 12').max(12, 'Le mois doit être entre 1 et 12'),
  annee: z.number().min(2020, 'L\'année doit être valide').max(2030, 'L\'année doit être valide'),
  montantDu: z.number().min(0, 'Le montant dû doit être positif'),
  dateEcheance: z.string().min(1, 'La date d\'échéance est requise'),
  commentaires: z.string().optional(),
});

type LoyerFormData = z.infer<typeof loyerSchema>;

interface LoyerFormProps {
  initialData?: Partial<LoyerFormData>;
  onSubmit: (data: LoyerFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  isEditing?: boolean;
}

const MONTHS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
];

const LoyerForm: React.FC<LoyerFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  isEditing = false,
}) => {
  const { data: contratsData, isLoading: contratsLoading } = useQuery(
    ['contrats-actifs'],
    () => contratsService.getAll({ statut: 'ACTIF', limit: 1000 })
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoyerFormData>({
    resolver: zodResolver(loyerSchema),
    defaultValues: {
      mois: new Date().getMonth() + 1,
      annee: new Date().getFullYear(),
      montantDu: 0,
      ...initialData,
    },
  });

  const selectedContratId = watch('contratId');

  // Auto-fill montantDu when contract is selected
  useEffect(() => {
    if (selectedContratId && contratsData?.data) {
      const selectedContrat = contratsData.data.find(c => c.id === selectedContratId);
      if (selectedContrat) {
        setValue('montantDu', selectedContrat.loyer + (selectedContrat.chargesMensuelles || 0));
      }
    }
  }, [selectedContratId, contratsData?.data, setValue]);

  // Auto-calculate dateEcheance based on month, year and contract payment day
  useEffect(() => {
    const mois = watch('mois');
    const annee = watch('annee');
    
    if (mois && annee && selectedContratId && contratsData?.data) {
      const selectedContrat = contratsData.data.find(c => c.id === selectedContratId);
      const jourPaiement = selectedContrat?.jourPaiement || 1;
      
      // Create date for the payment day of the selected month/year
      const dateEcheance = new Date(annee, mois - 1, jourPaiement);
      setValue('dateEcheance', dateEcheance.toISOString().split('T')[0]);
    }
  }, [watch('mois'), watch('annee'), selectedContratId, contratsData?.data, setValue]);

  const contrats = contratsData?.data || [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Sélection du contrat */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Informations du loyer</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contrat *
          </label>
          {contratsLoading ? (
            <div className="animate-pulse bg-gray-200 h-10 rounded-md"></div>
          ) : (
            <select
              {...register('contratId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Sélectionner un contrat</option>
              {contrats.map((contrat) => (
                <option key={contrat.id} value={contrat.id}>
                  {contrat.bien?.adresse} - {contrat.locataires?.[0]?.locataire?.nom} {contrat.locataires?.[0]?.locataire?.prenom}
                  ({contrat.loyer}€/mois)
                </option>
              ))}
            </select>
          )}
          {errors.contratId && (
            <p className="mt-1 text-sm text-red-600">{errors.contratId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mois *
            </label>
            <select
              {...register('mois', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            {errors.mois && (
              <p className="mt-1 text-sm text-red-600">{errors.mois.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Année *
            </label>
            <Input
              type="number"
              {...register('annee', { valueAsNumber: true })}
              error={errors.annee?.message}
              placeholder="2024"
              min="2020"
              max="2030"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Montant dû (€) *
            </label>
            <Input
              type="number"
              step="0.01"
              {...register('montantDu', { valueAsNumber: true })}
              error={errors.montantDu?.message}
              placeholder="850.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date d'échéance *
            </label>
            <Input
              type="date"
              {...register('dateEcheance')}
              error={errors.dateEcheance?.message}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Commentaires
          </label>
          <textarea
            {...register('commentaires')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows={3}
            placeholder="Commentaires optionnels sur ce loyer..."
          />
          {errors.commentaires && (
            <p className="mt-1 text-sm text-red-600">{errors.commentaires.message}</p>
          )}
        </div>
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
          {isEditing ? 'Modifier' : 'Créer'} le loyer
        </Button>
      </div>
    </form>
  );
};

export default LoyerForm;