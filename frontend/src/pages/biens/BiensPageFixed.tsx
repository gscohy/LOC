import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Plus, Search, Edit, Trash2, MapPin, Home, Euro } from 'lucide-react';

import { biensService } from '@/services/biens';
import { Bien } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Table from '@/components/ui/Table';

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    APPARTEMENT: 'Appartement',
    MAISON: 'Maison',
    STUDIO: 'Studio',
    BUREAU: 'Bureau',
    LOCAL_COMMERCIAL: 'Local commercial',
    GARAGE: 'Garage',
  };
  return labels[type] || type;
};

const getStatutLabel = (statut: string) => {
  const labels: Record<string, string> = {
    LIBRE: 'Libre',
    LOUE: 'Loué',
    MAINTENANCE: 'En maintenance',
    VENDU: 'Vendu',
  };
  return labels[statut] || statut;
};

const BiensPageFixed: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const {
    data: biensData,
    isLoading,
    error,
  } = useQuery(
    ['biens', currentPage, searchTerm],
    () => biensService.getAll({
      page: currentPage,
      limit: pageSize,
      search: searchTerm || undefined,
    }),
    {
      keepPreviousData: true,
    }
  );

  const columns = [
    {
      key: 'adresse',
      title: 'Adresse',
      render: (value: any, bien: Bien) => (
        <div>
          <div className="font-medium text-gray-900">
            {bien.adresse}
          </div>
          <div className="text-sm text-gray-500 flex items-center mt-1">
            <MapPin className="h-3 w-3 mr-1" />
            {bien.codePostal} {bien.ville}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type & Surface',
      render: (value: any, bien: Bien) => (
        <div>
          <div className="font-medium text-gray-900">
            {getTypeLabel(bien.type)}
          </div>
          <div className="text-sm text-gray-500 flex items-center mt-1">
            <Home className="h-3 w-3 mr-1" />
            {bien.surface}m² - {bien.nbPieces} pièces
          </div>
        </div>
      ),
    },
    {
      key: 'loyer',
      title: 'Loyer',
      render: (value: any, bien: Bien) => (
        <div className="text-right">
          <div className="font-medium text-gray-900 flex items-center">
            <Euro className="h-4 w-4 mr-1" />
            {bien.loyer.toLocaleString()}€
          </div>
          {bien.chargesMensuelles > 0 && (
            <div className="text-sm text-gray-500">
              + {bien.chargesMensuelles}€ charges
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'statut',
      title: 'Statut',
      render: (value: any, bien: Bien) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          bien.statut === 'LIBRE' ? 'bg-green-100 text-green-800' :
          bien.statut === 'LOUE' ? 'bg-blue-100 text-blue-800' :
          bien.statut === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {getStatutLabel(bien.statut)}
        </span>
      ),
    },
    {
      key: 'proprietaires',
      title: 'Propriétaires',
      render: (value: any, bien: Bien) => (
        <div>
          {bien.proprietaires?.map((bp) => (
            <div key={bp.id} className="text-sm">
              <span className="font-medium">
                {bp.proprietaire.prenom} {bp.proprietaire.nom}
              </span>
              {bien.proprietaires.length > 1 && (
                <span className="text-gray-500 ml-1">
                  ({bp.quotePart}%)
                </span>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, bien: Bien) => (
        <div className="flex justify-end space-x-2">
          <button className="text-blue-600 hover:text-blue-800">
            <Edit className="h-4 w-4" />
          </button>
          <button className="text-red-600 hover:text-red-800">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Biens immobiliers
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez votre portefeuille immobilier
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau bien
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Rechercher un bien..."
            icon={<Search className="h-4 w-4" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Liste des biens
          </h2>
        </div>
        
        {error ? (
          <div className="p-6 text-red-600">
            Erreur: {String(error)}
          </div>
        ) : (
          <Table
            columns={columns}
            data={biensData?.data || []}
            loading={isLoading}
            emptyText="Aucun bien trouvé"
            keyExtractor={(record) => record.id}
          />
        )}
      </div>

      {/* Pagination */}
      {biensData?.pagination && biensData.pagination.pages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Précédent
          </Button>
          <span className="flex items-center px-3 py-2 text-sm text-gray-700">
            Page {currentPage} sur {biensData.pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= biensData.pagination.pages}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
};

export default BiensPageFixed;