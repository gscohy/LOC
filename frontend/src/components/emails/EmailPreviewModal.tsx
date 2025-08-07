import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Eye, Mail, RefreshCw } from 'lucide-react';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { EmailTemplate } from '@/types';
import { emailsService } from '@/services/emails';

interface EmailPreviewModalProps {
  template: EmailTemplate;
  isOpen: boolean;
  onClose: () => void;
}

const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  template,
  isOpen,
  onClose,
}) => {
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({});

  // Initialiser les variables personnalisées
  useEffect(() => {
    const initialVariables: Record<string, string> = {};
    template.variables.forEach(variable => {
      initialVariables[variable] = '';
    });
    setCustomVariables(initialVariables);
  }, [template.variables]);

  const {
    data: previewData,
    isLoading,
    refetch,
  } = useQuery(
    ['email-preview', template.id, customVariables],
    () => emailsService.previewTemplate(template.id, customVariables),
    {
      enabled: isOpen,
    }
  );

  const handleVariableChange = (variable: string, value: string) => {
    setCustomVariables(prev => ({
      ...prev,
      [variable]: value,
    }));
  };

  const handleRefresh = () => {
    refetch();
  };

  const renderEmailPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Génération de l'aperçu...</span>
        </div>
      );
    }

    if (!previewData) {
      return (
        <div className="p-8 text-center text-gray-500">
          Erreur lors du chargement de l'aperçu
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* En-tête email */}
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="flex items-center mb-2">
            <Mail className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Aperçu de l'email</span>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">De:</span>{' '}
              <span className="text-gray-900">gestion@exemple.com</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">À:</span>{' '}
              <span className="text-gray-900">locataire@exemple.com</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Sujet:</span>{' '}
              <span className="text-gray-900 font-medium">{previewData.sujet}</span>
            </div>
          </div>
        </div>

        {/* Contenu email */}
        <div className="bg-white border rounded-lg">
          <div className="p-4 border-b bg-gray-50">
            <h4 className="font-medium text-gray-900">Contenu de l'email</h4>
          </div>
          <div className="p-6">
            <div 
              className="prose prose-sm max-w-none text-gray-900 whitespace-pre-wrap"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              {previewData.contenu}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Aperçu du template email"
      size="xl"
    >
      <div className="space-y-6">
        {/* Informations du template */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">
            {template.nom}
          </h3>
          <p className="text-sm text-blue-700">
            Type: {template.type} • {template.variables.length} variable(s) disponible(s)
          </p>
        </div>

        {/* Variables personnalisables */}
        {template.variables.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                Variables personnalisables
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="text-blue-600"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Actualiser
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              {template.variables.map((variable) => (
                <Input
                  key={variable}
                  label={variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  placeholder={`Valeur pour ${variable}`}
                  value={customVariables[variable] || ''}
                  onChange={(e) => handleVariableChange(variable, e.target.value)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Aperçu de l'email */}
        {renderEmailPreview()}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EmailPreviewModal;