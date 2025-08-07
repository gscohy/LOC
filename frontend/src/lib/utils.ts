import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, formatDistanceToNow, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting utilities
export const formatDate = (date: string | Date | null): string => {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    return format(dateObj, 'dd/MM/yyyy', { locale: fr });
  } catch {
    return '-';
  }
};

export const formatDateTime = (date: string | Date | null): string => {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    return format(dateObj, 'dd/MM/yyyy à HH:mm', { locale: fr });
  } catch {
    return '-';
  }
};

export const formatRelativeTime = (date: string | Date | null): string => {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: fr });
  } catch {
    return '-';
  }
};

// Currency formatting
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Number formatting
export const formatNumber = (number: number | null | undefined): string => {
  if (number === null || number === undefined) return '-';
  
  return new Intl.NumberFormat('fr-FR').format(number);
};

// Percentage formatting
export const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

// String utilities
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};

export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const isValidPostalCode = (postalCode: string): boolean => {
  const postalCodeRegex = /^(?:0[1-9]|[1-8]\d|9[0-8])\d{3}$/;
  return postalCodeRegex.test(postalCode);
};

// Array utilities
export const groupBy = <T, K extends keyof any>(
  array: T[],
  key: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((groups, item) => {
    const groupKey = key(item);
    (groups[groupKey] = groups[groupKey] || []).push(item);
    return groups;
  }, {} as Record<K, T[]>);
};

export const sortBy = <T>(
  array: T[],
  key: keyof T | ((item: T) => any),
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key];
    const bVal = typeof key === 'function' ? key(b) : b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

// File utilities
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

export const isImageFile = (filename: string): boolean => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const extension = getFileExtension(filename).toLowerCase();
  return imageExtensions.includes(extension);
};

// Color utilities
export const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export const getAvatarColor = (str: string): string => {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Status utilities
export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    // Loyer statuses
    PAYE: 'badge-success',
    ATTENTE: 'badge-warning',
    RETARD: 'badge-danger',
    PARTIEL: 'badge-info',
    
    // Bien statuses
    LOUE: 'badge-success',
    VACANT: 'badge-danger',
    TRAVAUX: 'badge-warning',
    
    // Contrat statuses
    ACTIF: 'badge-success',
    EXPIRE: 'badge-danger',
    RESILIE: 'badge-gray',
    
    // Quittance statuses
    GENEREE: 'badge-info',
    ENVOYEE: 'badge-success',
    
    // Default
    default: 'badge-gray',
  };
  
  return statusColors[status] || statusColors.default;
};

export const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    // Loyer statuses
    PAYE: 'Payé',
    ATTENTE: 'En attente',
    RETARD: 'En retard',
    PARTIEL: 'Partiel',
    
    // Bien statuses
    LOUE: 'Loué',
    VACANT: 'Vacant',
    TRAVAUX: 'Travaux',
    
    // Contrat statuses
    ACTIF: 'Actif',
    EXPIRE: 'Expiré',
    RESILIE: 'Résilié',
    
    // Quittance statuses
    GENEREE: 'Générée',
    ENVOYEE: 'Envoyée',
    
    // Civilités
    M: 'M.',
    MME: 'Mme',
    MLLE: 'Mlle',
    
    // Types de biens
    APPARTEMENT: 'Appartement',
    MAISON: 'Maison',
    STUDIO: 'Studio',
    LOCAL: 'Local commercial',
    GARAGE: 'Garage',
    
    // Types de garantie
    PHYSIQUE: 'Personne physique',
    MORALE: 'Personne morale',
    BANCAIRE: 'Garantie bancaire',
    
    // Modes de paiement
    VIREMENT: 'Virement',
    CHEQUE: 'Chèque',
    ESPECES: 'Espèces',
    CAF: 'CAF',
    PRELEVEMENT: 'Prélèvement',
  };
  
  return statusLabels[status] || status;
};

// Catégories de charges
export const CHARGE_CATEGORIES = {
    TRAVAUX: 'Travaux',
    ASSURANCE: 'Assurance',
    CREDIT: 'Crédit immobilier',
    TAXE: 'Taxe foncière',
    GESTION: 'Frais de gestion',
    EXCEPTIONNELLE: 'Charge exceptionnelle',
  };
  
  // Types de charges
  export const CHARGE_TYPES = {
    PONCTUELLE: 'Ponctuelle',
    RECURRENTE: 'Récurrente',
  };
  
  // Fréquences
  export const FREQUENCIES = {
    MENSUELLE: 'Mensuelle',
    TRIMESTRIELLE: 'Trimestrielle',
    SEMESTRIELLE: 'Semestrielle',
    ANNUELLE: 'Annuelle',
  };

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Local storage utilities
export const getStoredValue = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setStoredValue = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
};

// Month utilities
export const getMonthName = (month: number): string => {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return months[month - 1] || '';
};

export const getCurrentMonth = (): number => {
  return new Date().getMonth() + 1;
};

export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};