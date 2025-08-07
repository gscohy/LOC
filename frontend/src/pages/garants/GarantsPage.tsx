import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Shield, Edit2, Trash2, User, Mail, Phone, MapPin, Users } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import GarantForm from '@/components/forms/GarantForm';
import { garantsService, type Garant } from '@/services/garants';

const GarantsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeGarantie, setTypeGarantie] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedGarant, setSelectedGarant] = useState<Garant | null>(null);

  const { data, isLoading, error } = useQuery(
    ['garants', { page: currentPage, search, typeGarantie }],
    () => garantsService.getAll({ 
      page: currentPage, 
      limit: 10, 
      search: search || undefined,
      typeGarantie: typeGarantie || undefined
    }),
    {
      keepPreviousData: true
    }
  );

  const deleteMutation = useMutation(garantsService.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('garants');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  });

  const handleEdit = (garant: Garant) => {
    setSelectedGarant(garant);
    setShowForm(true);
  };

  const handleDelete = async (garant: Garant) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le garant ${garant.prenom} ${garant.nom} ?`)) {
      deleteMutation.mutate(garant.id);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedGarant(null);
  };

  const typeGarantieOptions = [
    { value: '', label: 'Tous les types' },
    { value: 'PHYSIQUE', label: 'Garant physique' },
    { value: 'MORALE', label: 'Garant moral' },
    { value: 'BANCAIRE', label: 'Garantie bancaire' },
    { value: 'ASSURANCE', label: 'Garantie d\'assurance' }
  ];

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Erreur lors du chargement des garants</p>
      </div>
    );
  }

  const garants = data?.data?.garants || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Garants
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez les garants de vos locataires
          </p>
        </div>
        <Button onClick={() => {
          setSelectedGarant(null);
          setShowForm(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau garant
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Rechercher un garant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select
          value={typeGarantie}
          onChange={setTypeGarantie}
          options={typeGarantieOptions}
          className="w-48"
        />
      </div>

      {/* Garants list */}
      {garants.length === 0 ? (
        <div className="card">
          <div className="p-12 text-center">
            <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun garant trouvé
            </h3>
            <p className="text-gray-600">
              {search || typeGarantie ? 'Aucun garant ne correspond à vos critères.' : 'Commencez par ajouter votre premier garant.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {garants.map((garant) => (
            <div key={garant.id} className="card hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {garant.civilite} {garant.prenom} {garant.nom}
                      </h3>
                      <Badge variant={getTypeGarantieBadge(garant.typeGarantie)}>
                        {getTypeGarantieLabel(garant.typeGarantie)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(garant)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(garant)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{garant.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{garant.telephone}</span>
                  </div>
                  {garant.adresse && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{garant.adresse}</span>
                    </div>
                  )}
                  {garant.profession && (
                    <div className="text-sm text-gray-600">
                      <strong>Profession:</strong> {garant.profession}
                    </div>
                  )}
                  {garant.revenus && garant.revenus > 0 && (
                    <div className="text-sm text-gray-600">
                      <strong>Revenus:</strong> {formatCurrency(garant.revenus)}/mois
                    </div>
                  )}
                </div>

                {garant.locataires && garant.locataires.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{garant.locataires.length} locataire(s) associé(s)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {pagination.page} sur {pagination.pages} ({pagination.total} garants)
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
              disabled={currentPage === pagination.pages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <GarantForm
        isOpen={showForm}
        onClose={handleCloseForm}
        garant={selectedGarant}
      />
    </div>
  );
};

export default GarantsPage;