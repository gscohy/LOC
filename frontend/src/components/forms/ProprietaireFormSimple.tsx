import React from 'react';
import Button from '@/components/ui/Button';

interface ProprietaireFormSimpleProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ProprietaireFormSimple: React.FC<ProprietaireFormSimpleProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type: 'PHYSIQUE',
      nom: 'Test',
      prenom: 'Propriétaire',
      email: 'test@email.fr',
      adresse: '123 rue test',
      ville: 'Test',
      codePostal: '12345'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Formulaire Propriétaire - Version Simple
        </h3>
        <p className="text-gray-600">
          Ceci est une version simplifiée pour tester le formulaire.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom
          </label>
          <input
            type="text"
            defaultValue="Test"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prénom
          </label>
          <input
            type="text"
            defaultValue="Propriétaire"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          defaultValue="test@email.fr"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          loading={isLoading}
        >
          Enregistrer
        </Button>
      </div>
    </form>
  );
};

export default ProprietaireFormSimple;