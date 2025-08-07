import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Filter, Download } from 'lucide-react';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { proprietairesService } from '@/services/proprietaires';
import { biensService } from '@/services/biens';
import { dashboardService } from '@/services/dashboard';

interface MonthlyData {
  bienId: string;
  adresse: string;
  mois: { [key: number]: { 
    loyer: number; 
    loyerDu: number; 
    charges: number; 
    net: number; 
    tauxPaiement: number;
    hasContract: boolean;
  } };
  total: number;
  difference: number;
}

interface FinancialTableProps {
  year?: number;
}

const FinancialTable: React.FC<FinancialTableProps> = ({ year = new Date().getFullYear() }) => {
  const [selectedProprietaire, setSelectedProprietaire] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Récupérer les données
  const { data: proprietaires } = useQuery('proprietaires', () =>
    proprietairesService.getAll({ page: 1, limit: 1000 })
  );

  const { data: biens } = useQuery(['biens', selectedProprietaire], () =>
    biensService.getAll({ 
      page: 1, 
      limit: 1000,
      ...(selectedProprietaire && { proprietaireId: selectedProprietaire })
    })
  );

  const { data: tableData, isLoading: tableLoading } = useQuery(
    ['financial-table', selectedProprietaire, year], 
    () => dashboardService.getFinancialTableData(year, selectedProprietaire),
    {
      staleTime: 60 * 1000, // Cache 1 minute
    }
  );

  // Utiliser les données du service dashboard
  const finalTableData = tableData || [];

  const getCellColor = (tauxPaiement: number, hasContract: boolean): string => {
    // Si le bien a un contrat mais 0€ de loyer payé, c'est un retard
    if (hasContract && tauxPaiement === 0) return 'bg-red-100 text-red-800';
    if (tauxPaiement <= 80) return 'bg-red-100 text-red-800';
    if (tauxPaiement > 80 && tauxPaiement < 100) return 'bg-orange-100 text-orange-800';
    if (tauxPaiement === 100) return 'bg-green-100 text-green-800';
    if (tauxPaiement > 100) return 'bg-green-200 text-green-900';
    return 'bg-gray-50 text-gray-600';
  };

  const getTotalCellColor = (value: number): string => {
    if (value > 0) return 'bg-green-100 text-green-800';
    if (value < 0) return 'bg-red-100 text-red-800';
    return 'bg-gray-50 text-gray-600';
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getMonthName = (month: number): string => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                   'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    return months[month - 1];
  };

  const proprietairesOptions = [
    { value: '', label: 'Tous les propriétaires' },
    ...(proprietaires?.data?.map(prop => ({
      value: prop.id,
      label: `${prop.prenom} ${prop.nom}`
    })) || [])
  ];

  const exportToCSV = () => {
    const headers = ['Adresse', ...Array.from({length: 12}, (_, i) => getMonthName(i + 1)), 'Total'];
    const csvContent = [
      headers.join(','),
      ...finalTableData.map(row => [
        `"${row.adresse}"`,
        ...Array.from({length: 12}, (_, i) => row.mois[i + 1]?.loyer || 0),
        row.total
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `synthese-financiere-${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Synthèse Financière par Bien - {year}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Revenus - Charges par mois et par bien
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Propriétaire"
                value={selectedProprietaire}
                onChange={(e) => setSelectedProprietaire(e.target.value)}
                options={proprietairesOptions}
              />
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        {tableLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Chargement des données...</span>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Adresse
                </th>
                {Array.from({length: 12}, (_, i) => (
                  <th key={i + 1} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                    {getMonthName(i + 1)}
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {finalTableData.map((row, index) => (
                <tr key={row.bienId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-inherit z-10 border-r border-gray-200">
                    <div className="max-w-xs truncate" title={row.adresse}>
                      {row.adresse}
                    </div>
                  </td>
                  {Array.from({length: 12}, (_, i) => {
                    const monthData = row.mois[i + 1];
                    const hasData = monthData && (monthData.loyer > 0 || monthData.charges > 0 || monthData.hasContract);
                    
                    return (
                      <td key={i + 1} className={`px-3 py-4 text-sm text-center font-medium ${hasData ? getCellColor(monthData.tauxPaiement, monthData.hasContract) : 'bg-gray-50 text-gray-600'}`}>
                        {hasData ? (
                          <div className="flex flex-col items-center">
                            <div className="font-semibold text-base leading-tight">
                              {formatCurrency(monthData.loyer)}
                            </div>
                            {monthData.charges > 0 && (
                              <div className="text-xs opacity-75 mt-1 leading-tight">
                                Charges: {formatCurrency(monthData.charges)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">0€</span>
                        )}
                      </td>
                    );
                  })}
                  {(() => {
                    const currentMonth = new Date().getMonth() + 1; // Mois en cours (1-12)
                    const currentYear = new Date().getFullYear();
                    
                    // Calculer seulement jusqu'au mois en cours si on est dans la même année
                    const maxMonth = currentYear === year ? currentMonth : 12;
                    
                    // Somme des revenus (paiements) jusqu'au mois en cours
                    const revenus = Object.entries(row.mois)
                      .filter(([month]) => parseInt(month) <= maxMonth)
                      .reduce((sum, [, monthData]) => sum + monthData.loyer, 0);
                    
                    // Somme des loyers dus jusqu'au mois en cours
                    const loyersDus = Object.entries(row.mois)
                      .filter(([month]) => parseInt(month) <= maxMonth)
                      .reduce((sum, [, monthData]) => sum + monthData.loyerDu, 0);
                    
                    // Somme des charges jusqu'au mois en cours  
                    const charges = Object.entries(row.mois)
                      .filter(([month]) => parseInt(month) <= maxMonth)
                      .reduce((sum, [, monthData]) => sum + monthData.charges, 0);
                    
                    // Calculer le taux de paiement
                    const tauxPaiement = loyersDus > 0 ? (revenus / loyersDus) * 100 : 0;
                    
                    // Déterminer la couleur de fond
                    let bgColor = 'bg-gray-50';
                    if (loyersDus > 0) { // Seulement si il y a des loyers dus
                      if (tauxPaiement >= 100) {
                        bgColor = 'bg-green-100';
                      } else if (tauxPaiement >= 80) {
                        bgColor = 'bg-orange-100';
                      } else {
                        bgColor = 'bg-red-100';
                      }
                    }
                    
                    return (
                      <td className={`px-3 py-4 text-sm text-center font-bold ${bgColor}`}>
                        <div className="flex flex-col items-center">
                          <div className="font-semibold text-base leading-tight text-green-600">
                            {formatCurrency(revenus)}
                          </div>
                          {charges > 0 && (
                            <div className="text-xs opacity-75 mt-1 leading-tight text-red-600">
                              Charges: {formatCurrency(charges)}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })()}
                </tr>
              ))}
              
              {/* Ligne totaux loyers */}
              <tr className="bg-blue-50 border-t-2 border-blue-200 font-semibold">
                <td className="px-6 py-3 text-sm font-bold text-blue-900 sticky left-0 bg-blue-50 z-10 border-r border-gray-200">
                  Total Loyers
                </td>
                {Array.from({length: 12}, (_, i) => {
                  const currentMonth = new Date().getMonth() + 1;
                  const currentYear = new Date().getFullYear();
                  const monthNumber = i + 1;
                  
                  // Si on est dans l'année en cours et que le mois n'est pas encore passé, afficher 0
                  const shouldShowZero = currentYear === year && monthNumber > currentMonth;
                  
                  const monthTotal = shouldShowZero ? 0 : finalTableData.reduce((sum, row) => {
                    const monthData = row.mois[monthNumber];
                    return sum + (monthData ? monthData.loyer : 0);
                  }, 0);
                  
                  return (
                    <td key={i + 1} className="px-3 py-3 text-sm text-center font-bold text-blue-900 bg-blue-50">
                      {formatCurrency(monthTotal)}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-sm text-center font-bold text-blue-900 bg-blue-50">
                  {(() => {
                    const currentMonth = new Date().getMonth() + 1;
                    const currentYear = new Date().getFullYear();
                    const maxMonth = currentYear === year ? currentMonth : 12;
                    
                    return formatCurrency(finalTableData.reduce((sum, row) => {
                      return sum + Object.entries(row.mois)
                        .filter(([month]) => parseInt(month) <= maxMonth)
                        .reduce((monthSum, [, monthData]) => monthSum + monthData.loyer, 0);
                    }, 0));
                  })()}
                </td>
              </tr>
              
              {/* Ligne totaux charges */}
              <tr className="bg-red-50 border-t border-red-200 font-semibold">
                <td className="px-6 py-3 text-sm font-bold text-red-900 sticky left-0 bg-red-50 z-10 border-r border-gray-200">
                  Total Charges
                </td>
                {Array.from({length: 12}, (_, i) => {
                  const currentMonth = new Date().getMonth() + 1;
                  const currentYear = new Date().getFullYear();
                  const monthNumber = i + 1;
                  
                  // Si on est dans l'année en cours et que le mois n'est pas encore passé, afficher 0
                  const shouldShowZero = currentYear === year && monthNumber > currentMonth;
                  
                  const monthTotal = shouldShowZero ? 0 : finalTableData.reduce((sum, row) => {
                    const monthData = row.mois[monthNumber];
                    return sum + (monthData ? monthData.charges : 0);
                  }, 0);
                  
                  return (
                    <td key={i + 1} className="px-3 py-3 text-sm text-center font-bold text-red-900 bg-red-50">
                      {formatCurrency(monthTotal)}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-sm text-center font-bold text-red-900 bg-red-50">
                  {(() => {
                    const currentMonth = new Date().getMonth() + 1;
                    const currentYear = new Date().getFullYear();
                    const maxMonth = currentYear === year ? currentMonth : 12;
                    
                    return formatCurrency(finalTableData.reduce((sum, row) => {
                      return sum + Object.entries(row.mois)
                        .filter(([month]) => parseInt(month) <= maxMonth)
                        .reduce((monthSum, [, monthData]) => monthSum + monthData.charges, 0);
                    }, 0));
                  })()}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {!tableLoading && finalTableData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucune donnée disponible pour les critères sélectionnés</p>
          </div>
        )}
      </div>

      {/* Totaux */}
      {finalTableData.length > 0 && (
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Revenus: </span>
              <span className="font-semibold text-green-600">
                {formatCurrency(finalTableData.reduce((sum, row) => sum + Math.max(0, row.total), 0))}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Total Charges: </span>
              <span className="font-semibold text-red-600">
                {formatCurrency(Math.abs(finalTableData.reduce((sum, row) => sum + Math.min(0, row.total), 0)))}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Bénéfice Net: </span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(finalTableData.reduce((sum, row) => sum + row.total, 0))}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Nombre de biens: </span>
              <span className="font-semibold">{finalTableData.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialTable;