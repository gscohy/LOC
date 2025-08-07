import { api } from '../lib/api';

export interface GenerationRequest {
  mois: number;
  annee: number;
  contratIds?: string[];
  forceRegeneration?: boolean;
}

export interface GenerationResponse {
  loyersGeneres: any[];
  loyersExistants: number;
  contratsTraites: number;
  erreurs: any[];
  statistiques: {
    totalContrats: number;
    contratsActifs: number;
    loyersGeneres: number;
    loyersExistants: number;
    erreurs: number;
  };
}

export interface PreviewResponse {
  periode: {
    mois: number;
    annee: number;
  };
  preview: Array<{
    contratId: string;
    bien: {
      adresse: string;
      ville: string;
      codePostal: string;
    };
    locataires: Array<{
      nom: string;
      prenom: string;
      email: string;
    }>;
    montantDu: number;
    dateEcheance: string;
    loyerExiste: boolean;
    action: 'EXISTE_DEJA' | 'A_GENERER';
  }>;
  statistiques: {
    totalContrats: number;
    contratsActifs: number;
    aGenerer: number;
    existeDeja: number;
    montantTotal: number;
  };
}

export const loyersGenerationService = {
  // Générer les loyers pour une période donnée
  async generer(data: GenerationRequest): Promise<GenerationResponse> {
    const response = await api.post('/loyers/generer', data);
    return response.data.data;
  },

  // Générer les loyers pour le mois suivant
  async genererMoisSuivant(): Promise<GenerationResponse> {
    const response = await api.post('/loyers/generer-mois-suivant');
    return response.data.data;
  },

  // Prévisualiser la génération de loyers
  async previewGeneration(mois: number, annee: number): Promise<PreviewResponse> {
    const response = await api.get('/loyers/preview-generation', {
      params: { mois, annee }
    });
    return response.data.data;
  },

  // Utilitaires
  getMoisLabel(mois: number): string {
    const moisLabels = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return moisLabels[mois - 1] || 'Mois inconnu';
  },

  formatPeriode(mois: number, annee: number): string {
    return `${this.getMoisLabel(mois)} ${annee}`;
  },

  getMoisSuivant(): { mois: number; annee: number } {
    const maintenant = new Date();
    let mois = maintenant.getMonth() + 2; // Mois suivant (getMonth() est 0-indexé)
    let annee = maintenant.getFullYear();

    if (mois > 12) {
      mois = 1;
      annee += 1;
    }

    return { mois, annee };
  },

  getMoisCourant(): { mois: number; annee: number } {
    const maintenant = new Date();
    return {
      mois: maintenant.getMonth() + 1,
      annee: maintenant.getFullYear()
    };
  },

  getAnneesDisponibles(): number[] {
    const anneeActuelle = new Date().getFullYear();
    const annees = [];
    for (let i = anneeActuelle - 2; i <= anneeActuelle + 2; i++) {
      annees.push(i);
    }
    return annees;
  },
};