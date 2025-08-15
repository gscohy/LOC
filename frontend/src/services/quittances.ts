import { api } from '../lib/api';

// Fonction utilitaire pour corriger les URLs de PDF selon l'environnement
const correctPdfUrl = (url: string | undefined): string | undefined => {
  if (!url) return url;
  
  // En développement local, s'assurer d'utiliser le bon port
  if (url.includes('localhost') && url.includes(':3002')) {
    return url.replace(':3002', ':7000');
  }
  
  return url;
};

export interface QuittanceCreate {
  loyerId: string;
}

export interface Quittance {
  id: string;
  loyerId: string;
  periode: string;
  montant: number;
  dateGeneration: string;
  dateEnvoi?: string;
  modeEnvoi: string;
  statut: string;
  pdfPath?: string;
  emailEnvoye: boolean;
  createdAt: string;
  loyer?: {
    id: string;
    mois: number;
    annee: number;
    montantDu: number;
    montantPaye: number;
    statut: string;
    contrat: {
      id: string;
      bien: {
        id: string;
        adresse: string;
        ville: string;
        codePostal: string;
      };
      locataires: Array<{
        locataire: {
          id: string;
          nom: string;
          prenom: string;
          email: string;
        };
      }>;
    };
  };
}

export interface QuittanceStats {
  totaux: {
    total: number;
    generees: number;
    envoyees: number;
    tauxEnvoi: number;
  };
  evolution: {
    ceMois: number;
    moisDernier: number;
    evolution: number;
  };
  repartition: {
    parStatut: Array<{
      statut: string;
      _count: {
        statut: number;
      };
    }>;
  };
}

export const quittancesService = {
  // Créer une nouvelle quittance
  async create(data: QuittanceCreate): Promise<Quittance> {
    const response = await api.post('/quittances', data);
    return response.data.data;
  },

  // Récupérer toutes les quittances avec pagination et filtres
  async getAll(params?: {
    page?: number;
    limit?: number;
    statut?: string;
    loyerId?: string;
    contratId?: string;
    dateDebut?: string;
    dateFin?: string;
  }): Promise<{
    quittances: Quittance[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get('/quittances', { params });
    return response.data.data;
  },

  // Récupérer une quittance par ID
  async getById(id: string): Promise<Quittance> {
    const response = await api.get(`/quittances/${id}`);
    return response.data.data;
  },

  // Renvoyer une quittance par email
  async resend(id: string): Promise<void> {
    await api.post(`/quittances/${id}/resend`);
  },

  // Générer une prévisualisation de quittance sans l'envoyer
  async preview(data: QuittanceCreate): Promise<{
    emailContent: {
      subject: string;
      html: string;
      to: string[];
    };
    pdfUrl?: string;
  }> {
    const response = await api.post('/quittances/preview', data);
    const result = response.data.data;
    
    // Corriger l'URL du PDF si nécessaire
    if (result.pdfUrl) {
      result.pdfUrl = correctPdfUrl(result.pdfUrl);
    }
    
    return result;
  },

  // Récupérer les statistiques des quittances
  async getStats(): Promise<QuittanceStats> {
    const response = await api.get('/quittances/stats');
    return response.data.data;
  },

  // Utilitaires pour formater les données
  formatPeriode(mois: number, annee: number): string {
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

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  // Obtenir la couleur d'un statut de quittance
  getStatutColor(statut: string): string {
    switch (statut) {
      case 'GENEREE':
        return 'bg-blue-100 text-blue-800';
      case 'ENVOYEE':
        return 'bg-green-100 text-green-800';
      case 'ERREUR':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  },

  // Obtenir le label d'un statut
  getStatutLabel(statut: string): string {
    switch (statut) {
      case 'GENEREE':
        return 'Générée';
      case 'ENVOYEE':
        return 'Envoyée';
      case 'ERREUR':
        return 'Erreur';
      default:
        return statut;
    }
  },
};