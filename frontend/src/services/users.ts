import { api } from '../lib/api';
import { PaginatedResponse, ApiResponse } from '@/types';

export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: 'ADMIN' | 'GESTIONNAIRE' | 'LECTEUR';
  structure?: string;
  typeCollab?: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  dateEmbauche?: string;
  statut: 'ACTIF' | 'INACTIF' | 'SUSPENDU';
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  total: number;
  recent: number;
  parRole: {
    role: string;
    _count: { role: number };
  }[];
  parStructure: {
    structure: string;
    _count: { structure: number };
  }[];
  parTypeCollab: {
    typeCollab: string;
    _count: { typeCollab: number };
  }[];
  parStatut: {
    statut: string;
    _count: { statut: number };
  }[];
}

export interface FilterOptions {
  structures: string[];
  typesCollab: string[];
  roles: string[];
  statuts: string[];
}

interface UsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  structure?: string;
  typeCollab?: string;
  statut?: string;
}

export const usersService = {
  async getAll(params?: UsersParams): Promise<PaginatedResponse<User>> {
    const { data } = await api.get<ApiResponse<{users: User[], pagination: any}>>('/users', {
      params,
    });
    return {
      data: data.data.users,
      pagination: data.data.pagination
    };
  },

  async getById(id: string): Promise<User> {
    const { data } = await api.get<ApiResponse<User>>(`/users/${id}`);
    return data.data;
  },

  async create(user: {
    email: string;
    nom: string;
    prenom: string;
    role?: 'ADMIN' | 'GESTIONNAIRE' | 'LECTEUR';
    structure?: string;
    typeCollab?: string;
    telephone?: string;
    adresse?: string;
    ville?: string;
    codePostal?: string;
    dateEmbauche?: string;
    statut?: 'ACTIF' | 'INACTIF' | 'SUSPENDU';
    password?: string;
  }): Promise<User> {
    const { data } = await api.post<ApiResponse<User>>('/users', user);
    return data.data;
  },

  async update(id: string, user: Partial<User & { password?: string }>): Promise<User> {
    const { data } = await api.put<ApiResponse<User>>(`/users/${id}`, user);
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  async getStats(): Promise<UserStats> {
    const { data } = await api.get<ApiResponse<UserStats>>('/users/stats');
    return data.data;
  },

  async getFilterOptions(): Promise<FilterOptions> {
    const { data } = await api.get<ApiResponse<FilterOptions>>('/users/filters/options');
    return data.data;
  },
};