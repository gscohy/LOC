import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from 'react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Calculator,
  CheckCircle,
} from 'lucide-react';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { resiliationService, ResiliationRequest } from '@/services/resiliation';

const resiliationSchema = z.object({
  dateFinReelle: z.string().min(1, 'La date de fin réelle est requise'),
  raisonResiliation: z.string().min(1, 'La raison de résiliation est requise'),
  dateDemandeResiliation: z.string().optional(),
  preavisRespect: z.boolean().default(true),
  commentairesResiliation: z.string().optional(),
}).refine((data) => {
  if (data.dateDemandeResiliation && data.dateFinReelle) {
    const dateDemande = new Date(data.dateDemandeResiliation);
    const dateFin = new Date(data.dateFinReelle);
    return dateFin >= dateDemande;
  }
  return true;
}, {
  message: 'La date de fin doit être postérieure ou égale à la date de demande',
  path: ['dateFinReelle'],
});

type ResiliationFormData = z.infer<typeof resiliationSchema>;

interface ResiliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contrat: {
    id: string;
    loyer: number;
    type?: string;
    bien?: {
      adresse: string;
    };
    locataires: Array<{
      locataire: {
        nom: string;
        prenom: string;
      };
    }>;
  };
  onSuccess: () => void;
}

const ResiliationModal: React.FC<ResiliationModalProps> = ({
  isOpen,
  onClose,
  contrat,
  onSuccess,
}) => {
  const [step, setStep] = useState<'form' | 'preview' | 'confirmation'>('form');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ResiliationFormData>({
    resolver: zodResolver(resiliationSchema),
    defaultValues: {
      dateDemandeResiliation: resiliationService.getTodayISOString(),
      preavisRespect: true,
    },
  });

  const watchedDateFin = watch('dateFinReelle');
  const watchedDateDemande = watch('dateDemandeResiliation');

  // Requête pour calculer les détails de résiliation
  const { data: resiliationDetails, isLoading: isCalculating } = useQuery(
    ['resiliation-details', contrat.id, watchedDateFin],
    () => resiliationService.calculateResiliationDetails(contrat.id, watchedDateFin),
    {
      enabled: !!watchedDateFin,
      staleTime: 30000, // 30 secondes
    }
  );

  // Mutation pour enregistrer la résiliation
  const resiliationMutation = useMutation(
    (formData: ResiliationRequest) => resiliationService.requestResiliation(contrat.id, formData),
    {
      onSuccess: () => {
        setStep('confirmation');
        toast.success('Résiliation enregistrée avec succès');
        onSuccess();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Erreur lors de la résiliation');
      },
    }
  );

  // Vérifier le préavis
  const isPreavisOk = watchedDateDemande && watchedDateFin
    ? resiliationService.isPreavisRespected(watchedDateDemande, watchedDateFin, contrat.type)
    : true;

  const handleFormSubmit = (_data: ResiliationFormData) => {
    setStep('preview');
  };

  const handleConfirmResiliation = () => {
    const formData = watch();
    resiliationMutation.mutate({
      ...formData,
      preavisRespect: isPreavisOk,
    });
  };

  const handleClose = () => {
    setStep('form');
    reset();
    onClose();
  };

  const raisonsResiliation = resiliationService.getRaisonsResiliation();
  const locatairesNames = contrat.locataires
    .map(cl => `${cl.locataire.prenom} ${cl.locataire.nom}`)
    .join(', ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Résiliation anticipée du contrat"
      size="lg"
    >
      {step === 'form' && (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Informations du contrat */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Informations du contrat</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Adresse:</span>
                <p className="font-medium">{contrat.bien?.adresse || 'Adresse non disponible'}</p>
              </div>
              <div>
                <span className="text-gray-600">Locataires:</span>
                <p className="font-medium">{locatairesNames}</p>
              </div>
              <div>
                <span className="text-gray-600">Loyer mensuel:</span>
                <p className="font-medium">{resiliationService.formatCurrency(contrat.loyer)}</p>
              </div>
            </div>
          </div>

          {/* Formulaire de résiliation */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin souhaitée *
                </label>
                <Input
                  type="date"
                  {...register('dateFinReelle')}
                  error={errors.dateFinReelle?.message}
                  min={watchedDateDemande || undefined}
                />
                <p className="mt-1 text-xs text-gray-500">
                  La date peut être antérieure à aujourd'hui mais doit être postérieure à la date de demande
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de la demande
                </label>
                <Input
                  type="date"
                  {...register('dateDemandeResiliation')}
                  error={errors.dateDemandeResiliation?.message}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Raison de la résiliation *
              </label>
              <select
                {...register('raisonResiliation')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Sélectionner une raison</option>
                {raisonsResiliation.map((raison) => (
                  <option key={raison.value} value={raison.value}>
                    {raison.label}
                  </option>
                ))}
              </select>
              {errors.raisonResiliation && (
                <p className="mt-1 text-sm text-red-600">{errors.raisonResiliation.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commentaires (optionnel)
              </label>
              <textarea
                {...register('commentairesResiliation')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Détails supplémentaires sur la résiliation..."
              />
            </div>

            {/* Vérification du préavis */}
            {watchedDateDemande && watchedDateFin && (
              <div className={`p-4 rounded-lg ${isPreavisOk ? 'bg-green-50' : 'bg-orange-50'}`}>
                <div className="flex items-start">
                  {isPreavisOk ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 mr-2" />
                  )}
                  <div>
                    <h4 className={`font-medium ${isPreavisOk ? 'text-green-800' : 'text-orange-800'}`}>
                      {isPreavisOk ? 'Préavis respecté' : 'Préavis non respecté'}
                    </h4>
                    <p className={`text-sm ${isPreavisOk ? 'text-green-700' : 'text-orange-700'}`}>
                      {isPreavisOk
                        ? 'Le délai de préavis légal est respecté.'
                        : `Le préavis légal de ${resiliationService.calculatePreavisLegal(contrat.type)} mois n'est pas respecté.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Calcul du prorata */}
            {resiliationDetails && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <Calculator className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-800 mb-2">Calcul du prorata</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700">Jours occupés:</span>
                        <p className="font-medium">{resiliationDetails.resiliationDetails.joursOccupes}/{resiliationDetails.resiliationDetails.dernierJourMois}</p>
                      </div>
                      <div>
                        <span className="text-blue-700">Pourcentage:</span>
                        <p className="font-medium">{resiliationService.formatProrataPercentage(resiliationDetails.resiliationDetails.prorataCoeff)}</p>
                      </div>
                      <div>
                        <span className="text-blue-700">Loyer prorata:</span>
                        <p className="font-medium text-blue-900">{resiliationService.formatCurrency(resiliationDetails.resiliationDetails.prorataLoyer)}</p>
                      </div>
                      <div>
                        <span className="text-blue-700">Économie:</span>
                        <p className="font-medium text-green-600">{resiliationService.formatCurrency(resiliationDetails.resiliationDetails.economie)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isCalculating}
            >
              Continuer
            </Button>
          </div>
        </form>
      )}

      {step === 'preview' && resiliationDetails && (
        <div className="space-y-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Confirmer la résiliation anticipée
            </h3>
            <p className="text-gray-600">
              Cette action est irréversible. Veuillez vérifier les informations avant de confirmer.
            </p>
          </div>

          {/* Résumé de la résiliation */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Date de fin:</span>
                <p className="font-medium">{resiliationService.formatDate(watch('dateFinReelle'))}</p>
              </div>
              <div>
                <span className="text-gray-600">Raison:</span>
                <p className="font-medium">{resiliationService.getRaisonLabel(watch('raisonResiliation'))}</p>
              </div>
              <div>
                <span className="text-gray-600">Préavis respecté:</span>
                <p className={`font-medium ${isPreavisOk ? 'text-green-600' : 'text-orange-600'}`}>
                  {isPreavisOk ? 'Oui' : 'Non'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Loyer prorata:</span>
                <p className="font-medium">{resiliationService.formatCurrency(resiliationDetails.resiliationDetails.prorataLoyer)}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('form')}
            >
              Modifier
            </Button>
            <Button
              onClick={handleConfirmResiliation}
              loading={resiliationMutation.isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmer la résiliation
            </Button>
          </div>
        </div>
      )}

      {step === 'confirmation' && (
        <div className="text-center space-y-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Résiliation enregistrée
            </h3>
            <p className="text-gray-600">
              La résiliation anticipée du contrat a été enregistrée avec succès.
              Le contrat sera marqué comme résilié et le bien repassera en statut vacant.
            </p>
          </div>
          <Button onClick={handleClose} className="w-full">
            Fermer
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default ResiliationModal;