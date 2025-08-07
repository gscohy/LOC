import React from 'react';
import { Plus, Search, Users } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const ProprietairesPageSimple: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Propriétaires - Version Test
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez vos propriétaires et leurs biens immobiliers
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
          />
        </div>
      </div>

      {/* Test content */}
      <div className="card">
        <div className="p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Test de rendu - ProprietairesPage
          </h3>
          <p className="text-gray-600">
            Si vous voyez ce texte, le problème vient du composant ProprietairesPage original.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProprietairesPageSimple;