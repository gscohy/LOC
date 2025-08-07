import { api } from '../lib/api';

export interface ContratDetails {
  contrat: {
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
    updatedAt: string;
    
    // Bien associé
    bien: {
      id: string;
      adresse: string;
      ville: string;
      codePostal: string;
      type: string;
      surface: number;
      nbPieces: number;
      nbChambres: number;
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
    };
    
    // Locataires du contrat
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
        garants: Array<{
          id: string;
          garant: {
            id: string;
            civilite: string;
            nom: string;
            prenom: string;
            email: string;
            telephone?: string;
            profession?: string;
            revenus?: number;
            typeGarantie: string;
          };
        }>;
      };
    }>;
    
    // Loyers du contrat
    loyers: Array<{
      id: string;
      mois: number;
      annee: number;
      montantDu: number;
      montantPaye: number;
      statut: string;
      dateEcheance: string;
      commentaires?: string;
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
        periode: string;
        montant: number;
        statut: string;
        dateGeneration: string;
        dateEnvoi?: string;
        modeEnvoi?: string;
        emailEnvoye: boolean;
      }>;
      rappels: Array<{
        id: string;
        type: string;
        dateEnvoi: string;
        destinataires: string;
        envoye: boolean;
      }>;
      _count: {
        paiements: number;
        quittances: number;
        rappels: number;
      };
    }>;
    
    // Historique du contrat
    historique: Array<{
      id: string;
      action: string;
      description: string;
      dateAction: string;
      metadata?: string;
    }>;
    
    // Compteurs
    _count: {
      locataires: number;
      loyers: number;
      historique: number;
    };
  };
  stats: ContratStats;
  loyersGroupes: Array<{
    statut: string;
    _count: {
      statut: number;
    };
    _sum: {
      montantDu: number;
      montantPaye: number;
    };
  }>;
  paiementsParMode: Array<{
    mode: string;
    _count: {
      mode: number;
    };
    _sum: {
      montant: number;
    };
  }>;
}

export interface ContratStats {
  loyers: {
    total: number;
    payes: number;
    enRetard: number;
    partiels: number;
    enAttente: number;
    tauxPaiement: number;
  };
  finances: {
    montantTotalDu: number;
    montantTotalPaye: number;
    resteAPayer: number;
    pourcentagePaye: number;
  };
  activite: {
    dernierPaiement?: {
      id: string;
      montant: number;
      date: string;
      mode: string;
      payeur: string;
      loyer: {
        mois: number;
        annee: number;
      };
    };
    prochainLoyer?: {
      id: string;
      mois: number;
      annee: number;
      montantDu: number;
      statut: string;
      dateEcheance: string;
    };
    quittancesGenerees: number;
    rappelsEnvoyes: number;
  };
}

export interface LoyerContratDetails {
  id: string;
  mois: number;
  annee: number;
  montantDu: number;
  montantPaye: number;
  statut: string;
  dateEcheance: string;
  commentaires?: string;
  paiements: Array<{
    id: string;
    montant: number;
    date: string;
    mode: string;
    payeur: string;
    reference?: string;
    loyer: {
      id: string;
      mois: number;
      annee: number;
      montantDu: number;
      statut: string;
    };
  }>;
  quittances: Array<{
    id: string;
    statut: string;
    dateGeneration: string;
    dateEnvoi?: string;
    modeEnvoi?: string;
  }>;
  rappels: Array<{
    id: string;
    type: string;
    dateEnvoi: string;
    envoye: boolean;
  }>;
  _count: {
    paiements: number;
    quittances: number;
    rappels: number;
  };
}

export interface PaiementContratDetails {
  id: string;
  montant: number;
  date: string;
  mode: string;
  payeur: string;
  reference?: string;
  loyer: {
    id: string;
    mois: number;
    annee: number;
    montantDu: number;
    statut: string;
  };
}

export interface QuittanceContratDetails {
  id: string;
  periode: string;
  montant: number;
  statut: string;
  dateGeneration: string;
  dateEnvoi?: string;
  modeEnvoi?: string;
  emailEnvoye: boolean;
  loyer: {
    id: string;
    mois: number;
    annee: number;
    montantDu: number;
    montantPaye: number;
  };
}

