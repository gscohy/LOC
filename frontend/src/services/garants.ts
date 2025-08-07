import { api } from '../lib/api';

export interface Garant {
  id: string;
  civilite: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  profession?: string;
  revenus?: number;
  typeGarantie: string;
  documents?: string;
  createdAt: string;
  updatedAt: string;
  locataires?: {
    id: string;
    locataire: {
      id: string;
      nom: string;
      prenom: string;
      email: string;
    };
  }[];
}

export interface CreateGarantData {
  civilite?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  profession?: string;
  revenus?: number;
  typeGarantie?: string;
  documents?: string;
}

export interface UpdateGarantData extends Partial<CreateGarantData> {}

export interface GarantsListParams {
  page?: number;
  limit?: number;
  search?: string;
  typeGarantie?: string;
}

export interface GarantsListResponse {
  garants: Garant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const garantsService = {
  // Récupérer la liste des garants
  async getAll(params: GarantsListParams = {}): Promise<{ data: GarantsListResponse }> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.typeGarantie) searchParams.append('typeGarantie', params.typeGarantie);

    const response = await api.get(`/garants?${searchParams.toString()}`);
    return response.data;
  },

  // Récupérer un garant par ID
  async getById(id: string): Promise<{ data: Garant }> {
    const response = await api.get(`/garants/${id}`);
    return response.data;
  },

  // Créer un nouveau garant
  async create(data: CreateGarantData): Promise<{ data: Garant }> {
    const response = await api.post('/garants', data);
    return response.data;
  },

  // Modifier un garant
  async update(id: string, data: UpdateGarantData): Promise<{ data: Garant }> {
    const response = await api.put(`/garants/${id}`, data);
    return response.data;
  },

  // Supprimer un garant
  async delete(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/garants/${id}`);
    return response.data;
  },

  // Associer un garant à un locataire
  async associateToLocataire(garantId: string, locataireId: string): Promise<{ data: any }> {
    const response = await api.post(`/garants/${garantId}/associate`, { locataireId });
    return response.data;
  },

  // Dissocier un garant d'un locataire
  async dissociateFromLocataire(garantId: string, locataireId: string): Promise<{ message: string }> {
    const response = await api.delete(`/garants/${garantId}/dissociate`, { 
      data: { locataireId } 
    });
    return response.data;
  }
};