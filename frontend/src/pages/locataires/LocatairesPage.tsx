import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  UserCheck,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  Users,
} from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Table from '@/components/ui/Table';
import { locatairesService } from '@/services/locataires';

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR');
};

const LocatairesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewingLocataire, setViewingLocataire] = useState<any>(null);
  const navigate = useNavigate();
  const limit = 10;

  const { data: locatairesData, isLoading } = useQuery(
    ['locataires', { page, limit, search }],
    () => locatairesService.getAll({ 
      page, 
      limit, 
      search: search || undefined
    }),
    { keepPreviousData: true }
  );

  const locataires = locatairesData?.data || [];
  const pagination = locatairesData?.pagination;

  const columns = [
    {
      key: 'nom',
      title: 'Locataire',
      render: (value: any, locataire: any) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">
                {locataire.nom?.charAt(0)}{locataire.prenom?.charAt(0)}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {locataire.civilite} {locataire.nom} {locataire.prenom}
            </div>
            {locataire.profession && (
              <div className="text-sm text-gray-500">{locataire.profession}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      title: 'Contact',
      render: (value: any, locataire: any) => (
        <div className="text-sm text-gray-900">
          <div className="flex items-center mb-1">
            <Mail className="h-3 w-3 text-gray-400 mr-1" />
            {locataire.email}
          </div>
          <div className="flex items-center">
            <Phone className="h-3 w-3 text-gray-400 mr-1" />
            {locataire.telephone}
          </div>
        </div>
      ),
    },
    {
      key: 'revenus',
      title: 'Revenus',
      render: (value: any, locataire: any) => (
        <span className="text-sm text-gray-900">
          {(locataire.revenus || 0).toLocaleString()}€/mois
        </span>
      ),
    },
    {
      key: 'contrats',
      title: 'Contrats & Loyers',
      render: (value: any, locataire: any) => (
        <div>
          <div className="flex items-center mb-1">
            <Users className="h-4 w-4 text-gray-400 mr-1" />
            {(locataire as any)._count?.contrats || 0} contrat(s)
          </div>
          {locataire.contrats && locataire.contrats.length > 0 && (
            <div className="text-xs space-y-1">
              {locataire.contrats.map((contrat: any) => {
                const loyersEnRetard = contrat.contrat?.loyers?.filter((l: any) => l.statut === 'RETARD').length || 0;
                const loyersEnAttente = contrat.contrat?.loyers?.filter((l: any) => l.statut === 'EN_ATTENTE').length || 0;
                return (
                  <div key={contrat.id}>
                    {loyersEnRetard > 0 && (
                      <span className="text-red-600 font-medium">⚠ {loyersEnRetard} loyer(s) en retard</span>
                    )}
                    {loyersEnAttente > 0 && !loyersEnRetard && (
                      <span className="text-orange-600">{loyersEnAttente} loyer(s) en attente</span>
                    )}
                    {!loyersEnRetard && !loyersEnAttente && (
                      <span className="text-green-600">✓ À jour</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: 'Depuis',
      render: (value: any, locataire: any) => (
        <span className="text-sm text-gray-900">{formatDate(locataire.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, locataire: any) => (
        <div className="flex justify-end space-x-2">
          <button className="text-primary-600 hover:text-primary-900" onClick={() => setViewingLocataire(locataire)}>
            <Eye className="h-4 w-4" />
          </button>
          <button className="text-gray-600 hover:text-gray-900">
            <Edit className="h-4 w-4" />
          </button>
          <button className="text-red-600 hover:text-red-900">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Locataires
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez vos locataires et leurs informations
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau locataire
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Rechercher un locataire..."
            icon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Locataires table */}
      <div className="card">
        <Table
          columns={columns}
          data={locataires}
          loading={isLoading}
          keyExtractor={(record) => record.id}
          onRowDoubleClick={(locataire) => navigate(`/locataires/${locataire.id}`)}
          emptyText="Aucun locataire trouvé. Commencez par ajouter votre premier locataire."
        />
      </div>
    </div>
  );
};

export default LocatairesPage;