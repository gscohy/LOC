import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from 'react-query';
import { Mail, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

import { authService } from '@/services/auth';
import { RegisterForm } from '@/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  role: z.enum(['ADMIN', 'GESTIONNAIRE', 'LECTEUR']).default('GESTIONNAIRE'),
});

const roleOptions = [
  { value: 'GESTIONNAIRE', label: 'Gestionnaire' },
  { value: 'ADMIN', label: 'Administrateur' },
  { value: 'LECTEUR', label: 'Lecteur' },
];

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'GESTIONNAIRE',
    },
  });

  const registerMutation = useMutation(authService.register, {
    onSuccess: (data) => {
      toast.success(`Compte créé avec succès ! Bienvenue ${data.user.prenom} !`);
      navigate('/dashboard');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la création du compte');
    },
  });

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="card">
      <div className="p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Créer un compte</h2>
          <p className="mt-2 text-sm text-gray-600">
            Créez votre compte pour accéder à l'application
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prénom"
              type="text"
              icon={<User className="h-4 w-4" />}
              placeholder="Jean"
              error={errors.prenom?.message}
              {...register('prenom')}
            />

            <Input
              label="Nom"
              type="text"
              icon={<User className="h-4 w-4" />}
              placeholder="Dupont"
              error={errors.nom?.message}
              {...register('nom')}
            />
          </div>

          <Input
            label="Email"
            type="email"
            icon={<Mail className="h-4 w-4" />}
            placeholder="jean.dupont@email.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Mot de passe"
            type="password"
            icon={<Lock className="h-4 w-4" />}
            placeholder="••••••••"
            error={errors.password?.message}
            helperText="Au moins 6 caractères"
            {...register('password')}
          />

          <Select
            label="Rôle"
            options={roleOptions}
            error={errors.role?.message}
            {...register('role')}
          />

          <Button
            type="submit"
            className="w-full"
            loading={registerMutation.isLoading}
          >
            Créer le compte
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Déjà un compte ?{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;