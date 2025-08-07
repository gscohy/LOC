import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Calendar, Euro, FileText, Building, Tag } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FileDropZone from '@/components/ui/FileDropZone';
import { ChargeCreate, ChargeUpdate, chargesService } from '@/services/charges';
import { biensService } from '@/services/biens';

interface ChargeFormProps {
  charge?: any; // Charge existante pour modification
  onSubmit: (data: ChargeCreate | ChargeUpdate) => void;
  onCancel: () => void;
  loading?: boolean;
}

const ChargeForm: React.FC<ChargeFormProps> = ({
  charge,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<ChargeCreate | ChargeUpdate>({
    bienId: '',
    categorie: 'TRAVAUX',
    description: '',
    montant: 0,
    date: new Date().toISOString().split('T')[0],
    type: 'PONCTUELLE',
    frequence: '',
    dateDebut: '',
    dateFin: '',
    facture: '',
    payee: false,
    commentaires: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [selectedFactureFile, setSelectedFactureFile] = useState<File | null>(null);

  // Charger la liste des biens
  const { data: biensData } = useQuery('biens', () => biensService.getAll(), {
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (charge) {
      setFormData({
        bienId: charge.bienId || '',
        categorie: charge.categorie || 'TRAVAUX',
        description: charge.description || '',
        montant: charge.montant || 0,
        date: charge.date ? new Date(charge.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        type: charge.type || 'PONCTUELLE',
        frequence: charge.frequence || '',
        dateDebut: charge.dateDebut ? new Date(charge.dateDebut).toISOString().split('T')[0] : '',
        dateFin: charge.dateFin ? new Date(charge.dateFin).toISOString().split('T')[0] : '',
        facture: charge.facture || '',
        payee: charge.payee || false,
        commentaires: charge.commentaires || '',
      });
    }
  }, [charge]);

  // Fonction pour la sélection de fichier (utilisée par FileDropZone)
  const handleFileSelect = (file: File) => {
    setSelectedFactureFile(file);
    console.log('Fichier sélectionné:', file.name, file.type, file.size);
  };

  const handleInputChange = (field: string, value: any) => {
    // S'assurer que la valeur est sérialisable
    let cleanValue = value;
    
    // Si c'est un événement React, extraire la valeur
    if (value && typeof value === 'object' && 'target' in value) {
      cleanValue = value.target.type === 'checkbox' ? value.target.checked : value.target.value;
    }
    
    // Convertir en type approprié
    if (field === 'montant') {
      cleanValue = parseFloat(cleanValue) || 0;
    } else if (field === 'payee') {
      cleanValue = Boolean(cleanValue);
    } else if (typeof cleanValue !== 'string' && typeof cleanValue !== 'number' && typeof cleanValue !== 'boolean') {
      cleanValue = String(cleanValue || '');
    }

    setFormData(prev => ({
      ...prev,
      [field]: cleanValue,
    }));

    // Supprimer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.bienId) {
      newErrors.bienId = 'Le bien est requis';
    }
    if (!formData.categorie) {
      newErrors.categorie = 'La catégorie est requise';
    }
    if (!formData.description?.trim()) {
      newErrors.description = 'La description est requise';
    }
    if (!formData.montant || formData.montant <= 0) {
      newErrors.montant = 'Le montant doit être positif';
    }
    if (!formData.date) {
      newErrors.date = 'La date est requise';
    }

    // Validation spécifique pour les charges récurrentes
    if (formData.type !== 'PONCTUELLE') {
      if (!formData.dateDebut) {
        newErrors.dateDebut = 'La date de début est requise pour les charges récurrentes';
      }
      if (formData.dateDebut && formData.dateFin && new Date(formData.dateDebut) >= new Date(formData.dateFin)) {
        newErrors.dateFin = 'La date de fin doit être postérieure à la date de début';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // Créer un objet avec seulement les propriétés nécessaires (éviter les références circulaires)
      const cleanData: ChargeCreate | ChargeUpdate = {
        bienId: String(formData.bienId || '').trim(),
        categorie: String(formData.categorie || 'TRAVAUX').trim(),
        description: String(formData.description || '').trim(),
        montant: Number(formData.montant) || 0,
        date: String(formData.date || new Date().toISOString().split('T')[0]).trim(),
        type: String(formData.type || 'PONCTUELLE').trim(),
        payee: Boolean(formData.payee),
        commentaires: String(formData.commentaires || '').trim(),
        facture: String(formData.facture || '').trim()
      };
      
      // Validation supplémentaire
      if (!cleanData.bienId) {
        throw new Error('Le bien est requis');
      }
      if (!cleanData.description) {
        throw new Error('La description est requise');
      }
      if (!cleanData.montant || cleanData.montant <= 0) {
        throw new Error('Le montant doit être positif');
      }
      
      // Ajouter les champs spécifiques aux charges récurrentes seulement si nécessaire
      if (cleanData.type !== 'PONCTUELLE') {
        cleanData.frequence = String(formData.frequence || '').trim();
        cleanData.dateDebut = String(formData.dateDebut || '').trim();
        cleanData.dateFin = String(formData.dateFin || '').trim();
      }

      // Gérer le fichier de facture si présent
      if (selectedFactureFile) {
        try {
          console.log('🔄 Upload de la facture en cours...', selectedFactureFile.name);
          const uploadResult = await chargesService.uploadFacture(selectedFactureFile);
          console.log('✅ Facture uploadée:', uploadResult);
          cleanData.facture = String(uploadResult.url || '');
        } catch (error) {
          console.error('❌ Erreur upload facture:', error);
          // En cas d'erreur, on met juste le nom du fichier
          cleanData.facture = String(selectedFactureFile.name || '');
          // On peut continuer avec la création de la charge
        }
      }

      // Validation finale pour s'assurer qu'il n'y a que des types primitifs
      const serializedData = JSON.parse(JSON.stringify(cleanData));
      console.log('📤 Envoi des données de la charge (nettoyées):', serializedData);
      
      onSubmit(serializedData);
    } catch (error) {
      console.error('❌ Erreur lors de la préparation des données:', error);
      alert('Erreur lors de la préparation des données. Veuillez réessayer.');
    }
  };

  const biensOptions = biensData?.data?.map(bien => ({
    value: bien.id,
    label: `${bien.adresse} - ${bien.ville}`,
  })) || [];

  const categoriesOptions = chargesService.getCategories().map(cat => ({
    value: cat,
    label: chargesService.getCategorieLabel(cat),
  }));

  const typesOptions = chargesService.getTypes().map(type => ({
    value: type,
    label: chargesService.getTypeLabel(type),
  }));

  try {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bien */}
        <div>
          <Select
            label="Bien concerné"
            value={formData.bienId}
            onChange={(e) => handleInputChange('bienId', e.target.value)}
            options={biensOptions}
            placeholder="Sélectionner un bien"
            error={errors.bienId}
            required
          />
        </div>

        {/* Catégorie */}
        <div>
          <Select
            label="Catégorie"
            value={formData.categorie}
            onChange={(e) => handleInputChange('categorie', e.target.value)}
            options={categoriesOptions}
            error={errors.categorie}
            required
          />
        </div>

        {/* Montant */}
        <div>
          <Input
            type="number"
            step="0.01"
            min="0"
            label="Montant"
            value={formData.montant}
            onChange={(e) => handleInputChange('montant', e.target.value)}
            placeholder="0.00"
            error={errors.montant}
            required
            icon={<Euro className="h-4 w-4" />}
          />
        </div>

        {/* Date */}
        <div>
          <Input
            type="date"
            label="Date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            error={errors.date}
            required
            icon={<Calendar className="h-4 w-4" />}
          />
        </div>

        {/* Type */}
        <div>
          <Select
            label="Type de charge"
            value={formData.type}
            onChange={(value) => handleInputChange('type', value)}
            options={typesOptions}
            error={errors.type}
            required
          />
        </div>

        {/* Statut payé */}
        <div className="flex items-center space-x-2 pt-8">
          <input
            type="checkbox"
            id="payee"
            checked={formData.payee}
            onChange={(e) => handleInputChange('payee', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="payee" className="text-sm font-medium text-gray-700">
            Charge payée
          </label>
        </div>
      </div>

      {/* Champs spécifiques aux charges récurrentes */}
      {formData.type !== 'PONCTUELLE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="col-span-full text-sm font-medium text-blue-900 mb-2">
            Paramètres de récurrence
          </h4>
          
          <div>
            <Input
              type="date"
              label="Date de début"
              value={formData.dateDebut}
              onChange={(e) => handleInputChange('dateDebut', e.target.value)}
              error={errors.dateDebut}
              required
            />
          </div>

          <div>
            <Input
              type="date"
              label="Date de fin (optionnel)"
              value={formData.dateFin}
              onChange={(e) => handleInputChange('dateFin', e.target.value)}
              error={errors.dateFin}
            />
          </div>

          <div>
            <Input
              type="text"
              label="Fréquence personnalisée"
              value={formData.frequence}
              onChange={(e) => handleInputChange('frequence', e.target.value)}
              placeholder="Ex: Tous les 3 mois"
            />
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Description détaillée de la charge..."
          error={errors.description}
          rows={3}
        />
      </div>

      {/* Facture */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <FileText className="h-4 w-4 inline mr-2" />
          Facture (optionnel)
        </label>
        <p className="text-sm text-gray-500 mb-3">
          Formats acceptés: PNG, JPG, PDF, DOC, DOCX (max 10MB)
        </p>
        
        <FileDropZone
          onFileSelect={handleFileSelect}
          selectedFile={selectedFactureFile}
          onFileRemove={() => setSelectedFactureFile(null)}
          accept="image/*,.pdf,.doc,.docx"
          maxSize={10 * 1024 * 1024}
          label="Glissez-déposez votre facture ici"
          description="ou cliquez pour parcourir vos fichiers"
        />
      </div>

      {/* Commentaires */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Commentaires (optionnel)
        </label>
        <Textarea
          value={formData.commentaires}
          onChange={(e) => handleInputChange('commentaires', e.target.value)}
          placeholder="Commentaires additionnels..."
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
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
          disabled={loading}
        >
          {loading && <LoadingSpinner size="sm" className="mr-2" />}
          {charge ? 'Mettre à jour' : 'Créer'} la charge
        </Button>
        </div>
      </form>
    );
  } catch (error) {
    console.error('Erreur rendu ChargeForm:', error);
    return (
      <div className="p-6 border border-red-300 rounded-lg bg-red-50">
        <h3 className="text-lg font-medium text-red-800 mb-2">
          Erreur lors du chargement du formulaire
        </h3>
        <p className="text-sm text-red-600 mb-4">
          Une erreur est survenue lors du chargement du formulaire de charge.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Rafraîchir la page
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }
};

export default ChargeForm;