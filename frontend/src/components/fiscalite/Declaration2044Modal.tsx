import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import { Download, FileText, X, Building2, Calculator, Euro, TrendingDown } from 'lucide-react';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { fiscaliteService } from '@/services/fiscalite';

interface Declaration2044ModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  proprietaireId?: string;
}

const Declaration2044Modal: React.FC<Declaration2044ModalProps> = ({
  isOpen,
  onClose,
  year,
  proprietaireId
}) => {
  const [activeTab, setActiveTab] = useState<'declaration' | 'detail'>('declaration');

  // Récupérer la déclaration 2044
  const { data: declaration, isLoading, error } = useQuery(
    ['declaration-2044', year, proprietaireId],
    () => fiscaliteService.generateDeclaration2044(year, proprietaireId),
    {
      enabled: isOpen,
      select: (data) => data.data
    }
  );

  // Récupérer la ventilation des charges
  const { data: chargesVentilation } = useQuery(
    ['charges-ventilation', year, proprietaireId],
    () => fiscaliteService.getChargesVentilation(year, proprietaireId),
    {
      enabled: isOpen,
      select: (data) => data.data
    }
  );

  // Mutation pour l'export PDF
  const exportPDFMutation = useMutation(
    () => fiscaliteService.exportDeclaration2044PDF(year, proprietaireId),
    {
      onSuccess: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `declaration-2044-${year}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      onError: (error: any) => {
        alert('Erreur lors de l\'export PDF: ' + (error.response?.data?.error || error.message));
      }
    }
  );

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatMontantDeclaration = (amount: number): string => {
    return Math.round(Math.max(0, amount)).toString();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title={`Déclaration 2044 - ${year}`}>
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <FileText className="h-6 w-6 text-blue-500 mr-2" />
          Déclaration 2044 - {year}
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportPDFMutation.mutate()}
            loading={exportPDFMutation.isLoading}
          >
            <Download className="h-4 w-4 mr-1" />
            Export PDF
          </Button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="p-6 text-center">
          <p className="text-red-600">Erreur lors de la génération de la déclaration</p>
        </div>
      ) : declaration ? (
        <div className="flex flex-col max-h-[80vh]">
          {/* Onglets de navigation */}
          <div className="border-b border-gray-200 px-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'declaration', label: 'Cases 2044', icon: Calculator },
                { key: 'detail', label: 'Détail par bien', icon: Building2 },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center py-3 px-1 border-b-2 font-medium text-sm ${
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

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'declaration' && (
              <div className="p-6 space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-3">
                    Cases principales de la déclaration 2044
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="font-medium">Case 211 - Revenus bruts :</span>
                        <span className="font-bold text-blue-600">
                          {formatMontantDeclaration(declaration.cases.case211)}€
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="font-medium">Case 212 - Revenus exceptionnels :</span>
                        <span className="font-bold">
                          {formatMontantDeclaration(declaration.cases.case212)}€
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="font-medium">Case 221 - Frais et charges :</span>
                        <span className="font-bold text-red-600">
                          {formatMontantDeclaration(declaration.cases.case221)}€
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="font-medium">Case 222 - Intérêts d'emprunt :</span>
                        <span className="font-bold">
                          {formatMontantDeclaration(declaration.cases.case222)}€
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="font-medium">Case 230 - Déficit imputable :</span>
                        <span className="font-bold text-orange-600">
                          {formatMontantDeclaration(declaration.cases.case230)}€
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="font-medium">Case 231 - Déficit reportable :</span>
                        <span className="font-bold">
                          {formatMontantDeclaration(declaration.cases.case231)}€
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">
                    Résultat foncier {year}
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className="text-lg">Total revenus - Total charges :</span>
                    <span className={`text-xl font-bold ${
                      (declaration.cases.case211 - declaration.cases.case221) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(declaration.cases.case211 - declaration.cases.case221)}
                    </span>
                  </div>
                </div>

                {declaration.cases.case230 > 0 && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-orange-900 mb-2">
                      Information sur le déficit foncier
                    </h3>
                    <ul className="text-sm text-orange-800 space-y-1">
                      <li>• Le déficit imputable ({formatCurrency(declaration.cases.case230)}) peut être déduit de vos autres revenus</li>
                      <li>• Limite annuelle d'imputation : 10 700€</li>
                      {declaration.cases.case231 > 0 && (
                        <li>• Le déficit excédentaire ({formatCurrency(declaration.cases.case231)}) est reportable sur 10 ans</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'detail' && (
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Détail par bien immobilier - Ventilation complète
                </h3>
                
                {declaration.biens.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucun bien avec des revenus fonciers trouvé pour {year}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {declaration.biens.map((bien, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b">
                          <h4 className="font-medium text-gray-900 text-lg">{bien.adresse}</h4>
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-sm text-gray-600">
                              Total Revenus: {formatCurrency(bien.revenus)} | Total Charges: {formatCurrency(bien.charges)}
                            </div>
                            <div className={`text-lg font-semibold px-3 py-1 rounded ${
                              bien.resultat >= 0 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              Résultat: {formatCurrency(bien.resultat)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Colonne Revenus */}
                            <div>
                              <h5 className="font-semibold text-green-700 mb-3 flex items-center">
                                <Euro className="h-4 w-4 mr-1" />
                                Revenus détaillés
                              </h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between py-1 border-b border-gray-100">
                                  <span className="text-gray-600">Loyers (ou fermages) bruts encaissés</span>
                                  <span className="font-medium text-green-600">{formatCurrency(bien.detailRevenus?.loyersBruts || bien.revenus)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-100">
                                  <span className="text-gray-600">Autres revenus locatifs</span>
                                  <span className="font-medium text-green-600">{formatCurrency(bien.detailRevenus?.autresRevenus || 0)}</span>
                                </div>
                                <div className="flex justify-between py-2 bg-green-50 px-2 rounded font-semibold">
                                  <span>Total Revenus</span>
                                  <span className="text-green-700">{formatCurrency(bien.revenus)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Colonne Charges */}
                            <div>
                              <h5 className="font-semibold text-red-700 mb-3 flex items-center">
                                <TrendingDown className="h-4 w-4 mr-1" />
                                Charges déductibles détaillées par catégorie
                              </h5>
                              <div className="space-y-2 text-sm">
                                {(bien.detailCharges || chargesVentilation) ? (
                                  // Si les détails ou la ventilation sont disponibles, les afficher
                                  <>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                      <span className="text-gray-600">Primes d'assurance</span>
                                      <span className="font-medium text-red-600">{formatCurrency(bien.detailCharges?.assurances || chargesVentilation?.assurances || 0)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                      <span className="text-gray-600">Taxes foncières et taxes annexes {year}</span>
                                      <span className="font-medium text-red-600">{formatCurrency(bien.detailCharges?.taxesFoncieres || chargesVentilation?.taxesFoncieres || 0)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                      <span className="text-gray-600">Intérêts d'emprunt (ou prêt)</span>
                                      <span className="font-medium text-red-600">{formatCurrency(bien.detailCharges?.interetsEmprunt || chargesVentilation?.interetsEmprunt || 0)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                      <span className="text-gray-600">Dépenses de réparation et d'entretien</span>
                                      <span className="font-medium text-red-600">{formatCurrency(bien.detailCharges?.reparationsEntretien || chargesVentilation?.reparationsEntretien || 0)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                      <span className="text-gray-600">Dépenses d'amélioration</span>
                                      <span className="font-medium text-red-600">{formatCurrency(bien.detailCharges?.ameliorations || chargesVentilation?.ameliorations || 0)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                      <span className="text-gray-600">Frais de gestion et d'administration</span>
                                      <span className="font-medium text-red-600">{formatCurrency(bien.detailCharges?.fraisGestion || chargesVentilation?.fraisGestion || 0)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                      <span className="text-gray-600">Autres charges déductibles</span>
                                      <span className="font-medium text-red-600">{formatCurrency(bien.detailCharges?.autresCharges || chargesVentilation?.autresCharges || 0)}</span>
                                    </div>
                                    {chargesVentilation && (
                                      <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
                                        ✓ Ventilation paramétrée appliquée
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  // Si aucun détail n'est disponible
                                  <>
                                    <div className="bg-orange-50 p-3 rounded-lg mb-3">
                                      <p className="text-sm text-orange-800">
                                        <strong>Détail non disponible</strong> - Les charges sont enregistrées globalement.
                                        Utilisez le bouton "Paramétrer la ventilation" pour détailler les montants.
                                      </p>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-gray-100">
                                      <span className="text-gray-600">Charges totales à ventiler</span>
                                      <span className="font-medium text-red-600">{formatCurrency(bien.charges)}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                                      <strong>Aide :</strong> Répartissez ce montant dans les catégories appropriées :
                                      <br />• Case 221 : Frais et charges courantes
                                      <br />• Case 222 : Intérêts d'emprunt
                                      <br />• Travaux déductibles selon leur nature
                                    </div>
                                  </>
                                )}
                                <div className="flex justify-between py-2 bg-red-50 px-2 rounded font-semibold mt-3">
                                  <span>Total Charges</span>
                                  <span className="text-red-700">{formatCurrency(bien.charges)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Résumé du bien */}
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-blue-900">Résultat foncier pour ce bien:</span>
                              <div className="text-right">
                                <div className="text-sm text-blue-700">
                                  {formatCurrency(bien.revenus)} - {formatCurrency(bien.charges)}
                                </div>
                                <div className={`text-xl font-bold ${
                                  bien.resultat >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  = {formatCurrency(bien.resultat)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Total général */}
                    <div className="bg-blue-100 border border-blue-200 rounded-lg p-6">
                      <h4 className="font-bold text-blue-900 text-lg mb-4">Récapitulatif général {year}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded">
                          <div className="text-sm text-gray-600 mb-1">Total Revenus</div>
                          <div className="text-xl font-bold text-green-600">
                            {formatCurrency(declaration.biens.reduce((sum, b) => sum + b.revenus, 0))}
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded">
                          <div className="text-sm text-gray-600 mb-1">Total Charges</div>
                          <div className="text-xl font-bold text-red-600">
                            {formatCurrency(declaration.biens.reduce((sum, b) => sum + b.charges, 0))}
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded">
                          <div className="text-sm text-gray-600 mb-1">Résultat Final</div>
                          <div className={`text-xl font-bold ${
                            declaration.biens.reduce((sum, b) => sum + b.resultat, 0) >= 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {formatCurrency(declaration.biens.reduce((sum, b) => sum + b.resultat, 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default Declaration2044Modal;