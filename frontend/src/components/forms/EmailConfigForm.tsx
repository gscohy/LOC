import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { emailsService } from '@/services/emails';

const emailConfigSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  fournisseur: z.enum(['GMAIL', 'ORANGE', 'OUTLOOK', 'YAHOO', 'CUSTOM']),
  email: z.string().email('Email invalide'),
  motDePasse: z.string().min(1, 'Le mot de passe est requis'),
  serveurSMTP: z.string().min(1, 'Le serveur SMTP est requis'),
  portSMTP: z.number().min(1).max(65535, 'Port invalide'),
  securite: z.enum(['TLS', 'SSL', 'NONE']),
  actif: z.boolean(),
  parDefaut: z.boolean(),
});

type EmailConfigFormData = z.infer<typeof emailConfigSchema>;

interface EmailConfigFormProps {
  initialData?: Partial<EmailConfigFormData>;
  onSubmit: (data: EmailConfigFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const EmailConfigForm: React.FC<EmailConfigFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmailConfigFormData>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      nom: '',
      fournisseur: 'GMAIL',
      email: '',
      motDePasse: '',
      serveurSMTP: 'smtp.gmail.com',
      portSMTP: 587,
      securite: 'TLS',
      actif: true,
      parDefaut: false,
      ...initialData,
    },
  });

  const watchedFournisseur = watch('fournisseur');

  // Auto-remplir les paramètres SMTP selon le fournisseur
  useEffect(() => {
    const defaults = emailsService.getProviderDefaults(watchedFournisseur);
    setValue('serveurSMTP', defaults.serveurSMTP);
    setValue('portSMTP', defaults.portSMTP);
    setValue('securite', defaults.securite);
  }, [watchedFournisseur, setValue]);

  const fournisseurs = [
    { value: 'GMAIL', label: 'Gmail' },
    { value: 'ORANGE', label: 'Orange' },
    { value: 'OUTLOOK', label: 'Outlook / Hotmail' },
    { value: 'YAHOO', label: 'Yahoo Mail' },
    { value: 'CUSTOM', label: 'Personnalisé' },
  ];

  const securiteOptions = [
    { value: 'TLS', label: 'TLS (recommandé)' },
    { value: 'SSL', label: 'SSL' },
    { value: 'NONE', label: 'Aucune' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Informations générales */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Configuration générale</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la configuration *
            </label>
            <Input
              {...register('nom')}
              error={errors.nom?.message}
              placeholder="Gmail principal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fournisseur *
            </label>
            <select
              {...register('fournisseur')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {fournisseurs.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.fournisseur && (
              <p className="mt-1 text-sm text-red-600">{errors.fournisseur.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse email *
            </label>
            <Input
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="votre.email@gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe d'application *
            </label>
            <Input
              type="password"
              {...register('motDePasse')}
              error={errors.motDePasse?.message}
              placeholder="Mot de passe d'application"
            />
            <p className="mt-1 text-xs text-gray-500">
              Pour Gmail/Outlook, utilisez un mot de passe d'application
            </p>
          </div>
        </div>
      </div>

      {/* Paramètres SMTP */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Paramètres SMTP</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serveur SMTP *
            </label>
            <Input
              {...register('serveurSMTP')}
              error={errors.serveurSMTP?.message}
              placeholder="smtp.gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Port *
            </label>
            <Input
              type="number"
              {...register('portSMTP', { valueAsNumber: true })}
              error={errors.portSMTP?.message}
              placeholder="587"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sécurité *
          </label>
          <select
            {...register('securite')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {securiteOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.securite && (
            <p className="mt-1 text-sm text-red-600">{errors.securite.message}</p>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Options</h3>
        
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('actif')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Configuration active
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('parDefaut')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Utiliser comme configuration par défaut
            </label>
          </div>
        </div>
      </div>

      {/* Guide rapide */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Guide rapide - Configuration par fournisseur
        </h4>
        <div className="text-xs text-blue-700 space-y-1">
          <p><strong>Gmail :</strong> Activez l'authentification à 2 facteurs puis créez un mot de passe d'application</p>
          <p><strong>Outlook :</strong> compte.microsoft.com → Sécurité → Options de connexion avancées</p>
          <p><strong>Orange :</strong> Utilisez un mot de passe applicatif (recommandé) ou votre mot de passe habituel</p>
          <p><strong>Yahoo :</strong> Générez un mot de passe d'application dans les paramètres de sécurité</p>
        </div>
      </div>

      {watchedFournisseur === 'ORANGE' && (
        <div className="bg-orange-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-orange-900 mb-2">
            Configuration Orange spécifique
          </h4>
          <div className="text-xs text-orange-700 space-y-2">
            <div>
              <p><strong>Paramètres SMTP recommandés :</strong></p>
              <p>• Serveur : smtp.orange.fr</p>
              <p>• Port : <strong>465</strong> (SSL) - Plus stable pour Orange</p>
              <p>• Sécurité : <strong>SSL</strong> - Recommandé</p>
            </div>
            <div>
              <p><strong>Authentification :</strong></p>
              <p>• <strong>Format email complet requis :</strong> prenom.nom@orange.fr</p>
              <p>• <strong>Mot de passe :</strong> Mot de passe applicatif ou mot de passe principal</p>
            </div>
            <div className="bg-red-50 p-2 rounded mt-2 border border-red-200">
              <p className="font-medium text-red-800">⚠️ Résolution d'erreurs courantes :</p>
              <div className="mt-1 text-red-700">
                <p>• Vérifiez que l'email est au format complet : nom@orange.fr</p>
                <p>• Testez d'abord avec votre mot de passe principal</p>
                <p>• Si échec, créez un nouveau mot de passe applicatif</p>
                <p>• Activez "Courrier sur d'autres appareils" dans vos paramètres Orange</p>
              </div>
            </div>
            <div className="bg-orange-100 p-2 rounded mt-2">
              <p className="font-medium">🔧 Étapes de dépannage :</p>
              <div className="mt-1">
                <p>1. orange.fr → Se connecter → Paramètres</p>
                <p>2. Messagerie → Accès depuis d'autres appareils → Activer</p>
                <p>3. Créer un nouveau mot de passe applicatif si nécessaire</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          loading={loading}
        >
          {initialData ? 'Modifier' : 'Créer'} la configuration
        </Button>
      </div>
    </form>
  );
};

export default EmailConfigForm;