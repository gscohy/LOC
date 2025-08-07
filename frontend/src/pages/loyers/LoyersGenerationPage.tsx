import React, { useState } from 'react';
import { useMutation } from 'react-query';
import { Calendar, Zap, Eye, CheckCircle, AlertTriangle, RefreshCw, Euro, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

import { loyersGenerationService, GenerationRequest, PreviewResponse } from '@/services/loyers-generation';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';

const LoyersGenerationPage: React.FC = () => {
  const [moisSelectionne, setMoisSelectionne] = useState(loyersGenerationService.getMoisSuivant().mois);
  const [anneeSelectionnee, setAnneeSelectionnee] = useState(loyersGenerationService.getMoisSuivant().annee);
  const [forceRegeneration, setForceRegeneration] = useState(false);
  
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  
  // Génération rapide pour le mois suivant
  const generationRapideMutation = useMutation(loyersGenerationService.genererMoisSuivant, {
    onSuccess: (data) => {
      toast.success(`${data.loyersGeneres.length} loyers générés avec succès !`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la génération');
    },
  });

  // Génération personnalisée
  const generationPersonnaliseeMutation = useMutation(loyersGenerationService.generer, {
    onSuccess: (data) => {
      toast.success(`${data.loyersGeneres.length} loyers générés avec succès !`);
      setIsPreviewModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la génération');
    },
  });

  // Prévisualisation
  const previewMutation = useMutation(
    ({ mois, annee }: { mois: number; annee: number }) =>
      loyersGenerationService.previewGeneration(mois, annee),
    {
      onSuccess: (data) => {
        setPreviewData(data);
        setIsPreviewModalOpen(true);
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error?.message || 'Erreur lors de la prévisualisation');
      },
    }
  );

  const handleGenerationRapide = () => {
    generationRapideMutation.mutate();
  };

  const handlePreview = () => {
    previewMutation.mutate({ mois: moisSelectionne, annee: anneeSelectionnee });
  };

  const handleGenererDepuisPreview = () => {
    if (!previewData) return;
    
    const request: GenerationRequest = {
      mois: previewData.periode.mois,
      annee: previewData.periode.annee,
      forceRegeneration,
    };

    generationPersonnaliseeMutation.mutate(request);
  };

  const moisSuivant = loyersGenerationService.getMoisSuivant();
  const annees = loyersGenerationService.getAnneesDisponibles();

  const previewColumns = [
    {
      key: 'bien',
      title: 'Bien',
      render: (_: any, record: any) => (
        <div>
          <div className="font-medium text-gray-900">
            {record.bien.adresse}
          </div>
          <div className="text-sm text-gray-500">
            {record.bien.codePostal} {record.bien.ville}
          </div>
        </div>
      ),
    },
    {
      key: 'locataires',
      title: 'Locataires',
      render: (_: any, record: any) => (
        <div>
          {record.locataires.map((locataire: any, index: number) => (
            <div key={index} className="text-sm">
              {locataire.prenom} {locataire.nom}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'montantDu',
      title: 'Montant',
      render: (_: any, record: any) => (
        <div className="text-right font-medium">
          {record.montantDu.toLocaleString()}€
        </div>
      ),
    },
    {
      key: 'dateEcheance',
      title: 'Échéance',
      render: (_: any, record: any) => (
        <div className="text-sm">
          {new Date(record.dateEcheance).toLocaleDateString('fr-FR')}
        </div>
      ),
    },
    {
      key: 'action',
      title: 'Statut',
      render: (_: any, record: any) => (
        <Badge
          variant={record.loyerExiste ? 'warning' : 'success'}
        >
          {record.loyerExiste ? 'Existe déjà' : 'À générer'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Génération automatique des loyers
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Générez automatiquement les loyers pour tous les contrats actifs
          </p>
        </div>
      </div>

      {/* Génération rapide */}
      <div className="card">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Zap className="h-6 w-6 text-blue-500 mr-3" />
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Génération rapide
              </h2>
              <p className="text-sm text-gray-600">
                Générer les loyers pour le mois prochain ({loyersGenerationService.formatPeriode(moisSuivant.mois, moisSuivant.annee)})
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleGenerationRapide}
              loading={generationRapideMutation.isLoading}
              className="flex items-center"
            >
              <Zap className="h-4 w-4 mr-2" />
              Générer pour {loyersGenerationService.formatPeriode(moisSuivant.mois, moisSuivant.annee)}
            </Button>
            
            {generationRapideMutation.data && (
              <div className="text-sm text-green-600 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                {generationRapideMutation.data.loyersGeneres.length} loyers générés
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Génération personnalisée */}
      <div className="card">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <Calendar className="h-6 w-6 text-purple-500 mr-3" />
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Génération personnalisée
              </h2>
              <p className="text-sm text-gray-600">
                Choisissez la période pour laquelle générer les loyers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mois
              </label>
              <select
                value={moisSelectionne}
                onChange={(e) => setMoisSelectionne(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(mois => (
                  <option key={mois} value={mois}>
                    {loyersGenerationService.getMoisLabel(mois)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Année
              </label>
              <select
                value={anneeSelectionnee}
                onChange={(e) => setAnneeSelectionnee(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {annees.map(annee => (
                  <option key={annee} value={annee}>
                    {annee}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={forceRegeneration}
                  onChange={(e) => setForceRegeneration(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Forcer la régénération
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handlePreview}
              loading={previewMutation.isLoading}
              className="flex items-center"
            >
              <Eye className="h-4 w-4 mr-2" />
              Prévisualiser
            </Button>
          </div>
        </div>
      </div>

      {/* Résultats des générations récentes */}
      {(generationRapideMutation.data || generationPersonnaliseeMutation.data) && (
        <div className="card">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-green-500" />
              Dernière génération
            </h2>
            
            {(() => {
              const data = generationPersonnaliseeMutation.data || generationRapideMutation.data;
              if (!data) return null;
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-700">Loyers générés</p>
                        <p className="text-2xl font-semibold text-green-900">
                          {data.loyersGeneres.length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-700">Contrats traités</p>
                        <p className="text-2xl font-semibold text-blue-900">
                          {data.contratsTraites}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="h-8 w-8 text-yellow-500" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-yellow-700">Existants</p>
                        <p className="text-2xl font-semibold text-yellow-900">
                          {data.loyersExistants}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Euro className="h-8 w-8 text-purple-500" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-purple-700">Montant total</p>
                        <p className="text-2xl font-semibold text-purple-900">
                          {data.loyersGeneres.reduce((sum: number, loyer: any) => sum + loyer.montantDu, 0).toLocaleString()}€
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal de prévisualisation */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={`Prévisualisation - ${previewData ? loyersGenerationService.formatPeriode(previewData.periode.mois, previewData.periode.annee) : ''}`}
        size="xl"
      >
        {previewData && (
          <div className="space-y-6">
            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-900">
                  {previewData.statistiques.contratsActifs}
                </div>
                <div className="text-sm text-blue-700">Contrats actifs</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-900">
                  {previewData.statistiques.aGenerer}
                </div>
                <div className="text-sm text-green-700">À générer</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-900">
                  {previewData.statistiques.existeDeja}
                </div>
                <div className="text-sm text-yellow-700">Existent déjà</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-900">
                  {previewData.statistiques.montantTotal.toLocaleString()}€
                </div>
                <div className="text-sm text-purple-700">Montant total</div>
              </div>
            </div>

            {/* Table de prévisualisation */}
            <div className="max-h-96 overflow-y-auto">
              <Table
                columns={previewColumns}
                data={previewData.preview}
                keyExtractor={(record) => record.contratId}
                emptyText="Aucun contrat trouvé"
              />
            </div>

            {/* Actions */}
            <div className="border-t pt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {previewData.statistiques.aGenerer > 0 && (
                  <span>
                    {previewData.statistiques.aGenerer} loyers seront générés
                    {forceRegeneration && previewData.statistiques.existeDeja > 0 && 
                      ` (+ ${previewData.statistiques.existeDeja} régénérés)`
                    }
                  </span>
                )}
              </div>
              
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setIsPreviewModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleGenererDepuisPreview}
                  loading={generationPersonnaliseeMutation.isLoading}
                  disabled={previewData.statistiques.aGenerer === 0 && !forceRegeneration}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Générer les loyers
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LoyersGenerationPage;