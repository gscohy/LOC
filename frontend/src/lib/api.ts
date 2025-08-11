import axios, { AxiosError, AxiosResponse } from 'axios';
import { ApiResponse, ApiError } from '@/types';
import toast from 'react-hot-toast';

// Determine the base URL based on environment
const getBaseURL = () => {
  // Priorité à la variable d'environnement VITE_API_URL
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL + '/api';
  }
  
  // Production: utiliser l'URL du backend Railway par défaut
  if (import.meta.env.PROD || import.meta.env.NODE_ENV === 'production') {
    return 'https://loc-backend-production.up.railway.app/api';
  }
  
  // Development: localhost
  return 'http://localhost:7000/api';
};

const baseURL = getBaseURL();
console.log('🔧 API Configuration:', {
  baseURL,
  environment: import.meta.env.MODE,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  PROD: import.meta.env.PROD
});

// Create axios instance
export const api = axios.create({
  baseURL,
  timeout: 30000, // Augmenté pour la production
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth token management
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('auth_token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('auth_token');
  }
};

// Initialize token from localStorage
const savedToken = localStorage.getItem('auth_token');
if (savedToken) {
  setAuthToken(savedToken);
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    
    // Add timestamp to prevent caching
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<any>>) => {
    console.log(`✅ API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error: AxiosError<ApiError>) => {
    console.error('❌ API Error details:', {
      status: error.response?.status,
      message: error.message,
      code: error.code,
      config: error.config,
      response: error.response?.data
    });
    
    const message = error.response?.data?.error?.message || error.message || 'Une erreur est survenue';
    
    // Handle specific error codes
    if (error.response?.status === 401) {
      console.log('🔒 Unauthorized - redirecting to login');
      setAuthToken(null);
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (error.response?.status === 403) {
      toast.error('Permissions insuffisantes');
    } else if (error.response?.status === 404) {
      // Ne pas afficher d'erreur pour les 404 - les gérer dans les composants
      console.warn('Ressource non trouvée:', error.config?.url);
    } else if (error.response && error.response.status >= 500) {
      console.error('🔥 Server error:', message);
      // Ne pas afficher de toast ici, laisser les composants gérer les erreurs 500
      // toast.error('Erreur serveur: ' + message);
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      console.error('🌐 Network error details:', error);
      console.error('🌐 Full error object:', error);
      console.error('🌐 Config:', error.config);
      toast.error('Erreur de connexion au serveur - Vérifiez votre connexion internet');
    } else {
      // Ne pas afficher les erreurs génériques, les laisser aux composants
      console.warn('⚠️ Erreur API:', message);
    }

    return Promise.reject(error);
  }
);

// Generic API functions
export const apiGet = async <T>(url: string, params?: any): Promise<T> => {
  const response = await api.get<ApiResponse<T>>(url, { params });
  return response.data.data;
};

export const apiPost = async <T>(url: string, data?: any): Promise<T> => {
  const response = await api.post<ApiResponse<T>>(url, data);
  return response.data.data;
};

export const apiPut = async <T>(url: string, data?: any): Promise<T> => {
  const response = await api.put<ApiResponse<T>>(url, data);
  return response.data.data;
};

export const apiDelete = async (url: string): Promise<void> => {
  await api.delete(url);
};

// File upload function
export const uploadFile = async (file: File, onUploadProgress?: (progress: number) => void): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<ApiResponse<{ url: string }>>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onUploadProgress) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(progress);
      }
    },
  });

  return response.data.data.url;
};

export default api;