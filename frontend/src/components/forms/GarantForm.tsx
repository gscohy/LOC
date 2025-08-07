import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { X, Upload } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import DocumentManager from '@/components/Documents/DocumentManager';
import { garantsService, type Garant, type CreateGarantData, type UpdateGarantData } from '@/services/garants';

interface GarantFormProps {
  isOpen: boolean;
  onClose: () => void;
  garant?: Garant | null;
  onSuccess?: () => void;
}

const GarantForm: React.FC<GarantFormProps> = ({
  isOpen,
  onClose,
  garant,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const isEditing = garant != null && garant.id != null;

  const [formData, setFormData] = useState<CreateGarantData | UpdateGarantData>({
    civilite: garant?.civilite || 'M',
    nom: garant?.nom || '',
    prenom: garant?.prenom || '',
    email: garant?.email || '',
    telephone: garant?.telephone || '',
    adresse: garant?.adresse || '',
    ville: garant?.ville || '',
    codePostal: garant?.codePostal || '',
    profession: garant?.profession || '',
    revenus: garant?.revenus || 0,
    typeGarantie: garant?.typeGarantie || 'PHYSIQUE'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDocuments, setShowDocuments] = useState(false);

  // Réinitialiser le formulaire quand le modal s'ouvre/ferme ou change de garant
  useEffect(() => {
    if (isOpen) {
      setFormData({
        civilite: garant?.civilite || 'M',
        nom: garant?.nom || '',
        prenom: garant?.prenom || '',
        email: garant?.email || '',
        telephone: garant?.telephone || '',
        adresse: garant?.adresse || '',
        ville: garant?.ville || '',
        codePostal: garant?.codePostal || '',
        profession: garant?.profession || '',
        revenus: garant?.revenus || 0,
        typeGarantie: garant?.typeGarantie || 'PHYSIQUE'
      });
      setErrors({});
      setShowDocuments(false);
    }
  }, [isOpen, garant]);

  const createMutation = useMutation(garantsService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('garants');
      onSuccess?.();
      onClose();
      setFormData({
        civilite: 'M',
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        adresse: '',
        ville: '',
        codePostal: '',
        profession: '',
        revenus: 0,
        typeGarantie: 'PHYSIQUE'
      });
      setErrors({});
    },
    onError: (error: any) => {
      if (error.response?.data?.details) {
        const newErrors: Record<string, string> = {};
        error.response.data.details.forEach((detail: any) => {
          if (detail.path) {
            newErrors[detail.path[0]] = detail.message;
          }
        });
        setErrors(newErrors);
      }
    }
  });

  const updateMutation = useMutation(
    (data: UpdateGarantData) => garantsService.update(garant!.id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('garants');
        queryClient.invalidateQueries(['garant', garant!.id]);
        onSuccess?.();
        onClose();
        setErrors({});
      },
      onError: (error: any) => {
        if (error.response?.data?.details) {
          const newErrors: Record<string, string> = {};
          error.response.data.details.forEach((detail: any) => {
            if (detail.path) {
              newErrors[detail.path[0]] = detail.message;
            }
          });
          setErrors(newErrors);
        }
      }
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Debug: Log des données avant envoi
    console.log('🔍 GarantForm - Données à envoyer:', formData);
    console.log('🔍 GarantForm - Types des données:', Object.entries(formData).map(([key, value]) => 
      [key, typeof value, value?.constructor?.name || 'undefined']
    ));

    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData as CreateGarantData);
    }
  };

  const handleChange = (name: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const civiliteOptions = [
    { value: 'M', label: 'M.' },
    { value: 'Mme', label: 'Mme' },
    { value: 'Dr', label: 'Dr' },
    { value: 'Me', label: 'Me' }
  ];

  const typeGarantieOptions = [
    { value: 'PHYSIQUE', label: 'Garant physique' },
    { value: 'MORALE', label: 'Garant moral' },
    { value: 'BANCAIRE', label: 'Garantie bancaire' },
    { value: 'ASSURANCE', label: 'Garantie d\'assurance' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">
          {isEditing ? 'Modifier le garant' : 'Nouveau garant'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informations personnelles */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Informations personnelles</h3>
            
            <Select
              label="Civilité"
              value={formData.civilite || 'M'}
              onChange={(e) => handleChange('civilite', e.target.value)}
              options={civiliteOptions}
              error={errors.civilite}
            />

            <Input
              label="Nom *"
              type="text"
              value={formData.nom || ''}
              onChange={(e) => handleChange('nom', e.target.value)}
              error={errors.nom}
              required
            />

            <Input
              label="Prénom *"
              type="text"
              value={formData.prenom || ''}
              onChange={(e) => handleChange('prenom', e.target.value)}
              error={errors.prenom}
              required
            />

            <Input
              label="Email *"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              error={errors.email}
              required
            />

            <Input
              label="Téléphone *"
              type="tel"
              value={formData.telephone || ''}
              onChange={(e) => handleChange('telephone', e.target.value)}
              error={errors.telephone}
              required
            />
          </div>

          {/* Informations complémentaires */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Informations complémentaires</h3>
            
            <Input
              label="Adresse"
              type="text"
              value={formData.adresse || ''}
              onChange={(e) => handleChange('adresse', e.target.value)}
              error={errors.adresse}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Code postal"
                type="text"
                value={formData.codePostal || ''}
                onChange={(e) => handleChange('codePostal', e.target.value)}
                error={errors.codePostal}
              />

              <Input
                label="Ville"
                type="text"
                value={formData.ville || ''}
                onChange={(e) => handleChange('ville', e.target.value)}
                error={errors.ville}
              />
            </div>

            <Input
              label="Profession"
              type="text"
              value={formData.profession || ''}
              onChange={(e) => handleChange('profession', e.target.value)}
              error={errors.profession}
            />

            <Input
              label="Revenus mensuels (€)"
              type="number"
              value={formData.revenus || 0}
              onChange={(e) => handleChange('revenus', parseFloat(e.target.value) || 0)}
              error={errors.revenus}
            />

            <Select
              label="Type de garantie"
              value={formData.typeGarantie || 'PHYSIQUE'}
              onChange={(e) => handleChange('typeGarantie', e.target.value)}
              options={typeGarantieOptions}
              error={errors.typeGarantie}
            />
          </div>
        </div>

        {/* Section Documents */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900 flex items-center">
              <Upload className="h-4 w-4 mr-2 text-orange-500" />
              Documents du garant
            </h3>
            <button
              type="button"
              onClick={() => setShowDocuments(!showDocuments)}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              {showDocuments ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          
          {garant?.id && showDocuments && (
            <div className="max-h-96 overflow-y-auto">
              <DocumentManager
                categorie="GARANT"
                entityId={garant.id}
                entityName={`${formData.prenom} ${formData.nom}`.trim() || 'Garant'}
                allowUpload={true}
                allowDelete={true}
                allowEdit={true}
                className="bg-gray-50 rounded-lg p-4"
              />
            </div>
          )}
          
          {!garant?.id && (
            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
              <Upload className="w-6 h-6 mx-auto mb-2 text-gray-300" />
              <p className="text-xs">
                Les documents pourront être ajoutés après la création du garant
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Exemples: CNI, justificatifs de revenus, acte de caution, etc.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            loading={createMutation.isLoading || updateMutation.isLoading}
          >
            {isEditing ? 'Modifier' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default GarantForm;