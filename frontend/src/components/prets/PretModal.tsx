import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from 'react-query';
import { X, Building2, CreditCard, Calendar, Euro } from 'lucide-react';
import toast from 'react-hot-toast';

import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { pretsService, PretImmobilier, CreatePretData } from '@/services/prets';
import { biensService } from '@/services/biens';

const pretSchema = z.object({
  bienId: z.string().min(1, 'Le bien est requis'),
  nom: z.string().min(1, 'Le nom du prêt est requis'),
  banque: z.string().min(1, 'Le nom de la banque est requis'),
  numeroPret: z.string().optional(),
  montantEmprunte: z.number({ invalid_type_error: 'Le montant doit être un nombre' })
    .positive('Le montant emprunté doit être positif'),
  tauxInteret: z.number({ invalid_type_error: 'Le taux doit être un nombre' })
    .positive('Le taux d\'intérêt doit être positif')
    .max(20, 'Le taux ne peut pas dépasser 20%'),
  dureeAnnees: z.number({ invalid_type_error: 'La durée doit être un nombre' })
    .int('La durée doit être un nombre entier')
    .positive('La durée doit être positive')
    .max(50, 'La durée ne peut pas dépasser 50 ans'),
  dateDebut: z.string().min(1, 'La date de début est requise'),
  dateFin: z.string().min(1, 'La date de fin est requise'),
  mensualiteBase: z.number({ invalid_type_error: 'La mensualité doit être un nombre' })
    .positive('La mensualité de base doit être positive'),
  mensualiteAssurance: z.number({ invalid_type_error: 'L\'assurance doit être un nombre' })
    .min(0, 'La mensualité d\'assurance doit être positive ou nulle')
    .default(0),
  statut: z.enum(['ACTIF', 'SOLDE', 'SUSPENDU']).default('ACTIF'),
  commentaires: z.string().optional(),
});

type FormData = z.infer<typeof pretSchema>;

interface PretModalProps {
  isOpen: boolean;
  onClose: () => void;
  pret?: PretImmobilier | null;
  onSuccess: () => void;
}

