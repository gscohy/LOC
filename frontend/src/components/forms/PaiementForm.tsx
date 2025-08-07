import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Euro, 
  Calendar, 
  CreditCard, 
  User, 
  FileText, 
  AlertCircle, 
  Info,
  CheckCircle,
} from 'lucide-react';

import { paiementsService, PaiementCreate } from '@/services/paiements';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';

// Schéma de validation
const paiementSchema = z.object({
  loyerId: z.string().min(1, 'Le loyer est requis'),
  montant: z.number()
    .min(0.01, 'Le montant doit être supérieur à 0')
    .max(10000, 'Le montant ne peut pas dépasser 10 000€'),
  date: z.string().min(1, 'La date est requise'),
  mode: z.string().min(1, 'Le mode de paiement est requis'),
  payeur: z.string().min(1, 'Le nom du payeur est requis'),
  reference: z.string().optional(),
  commentaires: z.string().optional(),
});

type PaiementFormData = z.infer<typeof paiementSchema>;

interface PaiementFormProps {
  loyer: {
    id: string;
    mois: number;
    annee: number;
    montantDu: number;
    montantPaye: number;
    statut: string;
    contrat?: {
      locataires: Array<{
        locataire: {
          nom: string;
          prenom: string;
        };
      }>;
    };
  };
  onSubmit: (data: PaiementCreate) => void;
  onCancel: () => void;
  loading?: boolean;
  initialData?: Partial<PaiementCreate>;
}

const PaiementForm: React.FC<PaiementFormProps> = ({
  loyer,
  onSubmit,
  onCancel,
  loading = false,
  initialData,
}) => {
  const [warnings, setWarnings] = useState<string[]>([]);
  const [montantMaximum, setMontantMaximum] = useState(0);

  const modesPaiement = paiementsService.getModesPaiement();
  const payeursSuggeres = loyer.contrat ? paiementsService.suggestPayeurs(loyer.contrat) : [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<PaiementFormData>({
    resolver: zodResolver(paiementSchema),
    defaultValues: {
      loyerId: loyer.id,
      montant: initialData?.montant || undefined,
      date: initialData?.date || paiementsService.getTodayISOString(),
      mode: initialData?.mode || '',
      payeur: initialData?.payeur || '',
      reference: initialData?.reference || '',
      commentaires: initialData?.commentaires || '',
    },
    mode: 'onChange',
  });

  // Calculer le montant maximum
  useEffect(() => {
    const max = paiementsService.calculateMontantMaximum(loyer);
    setMontantMaximum(max);
  }, [loyer]);

  // Surveiller les changements pour afficher les avertissements
  const watchedValues = watch();
  useEffect(() => {
    if (watchedValues.montant) {
      const validation = paiementsService.validatePaiementForLoyer(watchedValues, loyer);
      setWarnings(validation.warnings);
    } else {
      setWarnings([]);
    }
  }, [watchedValues, loyer]);

  const handleFormSubmit = (data: PaiementFormData) => {
    onSubmit({
      ...data,
      montant: Number(data.montant),
    });
  };

  const handlePayeurSelect = (payeur: string) => {
    setValue('payeur', payeur, { shouldValidate: true });
  };

  const handleMontantSuggestion = (montant: number) => {
    setValue('montant', montant, { shouldValidate: true });
  };

  const getMonthName = (mois: number): string => {
    const moisNoms = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return moisNoms[mois - 1] || `Mois ${mois}`;
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Informations du loyer */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2 flex items-center">
          <Info className="h-4 w-4 mr-2" />
          Loyer concerné
        </h3>
        <div className="text-sm text-blue-800">
          <div>Période: {getMonthName(loyer.mois)} {loyer.annee}</div>
          <div>Montant dû: {paiementsService.formatCurrency(loyer.montantDu)}</div>
          <div>Déjà payé: {paiementsService.formatCurrency(loyer.montantPaye)}</div>
          <div className="font-medium">
            Reste à payer: {paiementsService.formatCurrency(montantMaximum)}
          </div>
        </div>
      </div>

      {/* Montant */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Montant du paiement *
        </label>
        <div className="relative">
          <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max={montantMaximum}
            placeholder="0.00"
            className="pl-10"
            {...register('montant', { valueAsNumber: true })}
            error={errors.montant?.message}
          />
        </div>
        
        {/* Suggestions de montant */}
        {montantMaximum > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleMontantSuggestion(montantMaximum)}
              className="text-xs"
            >
              Solde complet ({paiementsService.formatCurrency(montantMaximum)})
            </Button>
            {montantMaximum > 100 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleMontantSuggestion(Math.round(montantMaximum / 2))}
                className="text-xs"
              >
                Moitié ({paiementsService.formatCurrency(Math.round(montantMaximum / 2))})
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Date de paiement */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date de paiement *
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="date"
            className="pl-10"
            {...register('date')}
            error={errors.date?.message}
            max={paiementsService.getTodayISOString()}
          />
        </div>
      </div>

      {/* Mode de paiement */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mode de paiement *
        </label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Select
            className="pl-10"
            {...register('mode')}
            error={errors.mode?.message}
            options={[
              { value: '', label: 'Sélectionner un mode' },
              ...modesPaiement.map((mode) => ({
                value: mode.value,
                label: mode.label
              }))
            ]}
          />
        </div>
      </div>

      {/* Payeur */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Nom du payeur *
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Nom et prénom du payeur"
            className="pl-10"
            {...register('payeur')}
            error={errors.payeur?.message}
          />
        </div>
        
        {/* Suggestions de payeurs */}
        {payeursSuggeres.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {payeursSuggeres.map((payeur, index) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePayeurSelect(payeur)}
                className="text-xs"
              >
                {payeur}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Référence */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Référence {watch('mode') === 'CHEQUE' && '*'}
        </label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={
              watch('mode') === 'CHEQUE' ? 'Numéro de chèque' :
              watch('mode') === 'VIREMENT' ? 'Référence du virement' :
              'Référence (optionnel)'
            }
            className="pl-10"
            {...register('reference')}
            error={errors.reference?.message}
          />
        </div>
      </div>

      {/* Commentaires */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Commentaires
        </label>
        <Textarea
          placeholder="Commentaires ou notes sur ce paiement (optionnel)"
          rows={3}
          {...register('commentaires')}
          error={errors.commentaires?.message}
        />
      </div>

      {/* Avertissements */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <div className="font-medium mb-1">Attention :</div>
              <ul className="list-disc list-inside space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
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
          disabled={!isValid || montantMaximum <= 0}
          className="flex items-center"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {initialData ? 'Modifier le paiement' : 'Enregistrer le paiement'}
        </Button>
      </div>
    </form>
  );
};

export default PaiementForm;