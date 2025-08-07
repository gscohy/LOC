import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Receipt,
  Download,
  Mail,
  Eye,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { quittancesService, Quittance } from '@/services/quittances';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const QuittancesPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [selectedQuittance, setSelectedQuittance] = useState<Quittance | null>(null);

  const queryClient = useQueryClient();

  // Récupérer les quittances
  const {
    data: quittancesData,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['quittances', currentPage, searchTerm, statutFilter],
    () => quittancesService.getAll({
      page: currentPage,
      limit: 20,
      statut: statutFilter || undefined,
    }),
    {
      keepPreviousData: true,
    }
  );

  // Mutation pour renvoyer une quittance
  const resendQuittanceMutation = useMutation(quittancesService.resend, {
    onSuccess: () => {
      queryClient.invalidateQueries(['quittances']);
      toast.success('Quittance renvoyée avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors du renvoi de la quittance');
    },
  });

  const handleResendQuittance = (quittanceId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir renvoyer cette quittance par email ?')) {
      resendQuittanceMutation.mutate(quittanceId);
    }
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'GENEREE':
        return <Clock className="h-4 w-4" />;
      case 'ENVOYEE':
        return <CheckCircle className="h-4 w-4" />;
      case 'ERREUR':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'GENEREE':
        return 'info';
      case 'ENVOYEE':
        return 'success';
      case 'ERREUR':
        return 'danger';
      default:
        return 'gray';
    }
  };

  // Colonnes du tableau
  const columns = [
    {
      key: 'periode',
      title: 'Période',
      render: (_: any, quittance: Quittance) => (
        <div className="font-medium">{quittance.periode}</div>
      ),
    },
    {
      key: 'bien',
      title: 'Bien',
      render: (_: any, quittance: Quittance) => (
        <div className="text-sm">
          <div className="font-medium">{quittance.loyer?.contrat.bien.adresse}</div>
          <div className="text-gray-500">
            {quittance.loyer?.contrat.bien.codePostal} {quittance.loyer?.contrat.bien.ville}
          </div>
        </div>
      ),
    },
    {
      key: 'locataire',
      title: 'Locataire',
      render: (_: any, quittance: Quittance) => {
        const locataires = quittance.loyer?.contrat.locataires
          .map(cl => `${cl.locataire.prenom} ${cl.locataire.nom}`)
          .join(' et ');
        return <div className="text-sm">{locataires}</div>;
      },
    },
    {
      key: 'montant',
      title: 'Montant',
      render: (_: any, quittance: Quittance) => (
        <div className="text-right font-medium">
          {quittancesService.formatCurrency(quittance.montant)}
        </div>
      ),
    },
    {
      key: 'statut',
      title: 'Statut',
      render: (_: any, quittance: Quittance) => (
        <Badge variant={getStatutColor(quittance.statut)} className="flex items-center">
          {getStatutIcon(quittance.statut)}
          <span className="ml-1">{quittancesService.getStatutLabel(quittance.statut)}</span>
        </Badge>
      ),
    },
    {
      key: 'dateGeneration',
      title: 'Date génération',
      render: (_: any, quittance: Quittance) => (
        <div className="text-sm">
          {quittancesService.formatDate(quittance.dateGeneration)}
        </div>
      ),
    },
    {
      key: 'dateEnvoi',
      title: 'Date envoi',
      render: (_: any, quittance: Quittance) => (
        <div className="text-sm">
          {quittance.dateEnvoi ? quittancesService.formatDate(quittance.dateEnvoi) : '-'}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, quittance: Quittance) => (
        <div className="flex justify-end space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedQuittance(quittance)}
            title="Voir les détails"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {quittance.emailEnvoye && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleResendQuittance(quittance.id)}
              className="text-blue-600 hover:text-blue-700"
              title="Renvoyer par email"
              loading={resendQuittanceMutation.isLoading}
            >
              <Mail className="h-4 w-4" />
            </Button>
          )}
          {quittance.pdfPath && (
            <Button
              variant="ghost"
              size="sm"
              className="text-green-600 hover:text-green-700"
              title="Télécharger le PDF"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Erreur lors du chargement des quittances</p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </div>
    );
  }

  const { quittances, pagination } = quittancesData || { quittances: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
            <Receipt className="h-6 w-6 mr-3 text-blue-500" />
            Quittances de loyer
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Gestion des quittances de loyer générées et envoyées automatiquement
          </p>
        </div>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-semibold text-gray-900">
                {pagination.total}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Générées</p>
              <p className="text-2xl font-semibold text-blue-600">
                {quittances.filter(q => q.statut === 'GENEREE').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Envoyées</p>
              <p className="text-2xl font-semibold text-green-600">
                {quittances.filter(q => q.statut === 'ENVOYEE').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Erreurs</p>
              <p className="text-2xl font-semibold text-red-600">
                {quittances.filter(q => q.statut === 'ERREUR').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Filtres</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recherche
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par période, bien, locataire..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Select
                  value={statutFilter}
                  onChange={(e) => setStatutFilter(e.target.value)}
                  className="pl-10"
                  options={[
                    { value: '', label: 'Tous les statuts' },
                    { value: 'GENEREE', label: 'Générée' },
                    { value: 'ENVOYEE', label: 'Envoyée' },
                    { value: 'ERREUR', label: 'Erreur' },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des quittances */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Liste des quittances
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {pagination.total} quittance{pagination.total > 1 ? 's' : ''} au total
          </p>
        </div>
        <Table
          columns={columns}
          data={quittances}
          keyExtractor={(record) => record.id}
          emptyText="Aucune quittance trouvée"
        />
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {pagination.page} sur {pagination.pages}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                  disabled={currentPage >= pagination.pages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal détails quittance */}
      <Modal
        isOpen={!!selectedQuittance}
        onClose={() => setSelectedQuittance(null)}
        title={`Quittance ${selectedQuittance?.periode || ''}`}
        size="lg"
      >
        {selectedQuittance && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Informations</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Période:</span>
                    <span>{selectedQuittance.periode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant:</span>
                    <span className="font-medium">{quittancesService.formatCurrency(selectedQuittance.montant)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Statut:</span>
                    <Badge variant={getStatutColor(selectedQuittance.statut)}>
                      {quittancesService.getStatutLabel(selectedQuittance.statut)}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date génération:</span>
                    <span>{quittancesService.formatDate(selectedQuittance.dateGeneration)}</span>
                  </div>
                  {selectedQuittance.dateEnvoi && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date envoi:</span>
                      <span>{quittancesService.formatDate(selectedQuittance.dateEnvoi)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Bien et locataire</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Bien:</span>
                    <div className="mt-1">
                      <div className="font-medium">{selectedQuittance.loyer?.contrat.bien.adresse}</div>
                      <div className="text-gray-500">
                        {selectedQuittance.loyer?.contrat.bien.codePostal} {selectedQuittance.loyer?.contrat.bien.ville}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Locataire(s):</span>
                    <div className="mt-1">
                      {selectedQuittance.loyer?.contrat.locataires.map((cl, index) => (
                        <div key={index} className="font-medium">
                          {cl.locataire.prenom} {cl.locataire.nom}
                          <div className="text-gray-500 text-xs">{cl.locataire.email}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedQuittance(null)}>
                Fermer
              </Button>
              {selectedQuittance.emailEnvoye && (
                <Button
                  onClick={() => handleResendQuittance(selectedQuittance.id)}
                  loading={resendQuittanceMutation.isLoading}
                  className="flex items-center"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Renvoyer par email
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QuittancesPage;