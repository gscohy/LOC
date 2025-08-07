import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { Settings, X, Euro, Save, RotateCcw } from 'lucide-react';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { fiscaliteService } from '@/services/fiscalite';

interface ChargesVentilationModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  proprietaireId?: string;
  totalCharges: number;
}

interface ChargesVentilation {
  assurances: number;
  taxesFoncieres: number;
  interetsEmprunt: number;
  reparationsEntretien: number;
  ameliorations: number;
  fraisGestion: number;
  autresCharges: number;
}

const ChargesVentilationModal: React.FC<ChargesVentilationModalProps> = ({
  isOpen,
  onClose,
  year,
  proprietaireId,
  totalCharges
}) => {
  const queryClient = useQueryClient();
  
  const [ventilation, setVentilation] = useState<ChargesVentilation>({
    assurances: 0,
    taxesFoncieres: 0,
    interetsEmprunt: 0,
    reparationsEntretien: 0,
    ameliorations: 0,
    fraisGestion: 0,
    autresCharges: 0,
  });

  // Récupérer la ventilation existante
  const { data: existingVentilation, isLoading } = useQuery(
    ['charges-ventilation', year, proprietaireId],
    () => fiscaliteService.getChargesVentilation(year, proprietaireId),
    {
      enabled: isOpen,
      onSuccess: (data) => {
        if (data.data) {
          setVentilation(data.data);
        }
      }
    }
  );

  // Mutation pour sauvegarder la ventilation
  const saveVentilationMutation = useMutation(
    (data: ChargesVentilation) => 
      fiscaliteService.saveChargesVentilation(year, proprietaireId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['charges-ventilation']);
        queryClient.invalidateQueries(['fiscal-detailed-data']);
        queryClient.invalidateQueries(['declaration-2044']);
        onClose();
      },
      onError: (error: any) => {
        alert('Erreur lors de la sauvegarde: ' + (error.response?.data?.error || error.message));
      }
    }
  );

  const handleChange = (field: keyof ChargesVentilation, value: string) => {
    const numValue = parseFloat(value) || 0;
    setVentilation(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const getTotalVentile = () => {
    return Object.values(ventilation).reduce((sum, value) => sum + value, 0);
  };

  const getDifference = () => {
    return totalCharges - getTotalVentile();
  };

  const handleAutoVentilation = () => {
    // Ventilation automatique selon des pourcentages standards
    const pourcentages = {
      assurances: 0.15,        // 15%
      taxesFoncieres: 0.25,    // 25%
      interetsEmprunt: 0.30,   // 30%
      reparationsEntretien: 0.20, // 20%
      ameliorations: 0.05,     // 5%
      fraisGestion: 0.05,      // 5%
      autresCharges: 0.00      // 0%
    };

    const newVentilation: ChargesVentilation = {
      assurances: Math.round(totalCharges * pourcentages.assurances * 100) / 100,
      taxesFoncieres: Math.round(totalCharges * pourcentages.taxesFoncieres * 100) / 100,
      interetsEmprunt: Math.round(totalCharges * pourcentages.interetsEmprunt * 100) / 100,
      reparationsEntretien: Math.round(totalCharges * pourcentages.reparationsEntretien * 100) / 100,
      ameliorations: Math.round(totalCharges * pourcentages.ameliorations * 100) / 100,
      fraisGestion: Math.round(totalCharges * pourcentages.fraisGestion * 100) / 100,
      autresCharges: 0
    };

    // Ajuster pour avoir le total exact
    const totalVentile = Object.values(newVentilation).reduce((sum, value) => sum + value, 0);
    const diff = totalCharges - totalVentile;
    if (diff !== 0) {
      newVentilation.autresCharges = Math.round(diff * 100) / 100;
    }

    setVentilation(newVentilation);
  };

  const handleReset = () => {
    setVentilation({
      assurances: 0,
      taxesFoncieres: 0,
      interetsEmprunt: 0,
      reparationsEntretien: 0,
      ameliorations: 0,
      fraisGestion: 0,
      autresCharges: 0,
    });
  };

  const handleSubmit = () => {
    saveVentilationMutation.mutate(ventilation);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const difference = getDifference();
  const isBalanced = Math.abs(difference) < 0.01;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title={`Ventilation des charges déductibles - ${year}`}>
      <div className="flex items-center justify-center mb-4">
        <Settings className="h-6 w-6 text-blue-500 mr-2" />
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Résumé */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-blue-900">Total des charges à ventiler:</span>
            <span className="text-xl font-bold text-blue-700">{formatCurrency(totalCharges)}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-blue-900">Total ventilé:</span>
            <span className="text-lg font-semibold text-blue-700">{formatCurrency(getTotalVentile())}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium text-blue-900">Différence:</span>
            <span className={`text-lg font-semibold ${
              isBalanced ? 'text-green-600' : Math.abs(difference) > 0.01 ? 'text-red-600' : 'text-blue-700'
            }`}>
              {formatCurrency(difference)}
              {isBalanced && ' ✓'}
            </span>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleAutoVentilation}
            className="flex items-center"
          >
            <Euro className="h-4 w-4 mr-2" />
            Ventilation automatique
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center text-gray-600"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Remettre à zéro
          </Button>
        </div>

        {/* Formulaire de ventilation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Primes d'assurance (€)"
            type="number"
            step="0.01"
            min="0"
            value={ventilation.assurances}
            onChange={(e) => handleChange('assurances', e.target.value)}
          />
          
          <Input
            label="Taxes foncières et taxes annexes (€)"
            type="number"
            step="0.01"
            min="0"
            value={ventilation.taxesFoncieres}
            onChange={(e) => handleChange('taxesFoncieres', e.target.value)}
          />
          
          <Input
            label="Intérêts d'emprunt (ou prêt) (€)"
            type="number"
            step="0.01"
            min="0"
            value={ventilation.interetsEmprunt}
            onChange={(e) => handleChange('interetsEmprunt', e.target.value)}
          />
          
          <Input
            label="Dépenses de réparation et d'entretien (€)"
            type="number"
            step="0.01"
            min="0"
            value={ventilation.reparationsEntretien}
            onChange={(e) => handleChange('reparationsEntretien', e.target.value)}
          />
          
          <Input
            label="Dépenses d'amélioration (€)"
            type="number"
            step="0.01"
            min="0"
            value={ventilation.ameliorations}
            onChange={(e) => handleChange('ameliorations', e.target.value)}
          />
          
          <Input
            label="Frais de gestion et d'administration (€)"
            type="number"
            step="0.01"
            min="0"
            value={ventilation.fraisGestion}
            onChange={(e) => handleChange('fraisGestion', e.target.value)}
          />
          
          <div className="md:col-span-2">
            <Input
              label="Autres charges déductibles (€)"
              type="number"
              step="0.01"
              min="0"
              value={ventilation.autresCharges}
              onChange={(e) => handleChange('autresCharges', e.target.value)}
            />
          </div>
        </div>

        {/* Aide */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">💡 Aide à la ventilation</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Assurances:</strong> PNO, GLI, protection juridique</p>
            <p>• <strong>Taxes foncières:</strong> Taxe foncière, taxe d'enlèvement des ordures ménagères</p>
            <p>• <strong>Intérêts d'emprunt:</strong> Déductibles sans limitation de montant</p>
            <p>• <strong>Réparations/Entretien:</strong> Travaux qui maintiennent l'état (peinture, plomberie)</p>
            <p>• <strong>Améliorations:</strong> Travaux qui ajoutent de la valeur ou du confort</p>
            <p>• <strong>Frais de gestion:</strong> Honoraires d'agence, syndic, comptable</p>
          </div>
        </div>

        {!isBalanced && (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
            <p className="text-sm text-orange-800">
              <strong>Attention:</strong> La ventilation n'est pas équilibrée. 
              {difference > 0.01 && ` Il reste ${formatCurrency(difference)} à ventiler.`}
              {difference < -0.01 && ` Vous avez ventilé ${formatCurrency(Math.abs(difference))} de trop.`}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={saveVentilationMutation.isLoading}
        >
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          loading={saveVentilationMutation.isLoading}
          disabled={!isBalanced}
          className="flex items-center"
        >
          <Save className="h-4 w-4 mr-2" />
          Sauvegarder la ventilation
        </Button>
      </div>
    </Modal>
  );
};

export default ChargesVentilationModal;