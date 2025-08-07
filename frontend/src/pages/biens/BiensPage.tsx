import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, MapPin, Home, Euro } from 'lucide-react';
import toast from 'react-hot-toast';

import { biensService } from '@/services/biens';
import { Bien } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';

const BiensPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBien, setEditingBien] = useState<Bien | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingBien, setDeletingBien] = useState<Bien | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pageSize = 10;

  const {
    data: biensData,
    isLoading,
    error,
  } = useQuery(
    ['biens', currentPage, searchTerm],
    () =>
      biensService.getAll({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
      }),
    {
      keepPreviousData: true,
    }
  );

  const deleteMutation = useMutation(biensService.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('biens');
      setIsDeleteModalOpen(false);
      setDeletingBien(null);
      toast.success('Bien supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la suppression');
    },
  });

  const handleDelete = () => {
    if (deletingBien) {
      deleteMutation.mutate(deletingBien.id);
    }
  };

  const openDeleteModal = (bien: Bien) => {
    setDeletingBien(bien);
    setIsDeleteModalOpen(true);
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'LOUE':
        return 'success';
      case 'VACANT':
        return 'warning';
      case 'TRAVAUX':
        return 'danger';
      default:
        return 'gray';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'LOUE':
        return 'Loué';
      case 'VACANT':
        return 'Vacant';
      case 'TRAVAUX':
        return 'Travaux';
      default:
        return statut;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'APPARTEMENT':
        return 'Appartement';
      case 'MAISON':
        return 'Maison';
      case 'STUDIO':
        return 'Studio';
      case 'LOCAL':
        return 'Local commercial';
      case 'GARAGE':
        return 'Garage';
      default:
        return type;
    }
  };

  const columns = [
    {
      key: 'adresse',
      title: 'Adresse',
      render: (value: any, bien: Bien) => (
        <div>
          <div className="font-medium text-gray-900">
            {bien.adresse}
          </div>
          <div className="text-sm text-gray-500 flex items-center mt-1">
            <MapPin className="h-3 w-3 mr-1" />
            {bien.codePostal} {bien.ville}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type & Surface',
      render: (value: any, bien: Bien) => (
        <div>
          <div className="font-medium text-gray-900">
            {getTypeLabel(bien.type)}
          </div>
          <div className="text-sm text-gray-500 flex items-center mt-1">
            <Home className="h-3 w-3 mr-1" />
            {bien.surface}m² - {bien.nbPieces} pièces
          </div>
        </div>
      ),
    },
    {
      key: 'loyer',
      title: 'Loyer',
      render: (value: any, bien: Bien) => (
        <div className="text-right">
          <div className="font-medium text-gray-900 flex items-center">
            <Euro className="h-4 w-4 mr-1" />
            {bien.loyer.toLocaleString()}€
          </div>
          {bien.chargesMensuelles > 0 && (
            <div className="text-sm text-gray-500">
              + {bien.chargesMensuelles}€ charges
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'statut',
      title: 'Statut & Loyers',
      render: (value: any, bien: Bien) => (
        <div>
          <Badge
            variant={getStatutColor(bien.statut)}
            className="capitalize mb-1"
          >
            {getStatutLabel(bien.statut)}
          </Badge>
          {bien.contrats && bien.contrats.length > 0 && (
            <div className="text-xs text-gray-600 mt-1">
              {bien.contrats[0].loyers?.filter(l => l.statut === 'RETARD').length > 0 && (
                <span className="text-red-600 font-medium">⚠ Loyers en retard</span>
              )}
              {bien.contrats[0].loyers?.filter(l => l.statut === 'EN_ATTENTE').length > 0 && (
                <span className="text-orange-600">⏳ Loyers en attente</span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'proprietaires',
      title: 'Propriétaire(s)',
      render: (value: any, bien: Bien) => (
        <div>
          {bien.proprietaires?.map((bp, index) => (
            <div key={bp.id} className="text-sm">
              <span className="font-medium">
                {bp.proprietaire.prenom} {bp.proprietaire.nom}
              </span>
              {bien.proprietaires.length > 1 && (
                <span className="text-gray-500 ml-1">
                  ({bp.quotePart}%)
                </span>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, bien: Bien) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingBien(bien)}
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDeleteModal(bien)}
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
        <p className="text-red-600">Erreur lors du chargement des biens</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Biens immobiliers
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez votre patrimoine immobilier ({biensData?.data?.length || 0} biens)
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau bien
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <Home className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total biens</p>
              <p className="text-2xl font-semibold text-gray-900">
                {biensData?.data?.length || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <Home className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Loués</p>
              <p className="text-2xl font-semibold text-gray-900">
                {biensData?.data?.filter(b => b.statut === 'LOUE').length || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <Home className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Vacants</p>
              <p className="text-2xl font-semibold text-gray-900">
                {biensData?.data?.filter(b => b.statut === 'VACANT').length || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <Euro className="h-8 w-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Loyer mensuel total</p>
              <p className="text-2xl font-semibold text-gray-900">
                {biensData?.data?.reduce((sum, bien) => sum + bien.loyer, 0)?.toLocaleString() || 0}€/mois
              </p>
              <p className="text-xs text-gray-500">
                Revenus potentiels annuels : {((biensData?.data?.reduce((sum, bien) => sum + bien.loyer, 0) || 0) * 12).toLocaleString()}€
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Rechercher un bien..."
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
          data={biensData?.data || []}
          loading={isLoading}
          keyExtractor={(record) => record.id}
          onRowDoubleClick={(bien) => navigate(`/biens/${bien.id}`)}
        />
      </div>

      {/* Create Modal - Placeholder for now */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Créer un bien"
        size="lg"
      >
        <div className="p-6 text-center">
          <Home className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Formulaire en cours de développement
          </h3>
          <p className="text-gray-600 mb-4">
            Le formulaire de création des biens sera bientôt disponible.
          </p>
          <Button onClick={() => setIsCreateModalOpen(false)}>
            Fermer
          </Button>
        </div>
      </Modal>

      {/* Edit Modal - Placeholder for now */}
      <Modal
        isOpen={!!editingBien}
        onClose={() => setEditingBien(null)}
        title="Modifier le bien"
        size="lg"
      >
        <div className="p-6 text-center">
          <Home className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Formulaire en cours de développement
          </h3>
          <p className="text-gray-600 mb-4">
            Le formulaire de modification des biens sera bientôt disponible.
          </p>
          <Button onClick={() => setEditingBien(null)}>
            Fermer
          </Button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Supprimer le bien"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir supprimer ce bien ? Cette action est
            irréversible.
          </p>
          {deletingBien && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">
                {deletingBien.adresse}
              </div>
              <div className="text-sm text-gray-600">
                {deletingBien.codePostal} {deletingBien.ville}
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

export default BiensPage;