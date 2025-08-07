import { api } from '../lib/api';

export interface Charge {
  id: string;
  bienId: string;
  categorie: string;
  description: string;
  montant: number;
  date: string;
  type: string;
  frequence?: string;
  dateDebut?: string;
  dateFin?: string;
  facture?: string;
  payee: boolean;
  commentaires?: string;
  createdAt: string;
  updatedAt: string;
  bien: {
    id: string;
    adresse: string;
    ville: string;
    codePostal: string;
  };
}

export interface ChargeCreate {
  bienId: string;
  categorie: string;
  description: string;
  montant: number;
  date: string;
  type?: string;
  frequence?: string;
  dateDebut?: string;
  dateFin?: string;
  facture?: string;
  payee?: boolean;
  commentaires?: string;
}

export interface ChargeUpdate {
  bienId?: string;
  categorie?: string;
  description?: string;
  montant?: number;
  date?: string;
  type?: string;
  frequence?: string;
  dateDebut?: string;
  dateFin?: string;
  facture?: string;
  payee?: boolean;
  commentaires?: string;
}

export interface ChargesListParams {
  page?: number;
  limit?: number;
  bienId?: string;
  categorie?: string;
  type?: string;
  payee?: boolean;
  dateDebut?: string;
  dateFin?: string;
}

export interface ChargesListResponse {
  charges: Charge[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ChargeStats {
  total: {
    montant: number;
    nombre: number;
  };
  payees: {
    montant: number;
    nombre: number;
  };
  nonPayees: {
    montant: number;
    nombre: number;
  };
  parCategorie: Array<{
    categorie: string;
    montant: number;
    nombre: number;
  }>;
  parMois?: Array<{
    mois: string;
    total: number;
    nombre: number;
  }>;
}

export interface ChargeStatsParams {
  bienId?: string;
  annee?: number;
}

export const chargesService = {
  // Récupérer toutes les charges avec filtres
  async getAll(params: ChargesListParams = {}): Promise<ChargesListResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const url = queryString ? `/charges?${queryString}` : '/charges';
    
    const response = await api.get(url);
    return response.data.data;
  },

  // Récupérer une charge par ID
  async getById(id: string): Promise<Charge> {
    const response = await api.get(`/charges/${id}`);
    return response.data.data;
  },

  // Créer une nouvelle charge
  async create(data: ChargeCreate): Promise<Charge> {
    console.log('🏭 Service charges - Création charge:', data);
    
    // Nettoyer les données avant envoi pour éviter les références circulaires
    const cleanData = JSON.parse(JSON.stringify(data));
    console.log('🧹 Données nettoyées:', cleanData);
    
    // Debug: vérifier le token d'authentification
    const token = localStorage.getItem('auth_token');
    console.log('🔑 Token présent:', !!token);
    if (token) {
      console.log('🔑 Token (début):', token.substring(0, 20) + '...');
    }
    
    // Debug: vérifier les headers axios
    console.log('📡 Headers API:', api.defaults.headers.common);
    
    try {
      const response = await api.post('/charges', cleanData);
      console.log('✅ Service charges - Charge créée:', response.data);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Service charges - Erreur création:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      throw error;
    }
  },

  // Mettre à jour une charge
  async update(id: string, data: ChargeUpdate): Promise<Charge> {
    const response = await api.put(`/charges/${id}`, data);
    return response.data.data;
  },

  // Supprimer une charge
  async delete(id: string): Promise<void> {
    await api.delete(`/charges/${id}`);
  },

  // Récupérer les statistiques des charges
  async getStats(params: ChargeStatsParams = {}): Promise<ChargeStats> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const url = queryString ? `/charges/stats/summary?${queryString}` : '/charges/stats/summary';
    
    const response = await api.get(url);
    return response.data.data;
  },

  // Basculer le statut payé/non payé d'une charge
  async togglePayee(id: string): Promise<Charge> {
    const response = await api.post(`/charges/${id}/toggle-payee`);
    return response.data.data;
  },

  // Upload d'une facture
  async uploadFacture(file: File): Promise<{ filename: string; originalname: string; size: number; url: string }> {
    const formData = new FormData();
    formData.append('facture', file);

    const response = await api.post('/charges/upload-facture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // Méthodes utilitaires pour les catégories et types
  getCategories(): string[] {
    return [
      'TRAVAUX',
      'ENTRETIEN',
      'ASSURANCE',
      'TAXE_FONCIERE',
      'CHARGES_COPROPRIETE',
      'GESTION',
      'SYNDIC',
      'ELECTRICITE',
      'GAZ',
      'EAU',
      'INTERNET',
      'NETTOYAGE',
      'GARDIENNAGE',
      'CREDIT_IMMO',
      'AUTRE'
    ];
  },

  getTypes(): string[] {
    return [
      'PONCTUELLE',
      'MENSUELLE',
      'TRIMESTRIELLE',
      'SEMESTRIELLE',
      'ANNUELLE'
    ];
  },

  getCategorieLabel(categorie: string): string {
    const labels: { [key: string]: string } = {
      'TRAVAUX': 'Travaux',
      'ENTRETIEN': 'Entretien',
      'ASSURANCE': 'Assurance',
      'TAXE_FONCIERE': 'Taxe foncière',
      'CHARGES_COPROPRIETE': 'Charges copropriété',
      'GESTION': 'Gestion',
      'SYNDIC': 'Syndic',
      'ELECTRICITE': 'Électricité',
      'GAZ': 'Gaz',
      'EAU': 'Eau',
      'INTERNET': 'Internet',
      'NETTOYAGE': 'Nettoyage',
      'GARDIENNAGE': 'Gardiennage',
      'CREDIT_IMMO': 'Crédit immobilier',
      'AUTRE': 'Autre'
    };
    return labels[categorie] || categorie;
  },

  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'PONCTUELLE': 'Ponctuelle',
      'MENSUELLE': 'Mensuelle',
      'TRIMESTRIELLE': 'Trimestrielle',
      'SEMESTRIELLE': 'Semestrielle',
      'ANNUELLE': 'Annuelle'
    };
    return labels[type] || type;
  }
};

export default chargesService;