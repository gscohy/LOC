import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from 'react-query';
import { 
  Bell, 
  Calendar, 
  MessageSquare, 
  Users, 
  AlertCircle, 
  Info,
  CheckCircle,
  FileText,
  Send,
  Search,
  Building,
} from 'lucide-react';

import { rappelsService, RappelCreate } from '@/services/rappels';
import { loyersService } from '@/services/loyers';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Schéma de validation
const createRappelSchema = z.object({
  loyerId: z.string().min(1, 'Le loyer est requis'),
  type: z.string().min(1, 'Le type de rappel est requis'),
  destinataires: z.string().min(1, 'Au moins un destinataire est requis'),
  message: z.string().min(10, 'Le message doit contenir au moins 10 caractères'),
  dateEnvoi: z.string().optional(),
  modeEnvoi: z.string().min(1, 'Le mode d\'envoi est requis'),
});

type CreateRappelFormData = z.infer<typeof createRappelSchema>;

interface CreateRappelFormProps {
  onSubmit: (data: RappelCreate) => void;
  onCancel: () => void;
  loading?: boolean;
}

const CreateRappelForm: React.FC<CreateRappelFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoyer, setSelectedLoyer] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [messageGenere, setMessageGenere] = useState<string>('');

  const typesRappel = rappelsService.getTypesRappel();
  const modesEnvoi = rappelsService.getModesEnvoi();

  // Charger les loyers en retard
  const { data: loyersData, isLoading: loyersLoading } = useQuery(
    ['loyers-en-retard', searchTerm],
    () => loyersService.getAll({
      page: 1,
      limit: 50,
      statut: 'RETARD,PARTIEL',
      search: searchTerm || undefined,
    }),
    {
      keepPreviousData: true,
    }
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
    reset,
  } = useForm<CreateRappelFormData>({
    resolver: zodResolver(createRappelSchema),
    defaultValues: {
      loyerId: '',
      type: 'RETARD',
      destinataires: '',
      message: '',
      dateEnvoi: rappelsService.getTodayISOString(),
      modeEnvoi: 'EMAIL',
    },
    mode: 'onChange',
  });

  // Surveiller les changements de loyer et type pour générer le message
  const watchedLoyerId = watch('loyerId');
  const watchedType = watch('type');

  useEffect(() => {
    if (watchedLoyerId && loyersData) {
      const loyer = loyersData.loyers.find(l => l.id === watchedLoyerId);
      if (loyer) {
        setSelectedLoyer(loyer);
        
        // Auto-remplir les destinataires avec les emails des locataires
        if (loyer.contrat?.locataires) {
          const emails = loyer.contrat.locataires
            .map(cl => cl.locataire?.email)
            .filter(email => email)
            .join(', ');
          setValue('destinataires', emails, { shouldValidate: true });
        }

        // Suggérer le type en fonction des rappels existants
        if (loyer.rappels && loyer.rappels.length > 0) {
          const typeSuggere = rappelsService.suggestNextRappelType(loyer.rappels);
          setValue('type', typeSuggere, { shouldValidate: true });
        }
      }
    }
  }, [watchedLoyerId, loyersData, setValue]);

  useEffect(() => {
    if (watchedType && selectedLoyer && watchedType !== selectedType) {
      setSelectedType(watchedType);
      
      // Générer le message automatiquement
      const loyerForMessage = {
        mois: selectedLoyer.mois,
        annee: selectedLoyer.annee,
        montantDu: selectedLoyer.montantDu,
        montantPaye: selectedLoyer.montantPaye,
        contrat: {
          bien: {
            adresse: selectedLoyer.contrat?.bien?.adresse || 'Adresse non disponible'
          },
          locataires: selectedLoyer.contrat?.locataires || []
        }
      };
      
      const message = rappelsService.generateDefaultMessage(loyerForMessage, watchedType);
      setMessageGenere(message);
      setValue('message', message, { shouldValidate: true });
    }
  }, [watchedType, selectedLoyer, setValue, selectedType]);

  const handleFormSubmit = (data: CreateRappelFormData) => {
    onSubmit({
      ...data,
      destinataires: data.destinataires.split(',').map(email => email.trim()),
    });
  };

  const handleLoyerSelect = (loyerId: string) => {
    setValue('loyerId', loyerId, { shouldValidate: true });
  };

  const handleDestinatairesSelect = (emails: string[]) => {
    setValue('destinataires', emails.join(', '), { shouldValidate: true });
  };

  const handleMessageGenerate = () => {
    if (selectedType && selectedLoyer) {
      const loyerForMessage = {
        mois: selectedLoyer.mois,
        annee: selectedLoyer.annee,
        montantDu: selectedLoyer.montantDu,
        montantPaye: selectedLoyer.montantPaye,
        contrat: {
          bien: {
            adresse: selectedLoyer.contrat?.bien?.adresse || 'Adresse non disponible'
          },
          locataires: selectedLoyer.contrat?.locataires || []
        }
      };
      
      const message = rappelsService.generateDefaultMessage(loyerForMessage, selectedType);
      setMessageGenere(message);
      setValue('message', message, { shouldValidate: true });
    }
  };

  const loyers = loyersData?.loyers || [];
  const montantRestant = selectedLoyer ? selectedLoyer.montantDu - selectedLoyer.montantPaye : 0;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Sélection du loyer */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rechercher un loyer en retard *
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par adresse, nom du locataire..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Liste des loyers */}
        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
          {loyersLoading ? (
            <div className="p-4 text-center">
              <LoadingSpinner size="sm" />
              <span className="ml-2 text-sm text-gray-600">Chargement des loyers...</span>
            </div>
          ) : loyers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Building className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Aucun loyer en retard trouvé</p>
              {searchTerm && (
                <p className="text-xs mt-1">Essayez avec d'autres termes de recherche</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {loyers.map((loyer) => (
                <div
                  key={loyer.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    watchedLoyerId === loyer.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => handleLoyerSelect(loyer.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {loyer.contrat?.bien?.adresse || 'Adresse non disponible'}
                        </h4>
                        <Badge 
                          variant={loyer.statut === 'RETARD' ? 'danger' : 'warning'}
                          className="flex-shrink-0"
                        >
                          {loyer.statut}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                        <span>{rappelsService.formatMoisAnnee(loyer.mois, loyer.annee)}</span>
                        <span>Dû: {rappelsService.formatCurrency(loyer.montantDu - loyer.montantPaye)}</span>
                        {loyer.contrat?.locataires?.length && (
                          <span>
                            {loyer.contrat.locataires.map(cl => 
                              `${cl.locataire.prenom} ${cl.locataire.nom}`
                            ).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    {watchedLoyerId === loyer.id && (
                      <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                  
                  {/* Rappels existants pour ce loyer */}
                  {loyer.rappels && loyer.rappels.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-600">
                        {loyer.rappels.length} rappel(s) existant(s): {' '}
                        {loyer.rappels.slice(0, 2).map(r => rappelsService.getTypeLabel(r.type)).join(', ')}
                        {loyer.rappels.length > 2 && ` et ${loyer.rappels.length - 2} autre(s)`}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Champ caché pour l'ID du loyer */}
        <input type="hidden" {...register('loyerId')} />
        {errors.loyerId && (
          <p className="text-sm text-red-600">{errors.loyerId.message}</p>
        )}
      </div>

      {/* Informations du loyer sélectionné */}
      {selectedLoyer && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2 flex items-center">
            <Info className="h-4 w-4 mr-2" />
            Loyer sélectionné
          </h3>
          <div className="text-sm text-blue-800">
            <div>Adresse: {selectedLoyer.contrat?.bien?.adresse}</div>
            <div>Période: {rappelsService.formatMoisAnnee(selectedLoyer.mois, selectedLoyer.annee)}</div>
            <div>Montant dû: {rappelsService.formatCurrency(selectedLoyer.montantDu)}</div>
            <div>Déjà payé: {rappelsService.formatCurrency(selectedLoyer.montantPaye)}</div>
            <div className="font-medium">
              Reste à payer: {rappelsService.formatCurrency(montantRestant)}
            </div>
            <div>Statut: 
              <Badge 
                variant={selectedLoyer.statut === 'RETARD' ? 'danger' : selectedLoyer.statut === 'PARTIEL' ? 'warning' : 'info'}
                className="ml-2"
              >
                {selectedLoyer.statut}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Type de rappel */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type de rappel *
        </label>
        <div className="relative">
          <Bell className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                className="pl-10"
                error={errors.type?.message}
                options={[
                  { value: '', label: 'Sélectionner un type' },
                  ...typesRappel.map((type) => ({
                    value: type.value,
                    label: type.label
                  }))
                ]}
              />
            )}
          />
        </div>
        
        {/* Description du type sélectionné */}
        {selectedType && (
          <div className="mt-2">
            {typesRappel.find(t => t.value === selectedType)?.description && (
              <p className="text-sm text-gray-600">
                {typesRappel.find(t => t.value === selectedType)?.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Destinataires */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Destinataires *
        </label>
        <div className="relative">
          <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Textarea
            placeholder="Adresses email séparées par des virgules"
            rows={2}
            className="pl-10"
            {...register('destinataires')}
            error={errors.destinataires?.message}
          />
        </div>
        
        {/* Suggestions d'emails */}
        {selectedLoyer?.contrat?.locataires && selectedLoyer.contrat.locataires.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs text-gray-500">Locataires:</span>
            {selectedLoyer.contrat.locataires.map((cl: any, index: number) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDestinatairesSelect([cl.locataire.email])}
                className="text-xs"
                title={`${cl.locataire.prenom} ${cl.locataire.nom}`}
              >
                {cl.locataire.email}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDestinatairesSelect(
                selectedLoyer.contrat.locataires.map((cl: any) => cl.locataire.email)
              )}
              className="text-xs"
            >
              Tous les locataires
            </Button>
          </div>
        )}
      </div>

      {/* Mode d'envoi */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mode d'envoi *
        </label>
        <div className="relative">
          <Send className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Controller
            name="modeEnvoi"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                className="pl-10"
                error={errors.modeEnvoi?.message}
                options={[
                  { value: '', label: 'Sélectionner un mode' },
                  ...modesEnvoi.map((mode) => ({
                    value: mode.value,
                    label: `${mode.icon} ${mode.label}`
                  }))
                ]}
              />
            )}
          />
        </div>
      </div>

      {/* Date d'envoi */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date d'envoi prévue
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="date"
            className="pl-10"
            {...register('dateEnvoi')}
            error={errors.dateEnvoi?.message}
            min={rappelsService.getTodayISOString()}
          />
        </div>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Message du rappel *
        </label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Textarea
            placeholder="Tapez votre message de rappel..."
            rows={12}
            className="pl-10"
            {...register('message')}
            error={errors.message?.message}
          />
        </div>
        
        {/* Bouton pour générer un message automatique */}
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMessageGenerate}
            disabled={!selectedType || !selectedLoyer}
            className="flex items-center"
          >
            <FileText className="h-4 w-4 mr-2" />
            Générer un message automatique
          </Button>
          {messageGenere && (
            <span className="text-xs text-green-600">Message généré automatiquement</span>
          )}
        </div>
      </div>

      {/* Aperçu du message */}
      {watch('message') && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Aperçu du message</h4>
          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border">
            {watch('message').substring(0, 200)}
            {watch('message').length > 200 && '...'}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {watch('message').length} caractères
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
          disabled={!isValid}
          className="flex items-center"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Créer le rappel
        </Button>
      </div>
    </form>
  );
};

export default CreateRappelForm;