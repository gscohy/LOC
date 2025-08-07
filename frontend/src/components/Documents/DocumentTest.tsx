import React from 'react';
import DocumentUpload from './DocumentUpload';

const DocumentTest: React.FC = () => {
  const handleUploadSuccess = (document: any) => {
    console.log('Document uploadé avec succès:', document);
    alert(`Document "${document.nom}" uploadé !`);
  };

  const handleUploadError = (error: string) => {
    console.error('Erreur upload:', error);
    alert(`Erreur: ${error}`);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Upload Documents</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Upload de test</h2>
        
        <DocumentUpload
          categorie="CONTRAT"
          entityId="test-contrat-id"
          onUploadSuccess={handleUploadSuccess}
          onError={handleUploadError}
          multiple={true}
        />
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Instructions :</h3>
          <ol className="text-sm text-gray-600 space-y-1">
            <li>1. Sélectionnez ou glissez-déposez des fichiers</li>
            <li>2. Cliquez sur "Uploader"</li>
            <li>3. Vérifiez la console du navigateur pour les erreurs</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DocumentTest;