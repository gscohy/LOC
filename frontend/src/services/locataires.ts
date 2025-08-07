import { api } from '../lib/api';
import { Locataire, PaginatedResponse, ApiResponse, Contrat, Loyer, Paiement } from '@/types';

export interface LocataireDetails extends Omit<Locataire, 'contrats'> {
  contrats: Array<{
    id: string;
    contrat: Contrat & {
      bien: {
        id: string;
        adresse: string;
        ville: string;
        codePostal: string;
        type: string;
        surface: number;
        nbPieces: number;
      };
      loyers: Array<Loyer & {
        paiements: Paiement[];
      }>;
    };
  }>;
  stats: {
    nombreContrats: number;
    contratsActifs: number;
    totalLoyers: number;
    totalPaye: number;
    soldeRestant: number;
  };
}

interface LocatairesParams {
  page?: number;
  limit?: number;
  search?: string;
  statut?: 'ACTIF' | 'INACTIF';
}

export const locatairesService = {
  async getAll(params?: LocatairesParams): Promise<PaginatedResponse<Locataire>> {
    const { data } = await api.get<ApiResponse<{locataires: Locataire[], pagination: any}>>('/locataires', {
      params,
    });
    return {
      data: data.data.locataires,
      pagination: data.data.pagination
    };
  },

  async getById(id: string): Promise<Locataire> {
    const { data } = await api.get<ApiResponse<Locataire>>(`/locataires/${id}`);
    return data.data;
  },

  async getDetails(id: string): Promise<LocataireDetails> {
    const { data } = await api.get<ApiResponse<LocataireDetails>>(`/locataires/${id}/details`);
    return data.data;
  },

  async create(locataire: Omit<Locataire, 'id' | 'createdAt' | 'updatedAt'>): Promise<Locataire> {
    const { data } = await api.post<ApiResponse<Locataire>>('/locataires', locataire);
    return data.data;
  },

  async update(id: string, locataire: Partial<Locataire>): Promise<Locataire> {
    const { data } = await api.put<ApiResponse<Locataire>>(`/locataires/${id}`, locataire);
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/locataires/${id}`);
  },
};