const PretModal: React.FC<PretModalProps> = ({ isOpen, onClose, pret, onSuccess }) => {
  const isEditing = Boolean(pret);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(pretSchema),
    defaultValues: {
      statut: 'ACTIF',
      mensualiteAssurance: 0,
    },
  });

  // Watch des valeurs pour les calculs automatiques
  const watchedValues = watch(['montantEmprunte', 'tauxInteret', 'dureeAnnees', 'dateDebut']);

  // Récupérer les biens
  const { data: biensData } = useQuery(
    'biens-all',
    () => biensService.getAll({ page: 1, limit: 1000 }),
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  // Mutation pour créer/mettre à jour
  const saveMutation = useMutation(
    (data: CreatePretData) => {
      if (isEditing && pret) {
        return pretsService.update(pret.id, data);
      }
      return pretsService.create(data);
    },
    {
      onSuccess: () => {
        toast.success(isEditing ? 'Prêt mis à jour avec succès' : 'Prêt créé avec succès');
        onSuccess();
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error || 'Erreur lors de la sauvegarde');
      },
    }
  );

  // Remplir le formulaire en mode édition
  useEffect(() => {
    console.log('🔄 PretModal useEffect: isOpen=', isOpen, 'pret=', pret);
    if (isOpen && pret) {
      console.log('📝 PretModal: Mode édition, remplissage du formulaire');
      reset({
        bienId: pret.bienId,
        nom: pret.nom,
        banque: pret.banque,
        numeroPret: pret.numeroPret || '',
        montantEmprunte: pret.montantEmprunte,
        tauxInteret: pret.tauxInteret,
        dureeAnnees: pret.dureeAnnees,
        dateDebut: pret.dateDebut.split('T')[0],
        dateFin: pret.dateFin.split('T')[0],
        mensualiteBase: pret.mensualiteBase,
        mensualiteAssurance: pret.mensualiteAssurance,
        statut: pret.statut,
        commentaires: pret.commentaires || '',
      });
    } else if (isOpen) {
      console.log('✨ PretModal: Mode création, formulaire vide');
      reset({
        statut: 'ACTIF',
        mensualiteAssurance: 0,
      });
    }
  }, [isOpen, pret, reset]);

  // Calcul automatique de la mensualité
  useEffect(() => {
    const [montantEmprunte, tauxInteret, dureeAnnees] = watchedValues;
    if (montantEmprunte && tauxInteret && dureeAnnees && montantEmprunte > 0 && tauxInteret > 0 && dureeAnnees > 0) {
      const mensualite = pretsService.calculateMonthlyPayment(montantEmprunte, tauxInteret, dureeAnnees);
      setValue('mensualiteBase', Math.round(mensualite * 100) / 100);
    }
  }, [watchedValues, setValue]);

  // Calcul automatique de la date de fin
  useEffect(() => {
    const [, , dureeAnnees, dateDebut] = watchedValues;
    if (dateDebut && dureeAnnees && dureeAnnees > 0) {
      const debut = new Date(dateDebut);
      if (!isNaN(debut.getTime())) {
        const fin = new Date(debut);
        fin.setFullYear(fin.getFullYear() + dureeAnnees);
        setValue('dateFin', fin.toISOString().split('T')[0]);
      }
    }
  }, [watchedValues, setValue]);

  const onSubmit = (data: FormData) => {
    console.log('🔍 PretModal: onSubmit called with:', data);
    
    // Validation des données essentielles
    if (!data.bienId || !data.nom || !data.banque || !data.montantEmprunte || 
        !data.tauxInteret || !data.dureeAnnees || !data.dateDebut || !data.dateFin) {
      console.log('❌ PretModal: Données incomplètes, abandon de la soumission');
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    const submitData: CreatePretData = {
      ...data,
      dateDebut: new Date(data.dateDebut).toISOString(),
      dateFin: new Date(data.dateFin).toISOString(),
    };
    console.log('🚀 PretModal: About to submit:', submitData);
    saveMutation.mutate(submitData);
  };

  const biensOptions = [
    { value: '', label: 'Sélectionner un bien' },
    ...(biensData?.data?.map((bien: any) => ({
      value: bien.id,
      label: `${bien.adresse}, ${bien.ville}`
    })) || [])
  ];

  const statutOptions = [
    { value: 'ACTIF', label: 'Actif' },
    { value: 'SOLDE', label: 'Soldé' },
    { value: 'SUSPENDU', label: 'Suspendu' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center">
          <CreditCard className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Modifier le Prêt' : 'Nouveau Prêt Immobilier'}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
        {/* Informations générales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Select
              label="Bien immobilier"
              icon={<Building2 className="h-4 w-4" />}
              options={biensOptions}
              error={errors.bienId?.message}
              {...register('bienId')}
            />
          </div>

          <Input
            label="Nom du prêt"
            placeholder="Ex: Prêt acquisition rue du moulin"
            error={errors.nom?.message}
            {...register('nom')}
          />

          <Input
            label="Banque"
            placeholder="Ex: Crédit Agricole"
            error={errors.banque?.message}
            {...register('banque')}
          />

          <Input
            label="Numéro du prêt (optionnel)"
            placeholder="Ex: 123456789"
            error={errors.numeroPret?.message}
            {...register('numeroPret')}
          />

          <Select
            label="Statut"
            options={statutOptions}
            error={errors.statut?.message}
            {...register('statut')}
          />
        </div>

        {/* Informations financières */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Euro className="h-5 w-5 text-green-600 mr-2" />
            Informations Financières
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Montant emprunté (€)"
              type="number"
              step="0.01"
              placeholder="200000"
              error={errors.montantEmprunte?.message}
              {...register('montantEmprunte', { valueAsNumber: true })}
            />

            <Input
              label="Taux d'intérêt (%)"
              type="number"
              step="0.01"
              placeholder="1.85"
              error={errors.tauxInteret?.message}
              {...register('tauxInteret', { valueAsNumber: true })}
            />

            <Input
              label="Durée (années)"
              type="number"
              placeholder="20"
              error={errors.dureeAnnees?.message}
              {...register('dureeAnnees', { valueAsNumber: true })}
            />

            <Input
              label="Mensualité de base (€)"
              type="number"
              step="0.01"
              placeholder="Calculée automatiquement"
              error={errors.mensualiteBase?.message}
              {...register('mensualiteBase', { valueAsNumber: true })}
            />

            <Input
              label="Mensualité assurance (€)"
              type="number"
              step="0.01"
              placeholder="0"
              error={errors.mensualiteAssurance?.message}
              {...register('mensualiteAssurance', { valueAsNumber: true })}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 text-blue-600 mr-2" />
            Période du Prêt
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Date de début"
              type="date"
              error={errors.dateDebut?.message}
              {...register('dateDebut')}
            />

            <Input
              label="Date de fin"
              type="date"
              error={errors.dateFin?.message}
              {...register('dateFin')}
            />
          </div>
        </div>

        {/* Commentaires */}
        <div className="border-t pt-6">
          <Input
            label="Commentaires (optionnel)"
            type="textarea"
            rows={3}
            placeholder="Informations complémentaires..."
            error={errors.commentaires?.message}
            {...register('commentaires')}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saveMutation.isLoading}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            loading={saveMutation.isLoading}
            className="min-w-[120px]"
          >
            {isEditing ? 'Mettre à jour' : 'Créer le prêt'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PretModal;