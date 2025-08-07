import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { biensDetailsService } from '@/services/biens-details';

const TestBienDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  console.log('🔍 TestBienDetailsPage - ID from params:', id);
  
  const {
    data: bienDetails,
    isLoading,
    error,
  } = useQuery(
    ['test-bien-details', id],
    () => biensDetailsService.getDetails(id!),
    {
      enabled: !!id,
      retry: 1,
    }
  );

  console.log('📊 Query state:', { 
    isLoading, 
    hasError: !!error, 
    hasData: !!bienDetails,
    id 
  });

  if (isLoading) {
    return (
      <div className="p-8 bg-blue-50">
        <h1 className="text-xl font-bold text-blue-600">🔄 Chargement...</h1>
        <p>ID du bien : {id}</p>
        <p>Statut : En cours de chargement</p>
      </div>
    );
  }

  if (error) {
    console.error('❌ Erreur détaillée:', error);
    return (
      <div className="p-8 bg-red-50">
        <h1 className="text-xl font-bold text-red-600">❌ Erreur</h1>
        <p>ID du bien : {id}</p>
        <p>Message d'erreur : {(error as any)?.message || 'Erreur inconnue'}</p>
        <details className="mt-4">
          <summary className="cursor-pointer font-medium">Détails de l'erreur</summary>
          <pre className="mt-2 text-xs bg-red-100 p-2 rounded">
            {JSON.stringify(error, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  if (!bienDetails) {
    return (
      <div className="p-8 bg-yellow-50">
        <h1 className="text-xl font-bold text-yellow-600">⚠️ Pas de données</h1>
        <p>ID du bien : {id}</p>
        <p>bienDetails est null/undefined</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-green-50">
      <h1 className="text-xl font-bold text-green-600">✅ Succès !</h1>
      <p>ID du bien : {id}</p>
      <p>Adresse : {bienDetails.bien.adresse}</p>
      <p>Ville : {bienDetails.bien.ville}</p>
      <p>Type : {bienDetails.bien.type}</p>
      <p>Loyer : {bienDetails.bien.loyer}€</p>
      
      <details className="mt-4">
        <summary className="cursor-pointer font-medium">Données complètes</summary>
        <pre className="mt-2 text-xs bg-green-100 p-2 rounded max-h-64 overflow-y-auto">
          {JSON.stringify(bienDetails, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default TestBienDetailsPage;