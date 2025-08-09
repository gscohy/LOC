import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Plus,
  Search,
  Euro,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  CreditCard,
  Bell,
} from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { loyersService } from '@/services/loyers';
import { paiementsService, PaiementCreate } from '@/services/paiements';
import { rappelsService, RappelCreate } from '@/services/rappels';
import PaiementForm from '@/components/forms/PaiementForm';
import RappelForm from '@/components/forms/RappelForm';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color }) => (
  <div className="card p-6">
    <div className="flex items-center">
      <div className={`flex-shrink-0 p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

const getStatutBadge = (statut: string) => {
  const styles = {
    'EN_ATTENTE': 'bg-yellow-100 text-yellow-800',
    'PARTIEL': 'bg-orange-100 text-orange-800',
    'PAYE': 'bg-green-100 text-green-800',
    'RETARD': 'bg-red-100 text-red-800',
  };
  
  const labels = {
    'EN_ATTENTE': 'En attente',
    'PARTIEL': 'Partiel',
    'PAYE': 'Payé',
    'RETARD': 'En retard',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[statut as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
      {labels[statut as keyof typeof labels] || statut}
    </span>
  );
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR');
};

const formatMoisAnnee = (mois: number, annee: number) => {
  const moisNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return `${moisNames[mois - 1]} ${annee}`;
};

const LoyersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [paiementModalOpen, setPaiementModalOpen] = useState(false);
  const [rappelModalOpen, setRappelModalOpen] = useState(false);
  const [selectedLoyer, setSelectedLoyer] = useState<any>(null);
  const [selectedLoyerForRappel, setSelectedLoyerForRappel] = useState<any>(null);
  const limit = 10;

  const queryClient = useQueryClient();

  const { data: loyersData, isLoading: loyersLoading } = useQuery(
    ['loyers', { page, limit, search, statut: statutFilter }],
    () => loyersService.getAll({ 
      page, 
      limit, 
      search: search || undefined,
      statut: statutFilter as any || undefined
    }),
    { keepPreviousData: true }
  );

  const { data: stats, isLoading: statsLoading } = useQuery(
    'loyersStats',
    () => loyersService.getStats()
  );

  const createPaiementMutation = useMutation(paiementsService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('loyers');
      queryClient.invalidateQueries('loyersStats');
      setPaiementModalOpen(false);
      setSelectedLoyer(null);
      toast.success('Paiement enregistré avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de l\'enregistrement du paiement');
    },
  });

  const createRappelMutation = useMutation(rappelsService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('loyers');
      setRappelModalOpen(false);
      setSelectedLoyerForRappel(null);
      toast.success('Rappel créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la création du rappel');
    },
  });

  const recalculateStatusMutation = useMutation(
    () => loyersService.recalculateStatuts(),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('loyers');
        queryClient.invalidateQueries('loyersStats');
        toast.success(`${data.updates?.length || 0} statuts mis à jour`);
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error?.message || 'Erreur lors du recalcul');
      },
    }
  );

  const loyers = loyersData?.data || [];
  const pagination = loyersData?.pagination;

  const handlePaiementSubmit = (data: PaiementCreate) => {
    createPaiementMutation.mutate(data);
  };

  const handleRappelSubmit = (data: RappelCreate) => {
    createRappelMutation.mutate(data);
  };

  const openPaiementModal = (loyer: any) => {
    setSelectedLoyer(loyer);
    setPaiementModalOpen(true);
  };

  const openRappelModal = (loyer: any) => {
    setSelectedLoyerForRappel(loyer);
    setRappelModalOpen(true);
  };

  const closePaiementModal = () => {
    setPaiementModalOpen(false);
    setSelectedLoyer(null);
  };

  const closeRappelModal = () => {
    setRappelModalOpen(false);
    setSelectedLoyerForRappel(null);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Suivi des loyers
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez les paiements et le suivi des loyers
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => recalculateStatusMutation.mutate()}
            disabled={recalculateStatusMutation.isLoading}
          >
            {recalculateStatusMutation.isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
            ) : (
              <Clock className="h-4 w-4 mr-2" />
            )}
            Recalculer les statuts
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Créer un loyer
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {!statsLoading && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Loyers en attente"
              value={stats.totaux.enAttente}
              icon={Clock}
              color="bg-yellow-500"
            />
            <StatsCard
              title="Loyers en retard"
              value={stats.totaux.enRetard}
              icon={AlertTriangle}
              color="bg-red-500"
            />
            <StatsCard
              title="Loyers payés"
              value={stats.totaux.payes}
              icon={CheckCircle}
              color="bg-green-500"
            />
            <StatsCard
              title="Revenus annuels"
              value={`${stats.revenus.annee.toLocaleString()}€`}
              icon={TrendingUp}
              color="bg-blue-500"
            />
          </div>
          
          {/* Taux de recouvrement */}
          {stats.totaux.total > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Taux de recouvrement
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {Math.round((stats.totaux.payes / stats.totaux.total) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Loyers payés</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {Math.round((stats.totaux.partiels / stats.totaux.total) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Paiements partiels</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {Math.round((stats.totaux.enRetard / stats.totaux.total) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">En retard</div>
                </div>
              </div>
              
              {/* Barre de progression visuelle */}
              <div className="mt-4">
                <div className="flex rounded-full overflow-hidden h-3 bg-gray-200">
                  <div 
                    className="bg-green-500 h-full"
                    style={{ width: `${(stats.totaux.payes / stats.totaux.total) * 100}%` }}
                  ></div>
                  <div 
                    className="bg-orange-500 h-full"
                    style={{ width: `${(stats.totaux.partiels / stats.totaux.total) * 100}%` }}
                  ></div>
                  <div 
                    className="bg-red-500 h-full"
                    style={{ width: `${(stats.totaux.enRetard / stats.totaux.total) * 100}%` }}
                  ></div>
                  <div 
                    className="bg-yellow-500 h-full"
                    style={{ width: `${(stats.totaux.enAttente / stats.totaux.total) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Payés</span>
                  <span>Partiels</span>
                  <span>Retards</span>
                  <span>En attente</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Rechercher un loyer..."
            icon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Tous les statuts</option>
          <option value="EN_ATTENTE">En attente</option>
          <option value="PARTIEL">Partiel</option>
          <option value="PAYE">Payé</option>
          <option value="RETARD">En retard</option>
        </select>
      </div>

      {/* Loyers table */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Liste des loyers
          </h2>
        </div>
        <div className="overflow-x-auto">
          {loyersLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-600">Chargement...</p>
            </div>
          ) : loyers.length === 0 ? (
            <div className="p-12 text-center">
              <Euro className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun loyer trouvé
              </h3>
              <p className="text-gray-600">
                Commencez par créer un loyer pour un contrat.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Période
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bien / Locataire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Échéance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loyers.map((loyer) => (
                  <tr key={loyer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatMoisAnnee(loyer.mois, loyer.annee)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {loyer.contrat?.bien?.adresse}
                      </div>
                      <div className="text-sm text-gray-500">
                        {loyer.contrat?.locataires?.[0]?.locataire?.nom}{' '}
                        {loyer.contrat?.locataires?.[0]?.locataire?.prenom}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {loyer.montantPaye.toLocaleString()}€ / {loyer.montantDu.toLocaleString()}€
                      </div>
                      {loyer._count && (
                        <div className="text-xs text-gray-500">
                          {loyer._count.paiements} paiement(s)
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(loyer.dateEcheance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatutBadge(loyer.statut)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {loyer.statut !== 'PAYE' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPaiementModal(loyer)}
                              className="text-green-600 hover:text-green-700"
                              title="Enregistrer un paiement"
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRappelModal(loyer)}
                              className="text-orange-600 hover:text-orange-700"
                              title="Créer un rappel"
                            >
                              <Bell className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                          title="Voir les détails"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-600 hover:text-gray-700"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Modal de paiement */}
      <Modal
        isOpen={paiementModalOpen}
        onClose={closePaiementModal}
        title="Enregistrer un paiement"
        size="lg"
      >
        {selectedLoyer && (
          <PaiementForm
            loyer={selectedLoyer}
            onSubmit={handlePaiementSubmit}
            onCancel={closePaiementModal}
            loading={createPaiementMutation.isLoading}
          />
        )}
      </Modal>

      {/* Modal de rappel */}
      <Modal
        isOpen={rappelModalOpen}
        onClose={closeRappelModal}
        title="Créer un rappel de paiement"
        size="xl"
      >
        {selectedLoyerForRappel && (
          <RappelForm
            loyer={selectedLoyerForRappel}
            onSubmit={handleRappelSubmit}
            onCancel={closeRappelModal}
            loading={createRappelMutation.isLoading}
          />
        )}
      </Modal>
    </div>
  );
};

export default LoyersPage;