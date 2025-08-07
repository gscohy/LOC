import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react';

import { proprietairesService } from '@/services/proprietaires';
import { Proprietaire } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Table from '@/components/ui/Table';

const ProprietairesPageTableTest: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  console.log('🔍 TableTest: Début du rendu');

  const {
    data: proprietairesData,
    isLoading,
    error,
  } = useQuery(
    ['proprietaires', currentPage, searchTerm],
    () => proprietairesService.getAll({
      page: currentPage,
      limit: pageSize,
      search: searchTerm || undefined,
    }),
    {
      keepPreviousData: true,
    }
  );

  console.log('🔍 TableTest: Données reçues:', proprietairesData);

  // Configuration simple des colonnes pour le Table
  const columns = [
    {
      key: 'nom',
      title: 'Nom',
      render: (value: any, record: Proprietaire) => (
        <div>
          <div className="font-medium text-gray-900">
            {record.nom} {record.prenom}
          </div>
          <div className="text-sm text-gray-500">{record.type}</div>
        </div>
      ),
    },
    {
      key: 'email',
      title: 'Contact',
      render: (value: any, record: Proprietaire) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <Mail className="h-3 w-3 text-gray-400 mr-1" />
            {record.email}
          </div>
          {record.telephone && (
            <div className="flex items-center text-sm">
              <Phone className="h-3 w-3 text-gray-400 mr-1" />
              {record.telephone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'adresse',
      title: 'Adresse',
      render: (value: any, record: Proprietaire) => (
        <div className="text-sm">
          <div>{record.adresse}</div>
          <div className="text-gray-500">
            {record.codePostal} {record.ville}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, record: Proprietaire) => (
        <div className="flex space-x-2">
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

  console.log('🔍 TableTest: Colonnes configurées:', columns);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Propriétaires - Table Test
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Test du composant Table
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau propriétaire
        </Button>
      </div>

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

      {/* Test du composant Table */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Test Table Component
          </h2>
        </div>
        
        {error ? (
          <div className="p-6 text-red-600">
            Erreur: {String(error)}
          </div>
        ) : (
          <Table
            columns={columns}
            data={proprietairesData?.data || []}
            loading={isLoading}
            emptyText="Aucun propriétaire trouvé"
            keyExtractor={(record) => record.id}
          />
        )}
      </div>
    </div>
  );
};

export default ProprietairesPageTableTest;