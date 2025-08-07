import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Home,
  FileText,
  Euro,
  MapPin,
  Phone,
  Mail,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Eye,
  CreditCard,
  Bell,
  Plus,
  XCircle,
  Receipt,
  Shield,
} from 'lucide-react';

import { biensDetailsService, ContratDetails, LoyerDetails } from '@/services/biens-details';
import { paiementsService, PaiementCreate } from '@/services/paiements';
import { rappelsService, RappelCreate } from '@/services/rappels';
import { contratsService, ContratCreateData } from '@/services/contrats';
import { quittancesService } from '@/services/quittances';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import MultiplePaiementForm from '@/components/forms/MultiplePaiementForm';
import RappelForm from '@/components/forms/RappelForm';
import ResiliationModal from '@/components/contrats/ResiliationModal';
import ContratForm from '@/components/forms/ContratForm';
import BienGarantsSection from '@/components/garants/BienGarantsSection';
import DocumentManager from '@/components/Documents/DocumentManager';

const BienDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  console.log('🔍 BienDetailsPage - ID from URL params:', id);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'contrats' | 'loyers' | 'charges' | 'garants' | 'documents'>('overview');
  const [selectedContrat, setSelectedContrat] = useState<ContratDetails | null>(null);
  const [selectedLoyer, setSelectedLoyer] = useState<LoyerDetails | null>(null);
  const [multiplePaiementModalOpen, setMultiplePaiementModalOpen] = useState(false);
  const [rappelModalOpen, setRappelModalOpen] = useState(false);
  const [selectedLoyerForMultiplePaiement, setSelectedLoyerForMultiplePaiement] = useState<LoyerDetails | null>(null);
  const [selectedLoyerForRappel, setSelectedLoyerForRappel] = useState<LoyerDetails | null>(null);
  const [resiliationModalOpen, setResiliationModalOpen] = useState(false);
  const [selectedContratForResiliation, setSelectedContratForResiliation] = useState<ContratDetails | null>(null);
  const [createContratModalOpen, setCreateContratModalOpen] = useState(false);

  const queryClient = useQueryClient();

  // Récupérer les détails du bien
  const {
    data: bienDetails,
    isLoading,
    error,
  } = useQuery(
    ['bien-details', id],
    () => biensDetailsService.getDetails(id!),
    {
      enabled: !!id,
    }
  );

  const createPaiementMutation = useMutation(paiementsService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries(['bien-details', id]);
      setPaiementModalOpen(false);
      setSelectedLoyerForPaiement(null);
      toast.success('Paiement enregistré avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de l\'enregistrement du paiement');
    },
  });

  const createMultiplePaiementMutation = useMutation(paiementsService.createBulk, {
    onSuccess: (data) => {
      queryClient.invalidateQueries(['bien-details', id]);
      setMultiplePaiementModalOpen(false);
      setSelectedLoyerForMultiplePaiement(null);
      toast.success(`${data.length} paiement${data.length > 1 ? 's' : ''} enregistré${data.length > 1 ? 's' : ''} avec succès`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de l\'enregistrement des paiements');
    },
  });

  const createRappelMutation = useMutation(rappelsService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries(['bien-details', id]);
      setRappelModalOpen(false);
      setSelectedLoyerForRappel(null);
      toast.success('Rappel créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la création du rappel');
    },
  });

  const genererLoyersManquantsMutation = useMutation(
    (contratId: string) => api.post(`/contrats/${contratId}/generer-loyers-manquants`),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries(['bien-details', id]);
        const count = response.data.data.length;
        toast.success(`${count} loyer(s) généré(s) avec succès`);
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error?.message || 'Erreur lors de la génération des loyers');
      },
    }
  );

  const createContratMutation = useMutation(contratsService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries(['bien-details', id]);
      setCreateContratModalOpen(false);
      toast.success('Contrat créé avec succès');
    },
    onError: (error: any) => {
      console.error('Erreur lors de la création du contrat:', error);
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la création du contrat');
    },
  });

  const handlePaiementSubmit = (data: PaiementCreate) => {
    createPaiementMutation.mutate(data);
  };

  const handleMultiplePaiementSubmit = (paiements: PaiementCreate[]) => {
    createMultiplePaiementMutation.mutate({ paiements });
  };

  const handleRappelSubmit = (data: RappelCreate) => {
    createRappelMutation.mutate(data);
  };

  const openMultiplePaiementModal = (loyer: LoyerDetails) => {
    setSelectedLoyerForMultiplePaiement(loyer);
    setMultiplePaiementModalOpen(true);
  };

  const openRappelModal = (loyer: LoyerDetails) => {
    // Adapter les données pour correspondre au type attendu par RappelForm
    // Récupérer les données complètes des locataires depuis le contrat actuel
    const contratActuel = bienDetails?.bien?.contrats?.actuel;
    const locatairesComplets = contratActuel?.locataires || [];
    
    const adaptedLoyer = {
      ...loyer,
      contrat: {
        bien: {
          adresse: bienDetails?.bien?.adresse || 'Adresse non disponible'
        },
        locataires: locatairesComplets.map(cl => ({
          locataire: {
            nom: cl.locataire.nom,
            prenom: cl.locataire.prenom,
            email: cl.locataire.email || '',
            telephone: cl.locataire.telephone || ''
          }
        }))
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

  const handleContratSubmit = (data: any) => {
    console.log('Données du formulaire:', data);
    
    // Préparer les données pour l'API
    const contratData = {
      ...data,
      bienId: id!,
      locataires: data.locataireIds || [], // Transformer locataireIds en locataires
    };
    
    console.log('Données envoyées à l\'API:', contratData);
    
    createContratMutation.mutate(contratData);
  };

  const closeCreateContratModal = () => {
    setCreateContratModalOpen(false);
  };

  // Fonction pour générer et envoyer une quittance
  const handleGenerateQuittance = async (loyer: LoyerDetails) => {
    if (loyer.statut !== 'PAYE') {
      toast.error('Le loyer doit être payé pour générer une quittance');
      return;
    }

    try {
      const result = await quittancesService.create({
        loyerId: loyer.id
      });

      toast.success('Quittance générée et envoyée avec succès !');
      
      // Optionnel: ouvrir le PDF dans un nouvel onglet
      if (result.pdfPath) {
        const pdfUrl = `http://localhost:3002/uploads/quittances/${result.pdfPath}`;
        console.log('Ouverture PDF:', pdfUrl);
        window.open(pdfUrl, '_blank');
      }
      
      // Rafraîchir les données
      queryClient.invalidateQueries(['bien-details', id]);
      
    } catch (error: any) {
      console.error('Erreur génération quittance:', error);
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la génération de la quittance');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <div className="ml-4 text-gray-600">
          Chargement des détails du bien {id}...
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Erreur lors du chargement du bien:', error);
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Erreur lors du chargement des détails du bien</p>
        <p className="text-sm text-gray-500 mt-2">
          {(error as any)?.response?.data?.error?.message || (error as any)?.message || 'Erreur inconnue'}
        </p>
        <p className="text-xs text-gray-400 mt-1">ID: {id}</p>
        <Button onClick={() => navigate('/biens')} className="mt-4">
          Retour à la liste
        </Button>
      </div>
    );
  }

  if (!bienDetails) {
    return (
      <div className="text-center py-12">
        <p className="text-yellow-600">Aucune donnée trouvée pour ce bien</p>
        <p className="text-xs text-gray-400 mt-1">ID: {id}</p>
        <Button onClick={() => navigate('/biens')} className="mt-4">
          Retour à la liste
        </Button>
      </div>
    );
  }

  const { bien, stats, loyersRecents } = bienDetails;

  // Colonnes pour le tableau des loyers
  const loyersColumns = [
    {
      key: 'periode',
      title: 'Période',
      render: (_: any, loyer: LoyerDetails) => (
        <div className="font-medium">
          {biensDetailsService.formatMoisAnnee(loyer.mois, loyer.annee)}
        </div>
      ),
    },
    {
      key: 'locataire',
      title: 'Locataire',
      render: (_: any, loyer: LoyerDetails) => (
        <div>
          {loyer.contrat?.locataires.map((cl, index) => (
            <div key={index} className="text-sm">
              {cl.locataire.prenom} {cl.locataire.nom}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'montant',
      title: 'Montant',
      render: (_: any, loyer: LoyerDetails) => (
        <div className="text-right">
          <div className="font-medium">
            {biensDetailsService.formatCurrency(loyer.montantDu)}
          </div>
          {loyer.montantPaye > 0 && (
            <div className="text-sm text-gray-500">
              Payé: {biensDetailsService.formatCurrency(loyer.montantPaye)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'statut',
      title: 'Statut',
      render: (_: any, loyer: LoyerDetails) => (
        <Badge variant={biensDetailsService.getLoyerStatutColor(loyer.statut)}>
          {biensDetailsService.getLoyerStatutLabel(loyer.statut)}
        </Badge>
      ),
    },
    {
      key: 'echeance',
      title: 'Échéance',
      render: (_: any, loyer: LoyerDetails) => (
        <div className="text-sm">
          {biensDetailsService.formatDate(loyer.dateEcheance)}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, loyer: LoyerDetails) => (
        <div className="flex space-x-1">
          {loyer.statut !== 'PAYE' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openMultiplePaiementModal(loyer)}
                className="text-blue-600 hover:text-blue-700"
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
          {loyer.statut === 'PAYE' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleGenerateQuittance(loyer)}
              className="text-purple-600 hover:text-purple-700"
              title="Générer et envoyer une quittance"
            >
              <Receipt className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedLoyer(loyer)}
            title="Voir les détails"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Colonnes pour le tableau des contrats
  const contratsColumns = [
    {
      key: 'periode',
      title: 'Période',
      render: (_: any, contrat: ContratDetails) => (
        <div>
          <div className="font-medium">
            Du {biensDetailsService.formatDate(contrat.dateDebut)}
          </div>
          {contrat.dateFin && (
            <div className="text-sm text-gray-500">
              au {biensDetailsService.formatDate(contrat.dateFin)}
            </div>
          )}
          <div className="text-xs text-gray-400">
            {biensDetailsService.calculateDureeContrat(contrat.dateDebut, contrat.dateFin)}
          </div>
        </div>
      ),
    },
    {
      key: 'locataires',
      title: 'Locataires',
      render: (_: any, contrat: ContratDetails) => (
        <div>
          {contrat.locataires.map((cl) => (
            <div key={cl.id} className="mb-1">
              <div className="font-medium text-sm">
                {cl.locataire.civilite} {cl.locataire.prenom} {cl.locataire.nom}
              </div>
              <div className="text-xs text-gray-500">
                {cl.locataire.email}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'loyer',
      title: 'Loyer',
      render: (_: any, contrat: ContratDetails) => (
        <div className="text-right">
          <div className="font-medium">
            {biensDetailsService.formatCurrency(contrat.loyer)}
          </div>
          {contrat.chargesMensuelles > 0 && (
            <div className="text-sm text-gray-500">
              + {biensDetailsService.formatCurrency(contrat.chargesMensuelles)} charges
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'statut',
      title: 'Statut',
      render: (_: any, contrat: ContratDetails) => (
        <Badge variant={biensDetailsService.getContratStatutColor(contrat.statut)}>
          {biensDetailsService.getContratStatutLabel(contrat.statut)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, contrat: ContratDetails) => (
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedContrat(contrat)}
            title="Voir les détails"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {contrat.statut === 'ACTIF' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedContratForResiliation(contrat);
                setResiliationModalOpen(true);
              }}
              className="text-red-600 hover:bg-red-50"
              title="Résilier le contrat"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header avec navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/biens')}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
              <Home className="h-6 w-6 mr-3 text-blue-500" />
              {bien.adresse}
            </h1>
            <p className="text-sm text-gray-600 flex items-center mt-1">
              <MapPin className="h-4 w-4 mr-1" />
              {bien.codePostal} {bien.ville} • {biensDetailsService.getTypeLabel(bien.type)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {!bien.contrats.actuel && (
            <Button
              onClick={() => setCreateContratModalOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau contrat
            </Button>
          )}
          <Badge variant={biensDetailsService.getStatutBadgeColor(bien.statut)} className="text-sm">
            {biensDetailsService.getStatutLabel(bien.statut)}
          </Badge>
        </div>
      </div>

      {/* Statistiques du bien */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <Euro className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Revenus 12 mois</p>
              <p className="text-2xl font-semibold text-gray-900">
                {biensDetailsService.formatCurrency(stats.finances.revenus12Mois)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Rentabilité</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.finances.rentabilite}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Taux occupation</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.occupation.tauxOccupation}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-orange-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Loyers en retard</p>
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
            { key: 'overview', label: 'Vue d\'ensemble', icon: Home },
            { key: 'contrats', label: 'Contrats', icon: FileText },
            { key: 'loyers', label: 'Loyers', icon: Euro },
            { key: 'charges', label: 'Charges', icon: TrendingDown },
            { key: 'garants', label: 'Garants', icon: Shield },
            { key: 'documents', label: 'Documents', icon: Receipt },
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
                    Informations générales
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type :</span>
                      <span className="font-medium">{biensDetailsService.getTypeLabel(bien.type)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Surface :</span>
                      <span className="font-medium">{bien.surface} m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pièces :</span>
                      <span className="font-medium">{bien.nbPieces} pièces</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Chambres :</span>
                      <span className="font-medium">{bien.nbChambres} chambres</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Loyer :</span>
                      <span className="font-medium">{biensDetailsService.formatCurrency(bien.loyer)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Charges :</span>
                      <span className="font-medium">{biensDetailsService.formatCurrency(bien.chargesMensuelles)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dépôt de garantie :</span>
                      <span className="font-medium">{biensDetailsService.formatCurrency(bien.depotGarantie)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Propriétaires */}
              <div className="card">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Propriétaires
                  </h3>
                  <div className="space-y-4">
                    {bien.proprietaires.map((bp) => (
                      <div key={bp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">
                            {bp.proprietaire.prenom} {bp.proprietaire.nom}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {bp.proprietaire.email}
                          </div>
                          {bp.proprietaire.telephone && (
                            <div className="text-sm text-gray-600 flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {bp.proprietaire.telephone}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-blue-600">
                            {bp.quotePart}%
                          </div>
                          <div className="text-xs text-gray-500">
                            Quote-part
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contrat actuel */}
            {bien.contrats.actuel && (
              <div className="card">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Contrat actuel
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Locataires</h4>
                      {bien.contrats.actuel.locataires.map((cl) => (
                        <div key={cl.id} className="mb-2">
                          <div className="font-medium">
                            {cl.locataire.civilite} {cl.locataire.prenom} {cl.locataire.nom}
                          </div>
                          <div className="text-sm text-gray-600">{cl.locataire.email}</div>
                          {cl.locataire.profession && (
                            <div className="text-sm text-gray-500">{cl.locataire.profession}</div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Période</h4>
                      <div className="text-sm">
                        <div>Début: {biensDetailsService.formatDate(bien.contrats.actuel.dateDebut)}</div>
                        {bien.contrats.actuel.dateFin && (
                          <div>Fin: {biensDetailsService.formatDate(bien.contrats.actuel.dateFin)}</div>
                        )}
                        <div className="text-gray-500 mt-1">
                          Durée: {bien.contrats.actuel.duree} mois
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Montants</h4>
                      <div className="text-sm space-y-1">
                        <div>Loyer: {biensDetailsService.formatCurrency(bien.contrats.actuel.loyer)}</div>
                        <div>Charges: {biensDetailsService.formatCurrency(bien.contrats.actuel.chargesMensuelles)}</div>
                        <div>Dépôt: {biensDetailsService.formatCurrency(bien.contrats.actuel.depotGarantie)}</div>
                        <div className="text-gray-500">Paiement le {bien.contrats.actuel.jourPaiement} du mois</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'contrats' && (
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Historique des contrats
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {bien._count.contrats} contrat{bien._count.contrats > 1 ? 's' : ''} au total
              </p>
            </div>
            <Table
              columns={contratsColumns}
              data={[
                ...(bien.contrats.actuel ? [bien.contrats.actuel] : []),
                ...bien.contrats.precedents
              ]}
              keyExtractor={(record) => record.id}
              emptyText="Aucun contrat trouvé"
            />
          </div>
        )}

        {activeTab === 'loyers' && (
          <div className="card">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Historique des loyers
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {loyersRecents.length} loyer{loyersRecents.length > 1 ? 's' : ''} récent{loyersRecents.length > 1 ? 's' : ''}
                </p>
              </div>
              {bien.contrats.actuel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => genererLoyersManquantsMutation.mutate(bien.contrats.actuel!.id)}
                  loading={genererLoyersManquantsMutation.isLoading}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Générer loyers manquants
                </Button>
              )}
            </div>
            <Table
              columns={loyersColumns}
              data={loyersRecents}
              keyExtractor={(record) => record.id}
              emptyText="Aucun loyer trouvé"
            />
          </div>
        )}

        {activeTab === 'charges' && (
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Charges du bien
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {bien._count.charges} charge{bien._count.charges > 1 ? 's' : ''} enregistrée{bien._count.charges > 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-6">
              {bien.charges.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingDown className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune charge enregistrée</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bien.charges.map((charge) => (
                    <div key={charge.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{charge.description}</div>
                        <div className="text-sm text-gray-600">
                          {charge.categorie} • {biensDetailsService.formatDate(charge.date)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${charge.payee ? 'text-green-600' : 'text-red-600'}`}>
                          {biensDetailsService.formatCurrency(charge.montant)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {charge.payee ? 'Payée' : 'Non payée'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'garants' && (
          <div className="card">
            <div className="p-6">
              <BienGarantsSection bienId={id!} />
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="card">
            <div className="p-6">
              <DocumentManager
                categorie="BIEN"
                entityId={id!}
                entityName={bien ? `${bien.adresse} - ${bien.ville}` : 'Bien'}
                allowUpload={true}
                allowDelete={true}
                allowEdit={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modal détails contrat */}
      <Modal
        isOpen={!!selectedContrat}
        onClose={() => setSelectedContrat(null)}
        title="Détails du contrat"
        size="lg"
      >
        {selectedContrat && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Informations générales</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Début:</span>
                    <span>{biensDetailsService.formatDate(selectedContrat.dateDebut)}</span>
                  </div>
                  {selectedContrat.dateFin && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fin:</span>
                      <span>{biensDetailsService.formatDate(selectedContrat.dateFin)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Durée:</span>
                    <span>{selectedContrat.duree} mois</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span>{selectedContrat.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Statut:</span>
                    <Badge variant={biensDetailsService.getContratStatutColor(selectedContrat.statut)}>
                      {biensDetailsService.getContratStatutLabel(selectedContrat.statut)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Montants</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loyer:</span>
                    <span className="font-medium">{biensDetailsService.formatCurrency(selectedContrat.loyer)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Charges:</span>
                    <span>{biensDetailsService.formatCurrency(selectedContrat.chargesMensuelles)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dépôt:</span>
                    <span>{biensDetailsService.formatCurrency(selectedContrat.depotGarantie)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jour de paiement:</span>
                    <span>Le {selectedContrat.jourPaiement} du mois</span>
                  </div>
                </div>
              </div>
            </div>
            
            {selectedContrat.clausesParticulieres && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Clauses particulières</h4>
                <div className="p-3 bg-gray-50 rounded text-sm">
                  {selectedContrat.clausesParticulieres}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal détails loyer */}
      <Modal
        isOpen={!!selectedLoyer}
        onClose={() => setSelectedLoyer(null)}
        title={`Loyer ${selectedLoyer ? biensDetailsService.formatMoisAnnee(selectedLoyer.mois, selectedLoyer.annee) : ''}`}
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
                    <span>{biensDetailsService.formatMoisAnnee(selectedLoyer.mois, selectedLoyer.annee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Échéance:</span>
                    <span>{biensDetailsService.formatDate(selectedLoyer.dateEcheance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Statut:</span>
                    <Badge variant={biensDetailsService.getLoyerStatutColor(selectedLoyer.statut)}>
                      {biensDetailsService.getLoyerStatutLabel(selectedLoyer.statut)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Montants</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant dû:</span>
                    <span className="font-medium">{biensDetailsService.formatCurrency(selectedLoyer.montantDu)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant payé:</span>
                    <span className="font-medium text-green-600">{biensDetailsService.formatCurrency(selectedLoyer.montantPaye)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reste à payer:</span>
                    <span className={`font-medium ${selectedLoyer.montantDu - selectedLoyer.montantPaye > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {biensDetailsService.formatCurrency(selectedLoyer.montantDu - selectedLoyer.montantPaye)}
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
                          {biensDetailsService.formatDate(paiement.date)} • {paiement.mode}
                        </div>
                        {paiement.reference && (
                          <div className="text-xs text-gray-500">Réf: {paiement.reference}</div>
                        )}
                      </div>
                      <div className="font-medium text-green-600">
                        {biensDetailsService.formatCurrency(paiement.montant)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de paiements multiples */}
      <Modal
        isOpen={multiplePaiementModalOpen}
        onClose={closeMultiplePaiementModal}
        title="Enregistrer plusieurs paiements"
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
      {selectedContratForResiliation && (
        <ResiliationModal
          isOpen={resiliationModalOpen}
          onClose={() => {
            setResiliationModalOpen(false);
            setSelectedContratForResiliation(null);
          }}
          contrat={{
            ...selectedContratForResiliation,
            bien: {
              adresse: bienDetails?.bien?.adresse || 'Adresse non disponible'
            }
          }}
          onSuccess={() => {
            queryClient.invalidateQueries(['bien-details', id]);
            setResiliationModalOpen(false);
            setSelectedContratForResiliation(null);
          }}
        />
      )}

      {/* Modal de création de contrat */}
      <Modal
        isOpen={createContratModalOpen}
        onClose={closeCreateContratModal}
        title="Nouveau contrat"
        size="xl"
      >
        <ContratForm
          initialData={{ bienId: id }}
          onSubmit={handleContratSubmit}
          onCancel={closeCreateContratModal}
          loading={createContratMutation.isLoading}
        />
      </Modal>
    </div>
  );
};

export default BienDetailsPage;