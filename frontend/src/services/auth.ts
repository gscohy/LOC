import { api, setAuthToken } from '../lib/api';
import { User, AuthResponse, LoginForm, RegisterForm, ApiResponse } from '@/types';

export const authService = {
  async login(credentials: LoginForm): Promise<AuthResponse> {
    const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    setAuthToken(data.data.token);
    
    // Déclencher le recalcul des statuts de loyers après connexion
    try {
      await api.post('/loyers/recalculate-statuts');
      console.log('✅ Statuts des loyers recalculés après connexion');
    } catch (error) {
      console.warn('⚠️ Erreur lors du recalcul des statuts:', error);
      // Ne pas faire échouer la connexion si le recalcul échoue
    }
    
    return data.data;
  },

  async register(userData: RegisterForm): Promise<AuthResponse> {
    const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/register', userData);
    setAuthToken(data.data.token);
    return data.data;
  },

  async getCurrentUser(): Promise<User> {
    const { data } = await api.get<ApiResponse<User>>('/auth/me');
    return data.data;
  },

  async updateProfile(userData: Partial<User>): Promise<User> {
    const { data } = await api.put<ApiResponse<User>>('/auth/profile', userData);
    return data.data;
  },

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    await api.put('/auth/password', data);
  },

  logout(): void {
    setAuthToken(null);
  },

  isAuthenticated(): boolean {
    return localStorage.getItem('auth_token') !== null;
  },

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },
};