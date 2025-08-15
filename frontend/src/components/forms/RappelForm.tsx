import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from 'react-query';
import { 
  Bell, 
  Calendar, 
  MessageSquare, 
  Users, 
  AlertCircle, 
  Info,
  CheckCircle,
  FileText,
  Send,
} from 'lucide-react';

import { rappelsService, RappelCreate } from '@/services/rappels';
import { emailsService } from '@/services/emails';
import { proprietairesService } from '@/services/proprietaires';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';

// Schéma de validation
const rappelSchema = z.object({
  loyerId: z.string().min(1, 'Le loyer est requis'),
  type: z.string().min(1, 'Le type de rappel est requis'),
  destinataires: z.string().min(1, 'Au moins un destinataire est requis'),
  message: z.string().min(10, 'Le message doit contenir au moins 10 caractères'),
  dateEnvoi: z.string().optional(),
  modeEnvoi: z.string().min(1, 'Le mode d\'envoi est requis'),
});

type RappelFormData = z.infer<typeof rappelSchema>;

interface RappelFormProps {
  loyer: {
    id: string;
    mois: number;
    annee: number;
    montantDu: number;
    montantPaye: number;
    statut: string;
    contrat?: {
      bien?: {
        adresse: string;
      };
      locataires: Array<{
        locataire: {
          nom: string;
          prenom: string;
          email: string;
          telephone?: string;
        };
      }>;
    };
    rappels?: Array<{
      id: string;
      type: string;
      envoye: boolean;
      dateEnvoi: string;
      loyerId?: string;
      destinataires?: string;
      message?: string;
      modeEnvoi?: string;
      dateEnvoiEffective?: string;
      commentaires?: string;
      createdAt?: string;
      updatedAt?: string;
    }>;
  };
  onSubmit: (data: RappelCreate) => void;
  onCancel: () => void;
  loading?: boolean;
  initialData?: Partial<RappelCreate>;
}

