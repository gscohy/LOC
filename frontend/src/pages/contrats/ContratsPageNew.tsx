import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Calendar, MapPin, Users, FileText, AlertTriangle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

import { contratsService } from '@/services/contrats';
import { Contrat } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import ContratForm from '@/components/forms/ContratForm';

const ContratsPageNew: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statutFilter, setStatutFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingContrat, setEditingContrat] = useState<Contrat | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingContrat, setDeletingContrat] = useState<Contrat | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pageSize = 10;

  const {
    data: contratsData,
    isLoading,
    error,
  } = useQuery(
    ['contrats', currentPage, searchTerm, statutFilter],
    () =>
      contratsService.getAll({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        statut: statutFilter || undefined,
      }),
    {
      keepPreviousData: true,
    }
  );

  const {
    data: statsData,
  } = useQuery('contrats-stats', contratsService.getStats);

  const createMutation = useMutation(contratsService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('contrats');
      queryClient.invalidateQueries('contrats-stats');
      setIsCreateModalOpen(false);
      toast.success('Contrat créé avec succès');
    },
    onError: (error: any) => {
      console.error('Erreur détaillée lors de la création du contrat:', error);
      const errorMessage = error?.response?.data?.error?.message || 
                          error?.response?.data?.message ||
                          error?.message ||
                          'Erreur lors de la création';
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => contratsService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contrats');
        queryClient.invalidateQueries('contrats-stats');
        setEditingContrat(null);
        toast.success('Contrat modifié avec succès');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error?.message || 'Erreur lors de la modification');
      },
    }
  );

  const deleteMutation = useMutation(contratsService.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('contrats');
      queryClient.invalidateQueries('contrats-stats');
      setIsDeleteModalOpen(false);
      setDeletingContrat(null);
      toast.success('Contrat supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la suppression');
    },
  });

  const handleCreate = (data: any) => {
    // Éviter les doubles soumissions
    if (createMutation.isLoading) {
      console.log('Soumission déjà en cours, ignorée');
      return;
    }
    
    console.log('Données reçues du formulaire:', data);
    
    // Transformer locataireIds en locataires pour correspondre à l'API
    const contratData = {
      ...data,
      locataires: data.locataireIds, // Renommer le champ
    };
    delete contratData.locataireIds; // Supprimer l'ancien champ
    
    console.log('Données envoyées à l\'API:', contratData);
    createMutation.mutate(contratData);
  };

  const handleUpdate = (data: any) => {
    if (editingContrat) {
      updateMutation.mutate({ id: editingContrat.id, data });
    }
  };

  const handleDelete = () => {
    if (deletingContrat) {
      deleteMutation.mutate(deletingContrat.id);
    }
  };

  const openDeleteModal = (contrat: Contrat) => {
    setDeletingContrat(contrat);
    setIsDeleteModalOpen(true);
  };

  const getStatutBadgeVariant = (statut: string): 'success' | 'danger' | 'warning' | 'info' | 'gray' => {
    switch (statut) {
      case 'ACTIF':
        return 'success';
      case 'RESILIE':
        return 'danger';
      case 'EXPIRE':
        return 'warning';
      case 'SUSPENDU':
        return 'info';
      default:
        return 'gray';
    }
  };

  const isExpiringSoon = (contrat: Contrat) => {
    if (!contrat.dateFin) return false;
    return contratsService.isExpireSoon(contrat.dateFin, 30);
  };

  const columns = [
    {
      key: 'bien',
      title: 'Bien',
      render: (value: any, contrat: Contrat) => (
        <div>
          <div className="font-medium text-gray-900 flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
            {contrat.bien?.adresse || 'Bien non trouvé'}
          </div>
          <div className="text-sm text-gray-500">
            {contrat.bien?.codePostal} {contrat.bien?.ville}
          </div>
          <div className="text-xs text-gray-400">
            {contrat.bien?.type} - {contrat.bien?.surface}m²
          </div>
        </div>
      ),
    },
    {
      key: 'locataires',
      title: 'Locataires',
      render: (value: any, contrat: Contrat) => (
        <div>
          {contrat.locataires?.map((cl, index) => (
            <div key={cl.id} className="text-sm">
              <span className="font-medium flex items-center">
                <Users className="h-3 w-3 mr-1 text-gray-400" />
                {cl.locataire?.prenom} {cl.locataire?.nom}
              </span>
              {index === 0 && contrat.locataires && contrat.locataires.length > 1 && (
                <span className="text-xs text-gray-500">
                  +{contrat.locataires.length - 1} autre(s)
                </span>
              )}
            </div>
          )) || (
            <span className="text-sm text-gray-400">Aucun locataire</span>
          )}
        </div>
      ),
    },
    {
      key: 'periode',
      title: 'Période',
      render: (value: any, contrat: Contrat) => (
        <div>
          <div className="text-sm font-medium text-gray-900 flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
            {contratsService.formatDateFr(contrat.dateDebut)}
          </div>
          {contrat.dateFin && (
            <div className="text-sm text-gray-600">
              au {contratsService.formatDateFr(contrat.dateFin)}
            </div>
          )}
          <div className="text-xs text-gray-500">
            {contrat.duree} mois
          </div>
          {isExpiringSoon(contrat) && (
            <div className="text-xs text-orange-600 flex items-center mt-1">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Expire bientôt
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'finances',
      title: 'Finances',
      render: (value: any, contrat: Contrat) => (
        <div className="text-right">
          <div className="font-medium text-gray-900">
            {contrat.loyer.toLocaleString()}€/mois
          </div>
          {contrat.chargesMensuelles > 0 && (
            <div className="text-sm text-gray-600">
              + {contrat.chargesMensuelles.toLocaleString()}€ charges
            </div>
          )}
          {contrat.depotGarantie > 0 && (
            <div className="text-xs text-gray-500">
              Dépôt: {contrat.depotGarantie.toLocaleString()}€
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'statut',
      title: 'Statut',
      render: (value: any, contrat: Contrat) => (
        <div>
          <Badge
            variant={getStatutBadgeVariant(contrat.statut)}
            className="capitalize"
          >
            {contratsService.getStatutLabel(contrat.statut)}
          </Badge>
          <div className="text-xs text-gray-500 mt-1">
            {contratsService.getTypeLabel(contrat.type)}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, contrat: Contrat) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/contrats/${contrat.id}`)}
            className="text-green-600 hover:text-green-700"
            title="Voir les détails"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingContrat(contrat)}
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDeleteModal(contrat)}
            className="text-red-600 hover:text-red-700"
            title="Supprimer"
            disabled={!!(contrat._count?.loyers && contrat._count.loyers > 0)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Erreur lors du chargement des contrats</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Contrats de bail
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez les contrats de bail de vos biens immobiliers
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau contrat
        </Button>
      </div>

      {/* Stats summary */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total contrats</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statsData.total}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Actifs</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statsData.actifs}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Loyer moyen</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round(statsData.loyer_moyen || 0).toLocaleString()}€
                </p>
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-orange-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Revenus totaux</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {(statsData.loyer_total || 0).toLocaleString()}€
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Rechercher un contrat..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="w-48">
          <select
            value={statutFilter}
            onChange={(e) => {
              setStatutFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Tous les statuts</option>
            <option value="ACTIF">Actif</option>
            <option value="RESILIE">Résilié</option>
            <option value="EXPIRE">Expiré</option>
            <option value="SUSPENDU">Suspendu</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {contratsData?.data.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun contrat trouvé
            </h3>
            <p className="text-gray-600 mb-4">
              Commencez par créer votre premier contrat de bail.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un contrat
            </Button>
          </div>
        ) : (
          <Table
            columns={columns}
            data={contratsData?.data || []}
            loading={isLoading}
            keyExtractor={(record) => record.id}
            onRowDoubleClick={(contrat) => navigate(`/contrats/${contrat.id}`)}
            getRowClassName={(contrat) => {
              if (contrat.statut === 'ACTIF') {
                return 'bg-green-50 hover:bg-green-100';
              } else if (contrat.statut === 'RESILIE') {
                return 'bg-red-50 hover:bg-red-100';
              }
              return '';
            }}
          />
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Créer un contrat"
        size="xl"
      >
        <ContratForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
          loading={createMutation.isLoading}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingContrat}
        onClose={() => setEditingContrat(null)}
        title="Modifier le contrat"
        size="xl"
      >
        {editingContrat && (
          <ContratForm
            contratId={editingContrat.id}
            isEditing={true}
            initialData={{
              bienId: editingContrat.bienId,
              locataireIds: editingContrat.locataires?.map(cl => cl.locataireId) || [],
              dateDebut: editingContrat.dateDebut ? new Date(editingContrat.dateDebut).toISOString().split('T')[0] : '',
              dateFin: editingContrat.dateFin ? new Date(editingContrat.dateFin).toISOString().split('T')[0] : '',
              duree: editingContrat.duree,
              loyer: editingContrat.loyer,
              chargesMensuelles: editingContrat.chargesMensuelles,
              depotGarantie: editingContrat.depotGarantie,
              jourPaiement: editingContrat.jourPaiement,
              fraisNotaire: editingContrat.fraisNotaire,
              fraisHuissier: editingContrat.fraisHuissier,
              type: editingContrat.type,
              clausesParticulieres: editingContrat.clausesParticulieres || '',
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditingContrat(null)}
            loading={updateMutation.isLoading}
          />
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Supprimer le contrat"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir supprimer ce contrat ? Cette action est
            irréversible.
          </p>
          {deletingContrat && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">
                Contrat pour {deletingContrat.bien?.adresse}
              </div>
              <div className="text-sm text-gray-600">
                {deletingContrat.locataires?.map(cl => cl.locataire?.prenom + ' ' + cl.locataire?.nom).join(', ')}
              </div>
              <div className="text-sm text-gray-500">
                Du {contratsService.formatDateFr(deletingContrat.dateDebut)}
                {deletingContrat.dateFin && ` au ${contratsService.formatDateFr(deletingContrat.dateFin)}`}
              </div>
            </div>
          )}
          {deletingContrat?._count?.loyers && deletingContrat._count.loyers > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                ⚠️ Ce contrat a {deletingContrat._count.loyers} loyer(s) associé(s). 
                La suppression n'est pas possible.
              </p>
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleteMutation.isLoading}
              disabled={!!(deletingContrat?._count?.loyers && deletingContrat._count.loyers > 0)}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ContratsPageNew;