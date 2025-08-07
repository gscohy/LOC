import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { Edit3, Save, X, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { contratsService } from '@/services/contrats';

interface ContratCommentairesProps {
  contratId: string;
  commentaires?: string;
}

const ContratCommentaires: React.FC<ContratCommentairesProps> = ({
  contratId,
  commentaires
}) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(commentaires || '');

  const updateCommentairesMutation = useMutation(
    (data: { commentaires: string }) => contratsService.update(contratId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['contrat-details', contratId]);
        setIsEditing(false);
        toast.success('Commentaires mis à jour avec succès');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error?.message || 'Erreur lors de la mise à jour');
      },
    }
  );

  const handleSave = () => {
    updateCommentairesMutation.mutate({ commentaires: editValue });
  };

  const handleCancel = () => {
    setEditValue(commentaires || '');
    setIsEditing(false);
  };

  return (
    <div className="card">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Notes et commentaires
          </h3>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex items-center"
            >
              <Edit3 className="h-4 w-4 mr-1" />
              Modifier
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Ajoutez vos notes importantes ici :
• Informations sur la résiliation
• Remboursement de la caution
• Travaux effectués ou à prévoir
• État des lieux
• Incidents particuliers
• Etc."
              rows={8}
              className="min-h-[200px]"
            />
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleSave}
                loading={updateCommentairesMutation.isLoading}
                className="flex items-center"
              >
                <Save className="h-4 w-4 mr-1" />
                Enregistrer
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateCommentairesMutation.isLoading}
                className="flex items-center"
              >
                <X className="h-4 w-4 mr-1" />
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="min-h-[100px]">
            {commentaires ? (
              <div className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-4 rounded-lg">
                {commentaires}
              </div>
            ) : (
              <div className="text-gray-500 italic text-center py-8">
                Aucun commentaire ajouté.
                <br />
                <span className="text-sm">
                  Cliquez sur "Modifier" pour ajouter des notes importantes comme les informations de résiliation, 
                  le remboursement de caution, les travaux effectués, etc.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContratCommentaires;