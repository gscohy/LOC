import React, { useMemo, useState } from 'react';
import { 
  Calendar, 
  ChevronDown, 
  ChevronRight, 
  Building, 
  Euro,
  FileText,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Charge, chargesService } from '@/services/charges';

interface ChargesGroupedTableProps {
  charges: Charge[];
  onView: (charge: Charge) => void;
  onEdit: (charge: Charge) => void;
  onDelete: (charge: Charge) => void;
  onTogglePayee: (charge: Charge) => void;
  groupBy: 'year-month' | 'category' | 'bien';
}

interface GroupedData {
  [key: string]: {
    charges: Charge[];
    total: number;
    totalPaye: number;
    count: number;
    expanded?: boolean;
  };
}

const ChargesGroupedTable: React.FC<ChargesGroupedTableProps> = ({
  charges,
  onView,
  onEdit,
  onDelete,
  onTogglePayee,
  groupBy
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const getPayeeVariant = (payee: boolean) => {
    return payee ? 'success' : 'warning';
  };

  const groupedData = useMemo(() => {
    const groups: GroupedData = {};

    charges.forEach(charge => {
      let groupKey = '';
      
      switch (groupBy) {
        case 'year-month':
          const date = new Date(charge.date);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          groupKey = `${year}-${month.toString().padStart(2, '0')}`;
          break;
        case 'category':
          groupKey = charge.categorie;
          break;
        case 'bien':
          groupKey = `${charge.bien.adresse} - ${charge.bien.ville}`;
          break;
        default:
          groupKey = 'default';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          charges: [],
          total: 0,
          totalPaye: 0,
          count: 0
        };
      }

      groups[groupKey].charges.push(charge);
      groups[groupKey].total += charge.montant;
      groups[groupKey].totalPaye += charge.payee ? charge.montant : 0;
      groups[groupKey].count += 1;
    });

    return groups;
  }, [charges, groupBy]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const getGroupTitle = (groupKey: string) => {
    switch (groupBy) {
      case 'year-month':
        const [year, month] = groupKey.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long'
        });
      case 'category':
        return chargesService.getCategorieLabel(groupKey);
      case 'bien':
        return groupKey;
      default:
        return groupKey;
    }
  };

  const getGroupIcon = () => {
    switch (groupBy) {
      case 'year-month':
        return <Calendar className="h-4 w-4" />;
      case 'category':
        return <FileText className="h-4 w-4" />;
      case 'bien':
        return <Building className="h-4 w-4" />;
      default:
        return <Euro className="h-4 w-4" />;
    }
  };

  // Trier les groupes
  const sortedGroups = Object.entries(groupedData).sort(([a], [b]) => {
    if (groupBy === 'year-month') {
      return b.localeCompare(a); // Plus récent en premier
    }
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-4">
      {sortedGroups.map(([groupKey, groupData]) => {
        const isExpanded = expandedGroups[groupKey] ?? true;
        const pourcentagePaye = groupData.total > 0 ? (groupData.totalPaye / groupData.total) * 100 : 0;

        return (
          <div key={groupKey} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* En-tête du groupe */}
            <div 
              className="bg-gray-50 px-4 py-3 border-b cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleGroup(groupKey)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                  {getGroupIcon()}
                  <h4 className="font-semibold text-gray-900">
                    {getGroupTitle(groupKey)}
                  </h4>
                  <Badge variant="gray">
                    {groupData.count} charge{groupData.count > 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(groupData.total)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(groupData.totalPaye)} payé
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all" 
                        style={{ width: `${pourcentagePaye}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {Math.round(pourcentagePaye)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenu du groupe */}
            {isExpanded && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      {groupBy !== 'bien' && (
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bien
                        </th>
                      )}
                      {groupBy !== 'category' && (
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Catégorie
                        </th>
                      )}
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Facture
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groupData.charges.map((charge) => (
                      <tr key={charge.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">
                          {formatDate(charge.date)}
                        </td>
                        {groupBy !== 'bien' && (
                          <td className="px-4 py-2 text-sm">
                            <div className="font-medium">{charge.bien.adresse}</div>
                            <div className="text-gray-500">{charge.bien.ville}</div>
                          </td>
                        )}
                        {groupBy !== 'category' && (
                          <td className="px-4 py-2">
                            <Badge variant="gray">
                              {chargesService.getCategorieLabel(charge.categorie)}
                            </Badge>
                          </td>
                        )}
                        <td className="px-4 py-2 text-sm max-w-xs truncate" title={charge.description}>
                          {charge.description}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {formatCurrency(charge.montant)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Badge variant={getPayeeVariant(charge.payee)}>
                            {charge.payee ? 'Payée' : 'Non payée'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {charge.facture ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
                                const factureUrl = charge.facture!.startsWith('/uploads/') 
                                  ? `${baseUrl}${charge.facture}`
                                  : `${baseUrl}/uploads/factures/${charge.facture}`;
                                window.open(factureUrl, '_blank');
                              }}
                              className="text-blue-600 hover:text-blue-700"
                              title="Visualiser la facture"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onTogglePayee(charge)}
                              className={charge.payee ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
                              title={charge.payee ? 'Marquer comme non payée' : 'Marquer comme payée'}
                            >
                              {charge.payee ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onView(charge)}
                              title="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(charge)}
                              title="Modifier"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(charge)}
                              className="text-red-600 hover:text-red-700"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={groupBy === 'bien' && groupBy === 'category' ? 5 : groupBy !== 'bien' && groupBy !== 'category' ? 7 : 6} 
                          className="px-4 py-2 font-semibold text-gray-900">
                        Total {getGroupTitle(groupKey)}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-lg">
                        {formatCurrency(groupData.total)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant={pourcentagePaye === 100 ? 'success' : pourcentagePaye > 0 ? 'warning' : 'danger'}>
                          {Math.round(pourcentagePaye)}% payé
                        </Badge>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {sortedGroups.length === 0 && (
        <div className="text-center py-12">
          <Euro className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune charge trouvée
          </h3>
          <p className="text-gray-600">
            Aucune charge ne correspond aux critères sélectionnés.
          </p>
        </div>
      )}
    </div>
  );
};

export default ChargesGroupedTable;