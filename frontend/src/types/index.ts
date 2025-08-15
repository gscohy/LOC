// User types
export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: 'ADMIN' | 'GESTIONNAIRE' | 'LECTEUR';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Proprietaire types
export interface Proprietaire {
  id: string;
  type: 'PHYSIQUE' | 'MORALE';
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse: string;
  ville: string;
  codePostal: string;
  entreprise?: string;
  siret?: string;
  signature?: string;
  numeroRIB?: string;
  createdAt: string;
  updatedAt: string;
  biens?: BienProprietaire[];
  _count?: {
    biens: number;
  };
}

// Bien types
export interface Bien {
  id: string;
  adresse: string;
  ville: string;
  codePostal: string;
  type: 'APPARTEMENT' | 'MAISON' | 'STUDIO' | 'LOCAL' | 'GARAGE';
  surface: number;
  nbPieces: number;
  nbChambres: number;
  loyer: number;
  chargesMensuelles: number;
  depotGarantie: number;
  statut: 'VACANT' | 'LOUE' | 'TRAVAUX';
  description?: string;
  reglementInterieur?: string;
  photos: string[];
  documents: string[];
  createdAt: string;
  updatedAt: string;
  proprietaires: BienProprietaire[];
  contrats?: Contrat[];
  charges?: Charge[];
  lots?: Lot[];
  _count?: {
    contrats: number;
    chargesMensuelles: number;
  };
}

export interface BienProprietaire {
  id: string;
  bienId: string;
  proprietaireId: string;
  quotePart: number;
  proprietaire: Proprietaire;
  bien?: Bien;
}

// Locataire types
export interface Locataire {
  id: string;
  civilite: 'M' | 'MME' | 'MLLE';
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  dateNaissance?: string;
  profession?: string;
  revenus?: number;
  documents: string[];
  createdAt: string;
  updatedAt: string;
  contrats?: ContratLocataire[];
  garants?: LocataireGarant[];
}

// Garant types
export interface Garant {
  id: string;
  civilite: 'M' | 'MME' | 'MLLE';
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  profession?: string;
  revenus?: number;
  typeGarantie: 'PHYSIQUE' | 'MORALE' | 'BANCAIRE';
  documents: string[];
  createdAt: string;
  updatedAt: string;
  locataires?: LocataireGarant[];
}

export interface LocataireGarant {
  id: string;
  locataireId: string;
  garantId: string;
  locataire: Locataire;
  garant: Garant;
}

// Contrat types
export interface Contrat {
  id: string;
  bienId: string;
  dateDebut: string;
  dateFin?: string;
  duree: number;
  loyer: number;
  chargesMensuelles: number;
  depotGarantie: number;
  jourPaiement: number;
  fraisNotaire: number;
  fraisHuissier: number;
  type: 'HABITATION' | 'COMMERCIAL' | 'SAISONNIER' | 'ETUDIANT';
  statut: 'ACTIF' | 'RESILIE' | 'EXPIRE' | 'SUSPENDU';
  clausesParticulieres?: string;
  documents?: string;
  commentaires?: string;
  // État des lieux
  dateEtatLieux?: string;
  heureEtatLieux?: string;
  // Mode de paiement
  modePaiement: 'CAF' | 'VIREMENT' | 'CHEQUE';
  createdAt: string;
  updatedAt: string;
  bien?: Bien;
  locataires?: ContratLocataire[];
  loyers?: Loyer[];
  historique?: ContratHistorique[];
  _count?: {
    loyers: number;
  };
}

export interface ContratLocataire {
  id: string;
  contratId: string;
  locataireId: string;
  contrat: Contrat;
  locataire: Locataire;
}

export interface ContratHistorique {
  id: string;
  contratId: string;
  action: 'CREATION' | 'MODIFICATION' | 'RENOUVELLEMENT' | 'RESILIATION';
  description: string;
  dateAction: string;
  metadata?: string;
}

// Loyer types
export interface Loyer {
  id: string;
  contratId: string;
  mois: number;
  annee: number;
  montantDu: number;
  montantPaye: number;
  statut: 'ATTENTE' | 'PAYE' | 'RETARD' | 'PARTIEL';
  dateEcheance: string;
  commentaires?: string;
  createdAt: string;
  updatedAt: string;
  contrat: Contrat;
  paiements: Paiement[];
  quittances?: Quittance[];
  rappels?: Rappel[];
}

export interface Paiement {
  id: string;
  loyerId: string;
  montant: number;
  date: string;
  mode: 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'CAF' | 'PRELEVEMENT';
  payeur: string;
  reference?: string;
  commentaire?: string;
  createdAt: string;
}

// Quittance types
export interface Quittance {
  id: string;
  loyerId: string;
  periode: string;
  montant: number;
  dateGeneration: string;
  dateEnvoi?: string;
  modeEnvoi: 'EMAIL' | 'COURRIER' | 'REMISE_MAIN';
  statut: 'GENEREE' | 'ENVOYEE';
  pdfPath?: string;
  emailEnvoye: boolean;
  createdAt: string;
  loyer: Loyer;
}

// Rappel types
export interface Rappel {
  id: string;
  loyerId: string;
  type: 'EMAIL' | 'SMS' | 'COURRIER';
  dateEnvoi: string;
  destinataires: string;
  contenu?: string;
  envoye: boolean;
}

// Charge types
export interface Charge {
  id: string;
  bienId: string;
  categorie: 'TRAVAUX' | 'ASSURANCE' | 'CREDIT' | 'TAXE' | 'GESTION' | 'EXCEPTIONNELLE';
  description: string;
  montant: number;
  date: string;
  type: 'PONCTUELLE' | 'RECURRENTE';
  frequence?: 'MENSUELLE' | 'TRIMESTRIELLE' | 'SEMESTRIELLE' | 'ANNUELLE';
  dateDebut?: string;
  dateFin?: string;
  facture?: string;
  payee: boolean;
  commentaires?: string;
  createdAt: string;
  updatedAt: string;
  bien: Bien;
}

// Lot types
export interface Lot {
  id: string;
  bienId: string;
  numero: string;
  description?: string;
  surface?: number;
  usage?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    details?: any;
    stack?: string;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  role?: 'ADMIN' | 'GESTIONNAIRE' | 'LECTEUR';
}

export interface ProprietaireForm {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
}

export interface BienForm {
  adresse: string;
  ville: string;
  codePostal: string;
  type: 'APPARTEMENT' | 'MAISON' | 'STUDIO' | 'LOCAL' | 'GARAGE';
  surface: number;
  nbPieces: number;
  nbChambres: number;
  loyer: number;
  chargesMensuelles: number;
  depotGarantie: number;
  description?: string;
  proprietaires: Array<{
    id: string;
    quotePart: number;
  }>;
}

export interface LocataireForm {
  civilite: 'M' | 'MME' | 'MLLE';
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  dateNaissance?: string;
  profession?: string;
  revenus?: number;
}

export interface GarantForm {
  civilite: 'M' | 'MME' | 'MLLE';
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  profession?: string;
  revenus?: number;
  typeGarantie: 'PHYSIQUE' | 'MORALE' | 'BANCAIRE';
}

export interface ContratForm {
  bienId: string;
  locataireIds: string[];
  dateDebut: string;
  dateFin?: string;
  duree: number;
  loyer: number;
  chargesMensuelles: number;
  depotGarantie: number;
  jourPaiement: number;
  fraisNotaire: number;
  fraisHuissier: number;
  type: 'HABITATION' | 'COMMERCIAL' | 'MIXTE';
  clausesParticulieres?: string;
  // État des lieux
  dateEtatLieux?: string;
  heureEtatLieux?: string;
  // Mode de paiement
  modePaiement: 'CAF' | 'VIREMENT' | 'CHEQUE';
}

export interface PaiementForm {
  loyerId: string;
  montant: number;
  date: string;
  mode: 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'CAF' | 'PRELEVEMENT';
  payeur: string;
  reference?: string;
  commentaire?: string;
}

export interface ChargeForm {
  bienId: string;
  categorie: 'TRAVAUX' | 'ASSURANCE' | 'CREDIT' | 'TAXE' | 'GESTION' | 'EXCEPTIONNELLE';
  description: string;
  montant: number;
  date: string;
  type: 'PONCTUELLE' | 'RECURRENTE';
  frequence?: 'MENSUELLE' | 'TRIMESTRIELLE' | 'SEMESTRIELLE' | 'ANNUELLE';
  commentaires?: string;
}

// Email Configuration types
export interface EmailConfig {
  id: string;
  nom: string;
  fournisseur: 'GMAIL' | 'ORANGE' | 'OUTLOOK' | 'YAHOO' | 'CUSTOM';
  email: string;
  motDePasse: string;
  serveurSMTP: string;
  portSMTP: number;
  securite: 'TLS' | 'SSL' | 'NONE';
  actif: boolean;
  parDefaut: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailConfigForm {
  nom: string;
  fournisseur: 'GMAIL' | 'ORANGE' | 'OUTLOOK' | 'YAHOO' | 'CUSTOM';
  email: string;
  motDePasse: string;
  serveurSMTP?: string;
  portSMTP?: number;
  securite: 'TLS' | 'SSL' | 'NONE';
  actif: boolean;
  parDefaut: boolean;
}

export interface EmailTemplate {
  id: string;
  nom: string;
  sujet: string;
  contenu: string;
  type: 'RETARD' | 'RELANCE' | 'MISE_EN_DEMEURE' | 'INFORMATION' | 'QUITTANCE' | 'BIENVENUE' | 'CUSTOM';
  variables: string[];
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

// Dashboard types
export interface DashboardStats {
  totalBiens: number;
  biensLoues: number;
  biensVacants: number;
  tauxOccupation: number;
  loyersEnAttente: number;
  loyersEnRetard: number;
  revenusAnnee: number;
  chargesAnnee: number;
  beneficeAnnee: number;
  contratsExpirants: number;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    fill?: boolean;
  }>;
}