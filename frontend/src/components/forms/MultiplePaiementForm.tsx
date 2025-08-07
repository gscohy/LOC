import React, { useState, useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
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
  Plus,
  Trash2,
} from 'lucide-react';

import { paiementsService, PaiementCreate } from '@/services/paiements';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';

// Schéma pour un paiement individuel
const singlePaiementSchema = z.object({
  montant: z.number()
    .min(0.01, 'Le montant doit être supérieur à 0')
    .max(10000, 'Le montant ne peut pas dépasser 10 000€'),
  date: z.string().min(1, 'La date est requise'),
  mode: z.string().min(1, 'Le mode de paiement est requis'),
  payeur: z.string().min(1, 'Le nom du payeur est requis'),
  reference: z.string().optional(),
  commentaires: z.string().optional(),
});

// Schéma pour plusieurs paiements
const multiplePaiementSchema = z.object({
  loyerId: z.string().min(1, 'Le loyer est requis'),
  paiements: z.array(singlePaiementSchema).min(1, 'Au moins un paiement est requis'),
});

type MultiplePaiementFormData = z.infer<typeof multiplePaiementSchema>;

interface MultiplePaiementFormProps {
  loyer: {
    id: string;
    mois: number;
    annee: number;
    montantDu: number;
    montantPaye: number;
    statut: string;
    contrat?: {
      jourPaiement?: number;
      locataires: Array<{
        locataire: {
          nom: string;
          prenom: string;
        };
      }>;
    };
  };
  onSubmit: (paiements: PaiementCreate[]) => void;
  onCancel: () => void;
  loading?: boolean;
}

