import React, { useState } from 'react';
import { useMutation } from 'react-query';
import { Calculator, X, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { fiscaliteService } from '@/services/fiscalite';

interface SimulateurImpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  initialRevenus?: number;
  initialCharges?: number;
}

const SimulateurImpotModal: React.FC<SimulateurImpotModalProps> = ({
  isOpen,
  onClose,
  year,
  initialRevenus = 0,
  initialCharges = 0
}) => {
  const [revenus, setRevenus] = useState(initialRevenus);
  const [charges, setCharges] = useState(initialCharges);
  const [autresRevenus, setAutresRevenus] = useState(50000); // Revenus fictifs pour simulation
  const [quotientFamilial, setQuotientFamilial] = useState(1);
  const [simulation, setSimulation] = useState<any>(null);

  // Mutation pour la comparaison des régimes
  const comparaisonMutation = useMutation(
    () => fiscaliteService.comparerRegimes(year, revenus, charges),
    {
      onSuccess: (data) => {
        setSimulation({ ...data.data, autresRevenus, quotientFamilial });
      },
      onError: (error: any) => {
        alert('Erreur lors de la simulation: ' + (error.response?.data?.error || error.message));
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

  const calculateImpot = (revenuImposable: number, quotient: number): number => {
    // Barème 2024 simplifié (à adapter selon l'année)
    const tranches = [
      { min: 0, max: 10777, taux: 0 },
      { min: 10778, max: 27478, taux: 0.11 },
      { min: 27479, max: 78570, taux: 0.30 },
      { min: 78571, max: 168994, taux: 0.41 },
      { min: 168995, max: Infinity, taux: 0.45 }
    ];

    const revenuParPart = revenuImposable / quotient;
    let impotParPart = 0;

    for (const tranche of tranches) {
      if (revenuParPart > tranche.min) {
        const base = Math.min(revenuParPart, tranche.max) - tranche.min;
        impotParPart += base * tranche.taux;
      }
    }

    return Math.max(0, impotParPart * quotient);
  };

  const handleSimulation = () => {
    comparaisonMutation.mutate();
  };

  const calculateCompletSimulation = () => {
    if (!simulation) return null;

    const revenuTotalReel = autresRevenus + Math.max(0, simulation.reel.imposable);
    const revenuTotalMicro = autresRevenus + Math.max(0, simulation.microFoncier.imposable);

    const impotReel = calculateImpot(revenuTotalReel, quotientFamilial);
    const impotMicro = simulation.microFoncier.eligible ? calculateImpot(revenuTotalMicro, quotientFamilial) : 0;

    // Prélèvements sociaux (17.2%)
    const prelevementsSociauxReel = simulation.reel.imposable * 0.172;
    const prelevementsSociauxMicro = simulation.microFoncier.eligible ? simulation.microFoncier.imposable * 0.172 : 0;

    return {
      impotReel: impotReel + prelevementsSociauxReel,
      impotMicro: impotMicro + prelevementsSociauxMicro,
      revenuTotalReel,
      revenuTotalMicro,
      prelevementsSociauxReel,
      prelevementsSociauxMicro
    };
  };

  const simulationComplete = calculateCompletSimulation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title={`Simulateur d'Impôt - ${year}`}>
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Calculator className="h-6 w-6 text-blue-500 mr-2" />
          Simulateur d'Impôt - {year}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Paramètres de simulation */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-4">Paramètres de simulation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Revenus fonciers annuels (€)"
              type="number"
              value={revenus}
              onChange={(e) => setRevenus(parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Charges déductibles annuelles (€)"
              type="number"
              value={charges}
              onChange={(e) => setCharges(parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Autres revenus (salaires, etc.) (€)"
              type="number"
              value={autresRevenus}
              onChange={(e) => setAutresRevenus(parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Nombre de parts fiscales"
              type="number"
              step="0.5"
              min="1"
              value={quotientFamilial}
              onChange={(e) => setQuotientFamilial(parseFloat(e.target.value) || 1)}
            />
          </div>
          <div className="mt-4">
            <Button 
              onClick={handleSimulation}
              loading={comparaisonMutation.isLoading}
            >
              Lancer la simulation
            </Button>
          </div>
        </div>

        {/* Résultats de simulation */}
        {simulation && simulationComplete && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Résultats de la simulation</h3>
            
            {/* Comparaison des régimes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Régime réel */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <TrendingDown className="h-4 w-4 mr-2 text-blue-500" />
                  Régime réel
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Revenus fonciers:</span>
                    <span className="font-medium">{formatCurrency(simulation.reel.revenus)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Charges déductibles:</span>
                    <span className="font-medium text-red-600">-{formatCurrency(simulation.reel.charges)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Résultat foncier:</span>
                    <span className={`font-semibold ${simulation.reel.resultat >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(simulation.reel.resultat)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Revenu imposable:</span>
                    <span className="font-medium">{formatCurrency(simulation.reel.imposable)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Prélèvements sociaux (17.2%):</span>
                    <span>{formatCurrency(simulationComplete.prelevementsSociauxReel)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Total impôt + prélèvements:</span>
                    <span className="text-red-600">{formatCurrency(simulationComplete.impotReel)}</span>
                  </div>
                </div>
              </div>

              {/* Régime micro-foncier */}
              <div className={`border rounded-lg p-4 ${simulation.microFoncier.eligible ? 'border-gray-200' : 'border-gray-300 bg-gray-50'}`}>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                  Régime micro-foncier
                  {!simulation.microFoncier.eligible && (
                    <AlertCircle className="h-4 w-4 ml-2 text-orange-500" />
                  )}
                </h4>
                {simulation.microFoncier.eligible ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Revenus fonciers:</span>
                      <span className="font-medium">{formatCurrency(simulation.microFoncier.revenus)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Abattement forfaitaire (30%):</span>
                      <span className="font-medium text-blue-600">-{formatCurrency(simulation.microFoncier.abattement)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span>Revenu imposable:</span>
                      <span className="font-medium">{formatCurrency(simulation.microFoncier.imposable)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Prélèvements sociaux (17.2%):</span>
                      <span>{formatCurrency(simulationComplete.prelevementsSociauxMicro)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Total impôt + prélèvements:</span>
                      <span className="text-red-600">{formatCurrency(simulationComplete.impotMicro)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    <p>Régime non applicable</p>
                    <p className="text-xs mt-1">Revenus &gt; 15 000€</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recommandation */}
            <div className={`p-4 rounded-lg ${
              simulation.recommandation.regime === 'micro-foncier' 
                ? 'bg-green-50 border border-green-200' 
                : simulation.recommandation.regime === 'reel'
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-gray-50 border border-gray-200'
            }`}>
              <h4 className="font-semibold mb-2">
                {simulation.recommandation.regime === 'micro-foncier' && '✅ Recommandation: Régime micro-foncier'}
                {simulation.recommandation.regime === 'reel' && '✅ Recommandation: Régime réel'}
                {simulation.recommandation.regime === 'reel-obligatoire' && '⚠️ Régime réel obligatoire'}
              </h4>
              <p className="text-sm">{simulation.recommandation.explication}</p>
              {simulation.recommandation.economie > 0 && (
                <p className="text-sm font-medium mt-2">
                  Économie estimée: {formatCurrency(simulation.recommandation.economie)}
                </p>
              )}
            </div>

            {/* Conseils */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Conseils d'optimisation</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Conservez tous vos justificatifs de charges déductibles</li>
                <li>• Planifiez vos travaux pour optimiser la déduction</li>
                <li>• Considérez l'impact sur vos autres revenus en cas de déficit</li>
                {simulation.reel.resultat < 0 && (
                  <li>• Votre déficit peut être reporté sur 10 ans maximum</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SimulateurImpotModal;