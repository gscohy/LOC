import { api } from '../lib/api';

export interface BienDetails {
  bien: {
    id: string;
    adresse: string;
    ville: string;
    codePostal: string;
    type: string;
    surface: number;
    nbPieces: number;
    nbChambres: number;
    loyer: number;
    chargesMensuelles: number;
    depotGarantie: number;
    statut: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    proprietaires: Array<{
      id: string;
      quotePart: number;
      proprietaire: {
        id: string;
        nom: string;
        prenom: string;
        email: string;
        telephone?: string;
        type: string;
      };
    }>;
    contrats: {
      actuel: ContratDetails | null;
      precedents: ContratDetails[];
    };
    charges: Array<{
      id: string;
      categorie: string;
      description: string;
      montant: number;
      date: string;
      type: string;
      payee: boolean;
    }>;
    _count: {
      contrats: number;
      charges: number;
    };
  };
  stats: BienStats;
  loyersRecents: LoyerDetails[];
}

export interface ContratDetails {
  id: string;
  dateDebut: string;
  dateFin?: string;
  duree: number;
  loyer: number;
  chargesMensuelles: number;
  depotGarantie: number;
  jourPaiement: number;
  type: string;
  statut: string;
  clausesParticulieres?: string;
  createdAt: string;
  locataires: Array<{
    id: string;
    locataire: {
      id: string;
      civilite: string;
      nom: string;
      prenom: string;
      email: string;
      telephone: string;
      profession?: string;
      revenus?: number;
    };
  }>;
  loyers: LoyerDetails[];
  historique: Array<{
    id: string;
    action: string;
    description: string;
    dateAction: string;
    metadata?: string;
  }>;
  _count: {
    locataires: number;
    loyers: number;
    historique: number;
  };
}

export interface LoyerDetails {
  id: string;
  mois: number;
  annee: number;
  montantDu: number;
  montantPaye: number;
  statut: string;
  dateEcheance: string;
  commentaires?: string;
  contrat?: {
    id: string;
    locataires: Array<{
      locataire: {
        nom: string;
        prenom: string;
      };
    }>;
  };
  paiements: Array<{
    id: string;
    montant: number;
    date: string;
    mode: string;
    payeur: string;
    reference?: string;
  }>;
  quittances: Array<{
    id: string;
    statut: string;
    dateGeneration: string;
    dateEnvoi?: string;
  }>;
  _count: {
    paiements: number;
    quittances: number;
    rappels: number;
  };
}

export interface BienStats {
  loyers: {
    total: number;
    payes: number;
    enRetard: number;
    tauxPaiement: number;
  };
  finances: {
    revenus12Mois: number;
    chargesAnnee: number;
    beneficeAnnee: number;
    rentabilite: number;
  };
  occupation: {
    tauxOccupation: number;
    moisOccupes: number;
    moisLibres: number;
  };
  dernierContrat?: ContratDetails;
}

export interface ContratHistory {
  actuel: ContratDetails | null;
  precedents: ContratDetails[];
  total: number;
}

export const biensDetailsService = {
  // Récupérer les détails complets d'un bien
  async getDetails(bienId: string): Promise<BienDetails> {
    console.log('🔍 Fetching bien details for ID:', bienId);
    try {
      const response = await api.get(`/biens/${bienId}/details`);
      console.log('✅ Bien details loaded:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ Error fetching bien details:', error);
      throw error;
    }
  },

  // Récupérer l'historique des loyers d'un bien
  async getLoyers(bienId: string, params?: {
    page?: number;
    limit?: number;
    annee?: number;
    statut?: string;
  }): Promise<{
    loyers: LoyerDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get(`/biens/${bienId}/loyers`, { params });
    return response.data.data;
  },

  // Récupérer l'historique des contrats d'un bien
  async getContrats(bienId: string): Promise<ContratHistory> {
    const response = await api.get(`/biens/${bienId}/contrats`);
    return response.data.data;
  },

  // Utilitaires pour le formatage
  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      APPARTEMENT: 'Appartement',
      MAISON: 'Maison',
      STUDIO: 'Studio',
      LOCAL: 'Local commercial',
      GARAGE: 'Garage',
    };
    return labels[type] || type;
  },

  getStatutLabel(statut: string): string {
    const labels: Record<string, string> = {
      VACANT: 'Vacant',
      LOUE: 'Loué',
      TRAVAUX: 'En travaux',
    };
    return labels[statut] || statut;
  },

  getStatutBadgeColor(statut: string): 'success' | 'danger' | 'warning' | 'info' | 'gray' {
    switch (statut) {
      case 'LOUE':
        return 'success';
      case 'VACANT':
        return 'warning';
      case 'TRAVAUX':
        return 'info';
      default:
        return 'gray';
    }
  },

  getLoyerStatutLabel(statut: string): string {
    const labels: Record<string, string> = {
      'EN_ATTENTE': 'En attente',
      'PAYE': 'Payé',
      'PARTIEL': 'Payé partiellement',
      'RETARD': 'En retard',
    };
    return labels[statut] || statut;
  },

  getLoyerStatutColor(statut: string): 'success' | 'danger' | 'warning' | 'info' | 'gray' {
    switch (statut) {
      case 'PAYE':
        return 'success';
      case 'RETARD':
        return 'danger';
      case 'PARTIEL':
        return 'warning';
      case 'EN_ATTENTE':
        return 'info';
      default:
        return 'gray';
    }
  },

  getContratStatutLabel(statut: string): string {
    const labels: Record<string, string> = {
      ACTIF: 'Actif',
      RESILIE: 'Résilié',
      EXPIRE: 'Expiré',
      SUSPENDU: 'Suspendu',
    };
    return labels[statut] || statut;
  },

  getContratStatutColor(statut: string): 'success' | 'danger' | 'warning' | 'info' | 'gray' {
    switch (statut) {
      case 'ACTIF':
        return 'success';
      case 'RESILIE':
      case 'EXPIRE':
        return 'danger';
      case 'SUSPENDU':
        return 'warning';
      default:
        return 'gray';
    }
  },

  formatMoisAnnee(mois: number, annee: number): string {
    const moisLabels = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return `${moisLabels[mois - 1]} ${annee}`;
  },

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  },

  formatCurrency(amount: number): string {
    return amount.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  },

  calculateDureeContrat(dateDebut: string, dateFin?: string): string {
    const debut = new Date(dateDebut);
    const fin = dateFin ? new Date(dateFin) : new Date();
    
    const diffTime = Math.abs(fin.getTime() - debut.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    
    if (diffMonths < 1) {
      return `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else if (diffMonths < 12) {
      return `${diffMonths} mois`;
    } else {
      const annees = Math.floor(diffMonths / 12);
      const moisRestants = diffMonths % 12;
      return moisRestants > 0 
        ? `${annees} an${annees > 1 ? 's' : ''} et ${moisRestants} mois`
        : `${annees} an${annees > 1 ? 's' : ''}`;
    }
  },
};