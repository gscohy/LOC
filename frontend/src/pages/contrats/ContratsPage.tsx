import React from 'react';
import { Plus, Search, FileText } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const ContratsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Contrats de location
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez vos contrats de location et leur historique
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau contrat
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Rechercher un contrat..."
            icon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Coming soon message */}
      <div className="card">
        <div className="p-12 text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Module en cours de développement
          </h3>
          <p className="text-gray-600">
            La gestion des contrats sera bientôt disponible.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContratsPage;