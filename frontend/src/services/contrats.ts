import { api } from '../lib/api';
import { Contrat, ApiResponse, PaginatedResponse } from '@/types';

export interface ContratsParams {
  page?: number;
  limit?: number;
  search?: string;
  statut?: string;
  bienId?: string;
  locataireId?: string;
}

export interface ContratStats {
  total: number;
  actifs: number;
  par_statut: Array<{
    statut: string;
    _count: { id: number };
  }>;
  par_type: Array<{
    type: string;
    _count: { id: number };
  }>;
  loyer_moyen: number;
  loyer_total: number;
}

export interface ContratCreateData {
  bienId: string;
  dateDebut: string;
  dateFin?: string;
  duree?: number;
  loyer: number;
  chargesMensuelles?: number;
  depotGarantie?: number;
  jourPaiement?: number;
  fraisNotaire?: number;
  fraisHuissier?: number;
  type?: 'HABITATION' | 'COMMERCIAL' | 'SAISONNIER' | 'ETUDIANT';
  statut?: 'ACTIF' | 'RESILIE' | 'EXPIRE' | 'SUSPENDU';
  clausesParticulieres?: string;
  documents?: string[];
  locataires: string[];
}

export interface ContratUpdateData {
  dateDebut?: string;
  dateFin?: string;
  duree?: number;
  loyer?: number;
  chargesMensuelles?: number;
  depotGarantie?: number;
  jourPaiement?: number;
  fraisNotaire?: number;
  fraisHuissier?: number;
  type?: 'HABITATION' | 'COMMERCIAL' | 'SAISONNIER' | 'ETUDIANT';
  statut?: 'ACTIF' | 'RESILIE' | 'EXPIRE' | 'SUSPENDU';
  clausesParticulieres?: string;
  documents?: string[];
  commentaires?: string;
}

export interface ContratStatutData {
  statut: 'ACTIF' | 'RESILIE' | 'EXPIRE' | 'SUSPENDU';
  motif?: string;
}

export const contratsService = {
  async getAll(params?: ContratsParams): Promise<PaginatedResponse<Contrat>> {
    const { data } = await api.get<ApiResponse<{contrats: Contrat[], pagination: any}>>('/contrats', {
      params,
    });
    return {
      data: data.data.contrats,
      pagination: data.data.pagination
    };
  },

  async getById(id: string): Promise<Contrat> {
    const { data } = await api.get<ApiResponse<Contrat>>(`/contrats/${id}`);
    return data.data;
  },

  async getStats(): Promise<ContratStats> {
    const { data } = await api.get<ApiResponse<ContratStats>>('/contrats/stats');
    return data.data;
  },

  async create(contratData: ContratCreateData): Promise<Contrat> {
    const { data } = await api.post<ApiResponse<Contrat>>('/contrats', contratData);
    return data.data;
  },

  async update(id: string, contratData: ContratUpdateData): Promise<Contrat> {
    const { data } = await api.put<ApiResponse<Contrat>>(`/contrats/${id}`, contratData);
    return data.data;
  },

  async updateStatut(id: string, statutData: ContratStatutData): Promise<Contrat> {
    const { data } = await api.put<ApiResponse<Contrat>>(`/contrats/${id}/statut`, statutData);
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/contrats/${id}`);
  },

  async getByBien(bienId: string): Promise<{ data: any[] }> {
    const response = await api.get(`/contrats?bienId=${bienId}&limit=1000`);
    return response.data;
  },

  // Méthodes utilitaires
  getStatutLabel(statut: string): string {
    const labels: Record<string, string> = {
      ACTIF: 'Actif',
      RESILIE: 'Résilié',
      EXPIRE: 'Expiré',
      SUSPENDU: 'Suspendu',
    };
    return labels[statut] || statut;
  },

  getStatutColor(statut: string): string {
    const colors: Record<string, string> = {
      ACTIF: 'success',
      RESILIE: 'danger',
      EXPIRE: 'warning',
      SUSPENDU: 'info',
    };
    return colors[statut] || 'gray';
  },

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      HABITATION: 'Habitation',
      COMMERCIAL: 'Commercial',
      SAISONNIER: 'Saisonnier',
      ETUDIANT: 'Étudiant',
    };
    return labels[type] || type;
  },

  formatDateFr(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  },

  calculerDateFin(dateDebut: string, dureeEnMois: number): string {
    const date = new Date(dateDebut);
    date.setMonth(date.getMonth() + dureeEnMois);
    return date.toISOString().split('T')[0];
  },

  calculerDureeRestante(dateFin: string): number {
    const maintenant = new Date();
    const fin = new Date(dateFin);
    const diffTime = fin.getTime() - maintenant.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  },

  isExpireSoon(dateFin: string, seuilJours: number = 30): boolean {
    const joursRestants = this.calculerDureeRestante(dateFin);
    return joursRestants <= seuilJours && joursRestants > 0;
  },

  isExpire(dateFin: string): boolean {
    return this.calculerDureeRestante(dateFin) <= 0;
  },
};