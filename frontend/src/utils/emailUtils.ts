import { EmailTemplate } from '@/types';

/**
 * Parse les variables d'un template email
 * Gère le cas où variables est une string JSON ou un array
 */
export const parseTemplateVariables = (variables: string[] | string): string[] => {
  if (Array.isArray(variables)) {
    return variables;
  }
  
  if (typeof variables === 'string') {
    try {
      const parsed = JSON.parse(variables);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Erreur lors du parsing des variables template:', error);
      return [];
    }
  }
  
  return [];
};

/**
 * Normalise un template email pour s'assurer que les variables sont un array
 */
export const normalizeEmailTemplate = (template: EmailTemplate): EmailTemplate => {
  return {
    ...template,
    variables: parseTemplateVariables(template.variables)
  };
};

/**
 * Normalise une liste de templates
 */
export const normalizeEmailTemplates = (templates: EmailTemplate[]): EmailTemplate[] => {
  return templates.map(normalizeEmailTemplate);
};