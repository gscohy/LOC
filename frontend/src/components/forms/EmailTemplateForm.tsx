import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Info, Plus, X, Eye } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Checkbox from '@/components/ui/Checkbox';
import { EmailTemplate } from '@/types';
import { parseTemplateVariables } from '@/utils/emailUtils';

const emailTemplateSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  sujet: z.string().min(1, 'Le sujet est requis'),
  contenu: z.string().min(1, 'Le contenu est requis'),
  type: z.enum(['RAPPEL_LOYER', 'QUITTANCE', 'RELANCE', 'BIENVENUE', 'CUSTOM']),
  variables: z.array(z.string()).default([]),
  actif: z.boolean().default(true),
});

type EmailTemplateFormData = z.infer<typeof emailTemplateSchema>;

interface EmailTemplateFormProps {
  initialData?: EmailTemplate;
  onSubmit: (data: EmailTemplateFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const EmailTemplateForm: React.FC<EmailTemplateFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [newVariable, setNewVariable] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmailTemplateFormData>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: initialData ? {
      nom: initialData.nom,
      sujet: initialData.sujet,
      contenu: initialData.contenu,
      type: initialData.type,
      variables: parseTemplateVariables(initialData.variables),
      actif: initialData.actif,
    } : {
      nom: '',
      sujet: '',
      contenu: '',
      type: 'CUSTOM',
      variables: [],
      actif: true,
    },
  });

  const watchedType = watch('type');
  const watchedVariables = watch('variables');
  const watchedContenu = watch('contenu');
  const watchedSujet = watch('sujet');

  // Variables prédéfinies selon le type
  const predefinedVariables: { [key: string]: string[] } = {
    RAPPEL_LOYER: [
      'locataire_nom', 'locataire_prenom', 'bien_adresse', 'bien_ville',
      'loyer_montant', 'periode', 'montant_du', 'nb_jours_retard'
    ],
    QUITTANCE: [
      'locataire_nom', 'locataire_prenom', 'bien_adresse', 'bien_ville',
      'loyer_montant', 'periode', 'date_paiement'
    ],
    RELANCE: [
      'locataire_nom', 'locataire_prenom', 'bien_adresse', 'bien_ville',
      'montant_du', 'nb_jours_retard', 'date_limite'
    ],
    BIENVENUE: [
      'locataire_nom', 'locataire_prenom', 'bien_adresse', 'bien_ville',
      'date_entree', 'proprietaire_nom'
    ],
    CUSTOM: [],
  };

  // Templates prédéfinis
  const predefinedTemplates: { [key: string]: { sujet: string; contenu: string } } = {
    RAPPEL_LOYER: {
      sujet: 'Rappel de loyer - {{periode}} - {{bien_adresse}}',
      contenu: `Bonjour {{locataire_prenom}} {{locataire_nom}},

Nous vous informons que votre loyer de {{periode}} d'un montant de {{loyer_montant}}€ pour le logement situé {{bien_adresse}} à {{bien_ville}} n'a pas été réglé.

Montant dû : {{montant_du}}€
Nombre de jours de retard : {{nb_jours_retard}}

Nous vous prions de bien vouloir régulariser votre situation dans les plus brefs délais.

Cordialement,
L'équipe de gestion`
    },
    QUITTANCE: {
      sujet: 'Quittance de loyer - {{periode}} - {{bien_adresse}}',
      contenu: `Madame, Monsieur {{locataire_nom}},

Nous accusons réception de votre paiement de loyer pour la période de {{periode}}.

Détails :
- Locataire : {{locataire_prenom}} {{locataire_nom}}
- Bien : {{bien_adresse}}, {{bien_ville}}
- Période : {{periode}}
- Montant : {{loyer_montant}}€
- Date de paiement : {{date_paiement}}

Cordialement,
L'équipe de gestion`
    },
    RELANCE: {
      sujet: 'RELANCE - Loyer impayé - {{bien_adresse}}',
      contenu: `{{locataire_prenom}} {{locataire_nom}},

Malgré notre précédent courrier, nous constatons que votre loyer demeure impayé.

Montant dû : {{montant_du}}€
Retard : {{nb_jours_retard}} jours
Date limite de paiement : {{date_limite}}

Nous vous mettons en demeure de procéder au règlement immédiatement, faute de quoi nous pourrions être contraints d'engager une procédure judiciaire.

Bien : {{bien_adresse}}, {{bien_ville}}

L'équipe de gestion`
    },
    BIENVENUE: {
      sujet: 'Bienvenue dans votre nouveau logement - {{bien_adresse}}',
      contenu: `Cher(e) {{locataire_prenom}} {{locataire_nom}},

Nous vous souhaitons la bienvenue dans votre nouveau logement !

Adresse : {{bien_adresse}}, {{bien_ville}}
Date d'entrée : {{date_entree}}
Propriétaire : {{proprietaire_nom}}

Nous restons à votre disposition pour toute question.

Cordialement,
L'équipe de gestion`
    },
  };

  // Mettre à jour les variables quand le type change
  useEffect(() => {
    if (watchedType && predefinedVariables[watchedType]) {
      setValue('variables', predefinedVariables[watchedType]);
      
      // Si c'est un nouveau template (pas en édition), appliquer le template prédéfini
      if (!initialData && predefinedTemplates[watchedType]) {
        setValue('sujet', predefinedTemplates[watchedType].sujet);
        setValue('contenu', predefinedTemplates[watchedType].contenu);
      }
    }
  }, [watchedType, setValue, initialData]);

  const handleAddVariable = () => {
    if (newVariable.trim() && !watchedVariables.includes(newVariable.trim())) {
      setValue('variables', [...watchedVariables, newVariable.trim()]);
      setNewVariable('');
    }
  };

  const handleRemoveVariable = (index: number) => {
    setValue('variables', watchedVariables.filter((_, i) => i !== index));
  };

  const insertVariable = (variable: string) => {
    const textarea = document.querySelector('[name="contenu"]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = watchedContenu;
      const before = text.substring(0, start);
      const after = text.substring(end);
      setValue('contenu', before + `{{${variable}}}` + after);
    }
  };

  const typeOptions = [
    { value: 'RAPPEL_LOYER', label: 'Rappel de loyer' },
    { value: 'QUITTANCE', label: 'Quittance' },
    { value: 'RELANCE', label: 'Relance' },
    { value: 'BIENVENUE', label: 'Bienvenue' },
    { value: 'CUSTOM', label: 'Personnalisé' },
  ];

  const renderPreview = () => {
    const sampleVariables: { [key: string]: string } = {
      locataire_nom: 'Dupont',
      locataire_prenom: 'Jean',
      bien_adresse: '123 rue des Exemples',
      bien_ville: 'Paris',
      loyer_montant: '1200',
      periode: 'Janvier 2025',
      montant_du: '1200',
      nb_jours_retard: '15',
      date_paiement: '05/01/2025',
      date_limite: '15/02/2025',
      date_entree: '01/02/2025',
      proprietaire_nom: 'Société ABC',
    };

    let previewSujet = watchedSujet;
    let previewContenu = watchedContenu;

    Object.entries(sampleVariables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      previewSujet = previewSujet.replace(new RegExp(placeholder, 'g'), value);
      previewContenu = previewContenu.replace(new RegExp(placeholder, 'g'), value);
    });

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sujet (aperçu)
          </label>
          <div className="p-3 bg-gray-50 border rounded-md text-sm">
            {previewSujet}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contenu (aperçu)
          </label>
          <div className="p-3 bg-gray-50 border rounded-md text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
            {previewContenu}
          </div>
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Nom du template"
          {...register('nom')}
          error={errors.nom?.message}
          required
        />

        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select
              label="Type de template"
              {...field}
              options={typeOptions}
              error={errors.type?.message}
              required
            />
          )}
        />
      </div>

      <Input
        label="Sujet de l'email"
        {...register('sujet')}
        error={errors.sujet?.message}
        helperText="Vous pouvez utiliser des variables avec la syntaxe {{nom_variable}}"
        required
      />

      {/* Variables disponibles */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Variables disponibles
        </label>
        
        {watchedVariables.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {watchedVariables.map((variable, index) => (
                <div key={index} className="flex items-center bg-blue-50 border border-blue-200 rounded-md px-2 py-1">
                  <span 
                    className="text-sm text-blue-800 cursor-pointer hover:text-blue-900"
                    onClick={() => insertVariable(variable)}
                    title="Cliquer pour insérer dans le contenu"
                  >
                    {variable}
                  </span>
                  {watchedType === 'CUSTOM' && (
                    <button
                      type="button"
                      onClick={() => handleRemoveVariable(index)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 flex items-center">
              <Info className="h-3 w-3 mr-1" />
              Cliquez sur une variable pour l'insérer dans le contenu
            </div>
          </div>
        )}

        {watchedType === 'CUSTOM' && (
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Nom de la variable"
              value={newVariable}
              onChange={(e) => setNewVariable(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddVariable())}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddVariable}
              disabled={!newVariable.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Toggle prévisualisation */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Contenu de l'email
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className="text-blue-600"
        >
          <Eye className="h-4 w-4 mr-1" />
          {isPreviewMode ? 'Éditer' : 'Aperçu'}
        </Button>
      </div>

      {isPreviewMode ? (
        renderPreview()
      ) : (
        <Textarea
          {...register('contenu')}
          rows={12}
          error={errors.contenu?.message}
          helperText="Utilisez {{nom_variable}} pour insérer des variables dynamiques"
          required
        />
      )}

      <Controller
        name="actif"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            label="Template actif"
            checked={value}
            onChange={onChange}
          />
        )}
      />

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" loading={loading}>
          {initialData ? 'Modifier' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};

export default EmailTemplateForm;