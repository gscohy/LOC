import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Mail, Phone, User, MapPin, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

import { locatairesService } from '@/services/locataires';
import { Locataire } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import LocataireForm from '@/components/forms/LocataireForm';

const LocatairesPageComplete: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIF'); // Par défaut : locataires actifs
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLocataire, setEditingLocataire] = useState<Locataire | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingLocataire, setDeletingLocataire] = useState<Locataire | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pageSize = 10;

  const {
    data: locatairesData,
    isLoading,
    error,
  } = useQuery(
    ['locataires', currentPage, searchTerm, statusFilter],
    () => locatairesService.getAll({
      page: currentPage,
      limit: pageSize,
      search: searchTerm || undefined,
      statut: statusFilter as 'ACTIF' | 'INACTIF' | undefined,
    }),
    {
      keepPreviousData: true,
    }
  );

  const createMutation = useMutation(locatairesService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('locataires');
      setIsCreateModalOpen(false);
      toast.success('Locataire créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la création');
    },
  });

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => locatairesService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('locataires');
        setEditingLocataire(null);
        toast.success('Locataire modifié avec succès');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error?.message || 'Erreur lors de la modification');
      },
    }
  );

  const deleteMutation = useMutation(locatairesService.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('locataires');
      setIsDeleteModalOpen(false);
      setDeletingLocataire(null);
      toast.success('Locataire supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la suppression');
    },
  });

  const handleCreate = (data: any) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (data: any) => {
    if (editingLocataire) {
      updateMutation.mutate({ id: editingLocataire.id, data });
    }
  };

  const handleDelete = () => {
    if (deletingLocataire) {
      deleteMutation.mutate(deletingLocataire.id);
    }
  };

  const openDeleteModal = (locataire: Locataire) => {
    setDeletingLocataire(locataire);
    setIsDeleteModalOpen(true);
  };

  const columns = [
    {
      key: 'nom',
      title: 'Nom complet',
      render: (value: any, locataire: Locataire) => (
        <div className="flex items-center">
          <User className="h-4 w-4 mr-2 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">
              {locataire.civilite} {locataire.prenom} {locataire.nom}
            </div>
            {locataire.profession && (
              <div className="text-sm text-gray-500">
                {locataire.profession}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      title: 'Contact',
      render: (value: any, locataire: Locataire) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm text-gray-900">
            <Mail className="h-4 w-4 mr-2 text-gray-400" />
            {locataire.email}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="h-4 w-4 mr-2 text-gray-400" />
            {locataire.telephone}
          </div>
        </div>
      ),
    },
    {
      key: 'adresse',
      title: 'Adresse',
      render: (value: any, locataire: Locataire) => (
        <div>
          {locataire.adresse ? (
            <div className="flex items-start text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div>{locataire.adresse}</div>
                {locataire.ville && locataire.codePostal && (
                  <div>{locataire.codePostal} {locataire.ville}</div>
                )}
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Non renseignée</span>
          )}
        </div>
      ),
    },
    {
      key: 'revenus',
      title: 'Revenus',
      render: (value: any, locataire: Locataire) => (
        <div className="text-right">
          {locataire.revenus ? (
            <div className="font-medium text-gray-900">
              {locataire.revenus.toLocaleString()}€/mois
            </div>
          ) : (
            <span className="text-sm text-gray-400">Non renseignés</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, locataire: Locataire) => (
        <div className="flex justify-end space-x-2">
          <button 
            className="text-green-600 hover:text-green-800"
            onClick={() => navigate(`/locataires/${locataire.id}`)}
            title="Voir les détails"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button 
            className="text-blue-600 hover:text-blue-800"
            onClick={() => setEditingLocataire(locataire)}
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button 
            className="text-red-600 hover:text-red-800"
            onClick={() => openDeleteModal(locataire)}
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Locataires
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez vos locataires et leurs informations
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau locataire
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Rechercher un locataire..."
            icon={<Search className="h-4 w-4" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="ACTIF">Locataires actifs</option>
          <option value="">Tous les locataires</option>
        </select>
      </div>

      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Liste des locataires
          </h2>
        </div>
        
        {error ? (
          <div className="p-6 text-red-600">
            Erreur: {String(error)}
          </div>
        ) : (
          <Table
            columns={columns}
            data={locatairesData?.data || []}
            loading={isLoading}
            emptyText="Aucun locataire trouvé"
            keyExtractor={(record) => record.id}
            onRowDoubleClick={(locataire) => navigate(`/locataires/${locataire.id}`)}
          />
        )}
      </div>

      {/* Pagination */}
      {locatairesData?.pagination && locatairesData.pagination.pages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-700">
            Affichage de {((currentPage - 1) * pageSize) + 1} à{' '}
            {Math.min(currentPage * pageSize, locatairesData.pagination.total)} sur{' '}
            {locatairesData.pagination.total} résultats
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Précédent
            </Button>
            <span className="px-3 py-2 text-sm text-gray-600">
              Page {currentPage} sur {locatairesData.pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= locatairesData.pagination.pages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Créer un locataire"
        size="lg"
      >
        <LocataireForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
          loading={createMutation.isLoading}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingLocataire}
        onClose={() => setEditingLocataire(null)}
        title="Modifier le locataire"
        size="lg"
      >
        {editingLocataire && (
          <LocataireForm
            locataireId={editingLocataire.id}
            isEditing={true}
            initialData={{
              ...editingLocataire,
              dateNaissance: editingLocataire.dateNaissance ? 
                new Date(editingLocataire.dateNaissance).toISOString().split('T')[0] : 
                undefined,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditingLocataire(null)}
            loading={updateMutation.isLoading}
          />
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Supprimer le locataire"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir supprimer ce locataire ? Cette action est
            irréversible.
          </p>
          {deletingLocataire && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">
                {deletingLocataire.civilite} {deletingLocataire.prenom} {deletingLocataire.nom}
              </div>
              <div className="text-sm text-gray-600">
                {deletingLocataire.email}
              </div>
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
            >
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LocatairesPageComplete;