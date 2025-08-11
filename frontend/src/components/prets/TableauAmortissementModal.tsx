import React, { useState, useRef } from 'react';
import { useMutation, useQuery } from 'react-query';
import { X, Upload, FileText, Download, Calendar, Euro, TrendingUp, Info } from 'lucide-react';
import toast from 'react-hot-toast';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { pretsService, PretImmobilier, EcheancePret } from '@/services/prets';

interface TableauAmortissementModalProps {
  isOpen: boolean;
  onClose: () => void;
  pret: PretImmobilier | null;
  onSuccess: () => void;
}

const TableauAmortissementModal: React.FC<TableauAmortissementModalProps> = ({
  isOpen,
  onClose,
  pret,
  onSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Récupérer les détails du prêt avec ses échéances
  const { data: pretData, refetch } = useQuery(
    ['pret', pret?.id],
    () => pret ? pretsService.getById(pret.id) : null,
    {
      enabled: Boolean(pret?.id && isOpen),
    }
  );

  // Récupérer les données fiscales pour l'année courante
  const { data: fiscaliteData } = useQuery(
    ['pret-fiscalite', pret?.id, currentYear],
    () => pret ? pretsService.getFiscaliteAnnee(pret.id, currentYear) : null,
    {
      enabled: Boolean(pret?.id && isOpen),
    }
  );

  // Mutation pour l'upload
  const uploadMutation = useMutation(
    (file: File) => {
      if (!pret) throw new Error('Aucun prêt sélectionné');
      console.log('🔄 Upload du fichier:', file.name, file.size, 'bytes');
      return pretsService.uploadTableau(pret.id, file);
    },
    {
      onSuccess: (data) => {
        console.log('✅ Upload réussi:', data);
        toast.success(data.message || 'Fichier importé avec succès');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        refetch();
        onSuccess();
      },
      onError: (error: any) => {
        console.error('❌ Erreur upload:', error);
        
        // Gestion spécifique des erreurs
        if (error?.response?.status === 500) {
          const message = error?.response?.data?.error?.message;
          if (message && message.includes('Tables de prêts non créées')) {
            toast.error('Tables de prêts non créées en base de données');
          } else {
            toast.error('Erreur serveur lors de l\'import du fichier');
          }
        } else if (error?.response?.data?.error?.message) {
          toast.error(error.response.data.error.message);
        } else if (error?.response?.data?.error) {
          toast.error(error.response.data.error);
        } else if (error?.message) {
          toast.error(error.message);
        } else {
          toast.error('Erreur lors de l\'upload du fichier');
        }
      },
    }
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        toast.error('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }
    
    console.log('🚀 Démarrage upload:', {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      pretId: pret?.id
    });
    
    uploadMutation.mutate(selectedFile);
  };

  const handleExportCSV = () => {
    if (!pretData?.data?.echeances) return;

    const echeances = pretData.data.echeances;
    const headers = [
      'Rang',
      'Date Échéance',
      'Montant à Recouvrer',
      'Capital Amorti',
      'Part Intérêts',
      'Part Accessoires (Assurance)',
      'Capital Restant Dû'
    ];

    const csvContent = [
      headers.join(','),
      ...echeances.map((e: EcheancePret) => [
        e.rang,
        new Date(e.dateEcheance).toLocaleDateString('fr-FR'),
        e.montantRecouvrer.toFixed(2),
        e.capitalAmorti.toFixed(2),
        e.partInterets.toFixed(2),
        e.partAccessoires.toFixed(2),
        e.capitalRestant.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tableau-amortissement-${pret?.nom}-${new Date().getFullYear()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const echeances = pretData?.data?.echeances || [];
  const hasTableau = echeances.length > 0;
  const totaux = fiscaliteData?.data?.totaux;

  const yearOptions = Array.from({length: 10}, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year, label: year.toString() };
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ErrorBoundary>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center">
          <FileText className="h-6 w-6 text-blue-600 mr-3" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Tableau d'Amortissement
            </h2>
            {pret && (
              <p className="text-sm text-gray-600">
                {pret.nom} - {pret.banque}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Upload du fichier */}
        <div className="border border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {hasTableau ? 'Remplacer le tableau d\'amortissement' : 'Importer le tableau d\'amortissement'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Fichier Excel (.xlsx ou .xls) avec les colonnes : RANG, DATE ECHEANCE, MONTANT A RECOUVRER, CAPITAL AMORTI, PART INTERETS, PART ACCESSOIRES, CAPITAL RESTANT DU
            </p>
            
            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Sélectionner un fichier
              </label>
            </div>
            
            {selectedFile && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-900">
                  Fichier sélectionné : {selectedFile.name}
                </p>
                <div className="mt-2">
                  <Button
                    onClick={handleUpload}
                    loading={uploadMutation.isLoading}
                    size="sm"
                  >
                    Importer le tableau
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Informations fiscales actuelles */}
        {hasTableau && totaux && (
          <div className="border border-green-200 rounded-lg p-6 bg-green-50">
            <div className="flex items-center mb-4">
              <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-lg font-medium text-green-900">
                Données Fiscales {currentYear}
              </h3>
              <div className="ml-auto">
                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                  className="text-sm border border-green-300 rounded px-2 py-1"
                >
                  {yearOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded border border-green-200">
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(totaux.interets)}
                </div>
                <div className="text-sm text-gray-600">Intérêts déductibles</div>
              </div>
              <div className="text-center p-4 bg-white rounded border border-green-200">
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(totaux.assurance)}
                </div>
                <div className="text-sm text-gray-600">Assurance déductible</div>
              </div>
              <div className="text-center p-4 bg-white rounded border border-green-200">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totaux.capital)}
                </div>
                <div className="text-sm text-gray-600">Capital amorti</div>
              </div>
              <div className="text-center p-4 bg-white rounded border border-green-200">
                <div className="text-2xl font-bold text-gray-700">
                  {totaux.nombreEcheances}
                </div>
                <div className="text-sm text-gray-600">Échéances</div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                <div className="text-sm text-blue-800">
                  <strong>Pour votre déclaration fiscale :</strong> Les intérêts d'emprunt ({formatCurrency(totaux.interets)}) 
                  et l'assurance ({formatCurrency(totaux.assurance)}) sont déductibles de vos revenus fonciers pour l'année {currentYear}.
                  <br />
                  <strong>Total déductible : {formatCurrency(totaux.interets + totaux.assurance)}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Affichage du tableau */}
        {hasTableau && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Échéances du Prêt ({echeances.length} échéances)
              </h3>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rang
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Mensualité
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Capital
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Intérêts
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Assurance
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Restant Dû
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {echeances.map((echeance: EcheancePret, index: number) => (
                    <tr 
                      key={echeance.id} 
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {echeance.rang}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(echeance.dateEcheance)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatCurrency(echeance.montantRecouvrer)}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600 text-right">
                        {formatCurrency(echeance.capitalAmorti)}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-600 text-right font-medium">
                        {formatCurrency(echeance.partInterets)}
                      </td>
                      <td className="px-4 py-3 text-sm text-orange-600 text-right font-medium">
                        {formatCurrency(echeance.partAccessoires)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {formatCurrency(echeance.capitalRestant)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Message si pas de tableau */}
        {!hasTableau && (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun tableau d'amortissement</h3>
            <p className="mt-1 text-sm text-gray-500">
              Importez votre fichier Excel pour voir les échéances et calculer les déductions fiscales.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 p-6 border-t">
        <Button
          variant="outline"
          onClick={onClose}
        >
          Fermer
        </Button>
      </div>
      </ErrorBoundary>
    </Modal>
  );
};

export default TableauAmortissementModal;