const RappelForm: React.FC<RappelFormProps> = ({
  loyer,
  onSubmit,
  onCancel,
  loading = false,
  initialData,
}) => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [messageGenere, setMessageGenere] = useState<string>('');

  // Vérification de sécurité
  if (!loyer) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600">Erreur: Aucun loyer sélectionné</p>
        <button onClick={onCancel} className="mt-4 px-4 py-2 bg-gray-500 text-white rounded">
          Fermer
        </button>
      </div>
    );
  }

  const typesRappel = rappelsService.getTypesRappel();
  const modesEnvoi = rappelsService.getModesEnvoi();

  // Récupérer les templates email
  const { data: templatesData } = useQuery(
    'email-templates-for-rappels',
    () => emailsService.getAllTemplates({ limit: 100 }),
    {
      staleTime: 5 * 60 * 1000, // Cache 5 minutes
    }
  );

  // Récupérer les données des propriétaires pour les signatures
  const { data: proprietairesData } = useQuery(
    'proprietaires-for-signatures',
    () => proprietairesService.getAll({ limit: 100 }),
    {
      staleTime: 10 * 60 * 1000, // Cache 10 minutes
    }
  );
  
  // Suggérer le prochain type de rappel
  const typeSuggere = (loyer.rappels && loyer.rappels.length > 0) ? 
    (loyer.rappels.some(r => r.type === 'MISE_EN_DEMEURE') ? 'AUTRE' : 
     loyer.rappels.some(r => r.type === 'RELANCE') ? 'MISE_EN_DEMEURE' :
     loyer.rappels.some(r => r.type === 'RETARD') ? 'RELANCE' : 'RETARD') : 'RETARD';

  // Fonction pour générer l'HTML de signature des propriétaires
  const generateProprietairesSignatures = useCallback(() => {
    if (!proprietairesData?.data || proprietairesData.data.length === 0) {
      return '<p style="font-style: italic; color: #666;">Signature propriétaire</p>';
    }

    // Pour l'instant, récupérer le premier propriétaire (TODO: améliorer pour gérer plusieurs propriétaires)
    const propriétaire = proprietairesData.data[0];
    
    if (propriétaire.signature) {
      // Extraire le nom de fichier depuis le chemin complet
      const filename = propriétaire.signature.split(/[/\\]/).pop();
      return `<img src="/public/signatures/${filename}" alt="Signature ${propriétaire.prenom} ${propriétaire.nom}" style="max-height: 80px; max-width: 200px; border: 1px solid #ddd; padding: 5px;" />`;
    }
    
    return `<p style="font-style: italic; color: #666;">Signature de ${propriétaire.prenom} ${propriétaire.nom}</p>`;
  }, [proprietairesData?.data]);

  // Fonction pour générer le message à partir des templates email
  const generateMessageFromTemplate = useCallback((type: string) => {
    if (!templatesData?.data || !loyer.contrat) return '';

    // Trouver le template correspondant au type
    const template = templatesData.data.find(t => t.type === type && t.actif);
    if (!template) {
      console.warn(`Aucun template trouvé pour le type: ${type}`);
      return '';
    }

    // Créer les variables pour remplacer dans le template
    const locataires = loyer.contrat.locataires
      .map(cl => `${cl.locataire.prenom} ${cl.locataire.nom}`)
      .join(' et ');
    
    const montantRestant = loyer.montantDu - loyer.montantPaye;
    const moisAnnee = rappelsService.formatMoisAnnee(loyer.mois, loyer.annee);
    const adresse = loyer.contrat.bien?.adresse || 'Adresse non disponible';

    const variables: Record<string, string> = {
      // Variables locataire
      locataire_nom: loyer.contrat.locataires[0]?.locataire?.nom || '',
      locataire_prenom: loyer.contrat.locataires[0]?.locataire?.prenom || '',
      locataire_nom_complet: loyer.contrat.locataires
        .map(cl => `${cl.locataire?.prenom} ${cl.locataire?.nom}`)
        .join(' et ') || '',
      
      // Variables bien
      bien_adresse: adresse,
      bien_ville: loyer.contrat?.bien?.ville || '',
      bien_code_postal: loyer.contrat?.bien?.codePostal || '',
      bien_reglement: loyer.contrat?.bien?.reglementInterieur || '',
      
      // Variables propriétaire (TODO: récupérer depuis la base)
      proprietaire_nom_complet: 'Propriétaire', // TODO: récupérer les vrais noms
      proprietaire_adresse: 'Adresse propriétaire', // TODO
      proprietaire_ville: 'Ville propriétaire', // TODO
      proprietaire_code_postal: 'CP propriétaire', // TODO
      proprietaire_rib: 'RIB propriétaire', // TODO
      signature_proprietaire: generateProprietairesSignatures(),
      
      // Variables loyer/financier
      periode: moisAnnee,
      mois_annee: moisAnnee,
      montant_du: montantRestant.toString(),
      montant_regle: loyer.montantPaye.toString(),
      loyer_montant: loyer.montantDu.toString(),
      loyer_hors_charges: (loyer.montantDu * 0.95).toFixed(2), // TODO: calculer vraiment
      charges_montant: (loyer.montantDu * 0.05).toFixed(2), // TODO: récupérer les vraies charges
      total_quittance: loyer.montantDu.toString(),
      mode_paiement: loyer.contrat?.modePaiement || 'VIREMENT',
      
      // Variables dates
      nb_jours_retard: Math.max(0, Math.floor((Date.now() - new Date(loyer.annee, loyer.mois - 1, 5).getTime()) / (1000 * 60 * 60 * 24))).toString(),
      date_paiement: new Date().toLocaleDateString('fr-FR'),
      date_etablissement: new Date().toLocaleDateString('fr-FR'),
      date_limite: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
      date_etat_lieux: loyer.contrat?.dateEtatLieux ? new Date(loyer.contrat.dateEtatLieux).toLocaleDateString('fr-FR') : '',
      heure_etat_lieux: loyer.contrat?.heureEtatLieux || '',
      lieu_etablissement: 'Ville', // TODO: récupérer depuis config
      
      // Variables générales
      message_personnalise: '[Veuillez personnaliser ce message]'
    };

    // Remplacer les variables dans le contenu du template
    let contenu = template.contenu;
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      contenu = contenu.replace(placeholder, value);
    });

    // Convertir le HTML en texte simple pour le textarea
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contenu;
    return tempDiv.textContent || tempDiv.innerText || '';
  }, [templatesData?.data, loyer.contrat, loyer.mois, loyer.annee, loyer.montantDu, loyer.montantPaye, generateProprietairesSignatures]);
  
  // Emails des locataires
  const emailsLocataires = (loyer.contrat && loyer.contrat.locataires) ? 
    loyer.contrat.locataires.map(cl => cl.locataire?.email).filter(email => email) : [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<RappelFormData>({
    resolver: zodResolver(rappelSchema),
    defaultValues: {
      loyerId: loyer.id,
      type: initialData?.type || typeSuggere,
      destinataires: Array.isArray(initialData?.destinataires) 
        ? initialData.destinataires.join(', ') 
        : initialData?.destinataires || emailsLocataires.join(', '),
      message: initialData?.message || '',
      dateEnvoi: initialData?.dateEnvoi || rappelsService.getTodayISOString(),
      modeEnvoi: initialData?.modeEnvoi || 'EMAIL',
    },
    mode: 'onChange',
  });

  // Surveiller les changements de type pour générer le message
  const watchedType = watch('type');
  useEffect(() => {
    if (watchedType && watchedType !== selectedType && templatesData?.data) {
      setSelectedType(watchedType);
      const message = generateMessageFromTemplate(watchedType);
      if (message) {
        setMessageGenere(message);
        setValue('message', message, { shouldValidate: true });
      }
    }
  }, [watchedType, templatesData, setValue, selectedType, generateMessageFromTemplate]);

  const handleFormSubmit = (data: RappelFormData) => {
    onSubmit({
      ...data,
      destinataires: data.destinataires.split(',').map(email => email.trim()),
    });
  };

  const handleDestinatairesSelect = (emails: string[]) => {
    setValue('destinataires', emails.join(', '), { shouldValidate: true });
  };

  const handleMessageGenerate = () => {
    if (selectedType) {
      const message = generateMessageFromTemplate(selectedType);
      if (message) {
        setMessageGenere(message);
        setValue('message', message, { shouldValidate: true });
      }
    }
  };

  const montantRestant = loyer.montantDu - loyer.montantPaye;
  const rappelsStats = (loyer.rappels && loyer.rappels.length > 0) ? {
    total: loyer.rappels.length,
    envoyes: loyer.rappels.filter(r => r.envoye).length,
    enAttente: loyer.rappels.filter(r => !r.envoye).length,
    parType: {} as Record<string, number>,
    dernierRappel: loyer.rappels[0]
  } : null;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Informations du loyer */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2 flex items-center">
          <Info className="h-4 w-4 mr-2" />
          Loyer concerné
        </h3>
        <div className="text-sm text-blue-800">
          <div>Période: {rappelsService.formatMoisAnnee(loyer.mois, loyer.annee)}</div>
          <div>Montant dû: {rappelsService.formatCurrency(loyer.montantDu)}</div>
          <div>Déjà payé: {rappelsService.formatCurrency(loyer.montantPaye)}</div>
          <div className="font-medium">
            Reste à payer: {rappelsService.formatCurrency(montantRestant)}
          </div>
          <div>Statut: 
            <Badge 
              variant={loyer.statut === 'RETARD' ? 'danger' : loyer.statut === 'PARTIEL' ? 'warning' : 'info'}
              className="ml-2"
            >
              {loyer.statut}
            </Badge>
          </div>
        </div>
      </div>

      {/* Statistiques des rappels existants */}
      {rappelsStats && rappelsStats.total > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-medium text-yellow-900 mb-2 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            Rappels existants
          </h3>
          <div className="text-sm text-yellow-800">
            <div>Total: {rappelsStats.total} rappel(s)</div>
            <div>Envoyés: {rappelsStats.envoyes}</div>
            <div>En attente: {rappelsStats.enAttente}</div>
            {rappelsStats.dernierRappel && (
              <div>
                Dernier rappel: {rappelsService.getTypeLabel(rappelsStats.dernierRappel.type)} 
                ({rappelsService.formatDate(rappelsStats.dernierRappel.dateEnvoi)})
              </div>
            )}
          </div>
        </div>
      )}

      {/* Type de rappel */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type de rappel *
        </label>
        <div className="relative">
          <Bell className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Select
            className="pl-10"
            {...register('type')}
            error={errors.type?.message}
            options={[
              { value: '', label: 'Sélectionner un type' },
              ...typesRappel.map((type) => ({
                value: type.value,
                label: type.label
              }))
            ]}
          />
        </div>
        
        {/* Description du type sélectionné */}
        {selectedType && (
          <div className="mt-2">
            {typesRappel.find(t => t.value === selectedType)?.description && (
              <p className="text-sm text-gray-600">
                {typesRappel.find(t => t.value === selectedType)?.description}
              </p>
            )}
          </div>
        )}
        
        {/* Suggestion de type */}
        {typeSuggere && typeSuggere !== selectedType && (
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValue('type', typeSuggere, { shouldValidate: true })}
              className="text-xs"
            >
              Suggéré: {rappelsService.getTypeLabel(typeSuggere)}
            </Button>
          </div>
        )}
      </div>

      {/* Destinataires */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Destinataires *
        </label>
        <div className="relative">
          <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Textarea
            placeholder="Adresses email séparées par des virgules"
            rows={2}
            className="pl-10"
            {...register('destinataires')}
            error={errors.destinataires?.message}
          />
        </div>
        
        {/* Suggestions d'emails */}
        {emailsLocataires.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs text-gray-500">Locataires:</span>
            {loyer.contrat?.locataires.map((cl, index) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDestinatairesSelect([cl.locataire.email])}
                className="text-xs"
                title={`${cl.locataire.prenom} ${cl.locataire.nom}`}
              >
                {cl.locataire.email}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDestinatairesSelect(emailsLocataires)}
              className="text-xs"
            >
              Tous les locataires
            </Button>
          </div>
        )}
      </div>

      {/* Mode d'envoi */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mode d'envoi *
        </label>
        <div className="relative">
          <Send className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Select
            className="pl-10"
            {...register('modeEnvoi')}
            error={errors.modeEnvoi?.message}
            options={[
              { value: '', label: 'Sélectionner un mode' },
              ...modesEnvoi.map((mode) => ({
                value: mode.value,
                label: `${mode.icon} ${mode.label}`
              }))
            ]}
          />
        </div>
      </div>

      {/* Date d'envoi */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date d'envoi prévue
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="date"
            className="pl-10"
            {...register('dateEnvoi')}
            error={errors.dateEnvoi?.message}
            min={rappelsService.getTodayISOString()}
          />
        </div>
      </div>

      {/* Sélecteur de template */}
      {templatesData?.data && templatesData.data.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Template email (optionnel)
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Select
              className="pl-10"
              onChange={(e) => {
                const templateId = e.target.value;
                if (templateId) {
                  const template = templatesData.data.find(t => t.id === templateId);
                  if (template) {
                    const message = generateMessageFromTemplate(template.type);
                    if (message) {
                      setValue('message', message, { shouldValidate: true });
                      setMessageGenere(message);
                    }
                  }
                }
              }}
              options={[
                { value: '', label: 'Sélectionner un template...' },
                ...templatesData.data
                  .filter(t => t.actif)
                  .map(template => ({
                    value: template.id,
                    label: `${template.nom} (${template.type})`
                  }))
              ]}
            />
          </div>
          <p className="text-xs text-gray-500">
            Les templates sont basés sur ceux configurés dans la section Emails
          </p>
        </div>
      )}

      {/* Message */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Message du rappel *
        </label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Textarea
            placeholder="Tapez votre message de rappel..."
            rows={12}
            className="pl-10"
            {...register('message')}
            error={errors.message?.message}
          />
        </div>
        
        {/* Bouton pour générer un message depuis template */}
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMessageGenerate}
            disabled={!selectedType}
            className="flex items-center"
          >
            <FileText className="h-4 w-4 mr-2" />
            Générer depuis template
          </Button>
          {messageGenere && (
            <span className="text-xs text-green-600">Message généré depuis template email</span>
          )}
        </div>
      </div>

      {/* Aperçu du message */}
      {watch('message') && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Aperçu du message</h4>
          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border">
            {watch('message').substring(0, 200)}
            {watch('message').length > 200 && '...'}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {watch('message').length} caractères
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
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
          disabled={!isValid}
          className="flex items-center"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {initialData ? 'Modifier le rappel' : 'Créer le rappel'}
        </Button>
      </div>
    </form>
  );
};

export default RappelForm;