import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import { 
  Calculator, 
  Download, 
  FileText, 
  HelpCircle, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Euro,
  Building2,
  AlertCircle,
  Settings
} from 'lucide-react';

import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { dashboardService } from '@/services/dashboard';
import { fiscaliteService } from '@/services/fiscalite';
import Declaration2044Modal from '@/components/fiscalite/Declaration2044Modal';
import SimulateurImpotModal from '@/components/fiscalite/SimulateurImpotModal';
import ChargesVentilationModal from '@/components/fiscalite/ChargesVentilationModal';

const FiscalitePage: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedProprietaire, setSelectedProprietaire] = useState('');
  const [showDeclarationModal, setShowDeclarationModal] = useState(false);
  const [showSimulateurModal, setShowSimulateurModal] = useState(false);
  const [showChargesVentilationModal, setShowChargesVentilationModal] = useState(false);

  // Récupérer les données fiscales
  const { data: dashboardStats, isLoading } = useQuery(
    ['fiscal-data', selectedYear], 
    () => dashboardService.getStats(selectedYear),
    {
      staleTime: 30 * 1000,
    }
  );

  // Récupérer les données fiscales détaillées
  const { data: fiscalData, isLoading: fiscalLoading } = useQuery(
    ['fiscal-detailed-data', selectedYear, selectedProprietaire],
    () => fiscaliteService.getFiscalData(selectedYear, selectedProprietaire || undefined),
    {
      staleTime: 30 * 1000,
      select: (data) => data.data
    }
  );

  // Récupérer la ventilation des charges
  const { data: chargesVentilation } = useQuery(
    ['charges-ventilation', selectedYear, selectedProprietaire],
    () => fiscaliteService.getChargesVentilation(selectedYear, selectedProprietaire || undefined),
    {
      staleTime: 30 * 1000,
      select: (data) => data.data
    }
  );

  const yearOptions = Array.from({length: 5}, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculs fiscaux
  const revenus = dashboardStats?.loyers.revenus.annee || 0;
  const charges = dashboardStats?.charges.total.montant || 0;
  const benefice = revenus - charges;
  const deficitFoncier = benefice < 0 ? Math.abs(benefice) : 0;
  const beneficeFoncier = benefice > 0 ? benefice : 0;

  if (isLoading || fiscalLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données fiscales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Aide à la Fiscalité
          </h1>
          <p className="mt-1 text-lg text-gray-600">
            Préparez votre déclaration 2044 et optimisez votre fiscalité
          </p>
        </div>
        <div className="flex space-x-3">
          <Select
            value={selectedYear.toString()}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            options={yearOptions}
            className="w-32"
          />
          <Button 
            variant="outline"
            onClick={async () => {
              try {
                const blob = await fiscaliteService.exportDeclaration2044PDF(selectedYear, selectedProprietaire || undefined);
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `declaration-2044-${selectedYear}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              } catch (error: any) {
                alert('Erreur lors de l\'export PDF: ' + (error.response?.data?.error || error.message));
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter PDF
          </Button>
        </div>
      </div>

      {/* Résumé fiscal */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-lg bg-blue-500">
              <Euro className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Revenus fonciers</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(revenus)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-lg bg-red-500">
              <TrendingDown className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Charges déductibles</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(charges)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className={`flex-shrink-0 p-3 rounded-lg ${benefice >= 0 ? 'bg-green-500' : 'bg-orange-500'}`}>
              {benefice >= 0 ? <TrendingUp className="h-6 w-6 text-white" /> : <TrendingDown className="h-6 w-6 text-white" />}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {benefice >= 0 ? 'Bénéfice foncier' : 'Déficit foncier'}
              </p>
              <p className={`text-2xl font-semibold ${benefice >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {formatCurrency(Math.abs(benefice))}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-lg bg-purple-500">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Biens en location</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardStats?.biens.total || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Déclaration 2044 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="h-5 w-5 text-blue-500 mr-2" />
              Déclaration 2044 - Revenus fonciers
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Cases principales à remplir :</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Case 211 - Revenus bruts :</span>
                  <span className="font-medium">{formatCurrency(revenus)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Case 221 - Frais et charges :</span>
                  <span className="font-medium">{formatCurrency(charges)}</span>
                </div>
                <hr className="border-blue-200" />
                <div className="flex justify-between font-semibold">
                  <span>Résultat foncier :</span>
                  <span className={benefice >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(benefice)}
                  </span>
                </div>
              </div>
            </div>

            {deficitFoncier > 0 && (
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Déficit foncier
                </h4>
                <p className="text-sm text-orange-800">
                  Votre déficit de <strong>{formatCurrency(deficitFoncier)}</strong> peut être imputé sur vos autres revenus 
                  (dans la limite de 10 700€) et sur vos revenus fonciers futurs.
                </p>
              </div>
            )}

            <Button 
              className="w-full"
              onClick={() => setShowDeclarationModal(true)}
            >
              <Calculator className="h-4 w-4 mr-2" />
              Générer la déclaration 2044
            </Button>
          </div>
        </div>

        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <HelpCircle className="h-5 w-5 text-green-500 mr-2" />
              Conseils fiscaux
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="bg-green-50 p-3 rounded-lg">
                <h4 className="font-medium text-green-900 mb-1">✓ Charges déductibles</h4>
                <p className="text-sm text-green-800">
                  Travaux d'entretien, frais de gestion, assurances, intérêts d'emprunt, taxe foncière...
                </p>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-1">⚠️ Régime micro-foncier</h4>
                <p className="text-sm text-yellow-800">
                  Si vos revenus fonciers sont inférieurs à 15 000€, vous pouvez opter pour un abattement de 30%.
                </p>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">💡 Optimisation</h4>
                <p className="text-sm text-blue-800">
                  Planifiez vos travaux pour optimiser la déduction des charges sur plusieurs années.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Dates importantes {selectedYear}</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Déclaration en ligne : avant fin mai</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Déclaration papier : avant mi-mai</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Détail des charges par catégorie */}
      <div className="card">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Détail des charges déductibles</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChargesVentilationModal(true)}
            className="flex items-center"
          >
            <Settings className="h-4 w-4 mr-2" />
            Paramétrer la ventilation
          </Button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Charges courantes</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Frais de gestion</span>
                  <span className="font-medium">{formatCurrency(fiscalData?.charges.fraisGestion || chargesVentilation?.fraisGestion || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Assurances</span>
                  <span className="font-medium">{formatCurrency(fiscalData?.charges.assurances || chargesVentilation?.assurances || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxe foncière</span>
                  <span className="font-medium">{formatCurrency(fiscalData?.charges.taxeFonciere || chargesVentilation?.taxesFoncieres || 0)}</span>
                </div>
                {chargesVentilation && (
                  <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
                    ✓ <strong>Ventilation paramétrée appliquée</strong>
                  </div>
                )}
                {(!fiscalData?.charges.fraisGestion && !fiscalData?.charges.assurances && !fiscalData?.charges.taxeFonciere && !chargesVentilation) && charges > 0 && (
                  <div className="mt-2 p-2 bg-orange-50 rounded text-xs text-orange-700">
                    <strong>Attention :</strong> Charges enregistrées globalement ({formatCurrency(charges)})
                    <br />Utilisez "Paramétrer la ventilation" pour détailler
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Travaux</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Travaux déductibles</span>
                  <span className="font-medium">{formatCurrency(fiscalData?.charges.travaux || (chargesVentilation?.reparationsEntretien || 0) + (chargesVentilation?.ameliorations || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Autres charges</span>
                  <span className="font-medium">{formatCurrency(fiscalData?.charges.autres || chargesVentilation?.autresCharges || 0)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Financement</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Intérêts d'emprunt</span>
                  <span className="font-medium">{formatCurrency(fiscalData?.charges.interetsEmprunt || chargesVentilation?.interetsEmprunt || 0)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total charges</span>
                  <span className="text-red-600">{formatCurrency(fiscalData?.charges.total || charges)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💡 Conseils pour optimiser vos charges déductibles</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Frais de gestion :</strong> Honoraires d'agence, frais de syndic, frais de procédure</li>
              <li>• <strong>Travaux déductibles :</strong> Réparations, entretien (peinture, plomberie, électricité)</li>
              <li>• <strong>Intérêts d'emprunt :</strong> Déductibles sans limitation de montant</li>
              <li>• <strong>Assurances :</strong> PNO, GLI, protection juridique</li>
              <li>• <strong>Taxe foncière :</strong> Entièrement déductible (mais pas la taxe d'habitation)</li>
            </ul>
            {/* Message sur les charges globales si pas de détail */}
            {charges > 0 && (!fiscalData?.charges.fraisGestion && !fiscalData?.charges.assurances && !fiscalData?.charges.taxeFonciere && !fiscalData?.charges.travaux && !fiscalData?.charges.interetsEmprunt) && (
              <div className="mt-3 pt-3 border-t border-blue-200 bg-yellow-50 p-3 rounded">
                <h5 className="font-medium text-yellow-900 mb-1">⚠️ Charges non ventilées</h5>
                <p className="text-sm text-yellow-800">
                  Vos charges totales de <strong>{formatCurrency(charges)}</strong> sont enregistrées globalement.
                  <br />Pour une déclaration précise, utilisez le bouton "Générer la déclaration 2044" pour obtenir le détail par bien.
                </p>
              </div>
            )}
            
            {fiscalData && fiscalData.optimisation.conseilsOptimisation.length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <h5 className="font-medium text-blue-900 mb-1">Recommandations personnalisées :</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  {fiscalData.optimisation.conseilsOptimisation.map((conseil, index) => (
                    <li key={index}>• {conseil}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button 
          variant="outline" 
          className="h-16 flex flex-col items-center justify-center"
          onClick={async () => {
            try {
              const blob = await fiscaliteService.exportFiscalDataExcel(selectedYear, selectedProprietaire || undefined);
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `donnees-fiscales-${selectedYear}.xlsx`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            } catch (error: any) {
              alert('Erreur lors de l\'export Excel: ' + (error.response?.data?.error || error.message));
            }
          }}
        >
          <FileText className="h-6 w-6 mb-1" />
          <span className="text-sm">Export Excel</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-16 flex flex-col items-center justify-center"
          onClick={() => setShowSimulateurModal(true)}
        >
          <Calculator className="h-6 w-6 mb-1" />
          <span className="text-sm">Simulateur d'impôt</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-16 flex flex-col items-center justify-center"
          onClick={() => {
            // TODO: Implémenter le guide fiscal
            alert('Guide fiscal - À implémenter');
          }}
        >
          <HelpCircle className="h-6 w-6 mb-1" />
          <span className="text-sm">Guide fiscal</span>
        </Button>
      </div>

      {/* Modals */}
      <Declaration2044Modal
        isOpen={showDeclarationModal}
        onClose={() => setShowDeclarationModal(false)}
        year={selectedYear}
        proprietaireId={selectedProprietaire || undefined}
      />

      <SimulateurImpotModal
        isOpen={showSimulateurModal}
        onClose={() => setShowSimulateurModal(false)}
        year={selectedYear}
        initialRevenus={revenus}
        initialCharges={charges}
      />

      <ChargesVentilationModal
        isOpen={showChargesVentilationModal}
        onClose={() => setShowChargesVentilationModal(false)}
        year={selectedYear}
        proprietaireId={selectedProprietaire || undefined}
        totalCharges={charges}
      />
    </div>
  );
};

export default FiscalitePage;