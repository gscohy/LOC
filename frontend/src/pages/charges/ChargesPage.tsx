import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Plus, 
  Search, 
  Filter, 
  Euro, 
  Calendar,
  Building,
  Tag,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  BarChart3,
  PieChart,
  Calculator
} from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ChargeForm from '@/components/forms/ChargeForm';
import ChargesGroupedTable from '@/components/charges/ChargesGroupedTable';
import ChargesSynthesisTable from '@/components/charges/ChargesSynthesisTable';
import ChargesCharts from '@/components/charges/ChargesCharts';
import { chargesService, Charge, ChargeCreate, ChargeUpdate, ChargesListParams } from '@/services/charges';
import { biensService } from '@/services/biens';

const ChargesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ChargesListParams>({
    page: 1,
    limit: 100, // Augmenté pour le tableau groupé
  });
  const [showFilters, setShowFilters] = useState(false);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [ventilationModalOpen, setVentilationModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('grouped');
  const [groupBy, setGroupBy] = useState<'year-month' | 'category' | 'bien'>('year-month');
  const [synthesisYear, setSynthesisYear] = useState<number>(new Date().getFullYear());

  const queryClient = useQueryClient();


  // Récupérer les charges avec filtres
  const {
    data: chargesData,
    isLoading: chargesLoading,
    error: chargesError,
  } = useQuery(
    ['charges', filters, searchTerm],
    () => {
      console.log('🔍 Requête charges avec filtres:', { filters, searchTerm });
      return chargesService.getAll({
        ...filters,
        ...(searchTerm && { search: searchTerm }),
      });
    },
    {
      keepPreviousData: true,
      onError: (error) => {
        console.error('❌ Erreur lors de la récupération des charges:', error);
      }
    }
  );

  // Récupérer les charges pour la synthèse (sans filtres de recherche)
  const {
    data: synthesisChargesData,
    isLoading: synthesisChargesLoading,
  } = useQuery(
    ['charges-synthesis', synthesisYear],
    () => {
      console.log('🔍 Requête charges synthèse pour année:', synthesisYear);
      return chargesService.getAll({
        page: 1,
        limit: 1000, // Récupérer toutes les charges pour la synthèse
        annee: synthesisYear
      });
    },
    {
      keepPreviousData: true,
    }
  );

  // Récupérer les statistiques
  const { data: statsData } = useQuery(
    ['charges-stats', filters.bienId],
    () => chargesService.getStats({
      bienId: filters.bienId,
      annee: new Date().getFullYear(),
    })
  );

  // Récupérer la liste des biens pour les filtres
  const { data: biensData } = useQuery('biens', () => biensService.getAll());

  // Mutations
  const createChargeMutation = useMutation(chargesService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries(['charges']);
      queryClient.invalidateQueries(['charges-stats']);
      setChargeModalOpen(false);
      setSelectedCharge(null);
      toast.success('Charge créée avec succès');
    },
    onError: (error: any) => {
      console.error('Erreur création charge:', error);
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la création de la charge');
    },
  });

  const updateChargeMutation = useMutation(
    ({ id, data }: { id: string; data: ChargeUpdate }) => chargesService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['charges']);
        queryClient.invalidateQueries(['charges-stats']);
        setChargeModalOpen(false);
        setSelectedCharge(null);
        toast.success('Charge mise à jour avec succès');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error?.message || 'Erreur lors de la mise à jour de la charge');
      },
    }
  );

  const deleteChargeMutation = useMutation(chargesService.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries(['charges']);
      queryClient.invalidateQueries(['charges-stats']);
      toast.success('Charge supprimée avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la suppression de la charge');
    },
  });

  const togglePayeeMutation = useMutation(chargesService.togglePayee, {
    onSuccess: (updatedCharge) => {
      queryClient.invalidateQueries(['charges']);
      queryClient.invalidateQueries(['charges-stats']);
      toast.success(`Charge marquée comme ${updatedCharge.payee ? 'payée' : 'non payée'}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la mise à jour du statut');
    },
  });

  const handleCreateCharge = () => {
    setSelectedCharge(null);
    setChargeModalOpen(true);
  };

  const handleEditCharge = (charge: Charge) => {
    setSelectedCharge(charge);
    setChargeModalOpen(true);
  };

  const handleViewCharge = (charge: Charge) => {
    setSelectedCharge(charge);
    setViewModalOpen(true);
  };

  const handleDeleteCharge = (charge: Charge) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette charge ?')) {
      deleteChargeMutation.mutate(charge.id);
    }
  };

  const handleFormSubmit = (data: ChargeCreate | ChargeUpdate) => {
    if (selectedCharge) {
      updateChargeMutation.mutate({ id: selectedCharge.id, data });
    } else {
      createChargeMutation.mutate(data as ChargeCreate);
    }
  };

  const handleTogglePayee = (charge: Charge) => {
    togglePayeeMutation.mutate(charge.id);
  };

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1, // Reset page when changing filters
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
    });
    setSearchTerm('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const getPayeeVariant = (payee: boolean) => {
    return payee ? 'success' : 'warning';
  };

  const biensOptions = [
    { value: '', label: 'Tous les biens' },
    ...(biensData?.data?.map(bien => ({
      value: bien.id,
      label: `${bien.adresse} - ${bien.ville}`,
    })) || [])
  ];

  const categoriesOptions = [
    { value: '', label: 'Toutes les catégories' },
    ...chargesService.getCategories().map(cat => ({
      value: cat,
      label: chargesService.getCategorieLabel(cat),
    }))
  ];

  const typesOptions = [
    { value: '', label: 'Tous les types' },
    ...chargesService.getTypes().map(type => ({
      value: type,
      label: chargesService.getTypeLabel(type),
    }))
  ];

  const columns = [
    {
      key: 'date',
      title: 'Date',
      render: (_: any, charge: Charge) => (
        <div className="text-sm">
          {formatDate(charge.date)}
        </div>
      ),
    },
    {
      key: 'bien',
      title: 'Bien',
      render: (_: any, charge: Charge) => (
        <div className="text-sm">
          <div className="font-medium">{charge.bien.adresse}</div>
          <div className="text-gray-500">{charge.bien.ville}</div>
        </div>
      ),
    },
    {
      key: 'categorie',
      title: 'Catégorie',
      render: (_: any, charge: Charge) => (
        <Badge variant="gray">
          {chargesService.getCategorieLabel(charge.categorie)}
        </Badge>
      ),
    },
    {
      key: 'description',
      title: 'Description',
      render: (_: any, charge: Charge) => (
        <div className="text-sm max-w-xs truncate" title={charge.description}>
          {charge.description}
        </div>
      ),
    },
    {
      key: 'montant',
      title: 'Montant',
      render: (_: any, charge: Charge) => (
        <div className="text-right font-medium">
          {formatCurrency(charge.montant)}
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      render: (_: any, charge: Charge) => (
        <span className="text-sm">
          {chargesService.getTypeLabel(charge.type)}
        </span>
      ),
    },
    {
      key: 'payee',
      title: 'Statut',
      render: (_: any, charge: Charge) => (
        <Badge variant={getPayeeVariant(charge.payee)}>
          {charge.payee ? 'Payée' : 'Non payée'}
        </Badge>
      ),
    },
    {
      key: 'facture',
      title: 'Facture',
      render: (_: any, charge: Charge) => (
        <div className="text-center">
          {charge.facture ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
                const factureUrl = charge.facture.startsWith('/uploads/') 
                  ? `${baseUrl}${charge.facture}`
                  : `${baseUrl}/uploads/factures/${charge.facture}`;
                window.open(factureUrl, '_blank');
              }}
              className="text-blue-600 hover:text-blue-700"
              title="Visualiser la facture"
            >
              <FileText className="h-4 w-4" />
            </Button>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, charge: Charge) => (
        <div className="flex justify-end space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleTogglePayee(charge)}
            className={charge.payee ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
            title={charge.payee ? 'Marquer comme non payée' : 'Marquer comme payée'}
          >
            {charge.payee ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewCharge(charge)}
            title="Voir les détails"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditCharge(charge)}
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteCharge(charge)}
            className="text-red-600 hover:text-red-700"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
            Charges propriétaire
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez les charges et frais liés aux biens immobiliers
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => setVentilationModalOpen(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Générer la déclaration 2044
          </Button>
          <Button onClick={handleCreateCharge}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle charge
          </Button>
        </div>
      </div>



      {/* Statistiques */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total charges</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(statsData.total.montant)}
                </p>
                <p className="text-xs text-gray-500">
                  {statsData.total.nombre} charge{statsData.total.nombre > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Charges payées</p>
                <p className="text-2xl font-semibold text-green-600">
                  {formatCurrency(statsData.payees.montant)}
                </p>
                <p className="text-xs text-gray-500">
                  {statsData.payees.nombre} charge{statsData.payees.nombre > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Charges non payées</p>
                <p className="text-2xl font-semibold text-red-600">
                  {formatCurrency(statsData.nonPayees.montant)}
                </p>
                <p className="text-xs text-gray-500">
                  {statsData.nonPayees.nombre} charge{statsData.nonPayees.nombre > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Taux paiement</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statsData.total.montant > 0 
                    ? Math.round((statsData.payees.montant / statsData.total.montant) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tableau de synthèse des charges par mois et localisation */}
      {synthesisChargesData && synthesisChargesData.charges.length > 0 && (
        <ChargesSynthesisTable
          charges={synthesisChargesData.charges}
          selectedYear={synthesisYear}
          onYearChange={setSynthesisYear}
        />
      )}

      {/* Search and filters */}
      <div className="card">
        <div className="p-4 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-md">
              <Input
                type="text"
                placeholder="Rechercher une charge..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
            <Button
              variant="outline"
              onClick={resetFilters}
            >
              Réinitialiser
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant={viewMode === 'grouped' ? 'primary' : 'outline'}
              onClick={() => setViewMode('grouped')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Vue groupée
            </Button>
            <Button
              variant={viewMode === 'table' ? 'primary' : 'outline'}
              onClick={() => setViewMode('table')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Vue tableau
            </Button>
            {viewMode === 'grouped' && (
              <Select
                label="Grouper par"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                options={[
                  { value: 'year-month', label: 'Année / Mois' },
                  { value: 'category', label: 'Catégorie' },
                  { value: 'bien', label: 'Bien immobilier' },
                ]}
              />
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <Select
                label="Bien"
                value={filters.bienId || ''}
                onChange={(e) => handleFilterChange('bienId', e.target.value || undefined)}
                options={biensOptions}
              />
              <Select
                label="Catégorie"
                value={filters.categorie || ''}
                onChange={(e) => handleFilterChange('categorie', e.target.value || undefined)}
                options={categoriesOptions}
              />
              <Select
                label="Type"
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
                options={typesOptions}
              />
              <Select
                label="Statut"
                value={filters.payee !== undefined ? (filters.payee ? 'true' : 'false') : ''}
                onChange={(e) => handleFilterChange('payee', e.target.value === '' ? undefined : e.target.value === 'true')}
                options={[
                  { value: '', label: 'Tous les statuts' },
                  { value: 'true', label: 'Payées' },
                  { value: 'false', label: 'Non payées' },
                ]}
              />
            </div>
          )}
        </div>
      </div>

      {/* Table/Vue groupée des charges */}
      <div className="space-y-4">
        {chargesLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : chargesError ? (
          <div className="text-center py-12">
            <p className="text-red-600">Erreur lors du chargement des charges</p>
          </div>
        ) : chargesData && chargesData.charges.length > 0 ? (
          <>
            {/* Afficher tableau simple si recherche active, sinon vue groupée ou tableau selon le mode */}
            {searchTerm ? (
              <div className="card">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Search className="h-5 w-5 mr-2" />
                    Résultats de recherche pour "{searchTerm}"
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {chargesData.charges.length} résultat{chargesData.charges.length > 1 ? 's' : ''} trouvé{chargesData.charges.length > 1 ? 's' : ''}
                  </p>
                </div>
                <Table
                  columns={columns}
                  data={chargesData.charges}
                  keyExtractor={(record) => record.id}
                />
                
                {/* Pagination */}
                {chargesData.pagination.pages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Page {chargesData.pagination.page} sur {chargesData.pagination.pages}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(chargesData.pagination.page - 1)}
                          disabled={chargesData.pagination.page === 1}
                        >
                          Précédent
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(chargesData.pagination.page + 1)}
                          disabled={chargesData.pagination.page === chargesData.pagination.pages}
                        >
                          Suivant
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : viewMode === 'grouped' ? (
              <ChargesGroupedTable
                charges={chargesData.charges}
                onView={handleViewCharge}
                onEdit={handleEditCharge}
                onDelete={handleDeleteCharge}
                onTogglePayee={handleTogglePayee}
                groupBy={groupBy}
              />
            ) : (
              <div className="card">
                <Table
                  columns={columns}
                  data={chargesData.charges}
                  keyExtractor={(record) => record.id}
                />
                
                {/* Pagination */}
                {chargesData.pagination.pages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Page {chargesData.pagination.page} sur {chargesData.pagination.pages}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(chargesData.pagination.page - 1)}
                          disabled={chargesData.pagination.page === 1}
                        >
                          Précédent
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(chargesData.pagination.page + 1)}
                          disabled={chargesData.pagination.page === chargesData.pagination.pages}
                        >
                          Suivant
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="card">
            <div className="text-center py-12">
              <Euro className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune charge trouvée
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || Object.keys(filters).some(k => filters[k as keyof ChargesListParams] && k !== 'page' && k !== 'limit')
                  ? 'Aucune charge ne correspond aux critères de recherche.' 
                  : 'Commencez par créer votre première charge.'}
              </p>
              <Button onClick={handleCreateCharge}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle charge
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal formulaire charge */}
      <Modal
        isOpen={chargeModalOpen}
        onClose={() => {
          setChargeModalOpen(false);
          setSelectedCharge(null);
        }}
        title={selectedCharge ? 'Modifier la charge' : 'Nouvelle charge'}
        size="xl"
      >
        <ChargeForm
          charge={selectedCharge}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setChargeModalOpen(false);
            setSelectedCharge(null);
          }}
          loading={createChargeMutation.isLoading || updateChargeMutation.isLoading}
        />
      </Modal>

      {/* Modal détails charge */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedCharge(null);
        }}
        title="Détails de la charge"
        size="lg"
      >
        {selectedCharge && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Informations générales</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bien:</span>
                    <span>{selectedCharge.bien.adresse}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Catégorie:</span>
                    <span>{chargesService.getCategorieLabel(selectedCharge.categorie)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span>{chargesService.getTypeLabel(selectedCharge.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span>{formatDate(selectedCharge.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Statut:</span>
                    <Badge variant={getPayeeVariant(selectedCharge.payee)}>
                      {selectedCharge.payee ? 'Payée' : 'Non payée'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Détails financiers</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant:</span>
                    <span className="font-medium text-lg">{formatCurrency(selectedCharge.montant)}</span>
                  </div>
                  {selectedCharge.facture && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Facture:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500 truncate max-w-32" title={selectedCharge.facture}>
                          {selectedCharge.facture}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
                            const factureUrl = selectedCharge.facture.startsWith('/uploads/') 
                              ? `${baseUrl}${selectedCharge.facture}`
                              : `${baseUrl}/uploads/factures/${selectedCharge.facture}`;
                            window.open(factureUrl, '_blank');
                          }}
                          className="text-blue-600 hover:text-blue-700"
                          title="Visualiser la facture"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {selectedCharge.description && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Description</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {selectedCharge.description}
                </p>
              </div>
            )}

            {selectedCharge.commentaires && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Commentaires</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {selectedCharge.commentaires}
                </p>
              </div>
            )}

            {selectedCharge.type !== 'PONCTUELLE' && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Récurrence</h4>
                <div className="space-y-2 text-sm">
                  {selectedCharge.dateDebut && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date de début:</span>
                      <span>{formatDate(selectedCharge.dateDebut)}</span>
                    </div>
                  )}
                  {selectedCharge.dateFin && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date de fin:</span>
                      <span>{formatDate(selectedCharge.dateFin)}</span>
                    </div>
                  )}
                  {selectedCharge.frequence && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fréquence:</span>
                      <span>{selectedCharge.frequence}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal déclaration 2044 */}
      <Modal
        isOpen={ventilationModalOpen}
        onClose={() => setVentilationModalOpen(false)}
        title="Déclaration 2044 - Détail des charges par bien"
        size="xl"
      >
        <div className="space-y-6">
          {/* En-tête explicatif */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Génération de la déclaration 2044 - Détail par bien immobilier
            </h3>
            <p className="text-sm text-blue-800">
              Détail des charges par bien et par catégorie pour faciliter la saisie de votre déclaration fiscale 2044.
            </p>
          </div>

          {chargesData && chargesData.charges.length > 0 && (
            <div className="space-y-6">
              {/* Grouper les charges par bien */}
              {Object.entries(
                chargesData.charges.reduce((acc, charge) => {
                  const bienKey = `${charge.bien.adresse}, ${charge.bien.ville}`;
                  if (!acc[bienKey]) {
                    acc[bienKey] = {
                      bien: charge.bien,
                      charges: [],
                      totalParCategorie: {}
                    };
                  }
                  acc[bienKey].charges.push(charge);
                  
                  // Calculer total par catégorie pour ce bien
                  if (!acc[bienKey].totalParCategorie[charge.categorie]) {
                    acc[bienKey].totalParCategorie[charge.categorie] = 0;
                  }
                  acc[bienKey].totalParCategorie[charge.categorie] += charge.montant;
                  
                  return acc;
                }, {} as Record<string, any>)
              ).map(([bienKey, bienData]) => (
                <div key={bienKey} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* En-tête du bien */}
                  <div className="bg-gray-100 px-4 py-3 border-b">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <Building className="h-4 w-4 mr-2" />
                      {bienData.bien.adresse}
                    </h4>
                    <p className="text-sm text-gray-600">{bienData.bien.ville} - {bienData.bien.codePostal}</p>
                  </div>
                  
                  {/* Tableau des charges par catégorie */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Catégorie
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Montant total
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nb charges
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Statut paiement
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(bienData.totalParCategorie)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([categorie, montantTotal]) => {
                            const chargesCategorie = bienData.charges.filter((c: any) => c.categorie === categorie);
                            const chargesPayees = chargesCategorie.filter((c: any) => c.payee);
                            const montantPaye = chargesPayees.reduce((sum: number, c: any) => sum + c.montant, 0);
                            
                            return (
                              <tr key={categorie} className="hover:bg-gray-50">
                                <td className="px-4 py-2">
                                  <div className="flex items-center">
                                    <Badge variant="gray" className="mr-2">
                                      {chargesService.getCategorieLabel(categorie)}
                                    </Badge>
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-right font-medium">
                                  {formatCurrency(montantTotal)}
                                </td>
                                <td className="px-4 py-2 text-center text-sm text-gray-600">
                                  {chargesCategorie.length}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex flex-col items-center">
                                    <div className="text-xs text-gray-600">
                                      {formatCurrency(montantPaye)} / {formatCurrency(montantTotal)}
                                    </div>
                                    <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                                      <div 
                                        className="bg-green-500 h-1.5 rounded-full" 
                                        style={{ 
                                          width: `${montantTotal > 0 ? (montantPaye / montantTotal) * 100 : 0}%` 
                                        }}
                                      ></div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {montantTotal > 0 ? Math.round((montantPaye / montantTotal) * 100) : 0}%
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td className="px-4 py-2 font-semibold text-gray-900">
                            Total {bienData.bien.adresse}
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-lg">
                            {formatCurrency(
                              Object.values(bienData.totalParCategorie).reduce((sum: number, montant: any) => sum + montant, 0)
                            )}
                          </td>
                          <td className="px-4 py-2 text-center font-medium">
                            {bienData.charges.length}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Badge variant={
                              bienData.charges.every((c: any) => c.payee) ? 'success' :
                              bienData.charges.some((c: any) => c.payee) ? 'warning' : 'danger'
                            }>
                              {bienData.charges.filter((c: any) => c.payee).length} / {bienData.charges.length} payées
                            </Badge>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}
              
              {/* Résumé global */}
              <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-4">
                <h4 className="font-bold text-blue-900 mb-3 text-lg flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Charges déductibles détaillées par catégorie
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-blue-300">
                        <th className="text-left py-2 font-semibold text-blue-900">Catégorie</th>
                        <th className="text-right py-2 font-semibold text-blue-900">Montant total</th>
                        <th className="text-center py-2 font-semibold text-blue-900">Répartition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(
                        chargesData.charges.reduce((acc, charge) => {
                          if (!acc[charge.categorie]) acc[charge.categorie] = 0;
                          acc[charge.categorie] += charge.montant;
                          return acc;
                        }, {} as Record<string, number>)
                      )
                        .sort(([, a], [, b]) => b - a)
                        .map(([categorie, montant]) => {
                          const totalGeneral = chargesData.charges.reduce((sum, c) => sum + c.montant, 0);
                          const pourcentage = totalGeneral > 0 ? (montant / totalGeneral) * 100 : 0;
                          
                          return (
                            <tr key={categorie} className="border-b border-blue-200">
                              <td className="py-2">
                                <Badge variant="outline">
                                  {chargesService.getCategorieLabel(categorie)}
                                </Badge>
                              </td>
                              <td className="py-2 text-right font-medium text-blue-900">
                                {formatCurrency(montant)}
                              </td>
                              <td className="py-2 text-center">
                                <div className="flex items-center justify-center">
                                  <div className="w-20 bg-blue-200 rounded-full h-2 mr-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full" 
                                      style={{ width: `${pourcentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium text-blue-800">
                                    {pourcentage.toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      <tr className="border-t-2 border-blue-400">
                        <td className="py-2 font-bold text-blue-900">TOTAL GÉNÉRAL</td>
                        <td className="py-2 text-right font-bold text-lg text-blue-900">
                          {formatCurrency(chargesData.charges.reduce((sum, c) => sum + c.montant, 0))}
                        </td>
                        <td className="py-2 text-center font-bold text-blue-900">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {(!chargesData || chargesData.charges.length === 0) && (
            <div className="text-center py-12">
              <Euro className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune charge à ventiler
              </h3>
              <p className="text-gray-600">
                Créez d'abord des charges pour voir la ventilation par bien et catégorie.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setVentilationModalOpen(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChargesPage;