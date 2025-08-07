import { api } from '../lib/api';

export interface FiscalData {
  annee: number;
  revenus: {
    loyers: number;
    autresRevenus: number;
    total: number;
  };
  charges: {
    travaux: number;
    interetsEmprunt: number;
    fraisGestion: number;
    assurances: number;
    taxeFonciere: number;
    autres: number;
    total: number;
  };
  resultat: {
    benefice: number;
    deficit: number;
    netFoncier: number;
  };
  optimisation: {
    microFoncierEligible: boolean;
    abattementMicroFoncier: number;
    conseilsOptimisation: string[];
  };
}

export interface Declaration2044 {
  annee: number;
  cases: {
    case211: number; // Revenus bruts
    case212: number; // Revenus exceptionnels
    case221: number; // Frais et charges
    case222: number; // Intérêts d'emprunt
    case223: number; // Autres charges
    case230: number; // Déficit imputable
    case231: number; // Déficit reportable
  };
  biens: Array<{
    adresse: string;
    revenus: number;
    charges: number;
    resultat: number;
    detailRevenus?: {
      loyersBruts: number;
      autresRevenus: number;
    };
    detailCharges?: {
      assurances: number;
      taxesFoncieres: number;
      interetsEmprunt: number;
      reparationsEntretien: number;
      ameliorations: number;
      fraisGestion: number;
      autresCharges: number;
    };
  }>;
}

export interface OptimisationFiscale {
  annee: number;
  scenarios: Array<{
    nom: string;
    description: string;
    impact: number;
    avantages: string[];
    inconvenients: string[];
  }>;
  conseils: string[];
  echeances: Array<{
    date: string;
    description: string;
    importance: 'haute' | 'moyenne' | 'faible';
  }>;
}

export const fiscaliteService = {
  // Calculer les données fiscales pour une année
  async getFiscalData(annee: number, proprietaireId?: string): Promise<{ data: FiscalData }> {
    const params = new URLSearchParams();
    params.append('annee', annee.toString());
    if (proprietaireId) params.append('proprietaireId', proprietaireId);

    const response = await api.get(`/fiscalite/data?${params.toString()}`);
    return response.data;
  },

  // Générer la déclaration 2044
  async generateDeclaration2044(annee: number, proprietaireId?: string): Promise<{ data: Declaration2044 }> {
    const response = await api.post('/fiscalite/declaration-2044', {
      annee,
      proprietaireId
    });
    return response.data;
  },

  // Export PDF de la déclaration 2044
  async exportDeclaration2044PDF(annee: number, proprietaireId?: string): Promise<Blob> {
    const response = await api.post('/fiscalite/declaration-2044/pdf', {
      annee,
      proprietaireId
    }, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Export Excel des données fiscales
  async exportFiscalDataExcel(annee: number, proprietaireId?: string): Promise<Blob> {
    const response = await api.post('/fiscalite/export-excel', {
      annee,
      proprietaireId
    }, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Calculer l'optimisation fiscale
  async getOptimisationFiscale(annee: number, proprietaireId?: string): Promise<{ data: OptimisationFiscale }> {
    const params = new URLSearchParams();
    params.append('annee', annee.toString());
    if (proprietaireId) params.append('proprietaireId', proprietaireId);

    const response = await api.get(`/fiscalite/optimisation?${params.toString()}`);
    return response.data;
  },

  // Simuler l'impact fiscal de différents scénarios
  async simulerImpact(annee: number, scenarios: any[]): Promise<{ data: any }> {
    const response = await api.post('/fiscalite/simulation', {
      annee,
      scenarios
    });
    return response.data;
  },

  // Récupérer les seuils et barèmes fiscaux
  async getBaremesFiscaux(annee: number): Promise<{ data: any }> {
    const response = await api.get(`/fiscalite/baremes/${annee}`);
    return response.data;
  },

  // Calculer la comparaison micro-foncier vs réel
  async comparerRegimes(annee: number, revenus: number, charges: number): Promise<{ data: any }> {
    const response = await api.post('/fiscalite/comparer-regimes', {
      annee,
      revenus,
      charges
    });
    return response.data;
  },

  // Récupérer la ventilation des charges
  async getChargesVentilation(annee: number, proprietaireId?: string): Promise<{ data: any }> {
    const params = new URLSearchParams();
    params.append('annee', annee.toString());
    if (proprietaireId) params.append('proprietaireId', proprietaireId);

    const response = await api.get(`/fiscalite/charges-ventilation?${params.toString()}`);
    return response.data;
  },

  // Sauvegarder la ventilation des charges
  async saveChargesVentilation(annee: number, proprietaireId: string | undefined, ventilation: any): Promise<{ data: any }> {
    const response = await api.post('/fiscalite/charges-ventilation', {
      annee,
      proprietaireId,
      ventilation
    });
    return response.data;
  }
};

// Utilitaires pour les calculs fiscaux côté client
export const fiscalUtils = {
  // Calculer l'abattement micro-foncier (30%)
  calculerAbattementMicroFoncier(revenus: number): number {
    return Math.min(revenus * 0.3, revenus);
  },

  // Vérifier l'éligibilité au micro-foncier
  estEligibleMicroFoncier(revenus: number): boolean {
    return revenus <= 15000;
  },

  // Calculer le déficit reportable (limité à 10 ans)
  calculerDeficitReportable(deficit: number): number {
    return Math.max(0, deficit);
  },

  // Calculer l'imputation du déficit sur autres revenus (limité à 10 700€)
  calculerImputationDeficit(deficit: number): { imputable: number; reportable: number } {
    const maxImputable = 10700;
    const imputable = Math.min(deficit, maxImputable);
    const reportable = Math.max(0, deficit - maxImputable);
    
    return { imputable, reportable };
  },

  // Formater les montants pour la déclaration
  formaterMontantDeclaration(montant: number): number {
    return Math.round(Math.max(0, montant));
  },

  // Calculer les dates limites de déclaration
  getDatesLimitesDeclaration(annee: number): { papier: Date; enligne: Date } {
    // Dates approximatives - à ajuster selon les années
    return {
      papier: new Date(annee + 1, 4, 20), // 20 mai
      enligne: new Date(annee + 1, 4, 31)  // 31 mai
    };
  },

  // Générer des conseils d'optimisation basiques
  genererConseilsOptimisation(fiscalData: Partial<FiscalData>): string[] {
    const conseils: string[] = [];
    
    if (fiscalData.revenus && fiscalData.revenus.total <= 15000) {
      conseils.push("Vous êtes éligible au régime micro-foncier avec un abattement de 30%");
    }
    
    if (fiscalData.resultat && fiscalData.resultat.deficit > 0) {
      conseils.push("Votre déficit peut être imputé sur vos autres revenus dans la limite de 10 700€");
    }
    
    if (fiscalData.charges && fiscalData.charges.travaux > 0) {
      conseils.push("Vos travaux de réparation et d'entretien sont entièrement déductibles");
    }
    
    return conseils;
  }
};