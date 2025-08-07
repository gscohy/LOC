import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Mail, Settings, Eye, TestTube, Star, StarOff } from 'lucide-react';
import toast from 'react-hot-toast';

import { emailsService } from '@/services/emails';
import { EmailConfig } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import EmailConfigForm from '@/components/forms/EmailConfigForm';

const EmailConfigsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EmailConfig | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingConfig, setDeletingConfig] = useState<EmailConfig | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pageSize = 10;

  const {
    data: configsData,
    isLoading,
    error,
  } = useQuery(
    ['email-configs', currentPage, searchTerm],
    () => emailsService.getAllConfigs({
      page: currentPage,
      limit: pageSize,
      search: searchTerm || undefined,
    }),
    {
      keepPreviousData: true,
    }
  );

  const createMutation = useMutation(emailsService.createConfig, {
    onSuccess: () => {
      queryClient.invalidateQueries('email-configs');
      setIsCreateModalOpen(false);
      toast.success('Configuration email créée avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la création');
    },
  });

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => emailsService.updateConfig(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('email-configs');
        setEditingConfig(null);
        toast.success('Configuration email modifiée avec succès');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error?.message || 'Erreur lors de la modification');
      },
    }
  );

  const deleteMutation = useMutation(emailsService.deleteConfig, {
    onSuccess: () => {
      queryClient.invalidateQueries('email-configs');
      setIsDeleteModalOpen(false);
      setDeletingConfig(null);
      toast.success('Configuration email supprimée avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la suppression');
    },
  });

  const testMutation = useMutation(emailsService.testConfig, {
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error: any) => {
      toast.error('Erreur lors du test de la configuration');
    },
  });

  const setDefaultMutation = useMutation(emailsService.setDefaultConfig, {
    onSuccess: () => {
      queryClient.invalidateQueries('email-configs');
      toast.success('Configuration définie comme par défaut');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la modification');
    },
  });

  const handleCreate = (data: any) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (data: any) => {
    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data });
    }
  };

  const handleDelete = () => {
    if (deletingConfig) {
      deleteMutation.mutate(deletingConfig.id);
    }
  };

  const handleTest = (config: EmailConfig) => {
    testMutation.mutate(config.id);
  };

  const handleSetDefault = (config: EmailConfig) => {
    setDefaultMutation.mutate(config.id);
  };

  const openDeleteModal = (config: EmailConfig) => {
    setDeletingConfig(config);
    setIsDeleteModalOpen(true);
  };

  const getFournisseurBadgeColor = (fournisseur: string) => {
    switch (fournisseur) {
      case 'GMAIL': return 'info';
      case 'ORANGE': return 'warning';
      case 'OUTLOOK': return 'info';
      case 'YAHOO': return 'danger';
      default: return 'gray';
    }
  };

  const columns = [
    {
      key: 'nom',
      title: 'Configuration',
      render: (value: any, config: EmailConfig) => (
        <div className="flex items-center">
          <Mail className="h-4 w-4 mr-2 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900 flex items-center">
              {config.nom}
              {config.parDefaut && (
                <Star className="h-4 w-4 ml-2 text-yellow-500 fill-current" />
              )}
            </div>
            <div className="text-sm text-gray-500">
              {config.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'fournisseur',
      title: 'Fournisseur',
      render: (value: any, config: EmailConfig) => (
        <Badge variant={getFournisseurBadgeColor(config.fournisseur)}>
          {config.fournisseur}
        </Badge>
      ),
    },
    {
      key: 'serveur',
      title: 'Serveur SMTP',
      render: (value: any, config: EmailConfig) => (
        <div className="text-sm">
          <div className="font-medium">{config.serveurSMTP}</div>
          <div className="text-gray-500">Port {config.portSMTP} • {config.securite}</div>
        </div>
      ),
    },
    {
      key: 'statut',
      title: 'Statut',
      render: (value: any, config: EmailConfig) => (
        <div className="space-y-1">
          <Badge variant={config.actif ? 'success' : 'gray'}>
            {config.actif ? 'Actif' : 'Inactif'}
          </Badge>
          {config.parDefaut && (
            <Badge variant="warning">
              Par défaut
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, config: EmailConfig) => (
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleTest(config)}
            className="text-purple-600 hover:text-purple-700"
            title="Tester la configuration"
            loading={testMutation.isLoading}
          >
            <TestTube className="h-4 w-4" />
          </Button>
          {!config.parDefaut && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSetDefault(config)}
              className="text-yellow-600 hover:text-yellow-700"
              title="Définir comme par défaut"
              loading={setDefaultMutation.isLoading}
            >
              <StarOff className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingConfig(config)}
            className="text-blue-600 hover:text-blue-700"
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDeleteModal(config)}
            className="text-red-600 hover:text-red-700"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
            <Settings className="h-6 w-6 mr-3 text-blue-500" />
            Configuration Email
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez vos comptes email pour l'envoi automatique de mails
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle configuration
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Rechercher une configuration..."
            icon={<Search className="h-4 w-4" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Configurations email
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {configsData?.pagination.total || 0} configuration(s)
          </p>
        </div>
        
        {error ? (
          <div className="p-6 text-red-600">
            Erreur: {String(error)}
          </div>
        ) : (
          <Table
            columns={columns}
            data={configsData?.data || []}
            loading={isLoading}
            emptyText="Aucune configuration trouvée"
            keyExtractor={(record) => record.id}
          />
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Créer une configuration email"
        size="lg"
      >
        <EmailConfigForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
          loading={createMutation.isLoading}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingConfig}
        onClose={() => setEditingConfig(null)}
        title="Modifier la configuration email"
        size="lg"
      >
        {editingConfig && (
          <EmailConfigForm
            initialData={editingConfig}
            onSubmit={handleUpdate}
            onCancel={() => setEditingConfig(null)}
            loading={updateMutation.isLoading}
          />
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Supprimer la configuration email"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir supprimer cette configuration email ? Cette action est
            irréversible.
          </p>
          {deletingConfig && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">
                {deletingConfig.nom}
              </div>
              <div className="text-sm text-gray-600">
                {deletingConfig.email} • {deletingConfig.fournisseur}
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleteMutation.isLoading}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmailConfigsPage;