import React, { useState, useEffect } from 'react';
import { Mail, FileText, Send, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { quittancesService, QuittanceCreate } from '@/services/quittances';
import { LoyerDetails } from '@/services/biens-details';
import toast from 'react-hot-toast';

interface QuittancePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  loyer: LoyerDetails;
  onConfirmSend: () => void;
}

const QuittancePreviewModal: React.FC<QuittancePreviewModalProps> = ({
  isOpen,
  onClose,
  loyer,
  onConfirmSend,
}) => {
  const [preview, setPreview] = useState<{
    emailContent: {
      subject: string;
      html: string;
      to: string[];
    };
    pdfUrl?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Charger la prévisualisation quand la modal s'ouvre
  useEffect(() => {
    if (isOpen && loyer) {
      loadPreview();
    }
  }, [isOpen, loyer]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      const previewData = await quittancesService.preview({
        loyerId: loyer.id
      });
      setPreview(previewData);
    } catch (error: any) {
      console.error('Erreur lors de la prévisualisation:', error);
      toast.error('Erreur lors de la génération de la prévisualisation');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    try {
      setSending(true);
      await quittancesService.create({
        loyerId: loyer.id
      });
      toast.success('Quittance générée et envoyée avec succès !');
      onConfirmSend();
      onClose();
    } catch (error: any) {
      console.error('Erreur envoi quittance:', error);
      toast.error(error?.response?.data?.error?.message || 'Erreur lors de l\'envoi de la quittance');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setPreview(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Prévisualisation de la quittance"
      size="xl"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">Génération de la prévisualisation...</span>
          </div>
        ) : preview ? (
          <>
            {/* Informations du loyer */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Détails du loyer
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Période :</span>
                  <span className="font-medium ml-2">
                    {new Date(2024, loyer.mois - 1).toLocaleDateString('fr-FR', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Montant :</span>
                  <span className="font-medium ml-2">
                    {loyer.montantDu.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR'
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Locataire(s) :</span>
                  <span className="font-medium ml-2">
                    {loyer.contrat?.locataires.map(cl => 
                      `${cl.locataire.prenom} ${cl.locataire.nom}`
                    ).join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Email(s) :</span>
                  <span className="font-medium ml-2">
                    {preview.emailContent.to.join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Prévisualisation de l'email */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 p-3 border-b">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="font-medium text-gray-900">Prévisualisation de l'email</span>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">Objet :</div>
                  <div className="font-medium">{preview.emailContent.subject}</div>
                </div>
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">Destinataire(s) :</div>
                  <div className="font-medium">{preview.emailContent.to.join(', ')}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-2">Contenu :</div>
                  <div 
                    className="bg-white border rounded p-4 max-h-96 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: preview.emailContent.html }}
                  />
                </div>
              </div>
            </div>

            {/* PDF de la quittance */}
            {preview.pdfUrl && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 p-3 border-b">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-red-600 mr-2" />
                    <span className="font-medium text-gray-900">Quittance PDF</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      La quittance sera jointe en PDF à l'email
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log('Ouverture PDF:', preview.pdfUrl);
                        window.open(preview.pdfUrl, '_blank');
                      }}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Voir PDF
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={sending}
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button
                onClick={handleSend}
                loading={sending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Envoyer la quittance
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Erreur lors de la génération de la prévisualisation</p>
            <Button
              variant="outline"
              onClick={loadPreview}
              className="mt-4"
            >
              Réessayer
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QuittancePreviewModal;