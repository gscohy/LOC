import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Users,
  Euro,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Home,
  User,
  Shield,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Receipt,
  Bell,
  CreditCard,
  XCircle,
} from 'lucide-react';

import { contratsDetailsService, LoyerContratDetails, PaiementContratDetails } from '@/services/contrats-details';
import { paiementsService, PaiementCreate } from '@/services/paiements';
import { rappelsService, RappelCreate } from '@/services/rappels';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import MultiplePaiementForm from '@/components/forms/MultiplePaiementForm';
import RappelForm from '@/components/forms/RappelForm';
import ResiliationModal from '@/components/contrats/ResiliationModal';
import DocumentManager from '@/components/Documents/DocumentManager';
import ContratCommentaires from '@/components/contrats/ContratCommentaires';

const ContratDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'locataires' | 'loyers' | 'paiements' | 'documents'>('overview');
  const [selectedLoyer, setSelectedLoyer] = useState<LoyerContratDetails | null>(null);
  const [selectedPaiement, setSelectedPaiement] = useState<PaiementContratDetails | null>(null);
  const [multiplePaiementModalOpen, setMultiplePaiementModalOpen] = useState(false);
  const [rappelModalOpen, setRappelModalOpen] = useState(false);
  const [selectedLoyerForMultiplePaiement, setSelectedLoyerForMultiplePaiement] = useState<LoyerContratDetails | null>(null);
  const [selectedLoyerForRappel, setSelectedLoyerForRappel] = useState<LoyerContratDetails | null>(null);
  const [resiliationModalOpen, setResiliationModalOpen] = useState(false);

  const queryClient = useQueryClient();

  // Récupérer les détails du contrat
  const {
    data: contratDetails,
    isLoading,
    error,
  } = useQuery(
    ['contrat-details', id],
    () => contratsDetailsService.getDetails(id!),
    {
      enabled: !!id,
    }
  );

  const createMultiplePaiementMutation = useMutation((paiements: PaiementCreate[]) => 
    paiementsService.createBulk({ paiements }), {
    onSuccess: () => {
      queryClient.invalidateQueries(['contrat-details', id]);
      setMultiplePaiementModalOpen(false);
      setSelectedLoyerForMultiplePaiement(null);
      toast.success('Paiements enregistrés avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de l\'enregistrement des paiements');
    },
  });

  const createRappelMutation = useMutation(rappelsService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries(['contrat-details', id]);
      setRappelModalOpen(false);
      setSelectedLoyerForRappel(null);
      toast.success('Rappel créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la création du rappel');
    },
  });

  const handleMultiplePaiementSubmit = (paiements: PaiementCreate[]) => {
    console.log('🔍 ContratDetailsPage - handleMultiplePaiementSubmit appelée avec:', paiements);
    createMultiplePaiementMutation.mutate(paiements);
  };

  const handleRappelSubmit = (data: RappelCreate) => {
    createRappelMutation.mutate(data);
  };

  const openMultiplePaiementModal = (loyer: LoyerContratDetails) => {
    // Adapter les données pour le formulaire de paiement multiple
    const adaptedLoyer = {
      ...loyer,
      contrat: {
        locataires: contratDetails?.contrat?.locataires || []
      }
    };
    setSelectedLoyerForMultiplePaiement(adaptedLoyer as any);
    setMultiplePaiementModalOpen(true);
  };

  const openRappelModal = (loyer: LoyerContratDetails) => {
    // Adapter les données pour correspondre au type attendu par RappelForm
    const adaptedLoyer = {
      ...loyer,
      contrat: {
        bien: {
          adresse: contratDetails?.contrat?.bien?.adresse || 'Adresse non disponible'
        },
        locataires: contratDetails?.contrat?.locataires?.map(cl => ({
          locataire: {
            nom: cl.locataire.nom,
            prenom: cl.locataire.prenom,
            email: cl.locataire.email || '',
            telephone: cl.locataire.telephone || ''
          }
        })) || []
      }
    };
    setSelectedLoyerForRappel(adaptedLoyer as any);
    setRappelModalOpen(true);
  };

  const closeMultiplePaiementModal = () => {
    setMultiplePaiementModalOpen(false);
    setSelectedLoyerForMultiplePaiement(null);
  };

  const closeRappelModal = () => {
    setRappelModalOpen(false);
    setSelectedLoyerForRappel(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !contratDetails) {
    console.error('🚨 Erreur contrat details:', error);
    const errorMessage = error?.response?.data?.error?.message || error?.message || 'Erreur inconnue';
    
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 font-medium">Erreur lors du chargement des détails du contrat</p>
          <p className="text-gray-600 text-sm mt-2">ID: {id}</p>
          <p className="text-gray-500 text-xs mt-1">{errorMessage}</p>
        </div>
        <Button onClick={() => navigate('/contrats')} className="mt-4">
          Retour à la liste
        </Button>
      </div>
    );
  }

  const { contrat, stats, loyersGroupes, paiementsParMode } = contratDetails;

  // Colonnes pour le tableau des loyers
  const loyersColumns = [
    {
      key: 'periode',
      title: 'Période',
      render: (_: any, loyer: LoyerContratDetails) => (
        <div className="font-medium">
          {contratsDetailsService.formatMoisAnnee(loyer.mois, loyer.annee)}
        </div>
      ),
    },
    {
      key: 'montant',
      title: 'Montant',
      render: (_: any, loyer: LoyerContratDetails) => (
        <div className="text-right">
          <div className="font-medium">
            {contratsDetailsService.formatCurrency(loyer.montantDu)}
          </div>
          {loyer.montantPaye > 0 && (
            <div className="text-sm text-gray-500">
              Payé: {contratsDetailsService.formatCurrency(loyer.montantPaye)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'statut',
      title: 'Statut',
      render: (_: any, loyer: LoyerContratDetails) => (
        <Badge variant={contratsDetailsService.getLoyerStatutColor(loyer.statut)}>
          {contratsDetailsService.getLoyerStatutLabel(loyer.statut)}
        </Badge>
      ),
    },
    {
      key: 'echeance',
      title: 'Échéance',
      render: (_: any, loyer: LoyerContratDetails) => (
        <div className="text-sm">
          {contratsDetailsService.formatDate(loyer.dateEcheance)}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, loyer: LoyerContratDetails) => (
        <div className="flex justify-end space-x-1">
          {loyer.statut !== 'PAYE' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openMultiplePaiementModal(loyer)}
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
            onClick={() => setSelectedLoyer(loyer)}
            title="Voir les détails"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {loyer._count.quittances > 0 && (
            <Button
              variant="ghost"
              size="sm"
              title={`${loyer._count.quittances} quittance(s)`}
            >
              <Receipt className="h-4 w-4" />
            </Button>
          )}
          {loyer._count.rappels > 0 && (
            <Button
              variant="ghost"
              size="sm"
              title={`${loyer._count.rappels} rappel(s)`}
            >
              <Bell className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Statistiques rapides
  const loyersStats = contratsDetailsService.getLoyersStatsSummary(loyersGroupes);
  const paiementsStats = contratsDetailsService.getModesPaiementStats(paiementsParMode);

  return (
    <div className="space-y-6">
      {/* Header avec navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/contrats')}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
              <FileText className="h-6 w-6 mr-3 text-blue-500" />
              Contrat #{contrat.id.slice(-8)}
            </h1>
            <p className="text-sm text-gray-600 flex items-center mt-1">
              <Home className="h-4 w-4 mr-1" />
              {contrat.bien.adresse}, {contrat.bien.codePostal} {contrat.bien.ville}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {contrat.statut === 'ACTIF' && (
            <Button
              variant="outline"
              onClick={() => setResiliationModalOpen(true)}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Résilier le contrat
            </Button>
          )}
          <Badge variant={contratsDetailsService.getStatutBadgeColor(contrat.statut)} className="text-sm">
            {contratsDetailsService.getStatutLabel(contrat.statut)}
          </Badge>
        </div>
      </div>

      {/* Statistiques du contrat */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <Euro className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total perçu</p>
              <p className="text-2xl font-semibold text-gray-900">
                {contratsDetailsService.formatCurrency(stats.finances.montantTotalPaye)}
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
                {stats.loyers.tauxPaiement}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Loyers payés</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.loyers.payes}/{stats.loyers.total}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">En retard</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.loyers.enRetard}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Onglets de navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Vue d\'ensemble', icon: FileText },
            { key: 'locataires', label: 'Locataires', icon: Users },
            { key: 'loyers', label: 'Loyers', icon: Euro },
            { key: 'paiements', label: 'Paiements', icon: Receipt },
            { key: 'documents', label: 'Documents', icon: FileText },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <>
            {/* Informations générales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Informations du contrat
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type :</span>
                      <span className="font-medium">{contratsDetailsService.getTypeLabel(contrat.type)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Début :</span>
                      <span className="font-medium">{contratsDetailsService.formatDate(contrat.dateDebut)}</span>
                    </div>
                    {contrat.dateFin && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fin :</span>
                        <span className="font-medium">{contratsDetailsService.formatDate(contrat.dateFin)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée :</span>
                      <span className="font-medium">{contrat.duree} mois</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Jour de paiement :</span>
                      <span className="font-medium">Le {contrat.jourPaiement} du mois</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bien associé */}
              <div className="card">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Bien immobilier
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Adresse :</span>
                      <span className="font-medium">{contrat.bien.adresse}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ville :</span>
                      <span className="font-medium">
                        {contrat.bien.codePostal} {contrat.bien.ville}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type :</span>
                      <span className="font-medium">{contrat.bien.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Surface :</span>
                      <span className="font-medium">{contrat.bien.surface} m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pièces :</span>
                      <span className="font-medium">{contrat.bien.nbPieces} pièces</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Montants */}
            <div className="card">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Montants et finances
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Loyer mensuel</h4>
                    <div className="text-2xl font-semibold text-green-600">
                      {contratsDetailsService.formatCurrency(contrat.loyer)}
                    </div>
                    {contrat.chargesMensuelles > 0 && (
                      <div className="text-sm text-gray-500">
                        + {contratsDetailsService.formatCurrency(contrat.chargesMensuelles)} charges
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Dépôt de garantie</h4>
                    <div className="text-2xl font-semibold text-blue-600">
                      {contratsDetailsService.formatCurrency(contrat.depotGarantie)}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Reste à percevoir</h4>
                    <div className={`text-2xl font-semibold ${stats.finances.resteAPayer > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {contratsDetailsService.formatCurrency(stats.finances.resteAPayer)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activité récente */}
            {(stats.activite.dernierPaiement || stats.activite.prochainLoyer) && (
              <div className="card">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Activité récente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {stats.activite.dernierPaiement && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                          Dernier paiement
                        </h4>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="font-medium">
                            {contratsDetailsService.formatCurrency(stats.activite.dernierPaiement.montant)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {contratsDetailsService.formatDate(stats.activite.dernierPaiement.date)} • {stats.activite.dernierPaiement.mode}
                          </div>
                          <div className="text-sm text-gray-600">
                            {contratsDetailsService.formatMoisAnnee(stats.activite.dernierPaiement.loyer.mois, stats.activite.dernierPaiement.loyer.annee)}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {stats.activite.prochainLoyer && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-orange-500" />
                          Prochain loyer
                        </h4>
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <div className="font-medium">
                            {contratsDetailsService.formatCurrency(stats.activite.prochainLoyer.montantDu)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Échéance: {contratsDetailsService.formatDate(stats.activite.prochainLoyer.dateEcheance)}
                          </div>
                          <div className="text-sm">
                            <Badge variant={contratsDetailsService.getLoyerStatutColor(stats.activite.prochainLoyer.statut)}>
                              {contratsDetailsService.getLoyerStatutLabel(stats.activite.prochainLoyer.statut)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Zone de commentaires */}
            <ContratCommentaires 
              contratId={contrat.id} 
              commentaires={contrat.commentaires} 
            />
          </>
        )}

        {activeTab === 'locataires' && (
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Locataires du contrat
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {contrat._count.locataires} locataire{contrat._count.locataires > 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {contrat.locataires.map((cl) => (
                  <div key={cl.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <User className="h-10 w-10 text-blue-500 bg-blue-100 rounded-full p-2" />
                        <div className="ml-4">
                          <h4 className="font-medium text-gray-900">
                            {cl.locataire.civilite} {cl.locataire.prenom} {cl.locataire.nom}
                          </h4>
                          <div className="text-sm text-gray-600 flex items-center mt-1">
                            <Mail className="h-3 w-3 mr-1" />
                            {cl.locataire.email}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {cl.locataire.telephone}
                          </div>
                          {cl.locataire.profession && (
                            <div className="text-sm text-gray-500 mt-1">
                              {cl.locataire.profession}
                            </div>
                          )}
                        </div>
                      </div>
                      {cl.locataire.revenus && (
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Revenus</div>
                          <div className="font-medium">
                            {contratsDetailsService.formatCurrency(cl.locataire.revenus)}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Garants */}
                    {cl.locataire.garants.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h5 className="font-medium text-gray-700 mb-2 flex items-center">
                          <Shield className="h-4 w-4 mr-2" />
                          Garants ({cl.locataire.garants.length})
                        </h5>
                        <div className="space-y-2">
                          {cl.locataire.garants.map((cg) => (
                            <div key={cg.id} className="bg-gray-50 p-3 rounded">
                              <div className="font-medium text-sm">
                                {cg.garant.civilite} {cg.garant.prenom} {cg.garant.nom}
                              </div>
                              <div className="text-xs text-gray-600 flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {cg.garant.email}
                                {cg.garant.telephone && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <Phone className="h-3 w-3 mr-1" />
                                    {cg.garant.telephone}
                                  </>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {contratsDetailsService.getGarantieTypeLabel(cg.garant.typeGarantie)}
                                {cg.garant.revenus && (
                                  <span className="ml-2">
                                    • {contratsDetailsService.formatCurrency(cg.garant.revenus)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'loyers' && (
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Historique des loyers
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {stats.loyers.total} loyer{stats.loyers.total > 1 ? 's' : ''} généré{stats.loyers.total > 1 ? 's' : ''}
              </p>
            </div>
            <Table
              columns={loyersColumns}
              data={contrat.loyers}
              keyExtractor={(record) => record.id}
              emptyText="Aucun loyer trouvé"
            />
          </div>
        )}

        {activeTab === 'paiements' && (
          <div className="space-y-6">
            {/* Statistiques des paiements */}
            {paiementsStats.length > 0 && (
              <div className="card">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Répartition des paiements par mode
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {paiementsStats.map((stat) => (
                      <div key={stat.mode} className="bg-gray-50 p-4 rounded-lg">
                        <div className="font-medium text-gray-900">{stat.label}</div>
                        <div className="text-2xl font-semibold text-blue-600">
                          {contratsDetailsService.formatCurrency(stat.montant)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {stat.count} paiement{stat.count > 1 ? 's' : ''} • {stat.pourcentage}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Paiements récents */}
            <div className="card">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Paiements récents
                </h3>
              </div>
              <div className="p-6">
                {contrat.loyers.some(l => l.paiements.length > 0) ? (
                  <div className="space-y-4">
                    {contrat.loyers
                      .filter(l => l.paiements.length > 0)
                      .slice(0, 10)
                      .map((loyer) =>
                        loyer.paiements.map((paiement) => (
                          <div key={paiement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium">{paiement.payeur}</div>
                              <div className="text-sm text-gray-600">
                                {contratsDetailsService.formatMoisAnnee(loyer.mois, loyer.annee)} • {paiement.mode}
                              </div>
                              <div className="text-sm text-gray-500">
                                {contratsDetailsService.formatDate(paiement.date)}
                                {paiement.reference && ` • Réf: ${paiement.reference}`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-green-600">
                                {contratsDetailsService.formatCurrency(paiement.montant)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Aucun paiement enregistré</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="card">
            <div className="p-6">
              <DocumentManager
                categorie="CONTRAT"
                entityId={id!}
                entityName={`Contrat ${contrat?.bien.adresse} - ${contrat?.locataires.map(l => `${l.prenom} ${l.nom}`).join(', ')}`}
                allowUpload={true}
                allowDelete={true}
                allowEdit={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modal détails loyer */}
      <Modal
        isOpen={!!selectedLoyer}
        onClose={() => setSelectedLoyer(null)}
        title={`Loyer ${selectedLoyer ? contratsDetailsService.formatMoisAnnee(selectedLoyer.mois, selectedLoyer.annee) : ''}`}
        size="lg"
      >
        {selectedLoyer && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Informations</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Période:</span>
                    <span>{contratsDetailsService.formatMoisAnnee(selectedLoyer.mois, selectedLoyer.annee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Échéance:</span>
                    <span>{contratsDetailsService.formatDate(selectedLoyer.dateEcheance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Statut:</span>
                    <Badge variant={contratsDetailsService.getLoyerStatutColor(selectedLoyer.statut)}>
                      {contratsDetailsService.getLoyerStatutLabel(selectedLoyer.statut)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Montants</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant dû:</span>
                    <span className="font-medium">{contratsDetailsService.formatCurrency(selectedLoyer.montantDu)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant payé:</span>
                    <span className="font-medium text-green-600">{contratsDetailsService.formatCurrency(selectedLoyer.montantPaye)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reste à payer:</span>
                    <span className={`font-medium ${selectedLoyer.montantDu - selectedLoyer.montantPaye > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {contratsDetailsService.formatCurrency(selectedLoyer.montantDu - selectedLoyer.montantPaye)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {selectedLoyer.paiements.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Paiements ({selectedLoyer.paiements.length})</h4>
                <div className="space-y-2">
                  {selectedLoyer.paiements.map((paiement) => (
                    <div key={paiement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{paiement.payeur}</div>
                        <div className="text-sm text-gray-600">
                          {contratsDetailsService.formatDate(paiement.date)} • {paiement.mode}
                        </div>
                        {paiement.reference && (
                          <div className="text-xs text-gray-500">Réf: {paiement.reference}</div>
                        )}
                      </div>
                      <div className="font-medium text-green-600">
                        {contratsDetailsService.formatCurrency(paiement.montant)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de paiement */}
      <Modal
        isOpen={multiplePaiementModalOpen}
        onClose={closeMultiplePaiementModal}
        title="Enregistrer un paiement"
        size="xl"
      >
        {selectedLoyerForMultiplePaiement && (
          <MultiplePaiementForm
            loyer={selectedLoyerForMultiplePaiement}
            onSubmit={handleMultiplePaiementSubmit}
            onCancel={closeMultiplePaiementModal}
            loading={createMultiplePaiementMutation.isLoading}
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
            loyer={selectedLoyerForRappel as any}
            onSubmit={handleRappelSubmit}
            onCancel={closeRappelModal}
            loading={createRappelMutation.isLoading}
          />
        )}
      </Modal>

      {/* Modal de résiliation */}
      <ResiliationModal
        isOpen={resiliationModalOpen}
        onClose={() => setResiliationModalOpen(false)}
        contrat={contrat}
        onSuccess={() => {
          queryClient.invalidateQueries(['contrat-details', id]);
          setResiliationModalOpen(false);
        }}
      />
    </div>
  );
};

export default ContratDetailsPage;