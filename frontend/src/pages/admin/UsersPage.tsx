import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Edit, Trash2, Users, UserCheck, UserX, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { usersService, User, FilterOptions } from '@/services/users';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import UserForm from '@/components/forms/UserForm';

const UsersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filtres
  const [filters, setFilters] = useState({
    role: '',
    structure: '',
    typeCollab: '',
    statut: '',
  });

  const queryClient = useQueryClient();
  const pageSize = 10;

  // Récupérer les utilisateurs
  const {
    data: usersData,
    isLoading,
    error,
  } = useQuery(
    ['users', currentPage, searchTerm, filters],
    () =>
      usersService.getAll({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        role: filters.role || undefined,
        structure: filters.structure || undefined,
        typeCollab: filters.typeCollab || undefined,
        statut: filters.statut || undefined,
      }),
    {
      keepPreviousData: true,
    }
  );

  // Récupérer les statistiques
  const { data: stats } = useQuery('users-stats', usersService.getStats);

  // Récupérer les options de filtres
  const { data: filterOptions } = useQuery<FilterOptions>('users-filter-options', usersService.getFilterOptions);

  // Mutations
  const deleteMutation = useMutation(usersService.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('users');
      queryClient.invalidateQueries('users-stats');
      setIsDeleteModalOpen(false);
      setDeletingUser(null);
      toast.success('Utilisateur supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la suppression');
    },
  });

  const handleDelete = () => {
    if (deletingUser) {
      deleteMutation.mutate(deletingUser.id);
    }
  };

  const openDeleteModal = (user: User) => {
    setDeletingUser(user);
    setIsDeleteModalOpen(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'danger';
      case 'GESTIONNAIRE':
        return 'primary';
      case 'LECTEUR':
        return 'secondary';
      default:
        return 'gray';
    }
  };

  const getStatutBadgeColor = (statut: string) => {
    switch (statut) {
      case 'ACTIF':
        return 'success';
      case 'INACTIF':
        return 'warning';
      case 'SUSPENDU':
        return 'danger';
      default:
        return 'gray';
    }
  };

  const clearFilters = () => {
    setFilters({
      role: '',
      structure: '',
      typeCollab: '',
      statut: '',
    });
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(filter => filter !== '');

  const columns = [
    {
      header: 'Utilisateur',
      accessor: 'nom' as keyof User,
      render: (user: User) => (
        <div>
          <div className="font-medium text-gray-900">
            {user.prenom} {user.nom}
          </div>
          <div className="text-sm text-gray-500">{user.email}</div>
          {user.telephone && (
            <div className="text-sm text-gray-500">{user.telephone}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Rôle',
      accessor: 'role' as keyof User,
      render: (user: User) => (
        <Badge variant={getRoleBadgeColor(user.role)}>
          {user.role}
        </Badge>
      ),
    },
    {
      header: 'Structure',
      accessor: 'structure' as keyof User,
      render: (user: User) => (
        <div className="text-sm">
          {user.structure || <span className="text-gray-400">Non définie</span>}
        </div>
      ),
    },
    {
      header: 'Type Collaborateur',
      accessor: 'typeCollab' as keyof User,
      render: (user: User) => (
        <div className="text-sm">
          {user.typeCollab || <span className="text-gray-400">Non défini</span>}
        </div>
      ),
    },
    {
      header: 'Statut',
      accessor: 'statut' as keyof User,
      render: (user: User) => (
        <Badge variant={getStatutBadgeColor(user.statut)}>
          {user.statut}
        </Badge>
      ),
    },
    {
      header: 'Créé le',
      accessor: 'createdAt' as keyof User,
      render: (user: User) => (
        <div className="text-sm text-gray-600">
          {new Date(user.createdAt).toLocaleDateString('fr-FR')}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id' as keyof User,
      render: (user: User) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingUser(user)}
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDeleteModal(user)}
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
        <p className="text-red-600">Erreur lors du chargement des utilisateurs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Administration des utilisateurs
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez les utilisateurs et leurs permissions ({usersData?.data?.length || 0} utilisateurs)
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total utilisateurs</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Utilisateurs actifs</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.parStatut.find(s => s.statut === 'ACTIF')?._count.statut || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Utilisateurs inactifs</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.parStatut.find(s => s.statut === 'INACTIF')?._count.statut || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Nouveaux (30j)</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.recent}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and filters */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-blue-50 text-blue-600' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtres
            {hasActiveFilters && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">
                {Object.values(filters).filter(f => f !== '').length}
              </span>
            )}
          </Button>
        </div>

        {/* Filtres avancés */}
        {showFilters && (
          <div className="card p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rôle
                </label>
                <Select
                  value={filters.role}
                  onChange={(value) => setFilters(prev => ({ ...prev, role: value }))}
                >
                  <option value="">Tous les rôles</option>
                  {filterOptions?.roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Structure
                </label>
                <Select
                  value={filters.structure}
                  onChange={(value) => setFilters(prev => ({ ...prev, structure: value }))}
                >
                  <option value="">Toutes les structures</option>
                  {filterOptions?.structures.map((structure) => (
                    <option key={structure} value={structure}>
                      {structure}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type Collaborateur
                </label>
                <Select
                  value={filters.typeCollab}
                  onChange={(value) => setFilters(prev => ({ ...prev, typeCollab: value }))}
                >
                  <option value="">Tous les types</option>
                  {filterOptions?.typesCollab.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statut
                </label>
                <Select
                  value={filters.statut}
                  onChange={(value) => setFilters(prev => ({ ...prev, statut: value }))}
                >
                  <option value="">Tous les statuts</option>
                  {filterOptions?.statuts.map((statut) => (
                    <option key={statut} value={statut}>
                      {statut}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-600"
                >
                  <X className="h-4 w-4 mr-1" />
                  Effacer les filtres
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card">
        <Table
          columns={columns}
          data={usersData?.data || []}
          loading={isLoading}
          pagination={{
            currentPage,
            totalPages: usersData?.pagination?.pages || 1,
            onPageChange: setCurrentPage,
          }}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateModalOpen || !!editingUser}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingUser(null);
        }}
        title={editingUser ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
        size="lg"
      >
        <UserForm
          user={editingUser}
          onSuccess={() => {
            queryClient.invalidateQueries('users');
            queryClient.invalidateQueries('users-stats');
            queryClient.invalidateQueries('users-filter-options');
            setIsCreateModalOpen(false);
            setEditingUser(null);
          }}
          onCancel={() => {
            setIsCreateModalOpen(false);
            setEditingUser(null);
          }}
        />
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Supprimer l'utilisateur"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
          </p>
          {deletingUser && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">
                {deletingUser.prenom} {deletingUser.nom}
              </div>
              <div className="text-sm text-gray-600">{deletingUser.email}</div>
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

export default UsersPage;