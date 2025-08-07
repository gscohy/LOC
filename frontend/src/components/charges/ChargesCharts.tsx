import React, { useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Calendar } from 'lucide-react';
import { Charge, chargesService } from '@/services/charges';

interface ChargesChartsProps {
  charges: Charge[];
  selectedYear: number;
}

const ChargesCharts: React.FC<ChargesChartsProps> = ({ charges, selectedYear }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Couleurs pour les graphiques
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
    '#EC4899', '#14B8A6', '#F472B6', '#A78BFA'
  ];

  // Filtrer les charges de l'année sélectionnée
  const yearCharges = useMemo(() => {
    return charges.filter(charge => 
      new Date(charge.date).getFullYear() === selectedYear
    );
  }, [charges, selectedYear]);

  // Données pour le graphique en secteurs par catégorie
  const categoryData = useMemo(() => {
    const categoryTotals: { [key: string]: number } = {};
    
    yearCharges.forEach(charge => {
      if (!categoryTotals[charge.categorie]) {
        categoryTotals[charge.categorie] = 0;
      }
      categoryTotals[charge.categorie] += charge.montant;
    });

    return Object.entries(categoryTotals)
      .map(([categorie, montant]) => ({
        name: chargesService.getCategorieLabel(categorie),
        value: montant,
        categorie: categorie
      }))
      .sort((a, b) => b.value - a.value);
  }, [yearCharges]);

  // Données pour le graphique par mois
  const monthlyData = useMemo(() => {
    const monthlyTotals: { [key: number]: number } = {};
    const monthlyCount: { [key: number]: number } = {};
    
    yearCharges.forEach(charge => {
      const month = new Date(charge.date).getMonth() + 1; // 1-12
      if (!monthlyTotals[month]) {
        monthlyTotals[month] = 0;
        monthlyCount[month] = 0;
      }
      monthlyTotals[month] += charge.montant;
      monthlyCount[month] += 1;
    });

    const monthNames = [
      'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
      'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
    ];

    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      return {
        name: monthNames[index],
        montant: monthlyTotals[month] || 0,
        nombre: monthlyCount[month] || 0
      };
    });
  }, [yearCharges]);

  // Données pour le graphique par bien immobilier
  const propertyData = useMemo(() => {
    const propertyTotals: { [key: string]: number } = {};
    
    yearCharges.forEach(charge => {
      const propertyKey = `${charge.bien.adresse} - ${charge.bien.ville}`;
      if (!propertyTotals[propertyKey]) {
        propertyTotals[propertyKey] = 0;
      }
      propertyTotals[propertyKey] += charge.montant;
    });

    return Object.entries(propertyTotals)
      .map(([property, montant]) => ({
        name: property.length > 25 ? property.substring(0, 22) + '...' : property,
        fullName: property,
        value: montant
      }))
      .sort((a, b) => b.value - a.value);
  }, [yearCharges]);

  // Données pour charges payées vs non payées
  const paymentStatusData = useMemo(() => {
    const payees = yearCharges.filter(charge => charge.payee);
    const nonPayees = yearCharges.filter(charge => !charge.payee);
    
    const payeesTotal = payees.reduce((sum, charge) => sum + charge.montant, 0);
    const nonPayeesTotal = nonPayees.reduce((sum, charge) => sum + charge.montant, 0);

    return [
      { name: 'Payées', value: payeesTotal, count: payees.length },
      { name: 'Non payées', value: nonPayeesTotal, count: nonPayees.length }
    ];
  }, [yearCharges]);

  if (yearCharges.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Graphiques des charges - {selectedYear}
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500">Aucune charge trouvée pour l'année {selectedYear}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="card p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Analyse graphique des charges - {selectedYear}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {yearCharges.length} charge{yearCharges.length > 1 ? 's' : ''} • {formatCurrency(yearCharges.reduce((sum, c) => sum + c.montant, 0))} au total
        </p>
      </div>

      {/* Première ligne - Répartition par catégorie et statut de paiement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique en secteurs par catégorie */}
        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <h4 className="text-md font-semibold text-gray-900 flex items-center">
              <PieChartIcon className="h-4 w-4 mr-2" />
              Répartition par catégorie
            </h4>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Montant']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique statut de paiement */}
        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <h4 className="text-md font-semibold text-gray-900 flex items-center">
              <PieChartIcon className="h-4 w-4 mr-2" />
              Statut de paiement
            </h4>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, value }) => `${name}: ${formatCurrency(value)} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#EF4444" />
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [
                    formatCurrency(Number(value)), 
                    `${name} (${props.payload.count} charge${props.payload.count > 1 ? 's' : ''})`
                  ]} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Deuxième ligne - Évolution mensuelle */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Évolution des charges par mois
          </h4>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'Montant') return [formatCurrency(Number(value)), name];
                  return [value, name];
                }}
                labelFormatter={(label) => `Mois: ${label}`}
              />
              <Legend />
              <Bar dataKey="montant" fill="#3B82F6" name="Montant" />
              <Line 
                type="monotone" 
                dataKey="nombre" 
                stroke="#EF4444" 
                strokeWidth={2} 
                name="Nombre de charges"
                yAxisId="right"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Troisième ligne - Répartition par bien immobilier */}
      {propertyData.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <h4 className="text-md font-semibold text-gray-900 flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Charges par bien immobilier
            </h4>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={Math.max(300, propertyData.length * 40)}>
              <BarChart 
                data={propertyData} 
                layout="horizontal"
                margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={120}
                />
                <Tooltip 
                  formatter={(value, name, props) => [
                    formatCurrency(Number(value)), 
                    `Charges - ${props.payload.fullName}`
                  ]}
                />
                <Bar dataKey="value" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tableau récapitulatif par catégorie */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-md font-semibold text-gray-900">
            Détail par catégorie
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant total
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nb charges
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % du total
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant moyen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categoryData.map((category, index) => {
                const categoryCharges = yearCharges.filter(c => c.categorie === category.categorie);
                const totalAmount = yearCharges.reduce((sum, c) => sum + c.montant, 0);
                const percentage = totalAmount > 0 ? (category.value / totalAmount) * 100 : 0;
                const averageAmount = categoryCharges.length > 0 ? category.value / categoryCharges.length : 0;
                
                return (
                  <tr key={category.categorie} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: colors[index % colors.length] }}
                        ></div>
                        <span className="font-medium text-gray-900">{category.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {formatCurrency(category.value)}
                    </td>
                    <td className="px-4 py-2 text-center text-gray-600">
                      {categoryCharges.length}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="h-2 rounded-full" 
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: colors[index % colors.length]
                            }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {formatCurrency(averageAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ChargesCharts;