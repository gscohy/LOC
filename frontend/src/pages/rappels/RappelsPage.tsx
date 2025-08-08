import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Bell,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  Mail,
  Calendar,
  Filter,
  Download,
} from 'lucide-react';

import { rappelsService, Rappel } from '@/services/rappels';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CreateRappelForm from '@/components/forms/CreateRappelForm';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color: string;
  trend?: number;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, trend }) => (
  <div className="card p-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`h-3 w-3 mr-1 ${trend < 0 ? 'transform rotate-180' : ''}`} />
              {Math.abs(trend)}% ce mois
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

const getStatutBadge = (rappel: Rappel) => {
  if (rappel.envoye) {
    return (
      <Badge variant="success" className="flex items-center">
        <CheckCircle className="h-3 w-3 mr-1" />
        Envoyé
      </Badge>
    );
  } else {
    const dateEnvoi = new Date(rappel.dateEnvoi);
    const maintenant = new Date();
    const isEnRetard = dateEnvoi < maintenant;

    return (
      <Badge variant={isEnRetard ? 'danger' : 'warning'} className="flex items-center">
        <Clock className="h-3 w-3 mr-1" />
        {isEnRetard ? 'En retard' : 'En attente'}
      </Badge>
    );
  }
};

const getTypeBadge = (type: string) => {
  const config = {
    'RETARD': { color: 'bg-yellow-100 text-yellow-800', label: 'Retard' },
    'RELANCE': { color: 'bg-orange-100 text-orange-800', label: 'Relance' },
    'MISE_EN_DEMEURE': { color: 'bg-red-100 text-red-800', label: 'Mise en demeure' },
    'INFORMATION': { color: 'bg-blue-100 text-blue-800', label: 'Information' },
    'AUTRE': { color: 'bg-gray-100 text-gray-800', label: 'Autre' },
  };

  const typeConfig = config[type as keyof typeof config] || config['AUTRE'];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}>
      {typeConfig.label}
    </span>
  );
};

const RappelsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statutFilter, setStatutFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedRappel, setSelectedRappel] = useState<Rappel | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [envoyerModalOpen, setEnvoyerModalOpen] = useState(false);
  const [rappelToSend, setRappelToSend] = useState<Rappel | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const limit = 10;

  const queryClient = useQueryClient();

  const { data: rappelsData, isLoading: rappelsLoading } = useQuery(
    ['rappels', { page, limit, search, type: typeFilter, envoye: statutFilter }],
    () => rappelsService.getAll({
      page,
      limit,
      ...(search && { loyerId: search }), // Pour l'instant on recherche par ID de loyer
      ...(typeFilter && { type: typeFilter }),
      ...(statutFilter !== '' && { envoye: statutFilter === 'true' }),
    }),
    { keepPreviousData: true }
  );

  const { data: stats, isLoading: statsLoading } = useQuery(
    'rappelsStats',
    () => rappelsService.getStats()
  );

  const marquerEnvoyeMutation = useMutation(
    (data: { id: string; dateEnvoiEffective?: string; commentaires?: string }) =>
      rappelsService.marquerEnvoye(data.id, {
        dateEnvoiEffective: data.dateEnvoiEffective,
        commentaires: data.commentaires,
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('rappels');
        queryClient.invalidateQueries('rappelsStats');
        setEnvoyerModalOpen(false);
        setRappelToSend(null);
        toast.success('Rappel marqué comme envoyé');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error?.message || 'Erreur lors de la mise à jour');
      },
    }
  );

  const deleteRappelMutation = useMutation(rappelsService.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('rappels');
      queryClient.invalidateQueries('rappelsStats');
      toast.success('Rappel supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la suppression');
    },
  });

  const createRappelMutation = useMutation(rappelsService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('rappels');
      queryClient.invalidateQueries('rappelsStats');
      setCreateModalOpen(false);
      toast.success('Rappel créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la création');
    },
  });

  const handleCreateRappel = (data: any) => {
    createRappelMutation.mutate(data);
  };

  const rappels = rappelsData?.rappels || [];
  const pagination = rappelsData?.pagination;

  const handleMarquerEnvoye = (rappel: Rappel) => {
    setRappelToSend(rappel);
    setEnvoyerModalOpen(true);
  };

  const handleConfirmerEnvoi = () => {
    if (rappelToSend) {
      marquerEnvoyeMutation.mutate({
        id: rappelToSend.id,
        dateEnvoiEffective: new Date().toISOString(),
        commentaires: 'Marqué comme envoyé manuellement',
      });
    }
  };

  const handleDeleteRappel = (rappel: Rappel) => {
    if (rappel.envoye) {
      toast.error('Impossible de supprimer un rappel déjà envoyé');
      return;
    }
    
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rappel ?')) {
      deleteRappelMutation.mutate(rappel.id);
    }
  };

  const openDetailsModal = (rappel: Rappel) => {
    setSelectedRappel(rappel);
    setDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedRappel(null);
  };

  const closeEnvoyerModal = () => {
    setEnvoyerModalOpen(false);
    setRappelToSend(null);
  };

  // Colonnes du tableau des rappels
  const rappelsColumns = [
    {
      key: 'type',
      title: 'Type',
      render: (_: any, rappel: Rappel) => getTypeBadge(rappel.type),
    },
    {
      key: 'loyer',
      title: 'Loyer concerné',
      render: (_: any, rappel: Rappel) => (
        <div>
          <div className="font-medium">
            {rappel.loyer ? 
              `${rappelsService.formatMoisAnnee(rappel.loyer.mois, rappel.loyer.annee)}` : 
              'Loyer supprimé'
            }
          </div>
          {rappel.loyer?.contrat && (
            <div className="text-sm text-gray-500">
              {rappel.loyer.contrat.bien.adresse}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'destinataires',
      title: 'Destinataires',
      render: (_: any, rappel: Rappel) => (
        <div className="text-sm">
          {rappelsService.formatDestinataires(rappel.destinataires)}
        </div>
      ),
    },
    {
      key: 'dateEnvoi',
      title: 'Date prévue',
      render: (_: any, rappel: Rappel) => (
        <div className="text-sm">
          {rappelsService.formatDate(rappel.dateEnvoi)}
        </div>
      ),
    },
    {
      key: 'statut',
      title: 'Statut',
      render: (_: any, rappel: Rappel) => getStatutBadge(rappel),
    },
    {
      key: 'modeEnvoi',
      title: 'Mode',
      render: (_: any, rappel: Rappel) => (
        <span className="text-sm text-gray-600">
          {rappelsService.getModeEnvoiLabel(rappel.modeEnvoi)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, rappel: Rappel) => (
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDetailsModal(rappel)}
            title="Voir les détails"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {!rappel.envoye && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMarquerEnvoye(rappel)}
                className="text-green-600 hover:text-green-700"
                title="Marquer comme envoyé"
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteRappel(rappel)}
                className="text-red-600 hover:text-red-700"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Gestion des rappels
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez tous les rappels de paiement et leur envoi
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau rappel
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total rappels"
            value={stats.totaux.total}
            icon={Bell}
            color="bg-blue-500"
            trend={stats.evolution.evolution}
          />
          <StatsCard
            title="Rappels envoyés"
            value={stats.totaux.envoyes}
            icon={CheckCircle}
            color="bg-green-500"
          />
          <StatsCard
            title="En attente"
            value={stats.totaux.enAttente}
            icon={Clock}
            color="bg-yellow-500"
          />
          <StatsCard
            title="Taux d'envoi"
            value={`${stats.totaux.tauxEnvoi}%`}
            icon={TrendingUp}
            color="bg-purple-500"
          />
        </div>
      )}

      {/* Filtres et recherche */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Rechercher un rappel..."
            icon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Tous les types</option>
          <option value="RETARD">Retard</option>
          <option value="RELANCE">Relance</option>
          <option value="MISE_EN_DEMEURE">Mise en demeure</option>
          <option value="INFORMATION">Information</option>
          <option value="AUTRE">Autre</option>
        </select>
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Tous les statuts</option>
          <option value="false">En attente</option>
          <option value="true">Envoyés</option>
        </select>
      </div>

      {/* Tableau des rappels */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Liste des rappels
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {rappels.length} rappel{rappels.length > 1 ? 's' : ''} affiché{rappels.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="overflow-x-auto">
          {rappelsLoading ? (
            <div className="p-12 text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-2 text-gray-600">Chargement des rappels...</p>
            </div>
          ) : rappels.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun rappel trouvé
              </h3>
              <p className="text-gray-600">
                Aucun rappel ne correspond à vos critères de recherche.
              </p>
            </div>
          ) : (
            <Table
              columns={rappelsColumns}
              data={rappels}
              keyExtractor={(record) => record.id}
              emptyText="Aucun rappel trouvé"
            />
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Affichage de {(pagination.page - 1) * pagination.limit + 1} à{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
              {pagination.total} résultats
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                Précédent
              </Button>
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

      {/* Modal détails rappel */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={closeDetailsModal}
        title="Détails du rappel"
        size="xl"
      >
        {selectedRappel && (
          <div className="space-y-6">
            {/* Informations générales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Informations générales</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    {getTypeBadge(selectedRappel.type)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Statut:</span>
                    {getStatutBadge(selectedRappel)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mode d'envoi:</span>
                    <span>{rappelsService.getModeEnvoiLabel(selectedRappel.modeEnvoi)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date prévue:</span>
                    <span>{rappelsService.formatDate(selectedRappel.dateEnvoi)}</span>
                  </div>
                  {selectedRappel.dateEnvoiEffective && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date d'envoi:</span>
                      <span>{rappelsService.formatDate(selectedRappel.dateEnvoiEffective)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Loyer concerné</h4>
                {selectedRappel.loyer ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Période:</span>
                      <span>{rappelsService.formatMoisAnnee(selectedRappel.loyer.mois, selectedRappel.loyer.annee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant:</span>
                      <span>{rappelsService.formatCurrency(selectedRappel.loyer.montantDu)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payé:</span>
                      <span>{rappelsService.formatCurrency(selectedRappel.loyer.montantPaye)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Statut:</span>
                      <span>{selectedRappel.loyer.statut}</span>
                    </div>
                    {selectedRappel.loyer.contrat && (
                      <div className="pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bien:</span>
                          <span>{selectedRappel.loyer.contrat.bien.adresse}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Loyer supprimé</p>
                )}
              </div>
            </div>

            {/* Destinataires */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Destinataires</h4>
              <div className="bg-gray-50 p-3 rounded text-sm">
                {selectedRappel.destinataires}
              </div>
            </div>

            {/* Message */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Message</h4>
              <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                {selectedRappel.message}
              </div>
            </div>

            {/* Commentaires */}
            {selectedRappel.commentaires && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Commentaires</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {selectedRappel.commentaires}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal confirmation envoi */}
      <Modal
        isOpen={envoyerModalOpen}
        onClose={closeEnvoyerModal}
        title="Marquer comme envoyé"
        size="md"
      >
        {rappelToSend && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Voulez-vous marquer ce rappel comme envoyé ? Cette action ne peut pas être annulée.
            </p>
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-sm">
                <div><strong>Type:</strong> {rappelsService.getTypeLabel(rappelToSend.type)}</div>
                <div><strong>Loyer:</strong> {rappelToSend.loyer ? 
                  rappelsService.formatMoisAnnee(rappelToSend.loyer.mois, rappelToSend.loyer.annee) : 
                  'Loyer supprimé'
                }</div>
                <div><strong>Destinataires:</strong> {rappelsService.formatDestinataires(rappelToSend.destinataires)}</div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={closeEnvoyerModal}>
                Annuler
              </Button>
              <Button 
                onClick={handleConfirmerEnvoi}
                loading={marquerEnvoyeMutation.isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marquer comme envoyé
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal création rappel */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Créer un nouveau rappel"
        size="2xl"
      >
        <CreateRappelForm
          onSubmit={handleCreateRappel}
          onCancel={() => setCreateModalOpen(false)}
          loading={createRappelMutation.isLoading}
        />
      </Modal>
    </div>
  );
};

export default RappelsPage;