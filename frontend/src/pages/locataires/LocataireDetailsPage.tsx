import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Euro,
  Home,
  FileText,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Receipt,
  CreditCard,
  XCircle,
  Bell,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

import { locatairesService, LocataireDetails } from '@/services/locataires';
import { paiementsService, PaiementCreate } from '@/services/paiements';
import { rappelsService, RappelCreate } from '@/services/rappels';
import { quittancesService } from '@/services/quittances';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import MultiplePaiementForm from '@/components/forms/MultiplePaiementForm';
import RappelForm from '@/components/forms/RappelForm';
import ResiliationModal from '@/components/contrats/ResiliationModal';
import LocataireGarantsSection from '@/components/garants/LocataireGarantsSection';
// import LocataireGarantsTest from '@/components/garants/LocataireGarantsTest';
import DocumentManager from '@/components/Documents/DocumentManager';

const LocataireDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'contrats' | 'loyers' | 'paiements' | 'garants' | 'documents'>('overview');
  const [selectedLoyer, setSelectedLoyer] = useState<any>(null);
  const [multiplePaiementModalOpen, setMultiplePaiementModalOpen] = useState(false);
  const [selectedLoyerForMultiplePaiement, setSelectedLoyerForMultiplePaiement] = useState<any>(null);
  const [rappelModalOpen, setRappelModalOpen] = useState(false);
  const [selectedLoyerForRappel, setSelectedLoyerForRappel] = useState<any>(null);
  const [resiliationModalOpen, setResiliationModalOpen] = useState(false);
  const [selectedContratForResiliation, setSelectedContratForResiliation] = useState<any>(null);

  const queryClient = useQueryClient();

  // Récupérer les détails du locataire
  const {
    data: locataireDetails,
    isLoading,
    error,
  } = useQuery(
    ['locataire-details', id],
    () => locatairesService.getDetails(id!),
    {
      enabled: !!id,
    }
  );

  // Mutation pour créer des paiements multiples
  const createMultiplePaiementMutation = useMutation((paiements: PaiementCreate[]) => 
    paiementsService.createBulk({ paiements }), {
    onSuccess: () => {
      queryClient.invalidateQueries(['locataire-details', id]);
      setMultiplePaiementModalOpen(false);
      setSelectedLoyerForMultiplePaiement(null);
      toast.success('Paiements enregistrés avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de l\'enregistrement des paiements');
    },
  });

  // Mutation pour créer des rappels
  const createRappelMutation = useMutation(rappelsService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries(['locataire-details', id]);
      setRappelModalOpen(false);
      setSelectedLoyerForRappel(null);
      toast.success('Rappel créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la création du rappel');
    },
  });

  const handleMultiplePaiementSubmit = (paiements: PaiementCreate[]) => {
    console.log('🔍 LocataireDetailsPage - handleMultiplePaiementSubmit appelée avec:', paiements);
    createMultiplePaiementMutation.mutate(paiements);
  };

  const openMultiplePaiementModal = (loyer: any) => {
    // Adapter les données pour le formulaire de paiement multiple
    const adaptedLoyer = {
      ...loyer,
      contrat: {
        jourPaiement: loyer.contrat?.jourPaiement,
        locataires: [{
          locataire: {
            id: locataireDetails?.id,
            nom: locataireDetails?.nom,
            prenom: locataireDetails?.prenom,
            civilite: locataireDetails?.civilite
          }
        }]
      }
    };
    setSelectedLoyerForMultiplePaiement(adaptedLoyer);
    setMultiplePaiementModalOpen(true);
  };

  const closeMultiplePaiementModal = () => {
    setMultiplePaiementModalOpen(false);
    setSelectedLoyerForMultiplePaiement(null);
  };

  const handleRappelSubmit = (data: RappelCreate) => {
    createRappelMutation.mutate(data);
  };

  const openRappelModal = (loyer: any) => {
    // Adapter les données pour le formulaire de rappel
    const adaptedLoyer = {
      ...loyer,
      contrat: {
        ...loyer.contrat,
        locataires: [{
          locataire: {
            id: locataireDetails?.id,
            nom: locataireDetails?.nom,
            prenom: locataireDetails?.prenom,
            email: locataireDetails?.email,
            telephone: locataireDetails?.telephone
          }
        }]
      }
    };
    
    console.log('Données loyer pour rappel:', adaptedLoyer);
    setSelectedLoyerForRappel(adaptedLoyer);
    setRappelModalOpen(true);
  };

  const closeRappelModal = () => {
    setRappelModalOpen(false);
    setSelectedLoyerForRappel(null);
  };

  // Fonction pour générer et envoyer une quittance
  const handleGenerateQuittance = async (loyer: any) => {
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
      queryClient.invalidateQueries(['locataire-details', id]);
      
    } catch (error: any) {
      console.error('Erreur génération quittance:', error);
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la génération de la quittance');
    }
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

  const formatMoisAnnee = (mois: number, annee: number) => {
    const date = new Date(annee, mois - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'PAYE': return 'success';
      case 'RETARD': return 'danger';
      case 'PARTIEL': return 'warning';
      default: return 'gray';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'PAYE': return 'Payé';
      case 'RETARD': return 'En retard';
      case 'PARTIEL': return 'Partiel';
      case 'ATTENTE': return 'En attente';
      default: return statut;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !locataireDetails) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Erreur lors du chargement des détails du locataire</p>
        <Button onClick={() => navigate('/locataires')} className="mt-4">
          Retour à la liste
        </Button>
      </div>
    );
  }

  const { stats } = locataireDetails;

  // Collecter tous les loyers de tous les contrats
  const allLoyers = locataireDetails.contrats.flatMap(c => 
    c.contrat.loyers.map(loyer => ({
      ...loyer,
      contrat: c.contrat,
      bien: c.contrat.bien
    }))
  ).sort((a, b) => new Date(b.dateEcheance).getTime() - new Date(a.dateEcheance).getTime());

  // Collecter tous les paiements
  const allPaiements = allLoyers.flatMap(loyer => 
    loyer.paiements.map(paiement => ({
      ...paiement,
      loyer: {
        id: loyer.id,
        mois: loyer.mois,
        annee: loyer.annee,
        contrat: loyer.contrat
      }
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Colonnes pour le tableau des loyers
  const loyersColumns = [
    {
      key: 'periode',
      title: 'Période',
      render: (_: any, loyer: any) => (
        <div className="font-medium">
          {formatMoisAnnee(loyer.mois, loyer.annee)}
        </div>
      ),
    },
    {
      key: 'bien',
      title: 'Bien',
      render: (_: any, loyer: any) => (
        <div className="text-sm">
          <div className="font-medium">{loyer.bien.adresse}</div>
          <div className="text-gray-500">{loyer.bien.ville}</div>
        </div>
      ),
    },
    {
      key: 'montant',
      title: 'Montant',
      render: (_: any, loyer: any) => (
        <div className="text-right">
          <div className="font-medium">
            {formatCurrency(loyer.montantDu)}
          </div>
          {loyer.montantPaye > 0 && (
            <div className="text-sm text-gray-500">
              Payé: {formatCurrency(loyer.montantPaye)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'statut',
      title: 'Statut',
      render: (_: any, loyer: any) => (
        <Badge variant={getStatutColor(loyer.statut)}>
          {getStatutLabel(loyer.statut)}
        </Badge>
      ),
    },
    {
      key: 'echeance',
      title: 'Échéance',
      render: (_: any, loyer: any) => (
        <div className="text-sm">
          {formatDate(loyer.dateEcheance)}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, loyer: any) => (
        <div className="flex justify-end space-x-1">
          {loyer.statut !== 'PAYE' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openMultiplePaiementModal(loyer)}
              className="text-green-600 hover:text-green-700"
              title="Enregistrer un paiement"
            >
              <CreditCard className="h-4 w-4" />
            </Button>
          )}
          {loyer.statut === 'RETARD' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openRappelModal(loyer)}
              className="text-orange-600 hover:text-orange-700"
              title="Créer un rappel de paiement"
            >
              <Bell className="h-4 w-4" />
            </Button>
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

  return (
    <div className="space-y-6">
      {/* Header avec navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/locataires')}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
              <User className="h-6 w-6 mr-3 text-blue-500" />
              {locataireDetails.civilite} {locataireDetails.prenom} {locataireDetails.nom}
            </h1>
            <p className="text-sm text-gray-600 flex items-center mt-1">
              <Mail className="h-4 w-4 mr-1" />
              {locataireDetails.email}
            </p>
          </div>
        </div>
      </div>

      {/* Statistiques du locataire */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Contrats</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.nombreContrats}
              </p>
              <p className="text-xs text-gray-500">
                {stats.contratsActifs} actif(s)
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <Euro className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total loyers</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(stats.totalLoyers)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total payé</p>
              <p className="text-2xl font-semibold text-green-600">
                {formatCurrency(stats.totalPaye)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Reste à payer</p>
              <p className={`text-2xl font-semibold ${stats.soldeRestant > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(stats.soldeRestant)}
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
                {stats.totalLoyers > 0 ? Math.round((stats.totalPaye / stats.totalLoyers) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Onglets de navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Vue d\'ensemble', icon: User },
            { key: 'contrats', label: 'Contrats', icon: FileText },
            { key: 'loyers', label: 'Loyers', icon: Euro },
            { key: 'paiements', label: 'Paiements', icon: Receipt },
            { key: 'garants', label: 'Garants', icon: Shield },
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
            {/* Informations personnelles */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Informations personnelles
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Civilité :</span>
                      <span className="font-medium">{locataireDetails.civilite}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email :</span>
                      <span className="font-medium">{locataireDetails.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Téléphone :</span>
                      <span className="font-medium">{locataireDetails.telephone}</span>
                    </div>
                    {locataireDetails.dateNaissance && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date de naissance :</span>
                        <span className="font-medium">{formatDate(locataireDetails.dateNaissance)}</span>
                      </div>
                    )}
                    {locataireDetails.profession && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Profession :</span>
                        <span className="font-medium">{locataireDetails.profession}</span>
                      </div>
                    )}
                    {locataireDetails.revenus && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Revenus :</span>
                        <span className="font-medium">{formatCurrency(locataireDetails.revenus)}/mois</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div className="card">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Adresse
                  </h3>
                  <div className="space-y-3">
                    {locataireDetails.adresse ? (
                      <>
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                          <div>
                            <div>{locataireDetails.adresse}</div>
                            {locataireDetails.ville && locataireDetails.codePostal && (
                              <div>{locataireDetails.codePostal} {locataireDetails.ville}</div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-400">Aucune adresse renseignée</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Biens loués actuellement */}
            <div className="card">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Biens loués actuellement
                </h3>
                <div className="space-y-4">
                  {locataireDetails.contrats
                    .filter(c => c.contrat.statut === 'ACTIF')
                    .map((contratLocataire) => (
                      <div key={contratLocataire.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center">
                            <Home className="h-10 w-10 text-blue-500 bg-blue-100 rounded-full p-2" />
                            <div className="ml-4">
                              <h4 className="font-medium text-gray-900">
                                {contratLocataire.contrat.bien.adresse}
                              </h4>
                              <div className="text-sm text-gray-600">
                                {contratLocataire.contrat.bien.codePostal} {contratLocataire.contrat.bien.ville}
                              </div>
                              <div className="text-sm text-gray-500">
                                {contratLocataire.contrat.bien.type} • {contratLocataire.contrat.bien.surface}m² • {contratLocataire.contrat.bien.nbPieces} pièces
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Loyer mensuel</div>
                            <div className="font-medium text-lg">
                              {formatCurrency(contratLocataire.contrat.loyer)}
                            </div>
                            {contratLocataire.contrat.chargesMensuelles > 0 && (
                              <div className="text-sm text-gray-500">
                                + {formatCurrency(contratLocataire.contrat.chargesMensuelles)} charges
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'contrats' && (
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Historique des contrats
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {stats.nombreContrats} contrat{stats.nombreContrats > 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {locataireDetails.contrats.map((contratLocataire) => (
                  <div key={contratLocataire.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          Contrat {locataireDetails.prenom} {locataireDetails.nom}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {contratLocataire.contrat.bien.adresse}, {contratLocataire.contrat.bien.ville}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {contratLocataire.contrat.statut === 'ACTIF' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedContratForResiliation(contratLocataire.contrat);
                              setResiliationModalOpen(true);
                            }}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            title="Résilier le contrat"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Résilier
                          </Button>
                        )}
                        <Badge variant={contratLocataire.contrat.statut === 'ACTIF' ? 'success' : 'gray'}>
                          {contratLocataire.contrat.statut}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Début :</span>
                        <span className="ml-2 font-medium">{formatDate(contratLocataire.contrat.dateDebut)}</span>
                      </div>
                      {contratLocataire.contrat.dateFin && (
                        <div>
                          <span className="text-gray-600">Fin :</span>
                          <span className="ml-2 font-medium">{formatDate(contratLocataire.contrat.dateFin)}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Loyer :</span>
                        <span className="ml-2 font-medium">{formatCurrency(contratLocataire.contrat.loyer)}</span>
                      </div>
                    </div>
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
                {allLoyers.length} loyer{allLoyers.length > 1 ? 's' : ''}
              </p>
            </div>
            <Table
              columns={loyersColumns}
              data={allLoyers}
              keyExtractor={(record) => record.id}
              emptyText="Aucun loyer trouvé"
            />
          </div>
        )}

        {activeTab === 'paiements' && (
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Historique des paiements
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {allPaiements.length} paiement{allPaiements.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-6">
              {allPaiements.length > 0 ? (
                <div className="space-y-4">
                  {allPaiements.map((paiement) => (
                    <div key={paiement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{paiement.payeur}</div>
                        <div className="text-sm text-gray-600">
                          {formatMoisAnnee(paiement.loyer.mois, paiement.loyer.annee)} • {paiement.mode}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(paiement.date)}
                          {paiement.reference && ` • Réf: ${paiement.reference}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          {paiement.loyer.contrat.bien.adresse}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          {formatCurrency(paiement.montant)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun paiement enregistré</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'garants' && (
          <div className="card">
            <div className="p-6">
              <LocataireGarantsSection 
                locataireId={id!}
                garants={locataireDetails?.garants}
                onUpdate={() => {
                  // Refresh les données du locataire
                  queryClient.invalidateQueries(['locataire-details', id]);
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="card">
            <div className="p-6">
              {console.log('DocumentManager - Locataire Debug:', { id, locataireDetails })}
              <DocumentManager
                categorie="LOCATAIRE"
                entityId={id!}
                entityName={`${locataireDetails?.prenom} ${locataireDetails?.nom}`}
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
        title={`Loyer ${selectedLoyer ? formatMoisAnnee(selectedLoyer.mois, selectedLoyer.annee) : ''}`}
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
                    <span>{formatMoisAnnee(selectedLoyer.mois, selectedLoyer.annee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bien:</span>
                    <span>{selectedLoyer.bien.adresse}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Échéance:</span>
                    <span>{formatDate(selectedLoyer.dateEcheance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Statut:</span>
                    <Badge variant={getStatutColor(selectedLoyer.statut)}>
                      {getStatutLabel(selectedLoyer.statut)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Montants</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant dû:</span>
                    <span className="font-medium">{formatCurrency(selectedLoyer.montantDu)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant payé:</span>
                    <span className="font-medium text-green-600">{formatCurrency(selectedLoyer.montantPaye)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reste à payer:</span>
                    <span className={`font-medium ${selectedLoyer.montantDu - selectedLoyer.montantPaye > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(selectedLoyer.montantDu - selectedLoyer.montantPaye)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {selectedLoyer.paiements.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Paiements ({selectedLoyer.paiements.length})</h4>
                <div className="space-y-2">
                  {selectedLoyer.paiements.map((paiement: any) => (
                    <div key={paiement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{paiement.payeur}</div>
                        <div className="text-sm text-gray-600">
                          {formatDate(paiement.date)} • {paiement.mode}
                        </div>
                        {paiement.reference && (
                          <div className="text-xs text-gray-500">Réf: {paiement.reference}</div>
                        )}
                      </div>
                      <div className="font-medium text-green-600">
                        {formatCurrency(paiement.montant)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de paiement multiple */}
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
            loyer={selectedLoyerForRappel}
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
          contrat={selectedContratForResiliation}
          onSuccess={() => {
            queryClient.invalidateQueries(['locataire-details', id]);
            setResiliationModalOpen(false);
            setSelectedContratForResiliation(null);
          }}
        />
      )}
    </div>
  );
};

export default LocataireDetailsPage;