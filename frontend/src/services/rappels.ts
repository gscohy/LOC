import { api } from '../lib/api';

export interface RappelCreate {
  loyerId: string;
  type: string;
  destinataires: string[] | string;
  message: string;
  dateEnvoi?: string;
  modeEnvoi?: string;
}

export interface RappelUpdate {
  message?: string;
  dateEnvoi?: string;
  modeEnvoi?: string;
}

export interface Rappel {
  id: string;
  loyerId: string;
  type: string;
  destinataires: string;
  message: string;
  dateEnvoi: string;
  dateEnvoiEffective?: string;
  modeEnvoi: string;
  envoye: boolean;
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
          email: string;
          telephone?: string;
        };
      }>;
    };
  };
}

export interface RappelStats {
  totaux: {
    total: number;
    envoyes: number;
    enAttente: number;
    tauxEnvoi: number;
  };
  evolution: {
    ceMois: number;
    moisDernier: number;
    evolution: number;
  };
  repartition: {
    parType: Array<{
      type: string;
      _count: {
        type: number;
      };
    }>;
    parMode: Array<{
      modeEnvoi: string;
      _count: {
        modeEnvoi: number;
      };
    }>;
  };
}

export interface GenerationAutomatiqueResult {
  rappelsCrees: Rappel[];
  loyersTraites: number;
  loyersEnRetardTotal: number;
}

