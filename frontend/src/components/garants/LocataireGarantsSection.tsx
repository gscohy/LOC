import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Shield, User, Mail, Phone, MapPin, Trash2, Edit2 } from 'lucide-react';

import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { garantsService, type Garant } from '@/services/garants';
import { locatairesService } from '@/services/locataires';
import GarantForm from '@/components/forms/GarantForm';

interface LocataireGarantsSectionProps {
  locataireId: string;
  garants?: {
    id: string;
    garant: Garant;
  }[];
  onUpdate?: () => void;
}

const LocataireGarantsSection: React.FC<LocataireGarantsSectionProps> = ({
  locataireId,
  garants = [],
  onUpdate
}) => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGarantId, setSelectedGarantId] = useState('');

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
    ({ garantId }: { garantId: string }) => garantsService.associateToLocataire(garantId, locataireId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['locataire', locataireId]);
        onUpdate?.();
        setShowAddModal(false);
        setSelectedGarantId('');
      },
      onError: (error: any) => {
        alert(error.response?.data?.error || 'Erreur lors de l\'association');
      }
    }
  );

  // Mutation pour dissocier un garant
  const dissociateMutation = useMutation(
    ({ garantId }: { garantId: string }) => garantsService.dissociateFromLocataire(garantId, locataireId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['locataire', locataireId]);
        onUpdate?.();
      },
      onError: (error: any) => {
        alert(error.response?.data?.error || 'Erreur lors de la dissociation');
      }
    }
  );

  const handleAssociateGarant = () => {
    if (selectedGarantId) {
      associateMutation.mutate({ garantId: selectedGarantId });
    }
  };

  const handleDissociateGarant = (garantId: string, garantNom: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir dissocier le garant ${garantNom} ?`)) {
      dissociateMutation.mutate({ garantId });
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

  // Filtrer les garants déjà associés
  const associatedGarantIds = garants.map(g => g.garant.id);
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
          Garants ({garants.length})
        </h3>
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowAddModal(true)}
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

      {garants.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Aucun garant associé à ce locataire</p>
          <Button 
            className="mt-3"
            size="sm"
            onClick={() => setShowAddModal(true)}
          >
            Ajouter un garant
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {garants.map(({ garant }) => (
            <div key={garant.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {garant.civilite} {garant.prenom} {garant.nom}
                    </h4>
                    <Badge variant={getTypeGarantieBadge(garant.typeGarantie)}>
                      {getTypeGarantieLabel(garant.typeGarantie)}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDissociateGarant(garant.id, `${garant.prenom} ${garant.nom}`)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>{garant.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>{garant.telephone}</span>
                </div>
                {garant.adresse && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{garant.adresse}</span>
                  </div>
                )}
                {garant.profession && (
                  <div className="text-sm">
                    <strong>Profession:</strong> {garant.profession}
                  </div>
                )}
                {garant.revenus && garant.revenus > 0 && (
                  <div className="text-sm">
                    <strong>Revenus:</strong> {formatCurrency(garant.revenus)}/mois
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal d'association */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Associer un garant
          </h3>
          
          {availableGarantsForAssociation.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">
                Aucun garant disponible. Tous les garants existants sont déjà associés à ce locataire.
              </p>
              <Button onClick={() => {
                setShowAddModal(false);
                setShowCreateForm(true);
              }}>
                Créer un nouveau garant
              </Button>
            </div>
          ) : (
            <>
              <Select
                label="Garant à associer"
                value={selectedGarantId}
                onChange={(e) => setSelectedGarantId(e.target.value)}
                options={garantOptions}
              />
              
              <div className="flex space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAssociateGarant}
                  disabled={!selectedGarantId}
                  loading={associateMutation.isLoading}
                >
                  Associer
                </Button>
              </div>
            </>
          )}
        </div>
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

export default LocataireGarantsSection;