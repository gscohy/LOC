import { api } from '../lib/api';
import { EmailConfig, EmailConfigForm, EmailTemplate, PaginatedResponse, ApiResponse } from '@/types';

interface EmailConfigsParams {
  page?: number;
  limit?: number;
  search?: string;
  actif?: boolean;
}

interface EmailTemplatesParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
}

export const emailsService = {
  // Gestion des configurations email
  async getAllConfigs(params?: EmailConfigsParams): Promise<PaginatedResponse<EmailConfig>> {
    const { data } = await api.get<ApiResponse<{configs: EmailConfig[], pagination: any}>>('/emails/configs', {
      params,
    });
    return {
      data: data.data.configs,
      pagination: data.data.pagination
    };
  },

  async getConfigById(id: string): Promise<EmailConfig> {
    const { data } = await api.get<ApiResponse<EmailConfig>>(`/emails/configs/${id}`);
    return data.data;
  },

  async createConfig(config: EmailConfigForm): Promise<EmailConfig> {
    const { data } = await api.post<ApiResponse<EmailConfig>>('/emails/configs', config);
    return data.data;
  },

  async updateConfig(id: string, config: Partial<EmailConfigForm>): Promise<EmailConfig> {
    const { data } = await api.put<ApiResponse<EmailConfig>>(`/emails/configs/${id}`, config);
    return data.data;
  },

  async deleteConfig(id: string): Promise<void> {
    await api.delete(`/emails/configs/${id}`);
  },

  async testConfig(id: string): Promise<{success: boolean, message: string}> {
    const { data } = await api.post<ApiResponse<{success: boolean, message: string}>>(`/emails/configs/${id}/test`);
    return data.data;
  },

  async setDefaultConfig(id: string): Promise<void> {
    await api.put(`/emails/configs/${id}/default`);
  },

  // Gestion des templates email
  async getAllTemplates(params?: EmailTemplatesParams): Promise<PaginatedResponse<EmailTemplate>> {
    const { data } = await api.get<ApiResponse<{templates: EmailTemplate[], pagination: any}>>('/emails/templates', {
      params,
    });
    return {
      data: data.data.templates,
      pagination: data.data.pagination
    };
  },

  async getTemplateById(id: string): Promise<EmailTemplate> {
    const { data } = await api.get<ApiResponse<EmailTemplate>>(`/emails/templates/${id}`);
    return data.data;
  },

  async createTemplate(template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
    const { data } = await api.post<ApiResponse<EmailTemplate>>('/emails/templates', template);
    return data.data;
  },

  async updateTemplate(id: string, template: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const { data } = await api.put<ApiResponse<EmailTemplate>>(`/emails/templates/${id}`, template);
    return data.data;
  },

  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`/emails/templates/${id}`);
  },

  // Utilitaires
  getProviderDefaults(provider: string) {
    const defaults: Record<string, {serveurSMTP: string, portSMTP: number, securite: 'TLS' | 'SSL' | 'NONE'}> = {
      GMAIL: {
        serveurSMTP: 'smtp.gmail.com',
        portSMTP: 587,
        securite: 'TLS'
      },
      ORANGE: {
        serveurSMTP: 'smtp.orange.fr',
        portSMTP: 465,
        securite: 'SSL'
      },
      OUTLOOK: {
        serveurSMTP: 'smtp-mail.outlook.com',
        portSMTP: 587,
        securite: 'TLS'
      },
      YAHOO: {
        serveurSMTP: 'smtp.mail.yahoo.com',
        portSMTP: 587,
        securite: 'TLS'
      }
    };
    
    return defaults[provider] || {
      serveurSMTP: '',
      portSMTP: 587,
      securite: 'TLS' as const
    };
  }
};