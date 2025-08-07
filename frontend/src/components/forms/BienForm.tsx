import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from 'react-query';
import { Upload } from 'lucide-react';

import { proprietairesService } from '@/services/proprietaires';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DocumentManager from '@/components/Documents/DocumentManager';

const bienSchema = z.object({
  adresse: z.string().min(1, 'L\'adresse est requise'),
  ville: z.string().min(1, 'La ville est requise'),
  codePostal: z.string().min(5, 'Le code postal doit faire au moins 5 caractères'),
  type: z.enum(['APPARTEMENT', 'MAISON', 'STUDIO', 'BUREAU', 'LOCAL_COMMERCIAL', 'GARAGE']),
  surface: z.number().positive('La surface doit être positive'),
  nbPieces: z.number().int().min(1, 'Le nombre de pièces doit être au moins 1'),
  nbChambres: z.number().int().min(0, 'Le nombre de chambres ne peut pas être négatif'),
  loyer: z.number().positive('Le loyer doit être positif'),
  chargesMensuelles: z.number().min(0, 'Les charges ne peuvent pas être négatives'),
  depotGarantie: z.number().min(0, 'Le dépôt de garantie ne peut pas être négatif'),
  statut: z.enum(['LIBRE', 'LOUE', 'MAINTENANCE', 'VENDU']),
  description: z.string().optional(),
  proprietaires: z.array(z.object({
    id: z.string(),
    quotePart: z.number().min(0).max(100),
  })).min(1, 'Au moins un propriétaire est requis'),
});

type BienFormData = z.infer<typeof bienSchema>;

