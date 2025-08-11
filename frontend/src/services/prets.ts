import { api } from '../lib/api';

export interface PretImmobilier {
  id: string;
  bienId: string;
  nom: string;
  banque: string;
  numeroPret?: string;
  montantEmprunte: number;
  tauxInteret: number;
  dureeAnnees: number;
  dateDebut: string;
  dateFin: string;
  mensualiteBase: number;
  mensualiteAssurance: number;
  statut: 'ACTIF' | 'SOLDE' | 'SUSPENDU';
  fichierOriginal?: string;
  dateImport: string;
  commentaires?: string;
  createdAt: string;
  updatedAt: string;
  bien?: {
    id: string;
    adresse: string;
    ville: string;
    codePostal: string;
    proprietaires?: Array<{
      proprietaire: {
        id: string;
        nom: string;
        prenom: string;
      };
    }>;
  };
  echeances?: EcheancePret[];
  _count?: {
    echeances: number;
  };
}

export interface EcheancePret {
  id: string;
  pretId: string;
  rang: number;
  dateEcheance: string;
  montantRecouvrer: number;
  capitalAmorti: number;
  partInterets: number;
  partAccessoires: number;
  capitalRestant: number;
  createdAt: string;
  updatedAt: string;
}

export interface FiscalitePret {
  pret: {
    id: string;
    nom: string;
    banque: string;
    bien: {
      adresse: string;
      ville: string;
    };
  };
  annee: number;
  totaux: {
    interets: number;
    assurance: number;
    capital: number;
    mensualites: number;
  };
  echeances: EcheancePret[];
  nombreEcheances: number;
}

export interface StatistiquesAnnuelles {
  annee: number;
  totauxGlobaux: {
    interets: number;
    assurance: number;
    capital: number;
    mensualites: number;
  };
  statsParPret: Array<{
    pret: PretImmobilier;
    totaux: {
      interets: number;
      assurance: number;
      capital: number;
      mensualites: number;
    };
    nombreEcheances: number;
  }>;
  nombrePrets: number;
}

export interface CreatePretData {
  bienId: string;
  nom: string;
  banque: string;
  numeroPret?: string;
  montantEmprunte: number;
  tauxInteret: number;
  dureeAnnees: number;
  dateDebut: string;
  dateFin: string;
  mensualiteBase: number;
  mensualiteAssurance?: number;
  statut?: 'ACTIF' | 'SOLDE' | 'SUSPENDU';
  commentaires?: string;
}

export const pretsService = {
  // Récupérer tous les prêts
  async getAll(params?: { 
    page?: number; 
    limit?: number; 
    bienId?: string; 
    statut?: string; 
  }) {
    const response = await api.get('/prets', { params });
    return response.data;
  },

  // Récupérer un prêt par ID avec ses échéances
  async getById(id: string) {
    const response = await api.get(`/prets/${id}`);
    return response.data;
  },

  // Créer un nouveau prêt
  async create(data: CreatePretData) {
    const response = await api.post('/prets', data);
    return response.data;
  },

  // Mettre à jour un prêt
  async update(id: string, data: Partial<CreatePretData>) {
    const response = await api.put(`/prets/${id}`, data);
    return response.data;
  },

  // Supprimer un prêt
  async delete(id: string) {
    const response = await api.delete(`/prets/${id}`);
    return response.data;
  },

  // Upload du tableau d'amortissement Excel
  async uploadTableau(id: string, file: File) {
    const formData = new FormData();
    formData.append('tableau', file);

    const response = await api.post(`/prets/${id}/upload-tableau`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Récupérer les données fiscales pour une année
  async getFiscaliteAnnee(id: string, annee: number): Promise<{ success: boolean; data: FiscalitePret }> {
    const response = await api.get(`/prets/${id}/fiscalite/${annee}`);
    return response.data;
  },

  // Récupérer les statistiques annuelles de tous les prêts
  async getStatistiquesAnnuelles(annee?: number): Promise<{ success: boolean; data: StatistiquesAnnuelles }> {
    const response = await api.get('/prets/stats/annuelle', {
      params: { annee }
    });
    return response.data;
  },

  // Utilitaires pour les calculs
  calculateMonthlyPayment(capital: number, tauxAnnuel: number, dureeAnnees: number): number {
    const tauxMensuel = tauxAnnuel / 100 / 12;
    const nombreMensualites = dureeAnnees * 12;
    
    if (tauxMensuel === 0) {
      return capital / nombreMensualites;
    }
    
    return capital * (tauxMensuel * Math.pow(1 + tauxMensuel, nombreMensualites)) / 
           (Math.pow(1 + tauxMensuel, nombreMensualites) - 1);
  },

  // Formatter les montants en euros
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  },

  // Formatter les pourcentages
  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  },

  // Calculer le taux d'endettement (à titre informatif)
  calculateDebtRatio(mensualiteTotale: number, revenusMensuels: number): number {
    if (revenusMensuels === 0) return 0;
    return (mensualiteTotale / revenusMensuels) * 100;
  },

  // Estimer le coût total du crédit
  calculateTotalCost(mensualite: number, dureeAnnees: number, montantEmprunte: number): {
    coutTotal: number;
    coutCredit: number;
    tauxEndettement: number;
  } {
    const coutTotal = mensualite * dureeAnnees * 12;
    const coutCredit = coutTotal - montantEmprunte;
    const tauxEndettement = (coutCredit / montantEmprunte) * 100;
    
    return {
      coutTotal,
      coutCredit,
      tauxEndettement
    };
  }
};