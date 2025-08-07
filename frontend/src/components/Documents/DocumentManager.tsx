import React, { useState } from 'react';
import { Plus, List, Grid, RefreshCw } from 'lucide-react';
import SimpleFileUpload from './SimpleFileUpload';
import DocumentList from './DocumentList';
import { Document, DocumentFilters } from '../../services/documentService';

interface DocumentManagerProps {
  categorie: 'CONTRAT' | 'LOCATAIRE' | 'GARANT' | 'BIEN';
  entityId: string;
  entityName?: string;
  className?: string;
  initialFilters?: DocumentFilters;
  allowUpload?: boolean;
  allowDelete?: boolean;
  allowEdit?: boolean;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({
  categorie,
  entityId,
  entityName,
  className = '',
  initialFilters = {},
  allowUpload = true,
  allowDelete = true,
  allowEdit = true
}) => {
  const [showUpload, setShowUpload] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [refreshKey, setRefreshKey] = useState(0);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Combiner les filtres initiaux avec l'ID de l'entité
  const filters: DocumentFilters = {
    ...initialFilters,
    [getEntityIdField()]: entityId,
    categorie
  };

  function getEntityIdField() {
    switch (categorie) {
      case 'CONTRAT': return 'contratId';
      case 'LOCATAIRE': return 'locataireId';
      case 'GARANT': return 'garantId';
      case 'BIEN': return 'bienId';
      default: return 'contratId';
    }
  }

  const getCategorieLabel = () => {
    switch (categorie) {
      case 'CONTRAT': return 'Contrat';
      case 'LOCATAIRE': return 'Locataire';
      case 'GARANT': return 'Garant';
      case 'BIEN': return 'Bien';
      default: return 'Documents';
    }
  };

  const handleUploadSuccess = (document: Document) => {
    setNotification({
      type: 'success',
      message: `Document "${document.nom}" uploadé avec succès`
    });
    setShowUpload(false);
    setRefreshKey(prev => prev + 1); // Force la recharge de la liste
    
    // Masquer la notification après 3 secondes
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUploadError = (error: string) => {
    setNotification({
      type: 'error',
      message: error
    });
    
    // Masquer la notification après 5 secondes
    setTimeout(() => setNotification(null), 5000);
  };

  const handleDocumentDelete = (document: Document) => {
    setNotification({
      type: 'success',
      message: `Document "${document.nom}" supprimé`
    });
    
    // Masquer la notification après 3 secondes
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setNotification({
      type: 'success',
      message: 'Liste des documents actualisée'
    });
    setTimeout(() => setNotification(null), 2000);
  };

  return (
    <div className={`document-manager ${className}`}>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Documents - {getCategorieLabel()}
          </h2>
          {entityName && (
            <p className="text-sm text-gray-600 mt-1">
              {entityName}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Toggle vue liste/grille */}
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Vue liste"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Vue grille"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* Bouton actualiser */}
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg"
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Bouton ajouter document */}
          {allowUpload && (
            <button
              type="button"
              onClick={() => setShowUpload(!showUpload)}
              className={`
                inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg
                ${showUpload 
                  ? 'text-gray-700 bg-gray-100 hover:bg-gray-200' 
                  : 'text-white bg-blue-600 hover:bg-blue-700'
                }
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              `}
            >
              <Plus className="w-4 h-4 mr-2" />
              {showUpload ? 'Annuler' : 'Ajouter document'}
            </button>
          )}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`
          mb-4 p-4 rounded-lg border-l-4 
          ${notification.type === 'success' 
            ? 'bg-green-50 border-green-500 text-green-700' 
            : 'bg-red-50 border-red-500 text-red-700'
          }
        `}>
          <p className="text-sm">{notification.message}</p>
        </div>
      )}

      {/* Zone d'upload */}
      {showUpload && allowUpload && (
        <div className="mb-6 p-6 bg-gray-50 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Ajouter des documents
          </h3>
          <SimpleFileUpload
            categorie={categorie}
            entityId={entityId}
            onUploadSuccess={handleUploadSuccess}
            onError={handleUploadError}
            multiple={true}
          />
        </div>
      )}

      {/* Liste des documents */}
      <DocumentList
        key={refreshKey} // Force la recharge quand refreshKey change
        filters={filters}
        onDocumentDelete={allowDelete ? handleDocumentDelete : undefined}
        onDocumentUpdate={allowEdit ? (doc) => {
          // Ici on pourrait ouvrir un modal d'édition
          console.log('Edit document:', doc);
        } : undefined}
        viewMode={viewMode}
        showFilters={false} // Masquer les filtres car on filtre déjà par entité
      />
    </div>
  );
};

export default DocumentManager;