export const rappelsService = {
  // Créer un nouveau rappel
  async create(data: RappelCreate): Promise<Rappel> {
    const response = await api.post('/rappels', data);
    return response.data.data;
  },

  // Récupérer tous les rappels avec pagination et filtres
  async getAll(params?: {
    page?: number;
    limit?: number;
    type?: string;
    envoye?: boolean;
    loyerId?: string;
    contratId?: string;
    dateDebut?: string;
    dateFin?: string;
  }): Promise<{
    rappels: Rappel[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get('/rappels', { params });
    return response.data.data;
  },

  // Récupérer un rappel par ID
  async getById(id: string): Promise<Rappel> {
    const response = await api.get(`/rappels/${id}`);
    return response.data.data;
  },

  // Marquer un rappel comme envoyé
  async marquerEnvoye(id: string, data?: {
    dateEnvoiEffective?: string;
    commentaires?: string;
  }): Promise<Rappel> {
    const response = await api.put(`/rappels/${id}/envoyer`, data || {});
    return response.data.data;
  },

  // Supprimer un rappel
  async delete(id: string): Promise<void> {
    await api.delete(`/rappels/${id}`);
  },

  // Générer des rappels automatiques
  async genererAutomatiques(data?: {
    joursRetard?: number;
    typeRappel?: string;
    modeEnvoi?: string;
    messagePersonnalise?: string;
  }): Promise<GenerationAutomatiqueResult> {
    const response = await api.post('/rappels/generer-automatiques', data || {});
    return response.data.data;
  },

  // Récupérer les statistiques des rappels
  async getStats(): Promise<RappelStats> {
    const response = await api.get('/rappels/stats');
    return response.data.data;
  },

  // Utilitaires pour les types de rappels
  getTypesRappel(): Array<{ value: string; label: string; description: string; couleur: string }> {
    return [
      { 
        value: 'RETARD', 
        label: 'Rappel de retard', 
        description: 'Premier rappel pour un loyer en retard',
        couleur: 'bg-yellow-100 text-yellow-800'
      },
      { 
        value: 'RELANCE', 
        label: 'Relance', 
        description: 'Deuxième rappel plus ferme',
        couleur: 'bg-orange-100 text-orange-800'
      },
      { 
        value: 'MISE_EN_DEMEURE', 
        label: 'Mise en demeure', 
        description: 'Dernier avertissement avant poursuites',
        couleur: 'bg-red-100 text-red-800'
      },
      { 
        value: 'INFORMATION', 
        label: 'Information', 
        description: 'Rappel informatif sans menace',
        couleur: 'bg-blue-100 text-blue-800'
      },
      { 
        value: 'AUTRE', 
        label: 'Autre', 
        description: 'Autre type de rappel personnalisé',
        couleur: 'bg-gray-100 text-gray-800'
      },
    ];
  },

  // Obtenir le label d'un type de rappel
  getTypeLabel(type: string): string {
    const types = this.getTypesRappel();
    const typeFound = types.find(t => t.value === type);
    return typeFound ? typeFound.label : type;
  },

  // Obtenir la couleur d'un type de rappel
  getTypeCouleur(type: string): string {
    const types = this.getTypesRappel();
    const typeFound = types.find(t => t.value === type);
    return typeFound ? typeFound.couleur : 'bg-gray-100 text-gray-800';
  },

  // Modes d'envoi
  getModesEnvoi(): Array<{ value: string; label: string; icon: string }> {
    return [
      { value: 'EMAIL', label: 'Email', icon: '📧' },
      { value: 'COURRIER', label: 'Courrier postal', icon: '📮' },
      { value: 'SMS', label: 'SMS', icon: '📱' },
      { value: 'TELEPHONE', label: 'Téléphone', icon: '📞' },
      { value: 'AUTRE', label: 'Autre', icon: '📄' },
    ];
  },

  // Obtenir le label d'un mode d'envoi
  getModeEnvoiLabel(mode: string): string {
    const modes = this.getModesEnvoi();
    const modeFound = modes.find(m => m.value === mode);
    return modeFound ? modeFound.label : mode;
  },

  // Générer un message de rappel par défaut
  generateDefaultMessage(loyer: {
    mois: number;
    annee: number;
    montantDu: number;
    montantPaye: number;
    contrat: {
      bien: {
        adresse: string;
      };
      locataires: Array<{
        locataire: {
          nom: string;
          prenom: string;
        };
      }>;
    };
  }, type: string): string {
    const montantRestant = loyer.montantDu - loyer.montantPaye;
    const moisAnnee = this.formatMoisAnnee(loyer.mois, loyer.annee);
    const adresse = loyer.contrat.bien.adresse;
    
    const locataires = loyer.contrat.locataires
      .map(cl => `${cl.locataire.prenom} ${cl.locataire.nom}`)
      .join(' et ');

    switch (type) {
      case 'RETARD':
        return `Cher(e) ${locataires},

Nous vous informons que le loyer de ${moisAnnee} pour le logement situé ${adresse} n'a pas été réglé à ce jour.

Montant dû : ${this.formatCurrency(loyer.montantDu)}
Montant payé : ${this.formatCurrency(loyer.montantPaye)}
Reste à payer : ${this.formatCurrency(montantRestant)}

Nous vous remercions de bien vouloir régulariser cette situation dans les plus brefs délais.

Cordialement,
La gestion locative`;

      case 'RELANCE':
        return `Cher(e) ${locataires},

Malgré notre précédent courrier, nous constatons que le loyer de ${moisAnnee} pour le logement situé ${adresse} demeure impayé.

Montant restant dû : ${this.formatCurrency(montantRestant)}

Nous vous demandons de procéder au règlement immédiat de cette somme, faute de quoi nous serions contraints d'engager des poursuites.

Cordialement,
La gestion locative`;

      case 'MISE_EN_DEMEURE':
        return `MISE EN DEMEURE

${locataires}
${adresse}

Nous vous mettons en demeure de régler immédiatement le loyer impayé de ${moisAnnee} d'un montant de ${this.formatCurrency(montantRestant)}.

À défaut de paiement sous 8 jours, nous engagerons sans autre préavis les poursuites judiciaires nécessaires.

La gestion locative`;

      case 'INFORMATION':
        return `Cher(e) ${locataires},

Nous souhaitons vous informer concernant votre logement situé ${adresse}.

[Veuillez personnaliser ce message selon vos besoins]

Nous restons à votre disposition pour toute question.

Cordialement,
La gestion locative`;

      default:
        return `Cher(e) ${locataires},

Nous vous contactons concernant le loyer de ${moisAnnee} pour le logement situé ${adresse}.

Montant concerné : ${this.formatCurrency(montantRestant)}

Merci de nous contacter pour régulariser la situation.

Cordialement,
La gestion locative`;
    }
  },

  // Valider les données d'un rappel
  validateRappel(data: Partial<RappelCreate>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.loyerId) {
      errors.push('Le loyer est requis');
    }

    if (!data.type) {
      errors.push('Le type de rappel est requis');
    }

    if (!data.destinataires || (Array.isArray(data.destinataires) && data.destinataires.length === 0)) {
      errors.push('Au moins un destinataire est requis');
    }

    if (!data.message || data.message.trim().length === 0) {
      errors.push('Le message est requis');
    } else if (data.message.trim().length < 10) {
      errors.push('Le message doit contenir au moins 10 caractères');
    }

    if (data.dateEnvoi) {
      const dateEnvoi = new Date(data.dateEnvoi);
      const maintenant = new Date();
      const dans30Jours = new Date();
      dans30Jours.setDate(dans30Jours.getDate() + 30);

      if (dateEnvoi < maintenant) {
        errors.push('La date d\'envoi ne peut pas être dans le passé');
      }

      if (dateEnvoi > dans30Jours) {
        errors.push('La date d\'envoi ne peut pas être supérieure à 30 jours');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Extraire les emails des destinataires
  extractEmails(destinataires: string): string[] {
    if (!destinataires) return [];
    
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return destinataires.match(emailRegex) || [];
  },

  // Formater la liste des destinataires
  formatDestinataires(destinataires: string): string {
    const emails = this.extractEmails(destinataires);
    if (emails.length <= 2) {
      return emails.join(', ');
    }
    return `${emails[0]} et ${emails.length - 1} autre(s)`;
  },

  // Calculer les statistiques de rappels pour un loyer
  calculateRappelStats(rappels: Rappel[]): {
    total: number;
    envoyes: number;
    enAttente: number;
    parType: Record<string, number>;
    dernierRappel?: Rappel;
  } {
    const stats = {
      total: rappels.length,
      envoyes: rappels.filter(r => r.envoye).length,
      enAttente: rappels.filter(r => !r.envoye).length,
      parType: {} as Record<string, number>,
    };

    // Compter par type
    rappels.forEach(rappel => {
      stats.parType[rappel.type] = (stats.parType[rappel.type] || 0) + 1;
    });

    // Trouver le dernier rappel
    const dernierRappel = rappels
      .sort((a, b) => new Date(b.dateEnvoi).getTime() - new Date(a.dateEnvoi).getTime())[0];

    return {
      ...stats,
      dernierRappel,
    };
  },

  // Suggérer le prochain type de rappel
  suggestNextRappelType(rappelsExistants: Rappel[]): string {
    const typesEnvoyes = rappelsExistants
      .filter(r => r.envoye)
      .map(r => r.type);

    if (!typesEnvoyes.includes('RETARD')) {
      return 'RETARD';
    } else if (!typesEnvoyes.includes('RELANCE')) {
      return 'RELANCE';
    } else if (!typesEnvoyes.includes('MISE_EN_DEMEURE')) {
      return 'MISE_EN_DEMEURE';
    } else {
      return 'AUTRE';
    }
  },

  // Utilitaires de formatage
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

  // Obtenir la date d'aujourd'hui au format ISO
  getTodayISOString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
};