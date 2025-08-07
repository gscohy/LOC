import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Edit, Trash2, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

import { proprietairesService } from '@/services/proprietaires';
import { Proprietaire } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import ProprietaireFormFixed from '@/components/forms/ProprietaireFormFixed';

const ProprietairesPageWithForm: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProprietaire, setEditingProprietaire] = useState<Proprietaire | null>(null);

  const queryClient = useQueryClient();
  const pageSize = 10;

  console.log('🔍 WithForm: Début du rendu');

  const {
    data: proprietairesData,
    isLoading,
    error,
  } = useQuery(
    ['proprietaires', currentPage, searchTerm],
    () => proprietairesService.getAll({
      page: currentPage,
      limit: pageSize,
      search: searchTerm || undefined,
    }),
    {
      keepPreviousData: true,
    }
  );

  const createMutation = useMutation(proprietairesService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('proprietaires');
      setIsCreateModalOpen(false);
      toast.success('Propriétaire créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la création');
    },
  });

  const columns = [
    {
      key: 'nom',
      title: 'Nom',
      render: (value: any, record: Proprietaire) => (
        <div>
          <div className="font-medium text-gray-900">
            {record.nom} {record.prenom}
          </div>
          <div className="text-sm text-gray-500">{record.type}</div>
        </div>
      ),
    },
    {
      key: 'email',
      title: 'Contact',
      render: (value: any, record: Proprietaire) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <Mail className="h-3 w-3 text-gray-400 mr-1" />
            {record.email}
          </div>
          {record.telephone && (
            <div className="flex items-center text-sm">
              <Phone className="h-3 w-3 text-gray-400 mr-1" />
              {record.telephone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'adresse',
      title: 'Adresse',
      render: (value: any, record: Proprietaire) => (
        <div className="text-sm">
          <div>{record.adresse}</div>
          <div className="text-gray-500">
            {record.codePostal} {record.ville}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, record: Proprietaire) => (
        <div className="flex space-x-2">
          <button 
            className="text-blue-600 hover:text-blue-800"
            onClick={() => setEditingProprietaire(record)}
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleCreateSubmit = (data: any) => {
    console.log('🔍 WithForm: Création:', data);
    createMutation.mutate(data);
  };

  console.log('🔍 WithForm: États:', { 
    isCreateModalOpen, 
    editingProprietaire, 
    isLoading: createMutation.isLoading 
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Propriétaires - Avec Formulaire
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Test avec le formulaire simple
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau propriétaire
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Rechercher un propriétaire..."
            icon={<Search className="h-4 w-4" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Liste des propriétaires
          </h2>
        </div>
        
        {error ? (
          <div className="p-6 text-red-600">
            Erreur: {String(error)}
          </div>
        ) : (
          <Table
            columns={columns}
            data={proprietairesData?.data || []}
            loading={isLoading}
            emptyText="Aucun propriétaire trouvé"
            keyExtractor={(record) => record.id}
          />
        )}
      </div>

      {/* Modal de création */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nouveau propriétaire"
        size="lg"
      >
        <ProprietaireFormFixed
          onSubmit={handleCreateSubmit}
          onCancel={() => setIsCreateModalOpen(false)}
          loading={createMutation.isLoading}
        />
      </Modal>

      {/* Modal d'édition */}
      <Modal
        isOpen={!!editingProprietaire}
        onClose={() => setEditingProprietaire(null)}
        title="Modifier propriétaire"
        size="lg"
      >
        {editingProprietaire && (
          <ProprietaireFormFixed
            initialData={editingProprietaire}
            onSubmit={(data) => {
              console.log('🔍 WithForm: Modification:', data);
              setEditingProprietaire(null);
            }}
            onCancel={() => setEditingProprietaire(null)}
          />
        )}
      </Modal>
    </div>
  );
};

export default ProprietairesPageWithForm;