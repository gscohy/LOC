import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Plus, Search } from 'lucide-react';

import { proprietairesService } from '@/services/proprietaires';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const ProprietairesPageDebug: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  console.log('🔍 Debug: Début du rendu ProprietairesPageDebug');

  const {
    data: proprietairesData,
    isLoading,
    error,
  } = useQuery(
    ['proprietaires', currentPage, searchTerm],
    () => {
      console.log('🔍 Debug: Exécution de la query proprietaires');
      return proprietairesService.getAll({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
      });
    },
    {
      keepPreviousData: true,
      onError: (err) => {
        console.error('🔍 Debug: Erreur dans la query:', err);
      },
      onSuccess: (data) => {
        console.log('🔍 Debug: Query réussie:', data);
      }
    }
  );

  console.log('🔍 Debug: État de la query:', { isLoading, error, data: proprietairesData });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Propriétaires - Debug Version
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Test de la query React Query
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau propriétaire
        </Button>
      </div>

      {/* Search bar */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Rechercher un propriétaire..."
            icon={<Search className="h-4 w-4" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Debug info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <h3 className="font-medium text-gray-900 mb-2">État de chargement</h3>
          <p className={`text-sm ${isLoading ? 'text-yellow-600' : 'text-green-600'}`}>
            {isLoading ? '⏳ Chargement...' : '✅ Terminé'}
          </p>
        </div>
        
        <div className="card p-4">
          <h3 className="font-medium text-gray-900 mb-2">Erreurs</h3>
          <p className={`text-sm ${error ? 'text-red-600' : 'text-green-600'}`}>
            {error ? `❌ ${String(error)}` : '✅ Aucune erreur'}
          </p>
        </div>
        
        <div className="card p-4">
          <h3 className="font-medium text-gray-900 mb-2">Données</h3>
          <p className={`text-sm ${proprietairesData ? 'text-green-600' : 'text-gray-600'}`}>
            {proprietairesData 
              ? `✅ ${proprietairesData.data?.length || 0} propriétaires`
              : '⏳ Pas de données'
            }
          </p>
        </div>
      </div>

      {/* Data display */}
      <div className="card">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Données brutes (JSON)
          </h2>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-64">
            {JSON.stringify({ isLoading, error: String(error), proprietairesData }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ProprietairesPageDebug;