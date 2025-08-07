import { api } from '../lib/api';

export interface Document {
  id: string;
  nom: string;
  nomFichier: string;
  chemin: string;
  taille: number;
  type: string;
  extension: string;
  categorie: 'CONTRAT' | 'LOCATAIRE' | 'GARANT' | 'BIEN';
  typeDoc: string;
  contratId?: string;
  locataireId?: string;
  garantId?: string;
  bienId?: string;
  description?: string;
  dateUpload: string;
  createdAt: string;
  updatedAt: string;
  // Relations optionnelles
  contrat?: {
    id: string;
    dateDebut: string;
    bien: {
      adresse: string;
    };
  };
  locataire?: {
    id: string;
    nom: string;
    prenom: string;
  };
  garant?: {
    id: string;
    nom: string;
    prenom: string;
  };
  bien?: {
    id: string;
    adresse: string;
    ville: string;
  };
}

export interface DocumentFilters {
  categorie?: string;
  typeDoc?: string;
  contratId?: string;
  locataireId?: string;
  garantId?: string;
  bienId?: string;
  page?: number;
  limit?: number;
}

export interface DocumentUploadData {
  categorie: 'CONTRAT' | 'LOCATAIRE' | 'GARANT' | 'BIEN';
  typeDoc: string;
  contratId?: string;
  locataireId?: string;
  garantId?: string;
  bienId?: string;
  description?: string;
}

export interface DocumentsResponse {
  success: boolean;
  data: {
    documents: Document[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface DocumentResponse {
  success: boolean;
  data: Document;
}

class DocumentService {
  // Upload d'un document
  async uploadDocument(file: File, data: DocumentUploadData): Promise<DocumentResponse> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('categorie', data.categorie);
    formData.append('typeDoc', data.typeDoc);
    
    if (data.contratId) formData.append('contratId', data.contratId);
    if (data.locataireId) formData.append('locataireId', data.locataireId);
    if (data.garantId) formData.append('garantId', data.garantId);
    if (data.bienId) formData.append('bienId', data.bienId);
    if (data.description) formData.append('description', data.description);

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Récupérer les documents avec filtres
  async getDocuments(filters: DocumentFilters = {}): Promise<DocumentsResponse> {
    const params = new URLSearchParams();
    
    if (filters.categorie) params.append('categorie', filters.categorie);
    if (filters.typeDoc) params.append('typeDoc', filters.typeDoc);
    if (filters.contratId) params.append('contratId', filters.contratId);
    if (filters.locataireId) params.append('locataireId', filters.locataireId);
    if (filters.garantId) params.append('garantId', filters.garantId);
    if (filters.bienId) params.append('bienId', filters.bienId);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/documents?${params.toString()}`);
    return response.data;
  }

  // Récupérer un document par ID
  async getDocument(id: string): Promise<DocumentResponse> {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  }

  // Supprimer un document
  async deleteDocument(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  }

  // Mettre à jour les métadonnées d'un document
  async updateDocument(id: string, data: { description?: string; typeDoc?: string }): Promise<DocumentResponse> {
    const response = await api.put(`/documents/${id}`, data);
    return response.data;
  }

  // Générer l'URL pour télécharger/afficher un document
  getDocumentUrl(document: Document): string {
    const baseURL = api.defaults.baseURL?.replace('/api', '') || 'http://localhost:7000';
    return `${baseURL}${document.chemin}`;
  }

  // Vérifier si un fichier est une image
  isImage(document: Document): boolean {
    return document.type.startsWith('image/');
  }

  // Vérifier si un fichier est un PDF
  isPDF(document: Document): boolean {
    return document.type === 'application/pdf';
  }

  // Formater la taille du fichier
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Obtenir l'icône pour un type de fichier
  getFileIcon(document: Document): string {
    if (this.isImage(document)) return '🖼️';
    if (this.isPDF(document)) return '📄';
    if (document.type.includes('word')) return '📝';
    if (document.type.includes('text')) return '📄';
    return '📎';
  }

  // Types de documents prédéfinis par catégorie
  getDocumentTypes(categorie: string): { value: string; label: string }[] {
    switch (categorie) {
      case 'CONTRAT':
        return [
          { value: 'BAIL', label: 'Bail' },
          { value: 'ETAT_LIEUX_ENTREE', label: 'État des lieux d\'entrée' },
          { value: 'ETAT_LIEUX_SORTIE', label: 'État des lieux de sortie' },
          { value: 'AVENANT', label: 'Avenant' },
          { value: 'RESILIATION', label: 'Résiliation' },
          { value: 'AUTRE', label: 'Autre' }
        ];
      case 'LOCATAIRE':
        return [
          { value: 'FICHE_PAIE', label: 'Fiche de paie' },
          { value: 'CNI', label: 'Carte d\'identité' },
          { value: 'PASSEPORT', label: 'Passeport' },
          { value: 'JUSTIFICATIF_REVENUS', label: 'Justificatif de revenus' },
          { value: 'ATTESTATION_EMPLOYEUR', label: 'Attestation employeur' },
          { value: 'RIB', label: 'RIB' },
          { value: 'AUTRE', label: 'Autre' }
        ];
      case 'GARANT':
        return [
          { value: 'CNI', label: 'Carte d\'identité' },
          { value: 'FICHE_PAIE', label: 'Fiche de paie' },
          { value: 'JUSTIFICATIF_REVENUS', label: 'Justificatif de revenus' },
          { value: 'ATTESTATION_EMPLOYEUR', label: 'Attestation employeur' },
          { value: 'ACTE_CAUTION', label: 'Acte de caution' },
          { value: 'RIB', label: 'RIB' },
          { value: 'AUTRE', label: 'Autre' }
        ];
      case 'BIEN':
        return [
          { value: 'PHOTO', label: 'Photo' },
          { value: 'PLAN', label: 'Plan' },
          { value: 'DIAGNOSTIC', label: 'Diagnostic' },
          { value: 'FACTURE_TRAVAUX', label: 'Facture travaux' },
          { value: 'ASSURANCE', label: 'Assurance' },
          { value: 'TAXE_FONCIERE', label: 'Taxe foncière' },
          { value: 'AUTRE', label: 'Autre' }
        ];
      default:
        return [{ value: 'AUTRE', label: 'Autre' }];
    }
  }
}

export default new DocumentService();