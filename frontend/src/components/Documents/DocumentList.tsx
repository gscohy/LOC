import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Eye, 
  Trash2, 
  Edit3, 
  FileText, 
  Image, 
  Calendar,
  User,
  Building,
  FileX,
  Loader,
  Search,
  Filter
} from 'lucide-react';
import documentService, { Document, DocumentFilters } from '../../services/documentService';

interface DocumentListProps {
  filters?: DocumentFilters;
  onDocumentClick?: (document: Document) => void;
  onDocumentDelete?: (document: Document) => void;
  onDocumentUpdate?: (document: Document) => void;
  className?: string;
  showFilters?: boolean;
  viewMode?: 'list' | 'grid';
}

const DocumentList: React.FC<DocumentListProps> = ({
  filters = {},
  onDocumentClick,
  onDocumentDelete,
  onDocumentUpdate,
  className = '',
  showFilters = true,
  viewMode = 'list'
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  
  const [localFilters, setLocalFilters] = useState<DocumentFilters>(filters);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Charger les documents
  const loadDocuments = async (newFilters: DocumentFilters = localFilters) => {
    try {
      setLoading(true);
      const response = await documentService.getDocuments(newFilters);
      setDocuments(response.data.documents);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // Mise à jour des filtres
  useEffect(() => {
    setLocalFilters(prev => ({ ...prev, ...filters }));
  }, [filters]);

  // Recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        // Pour la recherche, on pourrait étendre l'API backend
        // Pour l'instant, on filtre côté client
        const filtered = documents.filter(doc => 
          doc.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.typeDoc.toLowerCase().includes(searchTerm.toLowerCase())
        );
        // Note: Ceci n'est qu'un filtre côté client temporaire
      } else {
        loadDocuments();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleFilterChange = (newFilters: Partial<DocumentFilters>) => {
    const updatedFilters = { ...localFilters, ...newFilters, page: 1 };
    setLocalFilters(updatedFilters);
    loadDocuments(updatedFilters);
  };

  const handlePageChange = (newPage: number) => {
    const updatedFilters = { ...localFilters, page: newPage };
    setLocalFilters(updatedFilters);
    loadDocuments(updatedFilters);
  };

  const handleDeleteDocument = async (document: Document) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le document "${document.nom}" ?`)) {
      return;
    }

    try {
      await documentService.deleteDocument(document.id);
      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
      if (onDocumentDelete) {
        onDocumentDelete(document);
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const handleDownload = (document: Document) => {
    const url = documentService.getDocumentUrl(document);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = document.nom;
    link.click();
  };

  const handleView = (document: Document) => {
    const url = documentService.getDocumentUrl(document);
    window.open(url, '_blank');
  };

  const getEntityDisplay = (document: Document) => {
    if (document.contrat) {
      return {
        icon: <FileText className="w-4 h-4" />,
        text: `Contrat - ${document.contrat.bien.adresse}`,
        subtext: `Début: ${new Date(document.contrat.dateDebut).toLocaleDateString()}`
      };
    }
    if (document.locataire) {
      return {
        icon: <User className="w-4 h-4" />,
        text: `${document.locataire.prenom} ${document.locataire.nom}`,
        subtext: 'Locataire'
      };
    }
    if (document.garant) {
      return {
        icon: <User className="w-4 h-4" />,
        text: `${document.garant.prenom} ${document.garant.nom}`,
        subtext: 'Garant'
      };
    }
    if (document.bien) {
      return {
        icon: <Building className="w-4 h-4" />,
        text: `${document.bien.adresse}`,
        subtext: document.bien.ville
      };
    }
    return {
      icon: <FileX className="w-4 h-4" />,
      text: 'Non rattaché',
      subtext: ''
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        <span>Chargement des documents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        <p>{error}</p>
        <button 
          onClick={() => loadDocuments()}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className={`document-list ${className}`}>
      {/* Barre de recherche et filtres */}
      {showFilters && (
        <div className="mb-6 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher un document..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </button>
          </div>

          {/* Panel de filtres */}
          {showFilterPanel && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={localFilters.categorie || ''}
                    onChange={(e) => handleFilterChange({ categorie: e.target.value || undefined })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Toutes</option>
                    <option value="CONTRAT">Contrats</option>
                    <option value="LOCATAIRE">Locataires</option>
                    <option value="GARANT">Garants</option>
                    <option value="BIEN">Biens</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de document
                  </label>
                  <select
                    value={localFilters.typeDoc || ''}
                    onChange={(e) => handleFilterChange({ typeDoc: e.target.value || undefined })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Tous types</option>
                    {localFilters.categorie && documentService.getDocumentTypes(localFilters.categorie).map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Limite par page
                  </label>
                  <select
                    value={localFilters.limit || 20}
                    onChange={(e) => handleFilterChange({ limit: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setLocalFilters({});
                    setSearchTerm('');
                    loadDocuments({});
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Liste des documents */}
      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileX className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Aucun document trouvé</p>
        </div>
      ) : (
        <>
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {documents.map((document) => {
              const entityDisplay = getEntityDisplay(document);
              const fileIcon = documentService.getFileIcon(document);

              return (
                <div
                  key={document.id}
                  className={`
                    bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow
                    ${viewMode === 'list' ? 'p-4' : 'p-4'}
                  `}
                >
                  <div className={`flex ${viewMode === 'list' ? 'items-center space-x-4' : 'flex-col space-y-3'}`}>
                    {/* Icône du fichier */}
                    <div className={`flex-shrink-0 ${viewMode === 'grid' ? 'self-center' : ''}`}>
                      {documentService.isImage(document) ? (
                        <img
                          src={documentService.getDocumentUrl(document)}
                          alt={document.nom}
                          className="w-12 h-12 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                          {fileIcon}
                        </div>
                      )}
                    </div>

                    {/* Informations du document */}
                    <div className={`flex-1 min-w-0 ${viewMode === 'grid' ? 'text-center' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {document.nom}
                          </h3>
                          <div className="mt-1 flex items-center text-xs text-gray-500 space-x-2">
                            {entityDisplay.icon}
                            <span className="truncate">{entityDisplay.text}</span>
                          </div>
                          {entityDisplay.subtext && (
                            <div className="text-xs text-gray-400 mt-1">
                              {entityDisplay.subtext}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(document.dateUpload)}
                        </span>
                        <span>{documentService.formatFileSize(document.taille)}</span>
                      </div>

                      {document.description && (
                        <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                          {document.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className={`flex-shrink-0 ${viewMode === 'grid' ? 'w-full justify-center' : ''}`}>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleView(document)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(document)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {onDocumentUpdate && (
                          <button
                            onClick={() => onDocumentUpdate(document)}
                            className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteDocument(document)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Affichage de {((pagination.page - 1) * pagination.limit) + 1} à {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} documents
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Précédent
                </button>
                
                <span className="text-sm text-gray-700">
                  Page {pagination.page} sur {pagination.pages}
                </span>
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DocumentList;