const MultiplePaiementForm: React.FC<MultiplePaiementFormProps> = ({
  loyer,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [warnings, setWarnings] = useState<string[]>([]);
  const [montantMaximum, setMontantMaximum] = useState(0);

  // Fonction pour calculer la date par défaut basée sur jourPaiement
  const calculateDefaultDate = (): string => {
    const jourPaiement = loyer.contrat?.jourPaiement || 1;
    const mois = loyer.mois; // Mois du loyer (1-12)
    const annee = loyer.annee;

    console.log('🔍 calculateDefaultDate - Debug:', {
      jourPaiement,
      mois,
      annee,
      loyerData: loyer
    });

    // Créer une date avec le jour de paiement du contrat
    // JavaScript Date : mois - 1 car janvier = 0
    const date = new Date(annee, mois - 1, jourPaiement);
    
    console.log('🔍 calculateDefaultDate - Date créée:', date.toDateString());
    
    // Vérifier si le jour existe dans le mois (ex: 31 février n'existe pas)
    if (date.getMonth() !== mois - 1) {
      // Si le jour n'existe pas, prendre le dernier jour du mois
      const lastDayOfMonth = new Date(annee, mois, 0).getDate();
      date.setMonth(mois - 1);
      date.setDate(lastDayOfMonth);
      console.log('🔍 calculateDefaultDate - Date ajustée:', date.toDateString());
    }

    // Éviter le problème de fuseau horaire en construisant la date manuellement
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const resultDate = `${year}-${month}-${day}`;
    
    console.log('🔍 calculateDefaultDate - Résultat final:', resultDate);
    
    return resultDate;
  };
  
  // Calculer le montant restant à payer
  const montantRestant = paiementsService.calculateMontantMaximum(loyer);

  const modesPaiement = paiementsService.getModesPaiement();
  const payeursSuggeres = loyer.contrat ? paiementsService.suggestPayeurs(loyer.contrat) : [];
  
  // Ajouter la CAF aux suggestions de payeurs
  const payeursAvecCAF = ['CAF', ...payeursSuggeres];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isValid },
  } = useForm<MultiplePaiementFormData>({
    resolver: zodResolver(multiplePaiementSchema),
    defaultValues: {
      loyerId: loyer.id,
      paiements: [{
        montant: montantRestant,
        date: calculateDefaultDate(),
        mode: 'VIREMENT',
        payeur: '',
        reference: '',
        commentaires: '',
      }],
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'paiements',
  });

  // Calculer le montant maximum
  useEffect(() => {
    const max = paiementsService.calculateMontantMaximum(loyer);
    setMontantMaximum(max);
  }, [loyer]);

  // Surveiller les changements pour afficher les avertissements
  const watchedPaiements = watch('paiements');
  useEffect(() => {
    const totalPaiements = watchedPaiements?.reduce((sum, p) => sum + (p.montant || 0), 0) || 0;
    const newWarnings: string[] = [];

    if (totalPaiements > montantMaximum) {
      newWarnings.push(`Le total des paiements (${paiementsService.formatCurrency(totalPaiements)}) dépasse le montant restant dû (${paiementsService.formatCurrency(montantMaximum)})`);
    }

    setWarnings(newWarnings);
  }, [watchedPaiements, montantMaximum]);

  const handleFormSubmit = (data: MultiplePaiementFormData) => {
    console.log('🔍 MultiplePaiementForm - Données du formulaire:', data);
    
    const paiements: PaiementCreate[] = data.paiements.map(p => ({
      loyerId: data.loyerId,
      montant: Number(p.montant),
      date: p.date,
      mode: p.mode,
      payeur: p.payeur,
      reference: p.reference || undefined,
      commentaires: p.commentaires || undefined,
    }));

    console.log('🔍 MultiplePaiementForm - Paiements formatés:', paiements);
    onSubmit(paiements);
  };

  const handlePayeurSelect = (index: number, payeur: string) => {
    setValue(`paiements.${index}.payeur`, payeur, { shouldValidate: true });
  };

  const addPaiement = () => {
    // Calculer le solde restant après les paiements actuels
    const totalPaiementsActuels = watchedPaiements?.reduce((sum, p) => sum + (p.montant || 0), 0) || 0;
    const soldeRestant = Math.max(0, montantMaximum - totalPaiementsActuels);
    
    console.log('🔍 addPaiement - Calcul du solde:', {
      montantMaximum,
      totalPaiementsActuels,
      soldeRestant
    });
    
    append({
      montant: soldeRestant,
      date: calculateDefaultDate(),
      mode: 'VIREMENT',
      payeur: '',
      reference: '',
      commentaires: '',
    });
  };

  const removePaiement = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const getMonthName = (mois: number): string => {
    const moisNoms = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return moisNoms[mois - 1] || `Mois ${mois}`;
  };

  const totalPaiements = watchedPaiements?.reduce((sum, p) => sum + (p.montant || 0), 0) || 0;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Informations du loyer */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2 flex items-center">
          <Info className="h-4 w-4 mr-2" />
          Loyer concerné
        </h3>
        <div className="text-sm text-blue-800 space-y-1">
          <div>Période: {getMonthName(loyer.mois)} {loyer.annee}</div>
          <div>Montant dû: {paiementsService.formatCurrency(loyer.montantDu)}</div>
          <div>Déjà payé: {paiementsService.formatCurrency(loyer.montantPaye)}</div>
          <div className="font-medium">
            Reste à payer: {paiementsService.formatCurrency(montantMaximum)}
          </div>
          {totalPaiements > 0 && (
            <div className="pt-2 border-t border-blue-200">
              <div className={`font-medium ${totalPaiements > montantMaximum ? 'text-red-700' : 'text-green-700'}`}>
                Total des paiements: {paiementsService.formatCurrency(totalPaiements)}
              </div>
              <div className="text-blue-700">
                Solde après paiement: {paiementsService.formatCurrency(montantMaximum - totalPaiements)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Liste des paiements */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Paiements ({fields.length})
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPaiement}
            className="flex items-center text-blue-600 border-blue-600 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un paiement
          </Button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-700">Paiement {index + 1}</h4>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePaiement(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Montant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant *
                </label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="pl-10"
                    {...register(`paiements.${index}.montant`, { valueAsNumber: true })}
                    error={errors.paiements?.[index]?.montant?.message}
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    className="pl-10"
                    {...register(`paiements.${index}.date`)}
                    error={errors.paiements?.[index]?.date?.message}
                    max={paiementsService.getTodayISOString()}
                  />
                </div>
              </div>

              {/* Mode de paiement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mode *
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Select
                    className="pl-10"
                    {...register(`paiements.${index}.mode`)}
                    error={errors.paiements?.[index]?.mode?.message}
                    options={[
                      { value: '', label: 'Sélectionner' },
                      ...modesPaiement.map((mode) => ({
                        value: mode.value,
                        label: mode.label
                      }))
                    ]}
                  />
                </div>
              </div>

              {/* Référence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Référence
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Référence"
                    className="pl-10"
                    {...register(`paiements.${index}.reference`)}
                    error={errors.paiements?.[index]?.reference?.message}
                  />
                </div>
              </div>
            </div>

            {/* Payeur */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Payeur *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Nom du payeur"
                  className="pl-10"
                  {...register(`paiements.${index}.payeur`)}
                  error={errors.paiements?.[index]?.payeur?.message}
                />
              </div>
              
              {/* Suggestions de payeurs avec CAF en premier */}
              {payeursAvecCAF.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {payeursAvecCAF.map((payeur, payeurIndex) => (
                    <Button
                      key={payeurIndex}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePayeurSelect(index, payeur)}
                      className={`text-xs ${payeur === 'CAF' ? 'border-green-500 text-green-600 hover:bg-green-50' : ''}`}
                    >
                      {payeur}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Commentaires */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commentaires
              </label>
              <Textarea
                placeholder="Commentaires (optionnel)"
                rows={2}
                {...register(`paiements.${index}.commentaires`)}
                error={errors.paiements?.[index]?.commentaires?.message}
              />
            </div>
          </div>
        ))}
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
          Enregistrer {fields.length > 1 ? `les ${fields.length} paiements` : 'le paiement'}
        </Button>
      </div>
    </form>
  );
};

export default MultiplePaiementForm;