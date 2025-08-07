import React, { useMemo } from 'react';
import { Building, Calendar } from 'lucide-react';
import Select from '@/components/ui/Select';
import { Charge } from '@/services/charges';

interface ChargesSynthesisTableProps {
  charges: Charge[];
  selectedYear: number;
  onYearChange: (year: number) => void;
}

interface SynthesisData {
  [bienId: string]: {
    bien: {
      adresse: string;
      ville: string;
    };
    months: {
      [month: number]: number; // montant total du mois
    };
    total: number;
  };
}

const ChargesSynthesisTable: React.FC<ChargesSynthesisTableProps> = ({
  charges,
  selectedYear,
  onYearChange
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const monthNames = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
    'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
  ];

  // Calculer les données de synthèse
  const synthesisData = useMemo(() => {
    const data: SynthesisData = {};
    const yearCharges = charges.filter(charge => 
      new Date(charge.date).getFullYear() === selectedYear
    );

    yearCharges.forEach(charge => {
      const bienId = charge.bienId;
      const month = new Date(charge.date).getMonth() + 1; // 1-12

      if (!data[bienId]) {
        data[bienId] = {
          bien: {
            adresse: charge.bien.adresse,
            ville: charge.bien.ville,
          },
          months: {},
          total: 0
        };
      }

      if (!data[bienId].months[month]) {
        data[bienId].months[month] = 0;
      }

      data[bienId].months[month] += charge.montant;
      data[bienId].total += charge.montant;
    });

    return data;
  }, [charges, selectedYear]);

  // Calculer les totaux par mois
  const monthlyTotals = useMemo(() => {
    const totals: { [month: number]: number } = {};
    
    Object.values(synthesisData).forEach(bienData => {
      Object.entries(bienData.months).forEach(([month, amount]) => {
        const monthNum = parseInt(month);
        if (!totals[monthNum]) totals[monthNum] = 0;
        totals[monthNum] += amount;
      });
    });

    return totals;
  }, [synthesisData]);

  const grandTotal = Object.values(synthesisData).reduce(
    (sum, bienData) => sum + bienData.total, 0
  );

  // Générer les options d'années (années avec des charges)
  const availableYears = useMemo(() => {
    const years = new Set(
      charges.map(charge => new Date(charge.date).getFullYear())
    );
    return Array.from(years).sort((a, b) => b - a); // Plus récent en premier
  }, [charges]);

  const yearOptions = availableYears.map(year => ({
    value: year.toString(),
    label: year.toString()
  }));

  if (Object.keys(synthesisData).length === 0) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Synthèse des charges par bien et par mois
            </h3>
          </div>
          <Select
            value={selectedYear.toString()}
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            options={yearOptions}
          />
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">Aucune charge trouvée pour l'année {selectedYear}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Synthèse des charges par bien et par mois - {selectedYear}
            </h3>
          </div>
          <Select
            value={selectedYear.toString()}
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            options={yearOptions}
          />
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                <div className="flex items-center space-x-1">
                  <Building className="h-4 w-4" />
                  <span>Bien immobilier</span>
                </div>
              </th>
              {monthNames.map((month, index) => (
                <th key={index} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-20">
                  {month}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky right-0">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(synthesisData).map(([bienId, bienData]) => (
              <tr key={bienId} className="hover:bg-gray-50">
                <td className="px-4 py-3 sticky left-0 bg-white border-r border-gray-200">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      {bienData.bien.adresse}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {bienData.bien.ville}
                    </div>
                  </div>
                </td>
                {Array.from({ length: 12 }, (_, index) => {
                  const month = index + 1;
                  const amount = bienData.months[month] || 0;
                  return (
                    <td key={month} className="px-3 py-3 text-center text-sm">
                      {amount > 0 ? (
                        <span className="font-medium text-gray-900">
                          {formatCurrency(amount)}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right font-semibold text-gray-900 bg-gray-50 sticky right-0 border-l border-gray-200">
                  {formatCurrency(bienData.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100">
            <tr>
              <td className="px-4 py-3 font-bold text-gray-900 sticky left-0 bg-gray-100 border-r border-gray-300">
                Total mensuel
              </td>
              {Array.from({ length: 12 }, (_, index) => {
                const month = index + 1;
                const total = monthlyTotals[month] || 0;
                return (
                  <td key={month} className="px-3 py-3 text-center font-bold text-gray-900">
                    {total > 0 ? formatCurrency(total) : '-'}
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right font-bold text-lg text-gray-900 bg-gray-100 sticky right-0 border-l border-gray-300">
                {formatCurrency(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ChargesSynthesisTable;