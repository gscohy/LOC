import { api } from '../lib/api';

export interface ResiliationRequest {
  dateFinReelle: string;
  raisonResiliation: string;
  dateDemandeResiliation?: string;
  preavisRespect?: boolean;
  commentairesResiliation?: string;
}

export interface ResiliationDetails {
  contrat: {
    id: string;
    loyer: number;
    adresseBien: string;
  };
  resiliationDetails: {
    dateFinProposee: Date;
    moisResiliation: number;
    anneeResiliation: number;
    jourResiliation: number;
    dernierJourMois: number;
    joursOccupes: number;
    prorataCoeff: number;
    loyerComplet: number;
    prorataLoyer: number;
    economie: number;
    loyerExistant?: {
      id: string;
      montantActuel: number;
      montantPaye: number;
      statut: string;
    } | null;
  };
}

export interface ResiliationResponse {
  contrat: any;
  prorataLoyer: number | null;
  loyerAffecte: string | null;
}

export const resiliationService = {
  // Calculer les détails de résiliation pour une date donnée
  async calculateResiliationDetails(contratId: string, dateFinProposee: string): Promise<ResiliationDetails> {
    const { data } = await api.get(`/contrats/${contratId}/resiliation-details`, {
      params: { dateFinProposee }
    });
    return data.data;
  },

  // Demander la résiliation anticipée d'un contrat
  async requestResiliation(contratId: string, resiliationData: ResiliationRequest): Promise<ResiliationResponse> {
    const { data } = await api.put(`/contrats/${contratId}/resiliation`, resiliationData);
    return data.data;
  },

  // Formater la date pour affichage
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  },

  // Formater le montant en euros
  formatCurrency(amount: number): string {
    return amount.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },

  // Calculer le pourcentage du mois occupé
  formatProrataPercentage(coefficient: number): string {
    return `${Math.round(coefficient * 100)}%`;
  },

  // Générer les options de raisons de résiliation
  getRaisonsResiliation(): Array<{ value: string; label: string }> {
    return [
      { value: 'DEMENAGEMENT', label: 'Déménagement professionnel' },
      { value: 'ACHAT_LOGEMENT', label: 'Achat d\'un nouveau logement' },
      { value: 'CHANGEMENT_FAMILIAL', label: 'Changement de situation familiale' },
      { value: 'PROBLEMES_FINANCIERS', label: 'Difficultés financières' },
      { value: 'INSATISFACTION', label: 'Insatisfaction du logement' },
      { value: 'MUTATION', label: 'Mutation professionnelle' },
      { value: 'RETRAITE', label: 'Départ à la retraite' },
      { value: 'RAPPROCHEMENT_FAMILLE', label: 'Rapprochement familial' },
      { value: 'AUTRE', label: 'Autre raison' },
    ];
  },

  // Obtenir le label d'une raison de résiliation
  getRaisonLabel(raison: string): string {
    const raisons = this.getRaisonsResiliation();
    const raisonFound = raisons.find(r => r.value === raison);
    return raisonFound ? raisonFound.label : raison;
  },

  // Valider les données de résiliation
  validateResiliation(data: Partial<ResiliationRequest>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.dateFinReelle) {
      errors.push('La date de fin réelle est requise');
    } else {
      const dateFinReelle = new Date(data.dateFinReelle);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFinReelle < today) {
        errors.push('La date de fin réelle ne peut pas être dans le passé');
      }

      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      if (dateFinReelle > maxDate) {
        errors.push('La date de fin ne peut pas être supérieure à un an');
      }
    }

    if (!data.raisonResiliation) {
      errors.push('La raison de résiliation est requise');
    }

    if (data.dateDemandeResiliation) {
      const dateDemandeResiliation = new Date(data.dateDemandeResiliation);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (dateDemandeResiliation > today) {
        errors.push('La date de demande ne peut pas être dans le futur');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Calculer le préavis légal (3 mois pour les logements non meublés, 1 mois pour les meublés)
  calculatePreavisLegal(typeContrat: string = 'HABITATION'): number {
    // En mois
    switch (typeContrat) {
      case 'MEUBLE':
        return 1;
      case 'ETUDIANT':
        return 1;
      default:
        return 3; // Logement non meublé
    }
  },

  // Calculer la date de fin théorique avec préavis
  calculateDateFinAvecPreavis(dateDemandeResiliation: string, typeContrat: string = 'HABITATION'): Date {
    const datedemande = new Date(dateDemandeResiliation);
    const preavisMois = this.calculatePreavisLegal(typeContrat);
    
    const dateFinTheorique = new Date(datedemande);
    dateFinTheorique.setMonth(dateFinTheorique.getMonth() + preavisMois);
    
    return dateFinTheorique;
  },

  // Vérifier si le préavis est respecté
  isPreavisRespected(dateDemandeResiliation: string, dateFinReelle: string, typeContrat: string = 'HABITATION'): boolean {
    const dateFinTheorique = this.calculateDateFinAvecPreavis(dateDemandeResiliation, typeContrat);
    const dateFinReelleDate = new Date(dateFinReelle);
    
    return dateFinReelleDate >= dateFinTheorique;
  },

  // Obtenir la date d'aujourd'hui au format ISO
  getTodayISOString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Obtenir le premier jour du mois prochain
  getNextMonthFirstDay(): String {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const year = nextMonth.getFullYear();
    const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }
};