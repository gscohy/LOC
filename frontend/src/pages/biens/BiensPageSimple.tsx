import React from 'react';

const BiensPageSimple: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Biens immobiliers - Version Test
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Cette page devrait s'afficher correctement
        </p>
      </div>
      <div className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Test de rendu
        </h2>
        <p>Si vous voyez ce texte, le problème vient du composant BiensPage original.</p>
      </div>
    </div>
  );
};

export default BiensPageSimple;