import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Shield, User, Trash2, Eye } from 'lucide-react';

import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { garantsService, type Garant } from '@/services/garants';
import GarantForm from '@/components/forms/GarantForm';

interface ContratGarantsSelectionProps {
  selectedLocataireIds: string[];
  locataires?: Array<{
    id: string;
    nom: string;
    prenom: string;
    garants?: Array<{
      id: string;
      garant: Garant;
    }>;
  }>;
  onGarantChange?: () => void;
}

const ContratGarantsSelection: React.FC<ContratGarantsSelectionProps> = ({
  selectedLocataireIds,
  locataires = [],
  onGarantChange
}) => {
  const queryClient = useQueryClient();
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [selectedLocataireId, setSelectedLocataireId] = useState('');
  const [selectedGarantId, setSelectedGarantId] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showGarantDetails, setShowGarantDetails] = useState<Garant | null>(null);

  // Récupérer tous les garants disponibles
  const { data: availableGarants } = useQuery(
    'garants-available',
    () => garantsService.getAll({ limit: 1000 }),
    {
      select: (data) => data.data.garants
    }
  );

  // Mutation pour associer un garant
  const associateMutation = useMutation(
    ({ garantId, locataireId }: { garantId: string; locataireId: string }) => 
      garantsService.associateToLocataire(garantId, locataireId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('locataires');
        onGarantChange?.();
        setShowAssociateModal(false);
        setSelectedLocataireId('');
        setSelectedGarantId('');
      },
      onError: (error: any) => {
        alert(error.response?.data?.error || 'Erreur lors de l\'association');
      }
    }
  );

  // Mutation pour dissocier un garant
  const dissociateMutation = useMutation(
    ({ garantId, locataireId }: { garantId: string; locataireId: string }) => 
      garantsService.dissociateFromLocataire(garantId, locataireId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('locataires');
        onGarantChange?.();
      },
      onError: (error: any) => {
        alert(error.response?.data?.error || 'Erreur lors de la dissociation');
      }
    }
  );

  const handleAssociateGarant = () => {
    if (selectedGarantId && selectedLocataireId) {
      associateMutation.mutate({ garantId: selectedGarantId, locataireId: selectedLocataireId });
    }
  };

  const handleDissociateGarant = (garantId: string, locataireId: string, garantNom: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir dissocier le garant ${garantNom} ?`)) {
      dissociateMutation.mutate({ garantId, locataireId });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTypeGarantieBadge = (type: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'secondary'> = {
      'PHYSIQUE': 'success',
      'MORALE': 'info',
      'BANCAIRE': 'warning',
      'ASSURANCE': 'secondary'
    };
    return variants[type] || 'secondary';
  };

  const getTypeGarantieLabel = (type: string) => {
    const labels: Record<string, string> = {
      'PHYSIQUE': 'Physique',
      'MORALE': 'Moral',
      'BANCAIRE': 'Bancaire',
      'ASSURANCE': 'Assurance'
    };
    return labels[type] || type;
  };

  // Filtrer les locataires sélectionnés
  const selectedLocataires = locataires.filter(l => selectedLocataireIds.includes(l.id));

  // Calculer le nombre total de garants
  const totalGarants = selectedLocataires.reduce((sum, locataire) => 
    sum + (locataire.garants?.length || 0), 0
  );

  if (selectedLocataireIds.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Shield className="h-5 w-5 text-blue-500 mr-2" />
          Garants du contrat
        </h3>
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Sélectionnez d'abord les locataires pour gérer leurs garants</p>
        </div>
      </div>
    );
  }

  const locataireOptions = [
    { value: '', label: 'Sélectionner un locataire...' },
    ...selectedLocataires.map(locataire => ({
      value: locataire.id,
      label: `${locataire.prenom} ${locataire.nom}`
    }))
  ];

  // Filtrer les garants déjà associés au locataire sélectionné
  const selectedLocataire = selectedLocataires.find(l => l.id === selectedLocataireId);
  const associatedGarantIds = selectedLocataire?.garants?.map(g => g.garant.id) || [];
  const availableGarantsForAssociation = availableGarants?.filter(g => 
    !associatedGarantIds.includes(g.id)
  ) || [];

  const garantOptions = [
    { value: '', label: 'Sélectionner un garant...' },
    ...availableGarantsForAssociation.map(garant => ({
      value: garant.id,
      label: `${garant.civilite} ${garant.prenom} ${garant.nom} (${getTypeGarantieLabel(garant.typeGarantie)})`
    }))
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Shield className="h-5 w-5 text-blue-500 mr-2" />
          Garants du contrat ({totalGarants})
        </h3>
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowAssociateModal(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Associer
          </Button>
          <Button 
            size="sm"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nouveau garant
          </Button>
        </div>
      </div>

      {selectedLocataires.map((locataire) => (
        <div key={locataire.id} className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <User className="h-4 w-4 mr-2" />
            {locataire.prenom} {locataire.nom}
            <span className="ml-2 text-sm text-gray-500">
              ({locataire.garants?.length || 0} garant{(locataire.garants?.length || 0) > 1 ? 's' : ''})
            </span>
          </h4>

          {!locataire.garants || locataire.garants.length === 0 ? (
            <div className="text-center py-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Aucun garant associé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {locataire.garants.map(({ garant }) => (
                <div key={garant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {garant.civilite} {garant.prenom} {garant.nom}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={getTypeGarantieBadge(garant.typeGarantie)}>
                          {getTypeGarantieLabel(garant.typeGarantie)}
                        </Badge>
                        {garant.revenus && garant.revenus > 0 && (
                          <span className="text-xs text-gray-500">
                            {formatCurrency(garant.revenus)}/mois
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowGarantDetails(garant)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDissociateGarant(garant.id, locataire.id, `${garant.prenom} ${garant.nom}`)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Modal d'association */}
      <Modal isOpen={showAssociateModal} onClose={() => setShowAssociateModal(false)}>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Associer un garant à un locataire
          </h3>
          
          <div className="space-y-4">
            <Select
              label="Locataire"
              value={selectedLocataireId}
              onChange={setSelectedLocataireId}
              options={locataireOptions}
            />

            {selectedLocataireId && (
              <Select
                label="Garant à associer"
                value={selectedGarantId}
                onChange={setSelectedGarantId}
                options={garantOptions}
              />
            )}
          </div>
          
          <div className="flex space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowAssociateModal(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAssociateGarant}
              disabled={!selectedLocataireId || !selectedGarantId}
              loading={associateMutation.isLoading}
            >
              Associer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal détails garant */}
      <Modal 
        isOpen={!!showGarantDetails} 
        onClose={() => setShowGarantDetails(null)}
        title="Détails du garant"
      >
        {showGarantDetails && (
          <div className="p-6 space-y-4">
            <div>
              <h4 className="font-medium text-gray-900">
                {showGarantDetails.civilite} {showGarantDetails.prenom} {showGarantDetails.nom}
              </h4>
              <Badge variant={getTypeGarantieBadge(showGarantDetails.typeGarantie)}>
                {getTypeGarantieLabel(showGarantDetails.typeGarantie)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Email:</strong> {showGarantDetails.email}
              </div>
              <div>
                <strong>Téléphone:</strong> {showGarantDetails.telephone}
              </div>
              {showGarantDetails.adresse && (
                <div className="md:col-span-2">
                  <strong>Adresse:</strong> {showGarantDetails.adresse}
                </div>
              )}
              {showGarantDetails.profession && (
                <div>
                  <strong>Profession:</strong> {showGarantDetails.profession}
                </div>
              )}
              {showGarantDetails.revenus && showGarantDetails.revenus > 0 && (
                <div>
                  <strong>Revenus:</strong> {formatCurrency(showGarantDetails.revenus)}/mois
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Formulaire de création de garant */}
      <GarantForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={() => {
          queryClient.invalidateQueries('garants-available');
          setShowCreateForm(false);
        }}
      />
    </div>
  );
};

export default ContratGarantsSelection;