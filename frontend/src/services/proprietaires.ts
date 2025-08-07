import { api } from '../lib/api';
import { Proprietaire, PaginatedResponse, ApiResponse } from '@/types';

interface ProprietairesParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: 'PHYSIQUE' | 'MORALE';
}

interface ProprietaireStats {
  totalBiens: number;
  biensLoues: number;
  biensVacants: number;
  tauxOccupation: number;
  revenusAnnee: number;
  chargesAnnee: number;
  beneficeAnnee: number;
}

export const proprietairesService = {
  async getAll(params?: ProprietairesParams): Promise<PaginatedResponse<Proprietaire>> {
    const { data } = await api.get<ApiResponse<{proprietaires: Proprietaire[], pagination: any}>>('/proprietaires', {
      params,
    });
    return {
      data: data.data.proprietaires,
      pagination: data.data.pagination
    };
  },

  async getById(id: string): Promise<Proprietaire> {
    const { data } = await api.get<ApiResponse<Proprietaire>>(`/proprietaires/${id}`);
    return data.data;
  },

  async create(proprietaire: Omit<Proprietaire, 'id' | 'createdAt' | 'updatedAt'>): Promise<Proprietaire> {
    const { data } = await api.post<ApiResponse<Proprietaire>>('/proprietaires', proprietaire);
    return data.data;
  },

  async update(id: string, proprietaire: Partial<Proprietaire>): Promise<Proprietaire> {
    const { data } = await api.put<ApiResponse<Proprietaire>>(`/proprietaires/${id}`, proprietaire);
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/proprietaires/${id}`);
  },

  async uploadSignature(id: string, file: File): Promise<{ signature: string; filename: string }> {
    const formData = new FormData();
    formData.append('signature', file);
    
    const { data } = await api.post<ApiResponse<{ signature: string; filename: string }>>(`/proprietaires/${id}/signature`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data.data;
  },

  async deleteSignature(id: string): Promise<void> {
    await api.delete(`/proprietaires/${id}/signature`);
  },

  async getStats(id: string): Promise<ProprietaireStats> {
    const { data } = await api.get<ApiResponse<ProprietaireStats>>(`/proprietaires/${id}/stats`);
    return data.data;
  },
};