interface BienFormProps {
  initialData?: Partial<BienFormData>;
  bienId?: string; // ID du bien pour l'édition et les documents/photos
  onSubmit: (data: BienFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  isEditing?: boolean;
}

const BienForm: React.FC<BienFormProps> = ({
  initialData,
  bienId,
  onSubmit,
  onCancel,
  loading = false,
  isEditing = false,
}) => {
  const [showDocuments, setShowDocuments] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BienFormData>({
    resolver: zodResolver(bienSchema),
    defaultValues: {
      type: 'APPARTEMENT',
      nbPieces: 1,
      nbChambres: 0,
      chargesMensuelles: 0,
      depotGarantie: 0,
      statut: 'LIBRE',
      proprietaires: [{ id: '', quotePart: 100 }],
      ...initialData,
    },
  });

  const { data: proprietairesData } = useQuery(
    'proprietaires-all',
    () => proprietairesService.getAll({ limit: 100 })
  );

  const proprietaires = watch('proprietaires');

  const addProprietaire = () => {
    const currentTotal = proprietaires.reduce((sum, p) => sum + p.quotePart, 0);
    const remaining = Math.max(0, 100 - currentTotal);
    setValue('proprietaires', [...proprietaires, { id: '', quotePart: remaining }]);
  };

  const removeProprietaire = (index: number) => {
    if (proprietaires.length > 1) {
      setValue('proprietaires', proprietaires.filter((_, i) => i !== index));
    }
  };

  const updateProprietaire = (index: number, field: 'id' | 'quotePart', value: string | number) => {
    const updated = [...proprietaires];
    updated[index] = { ...updated[index], [field]: value };
    setValue('proprietaires', updated);
  };

  const totalQuotePart = proprietaires.reduce((sum, p) => sum + p.quotePart, 0);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Informations générales */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Informations générales</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse *
            </label>
            <Input
              {...register('adresse')}
              error={errors.adresse?.message}
              placeholder="123 rue de la Paix"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ville *
            </label>
            <Input
              {...register('ville')}
              error={errors.ville?.message}
              placeholder="Paris"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code postal *
            </label>
            <Input
              {...register('codePostal')}
              error={errors.codePostal?.message}
              placeholder="75001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de bien *
            </label>
            <select
              {...register('type')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="APPARTEMENT">Appartement</option>
              <option value="MAISON">Maison</option>
              <option value="STUDIO">Studio</option>
              <option value="BUREAU">Bureau</option>
              <option value="LOCAL_COMMERCIAL">Local commercial</option>
              <option value="GARAGE">Garage</option>
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Caractéristiques */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Caractéristiques</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Surface (m²) *
            </label>
            <Input
              type="number"
              step="0.1"
              {...register('surface', { valueAsNumber: true })}
              error={errors.surface?.message}
              placeholder="65.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de pièces *
            </label>
            <Input
              type="number"
              {...register('nbPieces', { valueAsNumber: true })}
              error={errors.nbPieces?.message}
              placeholder="3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de chambres
            </label>
            <Input
              type="number"
              {...register('nbChambres', { valueAsNumber: true })}
              error={errors.nbChambres?.message}
              placeholder="2"
            />
          </div>
        </div>
      </div>

      {/* Informations financières */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Informations financières</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loyer mensuel (€) *
            </label>
            <Input
              type="number"
              step="0.01"
              {...register('loyer', { valueAsNumber: true })}
              error={errors.loyer?.message}
              placeholder="1200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Charges mensuelles (€)
            </label>
            <Input
              type="number"
              step="0.01"
              {...register('chargesMensuelles', { valueAsNumber: true })}
              error={errors.chargesMensuelles?.message}
              placeholder="150"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dépôt de garantie (€)
            </label>
            <Input
              type="number"
              step="0.01"
              {...register('depotGarantie', { valueAsNumber: true })}
              error={errors.depotGarantie?.message}
              placeholder="1200"
            />
          </div>
        </div>
      </div>

      {/* Statut */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Statut
        </label>
        <select
          {...register('statut')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="LIBRE">Libre</option>
          <option value="LOUE">Loué</option>
          <option value="MAINTENANCE">En maintenance</option>
          <option value="VENDU">Vendu</option>
        </select>
      </div>

      {/* Propriétaires */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Propriétaires</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addProprietaire}
            disabled={proprietaires.length >= 5}
          >
            Ajouter un propriétaire
          </Button>
        </div>

        {proprietaires.map((proprietaire, index) => (
          <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Propriétaire
              </label>
              <select
                value={proprietaire.id}
                onChange={(e) => updateProprietaire(index, 'id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Sélectionner un propriétaire</option>
                {proprietairesData?.data.map((prop) => (
                  <option key={prop.id} value={prop.id}>
                    {prop.prenom} {prop.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quote-part (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={proprietaire.quotePart}
                onChange={(e) => updateProprietaire(index, 'quotePart', parseInt(e.target.value) || 0)}
              />
            </div>

            {proprietaires.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeProprietaire(index)}
                className="text-red-600 hover:text-red-700"
              >
                Supprimer
              </Button>
            )}
          </div>
        ))}

        {totalQuotePart !== 100 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Total des quotes-parts : {totalQuotePart}% (doit être égal à 100%)
            </p>
          </div>
        )}

        {errors.proprietaires && (
          <p className="text-sm text-red-600">{errors.proprietaires.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          {...register('description')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Description du bien..."
        />
      </div>

      {/* Section Photos et Documents */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Upload className="h-5 w-5 mr-2 text-orange-500" />
            Photos et documents du bien
          </h3>
          <button
            type="button"
            onClick={() => setShowDocuments(!showDocuments)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showDocuments ? 'Masquer' : 'Afficher'} les fichiers
          </button>
        </div>
        
        {bienId && showDocuments && (
          <DocumentManager
            categorie="BIEN"
            entityId={bienId}
            entityName={`${initialData?.adresse || ''} - ${initialData?.ville || ''}`.trim() || 'Nouveau bien'}
            allowUpload={true}
            allowDelete={true}
            allowEdit={true}
          />
        )}
        
        {!bienId && (
          <div className="text-center py-6 text-gray-500">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">
              Les photos et documents pourront être ajoutés après la création du bien
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Exemples: photos, plans, diagnostics, factures travaux, etc.
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
          disabled={totalQuotePart !== 100}
        >
          {isEditing ? 'Modifier' : 'Créer'} le bien
        </Button>
      </div>
    </form>
  );
};

export default BienForm;