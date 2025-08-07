import { api } from '../lib/api';
import { Bien, PaginatedResponse, ApiResponse } from '@/types';

interface BiensParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  statut?: string;
}

export const biensService = {
  async getAll(params?: BiensParams): Promise<PaginatedResponse<Bien>> {
    const { data } = await api.get<ApiResponse<{biens: Bien[], pagination: any}>>('/biens', {
      params,
    });
    return {
      data: data.data.biens,
      pagination: data.data.pagination
    };
  },

  async getById(id: string): Promise<Bien> {
    const { data } = await api.get<ApiResponse<Bien>>(`/biens/${id}`);
    return data.data;
  },

  async create(bien: Omit<Bien, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bien> {
    const { data } = await api.post<ApiResponse<Bien>>('/biens', bien);
    return data.data;
  },

  async update(id: string, bien: Partial<Bien>): Promise<Bien> {
    const { data } = await api.put<ApiResponse<Bien>>(`/biens/${id}`, bien);
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/biens/${id}`);
  },
};