import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin, FileImage } from 'lucide-react';
import toast from 'react-hot-toast';

import { proprietairesService } from '@/services/proprietaires';
import { Proprietaire } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import ProprietaireFormSimpleSignature from '@/components/forms/ProprietaireFormSimpleSignature';
import SignatureUpload from '@/components/proprietaires/SignatureUpload';

const ProprietairesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProprietaire, setEditingProprietaire] = useState<Proprietaire | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProprietaire, setDeletingProprietaire] = useState<Proprietaire | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureProprietaire, setSignatureProprietaire] = useState<Proprietaire | null>(null);

  const queryClient = useQueryClient();
  const pageSize = 10;

  const {
    data: proprietairesData,
    isLoading,
    error,
  } = useQuery(
    ['proprietaires', currentPage, searchTerm],
    () =>
      proprietairesService.getAll({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
      }),
    {
      keepPreviousData: true,
    }
  );

  // État de chargement pour les opérations
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const deleteMutation = useMutation(proprietairesService.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('proprietaires');
      setIsDeleteModalOpen(false);
      setDeletingProprietaire(null);
      toast.success('Propriétaire supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la suppression');
    },
  });

  const handleCreate = async (data: Omit<Proprietaire, 'id' | 'createdAt' | 'updatedAt'>): Promise<Proprietaire> => {
    setIsCreating(true);
    try {
      const result = await proprietairesService.create(data);
      queryClient.invalidateQueries('proprietaires');
      setIsCreateModalOpen(false);
      toast.success('Propriétaire créé avec succès');
      return result;
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la création');
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (data: Omit<Proprietaire, 'id' | 'createdAt' | 'updatedAt'>): Promise<Proprietaire> => {
    if (!editingProprietaire) {
      throw new Error('Aucun propriétaire en cours d\'édition');
    }
    
    setIsUpdating(true);
    try {
      const result = await proprietairesService.update(editingProprietaire.id, data);
      
      // Rafraîchir les données du propriétaire en cours d'édition pour voir les changements
      const updatedProprietaire = await proprietairesService.getById(editingProprietaire.id);
      setEditingProprietaire(updatedProprietaire);
      
      queryClient.invalidateQueries('proprietaires');
      toast.success('Propriétaire modifié avec succès');
      return result;
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la modification');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = () => {
    if (deletingProprietaire) {
      deleteMutation.mutate(deletingProprietaire.id);
    }
  };

  const handleSignatureUploaded = async () => {
    if (editingProprietaire) {
      // Rafraîchir les données du propriétaire pour voir la nouvelle signature
      const updatedProprietaire = await proprietairesService.getById(editingProprietaire.id);
      setEditingProprietaire(updatedProprietaire);
      queryClient.invalidateQueries('proprietaires');
    }
  };

  const openDeleteModal = (proprietaire: Proprietaire) => {
    setDeletingProprietaire(proprietaire);
    setIsDeleteModalOpen(true);
  };

  const openSignatureModal = (proprietaire: Proprietaire) => {
    setSignatureProprietaire(proprietaire);
    setIsSignatureModalOpen(true);
  };

  const columns = [
    {
      key: 'nom',
      title: 'Nom complet',
      render: (value: any, proprietaire: Proprietaire) => (
        <div>
          <div className="font-medium text-gray-900">
            {proprietaire.prenom} {proprietaire.nom}
          </div>
          {proprietaire.entreprise && (
            <div className="text-sm text-gray-500">{proprietaire.entreprise}</div>
          )}
        </div>
      ),
    },
    {
      key: 'email',
      title: 'Contact',
      render: (value: any, proprietaire: Proprietaire) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm text-gray-900">
            <Mail className="h-4 w-4 mr-2 text-gray-400" />
            {proprietaire.email}
          </div>
          {proprietaire.telephone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-4 w-4 mr-2 text-gray-400" />
              {proprietaire.telephone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'adresse',
      title: 'Adresse',
      render: (value: any, proprietaire: Proprietaire) => (
        <div className="flex items-start text-sm text-gray-600">
          <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <div>{proprietaire.adresse}</div>
            <div>
              {proprietaire.codePostal} {proprietaire.ville}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      render: (value: any, proprietaire: Proprietaire) => (
        <Badge
          variant={proprietaire.type === 'PHYSIQUE' ? 'success' : 'info'}
          className="capitalize"
        >
          {proprietaire.type === 'PHYSIQUE' ? 'Personne physique' : 'Personne morale'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, proprietaire: Proprietaire) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingProprietaire(proprietaire)}
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openSignatureModal(proprietaire)}
            className="text-blue-600 hover:text-blue-700"
            title="Gérer la signature"
          >
            <FileImage className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDeleteModal(proprietaire)}
            className="text-red-600 hover:text-red-700"
            title="Supprimer"
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
        <p className="text-red-600">Erreur lors du chargement des propriétaires</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Propriétaires
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez vos propriétaires et leurs informations
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau proprietaire
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Rechercher un propriétaire..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <Table
          columns={columns}
          data={proprietairesData?.data || []}
          loading={isLoading}
          keyExtractor={(record) => record.id}
          onRowDoubleClick={(proprietaire) => setEditingProprietaire(proprietaire)}
        />
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Créer un propriétaire"
        size="lg"
      >
        <ProprietaireFormSimpleSignature
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
          loading={isCreating}
          onSignatureUploaded={() => queryClient.invalidateQueries('proprietaires')}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingProprietaire}
        onClose={() => setEditingProprietaire(null)}
        title="Modifier le propriétaire"
        size="lg"
      >
        {editingProprietaire && (
          <ProprietaireFormSimpleSignature
            initialData={editingProprietaire}
            onSubmit={handleUpdate}
            onCancel={() => setEditingProprietaire(null)}
            loading={isUpdating}
            onSignatureUploaded={handleSignatureUploaded}
          />
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Supprimer le propriétaire"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir supprimer ce propriétaire ? Cette action est
            irréversible.
          </p>
          {deletingProprietaire && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">
                {deletingProprietaire.prenom} {deletingProprietaire.nom}
              </div>
              <div className="text-sm text-gray-600">
                {deletingProprietaire.email}
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

      {/* Signature Upload Modal */}
      {signatureProprietaire && (
        <SignatureUpload
          proprietaireId={signatureProprietaire.id}
          currentSignature={signatureProprietaire.signature || undefined}
          isOpen={isSignatureModalOpen}
          onClose={() => {
            setIsSignatureModalOpen(false);
            setSignatureProprietaire(null);
          }}
        />
      )}
    </div>
  );
};

export default ProprietairesPage;