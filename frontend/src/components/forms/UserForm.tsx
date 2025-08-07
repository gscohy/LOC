import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'react-query';
import toast from 'react-hot-toast';
import { User, usersService } from '@/services/users';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';

interface UserFormProps {
  user?: User | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ user, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    role: 'GESTIONNAIRE' as 'ADMIN' | 'GESTIONNAIRE' | 'LECTEUR',
    structure: '',
    typeCollab: '',
    telephone: '',
    adresse: '',
    ville: '',
    codePostal: '',
    dateEmbauche: '',
    statut: 'ACTIF' as 'ACTIF' | 'INACTIF' | 'SUSPENDU',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Récupérer les options de filtres pour les selects
  const { data: filterOptions } = useQuery('users-filter-options', usersService.getFilterOptions);

  // Pré-remplir le formulaire en mode édition
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        nom: user.nom || '',
        prenom: user.prenom || '',
        role: user.role || 'GESTIONNAIRE',
        structure: user.structure || '',
        typeCollab: user.typeCollab || '',
        telephone: user.telephone || '',
        adresse: user.adresse || '',
        ville: user.ville || '',
        codePostal: user.codePostal || '',
        dateEmbauche: user.dateEmbauche ? user.dateEmbauche.split('T')[0] : '',
        statut: user.statut || 'ACTIF',
        password: '', // Ne pas pré-remplir le mot de passe
      });
    }
  }, [user]);

  // Mutations
  const createMutation = useMutation(usersService.create, {
    onSuccess: () => {
      toast.success('Utilisateur créé avec succès');
      onSuccess();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || 'Erreur lors de la création';
      toast.error(message);
      if (error?.response?.data?.error?.details) {
        setErrors(error.response.data.error.details);
      }
    },
  });

  const updateMutation = useMutation(
    (data: { id: string; user: Partial<User & { password?: string }> }) =>
      usersService.update(data.id, data.user),
    {
      onSuccess: () => {
        toast.success('Utilisateur mis à jour avec succès');
        onSuccess();
      },
      onError: (error: any) => {
        const message = error?.response?.data?.error?.message || 'Erreur lors de la mise à jour';
        toast.error(message);
        if (error?.response?.data?.error?.details) {
          setErrors(error.response.data.error.details);
        }
      },
    }
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur pour ce champ
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    }

    if (!formData.prenom.trim()) {
      newErrors.prenom = 'Le prénom est requis';
    }

    if (!user && !formData.password.trim()) {
      newErrors.password = 'Le mot de passe est requis pour un nouvel utilisateur';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Préparer les données à envoyer
    const submitData = {
      ...formData,
      structure: formData.structure || undefined,
      typeCollab: formData.typeCollab || undefined,
      telephone: formData.telephone || undefined,
      adresse: formData.adresse || undefined,
      ville: formData.ville || undefined,
      codePostal: formData.codePostal || undefined,
      dateEmbauche: formData.dateEmbauche || undefined,
      password: formData.password || undefined,
    };

    if (user) {
      // Mode édition
      updateMutation.mutate({ id: user.id, user: submitData });
    } else {
      // Mode création
      createMutation.mutate(submitData);
    }
  };

  const isLoading = createMutation.isLoading || updateMutation.isLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Informations personnelles */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Informations personnelles</h3>
          
          <Input
            label="Email *"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            error={errors.email}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prénom *"
              value={formData.prenom}
              onChange={(e) => handleInputChange('prenom', e.target.value)}
              error={errors.prenom}
              required
            />
            <Input
              label="Nom *"
              value={formData.nom}
              onChange={(e) => handleInputChange('nom', e.target.value)}
              error={errors.nom}
              required
            />
          </div>

          <Input
            label="Téléphone"
            value={formData.telephone}
            onChange={(e) => handleInputChange('telephone', e.target.value)}
            error={errors.telephone}
          />

          <Input
            label="Adresse"
            value={formData.adresse}
            onChange={(e) => handleInputChange('adresse', e.target.value)}
            error={errors.adresse}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Code postal"
              value={formData.codePostal}
              onChange={(e) => handleInputChange('codePostal', e.target.value)}
              error={errors.codePostal}
            />
            <Input
              label="Ville"
              value={formData.ville}
              onChange={(e) => handleInputChange('ville', e.target.value)}
              error={errors.ville}
            />
          </div>
        </div>

        {/* Informations professionnelles */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Informations professionnelles</h3>
          
          <Select
            label="Rôle *"
            value={formData.role}
            onChange={(value) => handleInputChange('role', value)}
            error={errors.role}
            required
          >
            <option value="LECTEUR">Lecteur</option>
            <option value="GESTIONNAIRE">Gestionnaire</option>
            <option value="ADMIN">Administrateur</option>
          </Select>

          <Input
            label="Structure / Département"
            value={formData.structure}
            onChange={(e) => handleInputChange('structure', e.target.value)}
            error={errors.structure}
            list="structures-list"
          />
          <datalist id="structures-list">
            {filterOptions?.structures.map((structure) => (
              <option key={structure} value={structure} />
            ))}
          </datalist>

          <Input
            label="Type de collaborateur"
            value={formData.typeCollab}
            onChange={(e) => handleInputChange('typeCollab', e.target.value)}
            error={errors.typeCollab}
            list="types-collab-list"
          />
          <datalist id="types-collab-list">
            {filterOptions?.typesCollab.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>

          <Input
            label="Date d'embauche"
            type="date"
            value={formData.dateEmbauche}
            onChange={(e) => handleInputChange('dateEmbauche', e.target.value)}
            error={errors.dateEmbauche}
          />

          <Select
            label="Statut *"
            value={formData.statut}
            onChange={(value) => handleInputChange('statut', value)}
            error={errors.statut}
            required
          >
            <option value="ACTIF">Actif</option>
            <option value="INACTIF">Inactif</option>
            <option value="SUSPENDU">Suspendu</option>
          </Select>

          {/* Mot de passe */}
          <Input
            label={user ? "Nouveau mot de passe (laisser vide pour ne pas modifier)" : "Mot de passe *"}
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            error={errors.password}
            required={!user}
            placeholder={user ? "Laisser vide pour ne pas modifier" : ""}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading}
        >
          {user ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};

export default UserForm;