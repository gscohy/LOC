import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { X, FileText, Euro, Download, Calendar, Building2, TrendingUp, Info } from 'lucide-react';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { pretsService, StatistiquesAnnuelles } from '@/services/prets';

interface FiscalitePretsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FiscalitePretsModal: React.FC<FiscalitePretsModalProps> = ({ isOpen, onClose }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Récupérer les statistiques annuelles
  const { data: statsData, isLoading } = useQuery(
    ['prets-stats-annuelles', selectedYear],
    () => pretsService.getStatistiquesAnnuelles(selectedYear),
    {
      enabled: isOpen,
    }
  );

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleExportCSV = () => {
    if (!statsData?.data) return;

    const stats = statsData.data;
    const headers = [
      'Prêt',
      'Banque',
      'Bien',
      'Intérêts',
      'Assurance',
      'Capital Amorti',
      'Total Mensualités',
      'Nombre Échéances'
    ];

    const csvContent = [
      headers.join(','),
      ...stats.statsParPret.map(stat => [
        `"${stat.pret.nom}"`,
        `"${stat.pret.banque}"`,
        `"${stat.pret.bien?.adresse || ''}, ${stat.pret.bien?.ville || ''}"`,
        stat.totaux.interets.toFixed(2),
        stat.totaux.assurance.toFixed(2),
        stat.totaux.capital.toFixed(2),
        stat.totaux.mensualites.toFixed(2),
        stat.nombreEcheances
      ].join(',')),
      // Ligne de total
      '',
      'TOTAUX,,,' + 
      stats.totauxGlobaux.interets.toFixed(2) + ',' +
      stats.totauxGlobaux.assurance.toFixed(2) + ',' +
      stats.totauxGlobaux.capital.toFixed(2) + ',' +
      stats.totauxGlobaux.mensualites.toFixed(2) + ','
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fiscalite-prets-${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const yearOptions = Array.from({length: 10}, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });

  const stats = statsData?.data;
  const totauxDeductibles = stats ? stats.totauxGlobaux.interets + stats.totauxGlobaux.assurance : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center">
          <FileText className="h-6 w-6 text-green-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">
            Vue Fiscalité - Prêts Immobiliers
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Sélection de l'année */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="text-lg font-medium text-gray-900">Année fiscale :</span>
            <Select
              value={selectedYear.toString()}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              options={yearOptions}
              className="w-32"
            />
          </div>
          
          {stats && stats.nombrePrets > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Chargement...</span>
          </div>
        ) : stats && stats.nombrePrets > 0 ? (
          <>
            {/* Résumé fiscal */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="card p-6 bg-red-50 border-red-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-lg bg-red-500">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-red-700">Intérêts d'emprunt</p>
                    <p className="text-2xl font-semibold text-red-900">
                      {formatCurrency(stats.totauxGlobaux.interets)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-6 bg-orange-50 border-orange-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-lg bg-orange-500">
                    <Euro className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-orange-700">Assurance emprunteur</p>
                    <p className="text-2xl font-semibold text-orange-900">
                      {formatCurrency(stats.totauxGlobaux.assurance)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-6 bg-green-50 border-green-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-lg bg-green-500">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-700">Total déductible</p>
                    <p className="text-2xl font-semibold text-green-900">
                      {formatCurrency(totauxDeductibles)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-6 bg-blue-50 border-blue-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 rounded-lg bg-blue-500">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-700">Nombre de prêts</p>
                    <p className="text-2xl font-semibold text-blue-900">
                      {stats.nombrePrets}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Information fiscale */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-blue-900 mb-2">
                    Déduction fiscale {selectedYear}
                  </h3>
                  <p className="text-sm text-blue-800 mb-3">
                    Les intérêts d'emprunt et les primes d'assurance sont entièrement déductibles 
                    de vos revenus fonciers sans limitation de montant.
                  </p>
                  <div className="bg-white border border-blue-200 rounded p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Intérêts d'emprunt :</span>
                        <span className="ml-2 font-bold text-red-600">
                          {formatCurrency(stats.totauxGlobaux.interets)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Assurance emprunteur :</span>
                        <span className="ml-2 font-bold text-orange-600">
                          {formatCurrency(stats.totauxGlobaux.assurance)}
                        </span>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-blue-200">
                        <span className="font-medium text-gray-700">Total à déclarer en charges déductibles :</span>
                        <span className="ml-2 font-bold text-green-600 text-lg">
                          {formatCurrency(totauxDeductibles)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Détail par prêt */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Détail par Prêt - {selectedYear}
              </h3>
              
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Prêt & Bien
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Intérêts
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Assurance
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Total déductible
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Capital amorti
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Échéances
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.statsParPret.map((stat, index) => {
                      const deductibleTotal = stat.totaux.interets + stat.totaux.assurance;
                      return (
                        <tr key={stat.pret.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {stat.pret.nom}
                              </div>
                              <div className="text-sm text-gray-500">
                                {stat.pret.banque}
                              </div>
                              <div className="text-xs text-gray-400 flex items-center mt-1">
                                <Building2 className="h-3 w-3 mr-1" />
                                {stat.pret.bien?.adresse}, {stat.pret.bien?.ville}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right text-sm font-medium text-red-600">
                            {formatCurrency(stat.totaux.interets)}
                          </td>
                          <td className="px-4 py-4 text-right text-sm font-medium text-orange-600">
                            {formatCurrency(stat.totaux.assurance)}
                          </td>
                          <td className="px-4 py-4 text-right text-sm font-bold text-green-600">
                            {formatCurrency(deductibleTotal)}
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-blue-600">
                            {formatCurrency(stat.totaux.capital)}
                          </td>
                          <td className="px-4 py-4 text-center text-sm text-gray-600">
                            {stat.nombreEcheances}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                    <tr>
                      <td className="px-4 py-4 text-sm font-bold text-gray-900">
                        TOTAUX
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-red-600">
                        {formatCurrency(stats.totauxGlobaux.interets)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-orange-600">
                        {formatCurrency(stats.totauxGlobaux.assurance)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-green-600 text-lg">
                        {formatCurrency(totauxDeductibles)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-blue-600">
                        {formatCurrency(stats.totauxGlobaux.capital)}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-gray-600">
                        {stats.statsParPret.reduce((sum, stat) => sum + stat.nombreEcheances, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Aucun prêt avec tableau d'amortissement
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Ajoutez des prêts et importez leurs tableaux d'amortissement pour voir les données fiscales de l'année {selectedYear}.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 p-6 border-t">
        <Button
          variant="outline"
          onClick={onClose}
        >
          Fermer
        </Button>
      </div>
    </Modal>
  );
};

export default FiscalitePretsModal;