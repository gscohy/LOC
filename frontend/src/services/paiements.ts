import { api } from '../lib/api';

export interface PaiementCreate {
  loyerId: string;
  montant: number;
  date: string;
  mode: string;
  payeur: string;
  reference?: string;
  commentaires?: string;
}

export interface PaiementUpdate {
  montant?: number;
  date?: string;
  mode?: string;
  payeur?: string;
  reference?: string;
  commentaires?: string;
}

export interface Paiement {
  id: string;
  loyerId: string;
  montant: number;
  date: string;
  mode: string;
  payeur: string;
  reference?: string;
  commentaires?: string;
  createdAt: string;
  updatedAt: string;
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
        };
      }>;
    };
  };
}

export interface PaiementBulk {
  paiements: PaiementCreate[];
}

export const paiementsService = {
  // Créer un nouveau paiement
  async create(data: PaiementCreate): Promise<{ paiement: Paiement; loyerMisAJour: any }> {
    const response = await api.post('/paiements', data);
    return response.data.data;
  },

  // Récupérer les détails d'un paiement
  async getById(id: string): Promise<Paiement> {
    const response = await api.get(`/paiements/${id}`);
    return response.data.data;
  },

  // Modifier un paiement existant
  async update(id: string, data: PaiementUpdate): Promise<{ paiement: Paiement; loyer: any }> {
    const response = await api.put(`/paiements/${id}`, data);
    return response.data.data;
  },

  // Supprimer un paiement
  async delete(id: string): Promise<void> {
    await api.delete(`/paiements/${id}`);
  },

  // Créer plusieurs paiements en une fois
  async createBulk(data: PaiementBulk): Promise<Paiement[]> {
    console.log('🔍 PaiementsService.createBulk - Données envoyées:', data);
    try {
      const response = await api.post('/paiements/bulk', data);
      console.log('✅ PaiementsService.createBulk - Réponse reçue:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ PaiementsService.createBulk - Erreur:', error);
      throw error;
    }
  },

  // Utilitaires pour les modes de paiement
  getModesPaiement(): Array<{ value: string; label: string }> {
    return [
      { value: 'VIREMENT', label: 'Virement bancaire' },
      { value: 'CHEQUE', label: 'Chèque' },
      { value: 'ESPECES', label: 'Espèces' },
      { value: 'PRELEVEMENT', label: 'Prélèvement automatique' },
      { value: 'CARTE_BANCAIRE', label: 'Carte bancaire' },
      { value: 'PAYPAL', label: 'PayPal' },
      { value: 'AUTRE', label: 'Autre' },
    ];
  },

  // Obtenir le label d'un mode de paiement
  getModeLabel(mode: string): string {
    const modes = this.getModesPaiement();
    const modeFound = modes.find(m => m.value === mode);
    return modeFound ? modeFound.label : mode;
  },

  // Valider les données d'un paiement
  validatePaiement(data: Partial<PaiementCreate>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.loyerId) {
      errors.push('Le loyer est requis');
    }

    if (!data.montant || data.montant <= 0) {
      errors.push('Le montant doit être supérieur à 0');
    }

    if (!data.date) {
      errors.push('La date de paiement est requise');
    } else {
      // Vérifier que la date n'est pas dans le futur (tolérance de 1 jour)
      const datePaiement = new Date(data.date);
      const demain = new Date();
      demain.setDate(demain.getDate() + 1);
      
      if (datePaiement > demain) {
        errors.push('La date de paiement ne peut pas être dans le futur');
      }
    }

    if (!data.mode) {
      errors.push('Le mode de paiement est requis');
    }

    if (!data.payeur || data.payeur.trim().length === 0) {
      errors.push('Le nom du payeur est requis');
    }

    // Validation spécifique selon le mode de paiement
    if (data.mode === 'CHEQUE' && (!data.reference || data.reference.trim().length === 0)) {
      errors.push('Le numéro de chèque est requis pour un paiement par chèque');
    }

    if (data.mode === 'VIREMENT' && (!data.reference || data.reference.trim().length === 0)) {
      errors.push('La référence du virement est recommandée');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Calculer le montant maximum autorisé pour un paiement
  calculateMontantMaximum(loyer: { montantDu: number; montantPaye: number }): number {
    return Math.max(0, loyer.montantDu - loyer.montantPaye);
  },

  // Formater la devise
  formatCurrency(amount: number): string {
    return amount.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  },

  // Formater la date
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  },

  // Formater la date et l'heure
  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  // Obtenir la date d'aujourd'hui au format ISO (pour les inputs date)
  getTodayISOString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Générer un récapitulatif des paiements pour un loyer
  generatePaiementSummary(loyer: {
    montantDu: number;
    montantPaye: number;
    paiements?: Array<{
      id: string;
      montant: number;
      date: string;
      mode: string;
      payeur: string;
    }>;
  }): {
    montantDu: number;
    montantPaye: number;
    montantRestant: number;
    pourcentagePaye: number;
    nombrePaiements: number;
    dernierPaiement?: {
      montant: number;
      date: string;
      mode: string;
      payeur: string;
    };
  } {
    const montantRestant = loyer.montantDu - loyer.montantPaye;
    const pourcentagePaye = loyer.montantDu > 0 ? Math.round((loyer.montantPaye / loyer.montantDu) * 100) : 0;
    
    let dernierPaiement;
    if (loyer.paiements && loyer.paiements.length > 0) {
      // Trier par date décroissante et prendre le premier
      const paiementsTries = [...loyer.paiements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      dernierPaiement = paiementsTries[0];
    }

    return {
      montantDu: loyer.montantDu,
      montantPaye: loyer.montantPaye,
      montantRestant,
      pourcentagePaye,
      nombrePaiements: loyer.paiements?.length || 0,
      dernierPaiement,
    };
  },

  // Suggérer des payeurs basés sur les locataires du contrat
  suggestPayeurs(contrat: {
    locataires: Array<{
      locataire: {
        nom: string;
        prenom: string;
      };
    }>;
  }): string[] {
    const payeurs = contrat.locataires.map(cl => 
      `${cl.locataire.prenom} ${cl.locataire.nom}`
    );
    
    // Ajouter des options génériques
    payeurs.push('Locataire principal');
    payeurs.push('Tiers');
    
    return payeurs;
  },

  // Valider un paiement par rapport à un loyer spécifique
  validatePaiementForLoyer(
    paiementData: Partial<PaiementCreate>, 
    loyer: { montantDu: number; montantPaye: number; statut: string }
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation de base
    const baseValidation = this.validatePaiement(paiementData);
    errors.push(...baseValidation.errors);

    if (paiementData.montant) {
      const montantRestant = this.calculateMontantMaximum(loyer);
      
      if (paiementData.montant > montantRestant) {
        errors.push(`Le montant (${this.formatCurrency(paiementData.montant)}) dépasse le montant restant dû (${this.formatCurrency(montantRestant)})`);
      }

      // Avertissements
      if (loyer.statut === 'PAYE') {
        warnings.push('Ce loyer est déjà marqué comme payé intégralement');
      }

      if (paiementData.montant === montantRestant && loyer.montantPaye > 0) {
        warnings.push('Ce paiement va compléter le règlement de ce loyer');
      }

      if (paiementData.montant < montantRestant * 0.1) {
        warnings.push('Le montant semble faible par rapport au montant dû');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
};