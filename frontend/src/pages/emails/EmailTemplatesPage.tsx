import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Mail, FileText, Eye, MessageSquare, AlertTriangle, User, Star } from 'lucide-react';
import toast from 'react-hot-toast';

import { emailsService } from '@/services/emails';
import { EmailTemplate } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import EmailTemplateForm from '@/components/forms/EmailTemplateForm';
import EmailPreviewModal from '@/components/emails/EmailPreviewModal';

const EmailTemplatesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pageSize = 10;

  const {
    data: templatesData,
    isLoading,
    error,
  } = useQuery(
    ['email-templates', currentPage, searchTerm, typeFilter],
    () => emailsService.getAllTemplates({
      page: currentPage,
      limit: pageSize,
      search: searchTerm || undefined,
      type: typeFilter || undefined,
    }),
    {
      keepPreviousData: true,
    }
  );

  const createMutation = useMutation(emailsService.createTemplate, {
    onSuccess: () => {
      queryClient.invalidateQueries('email-templates');
      setIsCreateModalOpen(false);
      toast.success('Template email créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la création');
    },
  });

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => emailsService.updateTemplate(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('email-templates');
        setEditingTemplate(null);
        toast.success('Template email modifié avec succès');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error?.message || 'Erreur lors de la modification');
      },
    }
  );

  const deleteMutation = useMutation(emailsService.deleteTemplate, {
    onSuccess: () => {
      queryClient.invalidateQueries('email-templates');
      setIsDeleteModalOpen(false);
      setDeletingTemplate(null);
      toast.success('Template email supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de la suppression');
    },
  });

  const handleCreate = (data: any) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (data: any) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    }
  };

  const handleDelete = () => {
    if (deletingTemplate) {
      deleteMutation.mutate(deletingTemplate.id);
    }
  };

  const openDeleteModal = (template: EmailTemplate) => {
    setDeletingTemplate(template);
    setIsDeleteModalOpen(true);
  };

  const openPreviewModal = (template: EmailTemplate) => {
    setPreviewTemplate(template);
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'RAPPEL_LOYER': return 'warning';
      case 'QUITTANCE': return 'success';
      case 'RELANCE': return 'danger';
      case 'BIENVENUE': return 'info';
      case 'CUSTOM': return 'gray';
      default: return 'gray';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'RAPPEL_LOYER': return <AlertTriangle className="h-4 w-4" />;
      case 'QUITTANCE': return <FileText className="h-4 w-4" />;
      case 'RELANCE': return <MessageSquare className="h-4 w-4" />;
      case 'BIENVENUE': return <User className="h-4 w-4" />;
      case 'CUSTOM': return <Star className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'RAPPEL_LOYER': return 'Rappel de loyer';
      case 'QUITTANCE': return 'Quittance';
      case 'RELANCE': return 'Relance';
      case 'BIENVENUE': return 'Bienvenue';
      case 'CUSTOM': return 'Personnalisé';
      default: return type;
    }
  };

  const typeOptions = [
    { value: '', label: 'Tous les types' },
    { value: 'RAPPEL_LOYER', label: 'Rappel de loyer' },
    { value: 'QUITTANCE', label: 'Quittance' },
    { value: 'RELANCE', label: 'Relance' },
    { value: 'BIENVENUE', label: 'Bienvenue' },
    { value: 'CUSTOM', label: 'Personnalisé' },
  ];

  const columns = [
    {
      key: 'nom',
      title: 'Template',
      render: (value: any, template: EmailTemplate) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 mr-3">
            {getTypeIcon(template.type)}
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {template.nom}
            </div>
            <div className="text-sm text-gray-500 truncate max-w-xs" title={template.sujet}>
              {template.sujet}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      render: (value: any, template: EmailTemplate) => (
        <Badge variant={getTypeBadgeColor(template.type)}>
          {getTypeLabel(template.type)}
        </Badge>
      ),
    },
    {
      key: 'variables',
      title: 'Variables',
      render: (value: any, template: EmailTemplate) => (
        <div className="space-y-1">
          {template.variables.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {template.variables.slice(0, 3).map((variable, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                >
                  {variable}
                </span>
              ))}
              {template.variables.length > 3 && (
                <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                  +{template.variables.length - 3}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400">Aucune variable</span>
          )}
        </div>
      ),
    },
    {
      key: 'statut',
      title: 'Statut',
      render: (value: any, template: EmailTemplate) => (
        <Badge variant={template.actif ? 'success' : 'gray'}>
          {template.actif ? 'Actif' : 'Inactif'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      title: 'Créé le',
      render: (value: string) => new Date(value).toLocaleDateString('fr-FR'),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, template: EmailTemplate) => (
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openPreviewModal(template)}
            className="text-purple-600 hover:text-purple-700"
            title="Prévisualiser"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingTemplate(template)}
            className="text-blue-600 hover:text-blue-700"
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDeleteModal(template)}
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
            <Mail className="h-6 w-6 mr-3 text-blue-500" />
            Templates Email
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez vos modèles d'emails pour les rappels et quittances
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau template
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Rechercher un template..."
            icon={<Search className="h-4 w-4" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={typeOptions}
          />
        </div>
      </div>

      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Templates email
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {templatesData?.pagination.total || 0} template(s)
          </p>
        </div>
        
        {error ? (
          <div className="p-6 text-red-600">
            Erreur: {String(error)}
          </div>
        ) : (
          <Table
            columns={columns}
            data={templatesData?.data || []}
            loading={isLoading}
            emptyText="Aucun template trouvé"
            keyExtractor={(record) => record.id}
          />
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Créer un template email"
        size="xl"
      >
        <EmailTemplateForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
          loading={createMutation.isLoading}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        title="Modifier le template email"
        size="xl"
      >
        {editingTemplate && (
          <EmailTemplateForm
            initialData={editingTemplate}
            onSubmit={handleUpdate}
            onCancel={() => setEditingTemplate(null)}
            loading={updateMutation.isLoading}
          />
        )}
      </Modal>

      {/* Preview Modal */}
      {previewTemplate && (
        <EmailPreviewModal
          template={previewTemplate}
          isOpen={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Supprimer le template email"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir supprimer ce template email ? Cette action est
            irréversible.
          </p>
          {deletingTemplate && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">
                {deletingTemplate.nom}
              </div>
              <div className="text-sm text-gray-600">
                {getTypeLabel(deletingTemplate.type)} • {deletingTemplate.sujet}
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

export default EmailTemplatesPage;