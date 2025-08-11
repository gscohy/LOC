import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  CreditCard, 
  Plus, 
  Upload,
  Download,
  Trash2,
  Edit3,
  FileText,
  Building2,
  Calendar,
  Euro,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { pretsService, PretImmobilier } from '@/services/prets';
import { biensService } from '@/services/biens';
import PretModal from '@/components/prets/PretModal';
import TableauAmortissementModal from '@/components/prets/TableauAmortissementModal';
import FiscalitePretsModal from '@/components/prets/FiscalitePretsModal';

const PretsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [bienFilter, setBienFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTableauModal, setShowTableauModal] = useState(false);
  const [showFiscaliteModal, setShowFiscaliteModal] = useState(false);
  const [selectedPret, setSelectedPret] = useState<PretImmobilier | null>(null);

  // Récupérer les prêts
  const { data: pretsData, isLoading } = useQuery(
    ['prets', page, statusFilter, bienFilter],
    () => pretsService.getAll({ 
      page, 
      limit: 20, 
      statut: statusFilter || undefined,
      bienId: bienFilter || undefined 
    }),
    {
      keepPreviousData: true,
    }
  );

  // Récupérer les biens pour le filtre
  const { data: biensData } = useQuery(
    'biens-all',
    () => biensService.getAll({ page: 1, limit: 1000 }),
    {
      staleTime: 5 * 60 * 1000, // Cache 5 minutes
    }
  );

  // Mutation pour supprimer un prêt
  const deleteMutation = useMutation(
    (id: string) => pretsService.delete(id),
    {
      onSuccess: () => {
        toast.success('Prêt supprimé avec succès');
        queryClient.invalidateQueries(['prets']);
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error || 'Erreur lors de la suppression');
      },
    }
  );

  const handleDelete = (pret: PretImmobilier) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le prêt "${pret.nom}" ?\n\nCette action supprimera également toutes les échéances associées et ne peut pas être annulée.`)) {
      deleteMutation.mutate(pret.id);
    }
  };

  const handleEditPret = (pret: PretImmobilier) => {
    setSelectedPret(pret);
    setShowCreateModal(true);
  };

  const handleUploadTableau = (pret: PretImmobilier) => {
    setSelectedPret(pret);
    setShowTableauModal(true);
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'ACTIF': return 'text-green-600 bg-green-100';
      case 'SOLDE': return 'text-blue-600 bg-blue-100';
      case 'SUSPENDU': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'ACTIF': return <CheckCircle className="h-4 w-4" />;
      case 'SOLDE': return <TrendingUp className="h-4 w-4" />;
      case 'SUSPENDU': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'ACTIF', label: 'Actif' },
    { value: 'SOLDE', label: 'Soldé' },
    { value: 'SUSPENDU', label: 'Suspendu' },
  ];

  const biensOptions = [
    { value: '', label: 'Tous les biens' },
    ...(biensData?.data?.biens?.map((bien: any) => ({
      value: bien.id,
      label: `${bien.adresse}, ${bien.ville}`
    })) || [])
  ];

  const prets = pretsData?.data?.prets || [];
  const pagination = pretsData?.data?.pagination;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <CreditCard className="h-8 w-8 text-blue-600 mr-3" />
            Prêts Immobiliers
          </h1>
          <p className="mt-1 text-lg text-gray-600">
            Gestion des prêts et tableaux d'amortissement pour les déclarations fiscales
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowFiscaliteModal(true)}
            className="flex items-center"
          >
            <FileText className="h-4 w-4 mr-2" />
            Vue Fiscalité
          </Button>
          <Button
            onClick={() => {
              setSelectedPret(null);
              setShowCreateModal(true);
            }}
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Prêt
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Statut"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={statusOptions}
          />
          <Select
            label="Bien immobilier"
            value={bienFilter}
            onChange={(e) => {
              setBienFilter(e.target.value);
              setPage(1);
            }}
            options={biensOptions}
          />
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter('');
                setBienFilter('');
                setPage(1);
              }}
              className="w-full"
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      {prets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-blue-500">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Prêts</p>
                <p className="text-2xl font-semibold text-gray-900">{pagination?.total || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-green-500">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Prêts Actifs</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {prets.filter((p: PretImmobilier) => p.statut === 'ACTIF').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-purple-500">
                <Euro className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Capital Emprunté</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(prets.reduce((sum: number, p: PretImmobilier) => sum + p.montantEmprunte, 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-orange-500">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avec Tableau</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {prets.filter((p: PretImmobilier) => p.fichierOriginal).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste des prêts */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Liste des Prêts Immobiliers
          </h3>
        </div>

        <div className="overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Chargement...</span>
            </div>
          ) : prets.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun prêt</h3>
              <p className="mt-1 text-sm text-gray-500">
                Commencez par ajouter votre premier prêt immobilier.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => {
                    setSelectedPret(null);
                    setShowCreateModal(true);
                  }}
                  className="inline-flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau Prêt
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prêt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bien
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant & Durée
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mensualité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tableau
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {prets.map((pret: PretImmobilier) => (
                    <tr key={pret.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {pret.nom}
                          </div>
                          <div className="text-sm text-gray-500">
                            {pret.banque}
                          </div>
                          {pret.numeroPret && (
                            <div className="text-xs text-gray-400">
                              N° {pret.numeroPret}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm text-gray-900">
                              {pret.bien?.adresse}
                            </div>
                            <div className="text-sm text-gray-500">
                              {pret.bien?.ville}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(pret.montantEmprunte)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {pret.dureeAnnees} ans - {pret.tauxInteret}%
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(pret.mensualiteBase + pret.mensualiteAssurance)}
                          </div>
                          <div className="text-sm text-gray-500">
                            dont {formatCurrency(pret.mensualiteAssurance)} assurance
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatutColor(pret.statut)}`}>
                          {getStatutIcon(pret.statut)}
                          <span className="ml-1">{pret.statut}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {pret.fichierOriginal ? (
                            <div className="text-sm text-green-600 flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {pret._count?.echeances || 0} échéances
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Non importé
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUploadTableau(pret)}
                            title="Importer/Voir le tableau d'amortissement"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPret(pret)}
                            title="Modifier le prêt"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(pret)}
                            className="text-red-600 hover:text-red-900"
                            title="Supprimer le prêt"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
              {pagination.total} prêts
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Précédent
              </Button>
              <span className="px-3 py-1 text-sm text-gray-600">
                Page {pagination.page} sur {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.pages}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <PretModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedPret(null);
        }}
        pret={selectedPret}
        onSuccess={() => {
          queryClient.invalidateQueries(['prets']);
          setShowCreateModal(false);
          setSelectedPret(null);
        }}
      />

      <TableauAmortissementModal
        isOpen={showTableauModal}
        onClose={() => {
          setShowTableauModal(false);
          setSelectedPret(null);
        }}
        pret={selectedPret}
        onSuccess={() => {
          queryClient.invalidateQueries(['prets']);
          setShowTableauModal(false);
          setSelectedPret(null);
        }}
      />

      <FiscalitePretsModal
        isOpen={showFiscaliteModal}
        onClose={() => setShowFiscaliteModal(false)}
      />
    </div>
  );
};

export default PretsPage;