import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from 'react-query';
import { Calendar, Home, Users, Euro, FileText, Shield, Upload } from 'lucide-react';

import { biensService } from '@/services/biens';
import { locatairesService } from '@/services/locataires';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ContratGarantsSelection from '@/components/forms/ContratGarantsSelection';
import DocumentManager from '@/components/Documents/DocumentManager';

const contratSchema = z.object({
  bienId: z.string().min(1, 'Le bien est requis'),
  locataireIds: z.array(z.string()).min(1, 'Au moins un locataire est requis'),
  dateDebut: z.string().min(1, 'La date de début est requise'),
  dateFin: z.string().optional(),
  duree: z.number().min(1, 'La durée doit être positive').max(120, 'Durée maximale: 120 mois'),
  loyer: z.number().min(0, 'Le loyer doit être positif'),
  chargesMensuelles: z.number().min(0, 'Les charges doivent être positives'),
  depotGarantie: z.number().min(0, 'Le dépôt de garantie doit être positif'),
  jourPaiement: z.number().min(1, 'Le jour doit être entre 1 et 31').max(31, 'Le jour doit être entre 1 et 31'),
  fraisNotaire: z.number().min(0, 'Les frais de notaire doivent être positifs'),
  fraisHuissier: z.number().min(0, 'Les frais d\'huissier doivent être positifs'),
  type: z.enum(['HABITATION', 'COMMERCIAL', 'SAISONNIER', 'ETUDIANT']),
  clausesParticulieres: z.string().optional(),
});

type ContratFormData = z.infer<typeof contratSchema>;

interface ContratFormProps {
  initialData?: Partial<ContratFormData>;
  contratId?: string; // ID du contrat pour l'édition et les documents
  onSubmit: (data: ContratFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  isEditing?: boolean;
}

const ContratForm: React.FC<ContratFormProps> = ({
  initialData,
  contratId,
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
    watch,
    setValue,
  } = useForm<ContratFormData>({
    resolver: zodResolver(contratSchema),
    defaultValues: {
      bienId: '',
      locataireIds: [],
      dateDebut: '',
      dateFin: '',
      duree: 12,
      loyer: 0,
      chargesMensuelles: 0,
      depotGarantie: 0,
      jourPaiement: 1,
      fraisNotaire: 0,
      fraisHuissier: 0,
      type: 'HABITATION',
      clausesParticulieres: '',
      ...initialData,
    },
  });

  // Récupérer les biens disponibles
  const { data: biensData, isLoading: biensLoading } = useQuery(
    'biens-available',
    () => biensService.getAll({ page: 1, limit: 100 })
  );

  // Récupérer les locataires disponibles
  const { data: locatairesData, isLoading: locatairesLoading } = useQuery(
    'locataires-available',
    () => locatairesService.getAll({ page: 1, limit: 100 })
  );

  const watchedBienId = watch('bienId');
  const watchedDuree = watch('duree');
  const watchedDateDebut = watch('dateDebut');
  const watchedLocataireIds = watch('locataireIds');

  // Auto-remplir les informations du bien sélectionné
  useEffect(() => {
    if (watchedBienId && biensData?.data) {
      const selectedBien = biensData.data.find(bien => bien.id === watchedBienId);
      if (selectedBien) {
        setValue('loyer', selectedBien.loyer);
        setValue('chargesMensuelles', selectedBien.chargesMensuelles);
        setValue('depotGarantie', selectedBien.depotGarantie);
      }
    }
  }, [watchedBienId, biensData, setValue]);

  // Calculer automatiquement la date de fin
  useEffect(() => {
    if (watchedDateDebut && watchedDuree) {
      const dateDebut = new Date(watchedDateDebut);
      const dateFin = new Date(dateDebut);
      dateFin.setMonth(dateFin.getMonth() + watchedDuree);
      setValue('dateFin', dateFin.toISOString().split('T')[0]);
    }
  }, [watchedDateDebut, watchedDuree, setValue]);

  const handleFormSubmit = (data: ContratFormData) => {
    // Log des données avant soumission pour debug
    console.log('Soumission du formulaire avec les données:', data);
    
    // Validation supplémentaire avant soumission
    if (!data.bienId) {
      console.error('Bien non sélectionné');
      return;
    }
    
    if (!data.locataireIds || data.locataireIds.length === 0) {
      console.error('Aucun locataire sélectionné');
      return;
    }
    
    onSubmit(data);
  };

  if (biensLoading || locatairesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const biens = biensData?.data || [];
  const locataires = locatairesData?.data || [];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Section Bien */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Home className="h-5 w-5 mr-2 text-blue-500" />
          Bien immobilier
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bien <span className="text-red-500">*</span>
            </label>
            <select
              {...register('bienId')}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.bienId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Sélectionner un bien</option>
              {biens.map((bien) => (
                <option key={bien.id} value={bien.id}>
                  {bien.adresse} - {bien.ville} ({bien.loyer}€/mois)
                </option>
              ))}
            </select>
            {errors.bienId && (
              <p className="mt-1 text-sm text-red-600">{errors.bienId.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section Locataires */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-green-500" />
          Locataires
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Locataires <span className="text-red-500">*</span>
            </label>
            <select
              multiple
              {...register('locataireIds')}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px] ${
                errors.locataireIds ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              {locataires.map((locataire) => (
                <option key={locataire.id} value={locataire.id}>
                  {locataire.civilite} {locataire.prenom} {locataire.nom} - {locataire.email}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Maintenez Ctrl/Cmd pour sélectionner plusieurs locataires
            </p>
            {errors.locataireIds && (
              <p className="mt-1 text-sm text-red-600">{errors.locataireIds.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section Période */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-purple-500" />
          Période du contrat
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Date de début"
            type="date"
            required
            {...register('dateDebut')}
            error={errors.dateDebut?.message}
          />
          
          <Input
            label="Durée (mois)"
            type="number"
            min="1"
            max="120"
            required
            {...register('duree', { valueAsNumber: true })}
            error={errors.duree?.message}
          />
          
          <Input
            label="Date de fin"
            type="date"
            {...register('dateFin')}
            error={errors.dateFin?.message}
            disabled
          />
        </div>
      </div>

      {/* Section Finances */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Euro className="h-5 w-5 mr-2 text-yellow-500" />
          Informations financières
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Loyer mensuel (€)"
            type="number"
            min="0"
            step="0.01"
            required
            {...register('loyer', { valueAsNumber: true })}
            error={errors.loyer?.message}
          />
          
          <Input
            label="Charges mensuelles (€)"
            type="number"
            min="0"
            step="0.01"
            {...register('chargesMensuelles', { valueAsNumber: true })}
            error={errors.chargesMensuelles?.message}
          />
          
          <Input
            label="Dépôt de garantie (€)"
            type="number"
            min="0"
            step="0.01"
            {...register('depotGarantie', { valueAsNumber: true })}
            error={errors.depotGarantie?.message}
          />
          
          <Input
            label="Jour de paiement"
            type="number"
            min="1"
            max="31"
            required
            {...register('jourPaiement', { valueAsNumber: true })}
            error={errors.jourPaiement?.message}
          />
          
          <Input
            label="Frais de notaire (€)"
            type="number"
            min="0"
            step="0.01"
            {...register('fraisNotaire', { valueAsNumber: true })}
            error={errors.fraisNotaire?.message}
          />
          
          <Input
            label="Frais d'huissier (€)"
            type="number"
            min="0"
            step="0.01"
            {...register('fraisHuissier', { valueAsNumber: true })}
            error={errors.fraisHuissier?.message}
          />
        </div>
      </div>

      {/* Section Type et Clauses */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-indigo-500" />
          Type et clauses
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de contrat <span className="text-red-500">*</span>
            </label>
            <select
              {...register('type')}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.type ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="HABITATION">Habitation</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="SAISONNIER">Saisonnier</option>
              <option value="ETUDIANT">Étudiant</option>
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clauses particulières
            </label>
            <textarea
              {...register('clausesParticulieres')}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.clausesParticulieres ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Clauses particulières du contrat..."
            />
            {errors.clausesParticulieres && (
              <p className="mt-1 text-sm text-red-600">{errors.clausesParticulieres.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section Garants */}
      {/* TODO: Réimplémenter ContratGarantsSelection
      {watchedLocataireIds && watchedLocataireIds.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <ContratGarantsSelection
            selectedLocataireIds={watchedLocataireIds}
            locataires={locataires}
            onGarantChange={() => {
              // Refresh des données si nécessaire
            }}
          />
        </div>
      )}
      */}

      {/* Section Documents */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Upload className="h-5 w-5 mr-2 text-orange-500" />
            Documents du contrat
          </h3>
          <button
            type="button"
            onClick={() => setShowDocuments(!showDocuments)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showDocuments ? 'Masquer' : 'Afficher'} les documents
          </button>
        </div>
        
        {contratId && showDocuments && (
          <DocumentManager
            categorie="CONTRAT"
            entityId={contratId}
            entityName={watchedBienId ? 
              biens.find(b => b.id === watchedBienId)?.adresse + ' - ' + 
              biens.find(b => b.id === watchedBienId)?.ville 
              : 'Nouveau contrat'
            }
            allowUpload={true}
            allowDelete={true}
            allowEdit={true}
          />
        )}
        
        {!contratId && (
          <div className="text-center py-6 text-gray-500">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">
              Les documents pourront être ajoutés après la création du contrat
            </p>
          </div>
        )}
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
        <Button
          type="submit"
          loading={loading}
        >
          {isEditing ? 'Modifier le contrat' : 'Créer le contrat'}
        </Button>
      </div>
    </form>
  );
};

export default ContratForm;