export const contratsDetailsService = {
  // Récupérer les détails complets d'un contrat
  async getDetails(contratId: string): Promise<ContratDetails> {
    const response = await api.get(`/contrats/${contratId}/details`);
    return response.data.data;
  },

  // Récupérer l'historique des loyers d'un contrat
  async getLoyers(contratId: string, params?: {
    page?: number;
    limit?: number;
    annee?: number;
    statut?: string;
  }): Promise<{
    loyers: LoyerContratDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get(`/contrats/${contratId}/loyers`, { params });
    return response.data.data;
  },

  // Récupérer l'historique des paiements d'un contrat
  async getPaiements(contratId: string, params?: {
    page?: number;
    limit?: number;
    mode?: string;
    annee?: number;
  }): Promise<{
    paiements: PaiementContratDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get(`/contrats/${contratId}/paiements`, { params });
    return response.data.data;
  },

  // Récupérer l'historique des quittances d'un contrat
  async getQuittances(contratId: string, params?: {
    page?: number;
    limit?: number;
    statut?: string;
  }): Promise<{
    quittances: QuittanceContratDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get(`/contrats/${contratId}/quittances`, { params });
    return response.data.data;
  },

  // Utilitaires pour le formatage
  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      HABITATION: 'Habitation',
      COMMERCIAL: 'Commercial',
      PROFESSIONNEL: 'Professionnel',
      MIXTE: 'Mixte',
    };
    return labels[type] || type;
  },

  getStatutLabel(statut: string): string {
    const labels: Record<string, string> = {
      ACTIF: 'Actif',
      RESILIE: 'Résilié',
      EXPIRE: 'Expiré',
      SUSPENDU: 'Suspendu',
    };
    return labels[statut] || statut;
  },

  getStatutBadgeColor(statut: string): 'success' | 'danger' | 'warning' | 'info' | 'gray' {
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

  getGarantieTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      PERSONNE_PHYSIQUE: 'Personne physique',
      ORGANISME: 'Organisme',
      DEPOT_GARANTIE: 'Dépôt de garantie',
      ASSURANCE: 'Assurance loyers impayés',
    };
    return labels[type] || type;
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

  getModesPaiementStats(paiementsParMode: Array<{ mode: string; _count: { mode: number }; _sum: { montant: number } }>): Array<{
    mode: string;
    label: string;
    count: number;
    montant: number;
    pourcentage: number;
  }> {
    const totalMontant = paiementsParMode.reduce((sum, p) => sum + (p._sum.montant || 0), 0);
    
    const modesLabels: Record<string, string> = {
      VIREMENT: 'Virement',
      CHEQUE: 'Chèque',
      ESPECES: 'Espèces',
      PRELEVEMENT: 'Prélèvement',
      AUTRE: 'Autre',
    };

    return paiementsParMode.map(p => ({
      mode: p.mode,
      label: modesLabels[p.mode] || p.mode,
      count: p._count.mode,
      montant: p._sum.montant || 0,
      pourcentage: totalMontant > 0 ? Math.round(((p._sum.montant || 0) / totalMontant) * 100) : 0,
    }));
  },

  getLoyersStatsSummary(loyersGroupes: Array<{ statut: string; _count: { statut: number }; _sum: { montantDu: number; montantPaye: number } }>): {
    total: number;
    montantTotal: number;
    montantPaye: number;
    byStatus: Record<string, { count: number; montantDu: number; montantPaye: number }>;
  } {
    const total = loyersGroupes.reduce((sum, l) => sum + l._count.statut, 0);
    const montantTotal = loyersGroupes.reduce((sum, l) => sum + (l._sum.montantDu || 0), 0);
    const montantPaye = loyersGroupes.reduce((sum, l) => sum + (l._sum.montantPaye || 0), 0);
    
    const byStatus: Record<string, { count: number; montantDu: number; montantPaye: number }> = {};
    loyersGroupes.forEach(l => {
      byStatus[l.statut] = {
        count: l._count.statut,
        montantDu: l._sum.montantDu || 0,
        montantPaye: l._sum.montantPaye || 0,
      };
    });

    return {
      total,
      montantTotal,
      montantPaye,
      byStatus,
    };
  },
};