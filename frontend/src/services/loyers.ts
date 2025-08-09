import { api } from '../lib/api';
import { PaginatedResponse, ApiResponse } from '@/types';

export interface Loyer {
  id: string;
  contratId: string;
  mois: number;
  annee: number;
  montantDu: number;
  montantPaye: number;
  dateEcheance: string;
  statut: 'EN_ATTENTE' | 'PARTIEL' | 'PAYE' | 'RETARD';
  commentaires?: string;
  createdAt: string;
  updatedAt: string;
  contrat?: {
    id: string;
    bien: {
      id: string;
      adresse: string;
      ville: string;
      codePostal: string;
    };
    locataires: {
      locataire: {
        id: string;
        nom: string;
        prenom: string;
        email: string;
      };
    }[];
  };
  paiements?: Paiement[];
  quittances?: {
    id: string;
    statut: string;
    dateGeneration: string;
  }[];
  rappels?: {
    id: string;
    type: string;
    envoye: boolean;
    dateEnvoi: string;
  }[];
  _count?: {
    paiements: number;
    quittances: number;
    rappels: number;
  };
}

export interface Paiement {
  id: string;
  loyerId: string;
  montant: number;
  date: string;
  mode: 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'CAF' | 'PRELEVEMENT';
  payeur: string;
  reference?: string;
  commentaire?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoyerStats {
  totaux: {
    enAttente: number;
    enRetard: number;
    partiels: number;
    payes: number;
    total: number;
  };
  revenus: {
    annee: number;
    parMois: {
      annee: number;
      mois: number;
      _sum: {
        montantDu: number;
        montantPaye: number;
      };
      _count: number;
    }[];
  };
}

interface LoyersParams {
  page?: number;
  limit?: number;
  search?: string;
  statut?: string; // Peut accepter plusieurs statuts séparés par des virgules
  mois?: number;
  annee?: number;
  contratId?: string;
}

export const loyersService = {
  async getAll(params?: LoyersParams): Promise<{loyers: Loyer[], pagination: any}> {
    const { data } = await api.get<ApiResponse<{loyers: Loyer[], pagination: any}>>('/loyers', {
      params,
    });
    return data.data;
  },

  async getById(id: string): Promise<Loyer> {
    const { data } = await api.get<ApiResponse<Loyer>>(`/loyers/${id}`);
    return data.data;
  },

  async create(loyer: {
    contratId: string;
    mois: number;
    annee: number;
    montantDu: number;
    dateEcheance: string;
    commentaires?: string;
  }): Promise<Loyer> {
    const { data } = await api.post<ApiResponse<Loyer>>('/loyers', loyer);
    return data.data;
  },

  async update(id: string, loyer: Partial<Loyer>): Promise<Loyer> {
    const { data } = await api.put<ApiResponse<Loyer>>(`/loyers/${id}`, loyer);
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/loyers/${id}`);
  },

  async addPaiement(loyerId: string, paiement: {
    montant: number;
    date: string;
    mode?: 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'CAF' | 'PRELEVEMENT';
    payeur?: string;
    reference?: string;
    commentaire?: string;
  }): Promise<{paiement: Paiement, loyer: Loyer}> {
    const { data } = await api.post<ApiResponse<{paiement: Paiement, loyer: Loyer}>>(`/loyers/${loyerId}/paiements`, paiement);
    return data.data;
  },

  async updatePaiement(loyerId: string, paiementId: string, paiement: Partial<Paiement>): Promise<{paiement: Paiement, loyer: Loyer}> {
    const { data } = await api.put<ApiResponse<{paiement: Paiement, loyer: Loyer}>>(`/loyers/${loyerId}/paiements/${paiementId}`, paiement);
    return data.data;
  },

  async deletePaiement(loyerId: string, paiementId: string): Promise<void> {
    await api.delete(`/loyers/${loyerId}/paiements/${paiementId}`);
  },

  async getStats(): Promise<LoyerStats> {
    const { data } = await api.get<ApiResponse<LoyerStats>>('/loyers/stats');
    return data.data;
  },

  async recalculateStatuts(): Promise<{updates: {id: string, ancienStatut: string, nouveauStatut: string}[]}> {
    const { data } = await api.post<ApiResponse<{updates: {id: string, ancienStatut: string, nouveauStatut: string}[]}>>('/loyers/recalculate-statuts');
    return data.data;
  },
};