import React from 'react';
import { useQuery } from 'react-query';
import { Shield, User, Mail, Phone, MapPin } from 'lucide-react';

import Badge from '@/components/ui/Badge';
import { contratsService } from '@/services/contrats';

interface BienGarantsSectionProps {
  bienId: string;
}

const BienGarantsSection: React.FC<BienGarantsSectionProps> = ({ bienId }) => {
  console.log('🔍 BienGarantsSection - bienId reçu:', bienId);
  
  // Récupérer les contrats du bien avec les locataires et leurs garants
  const { data: contrats, isLoading } = useQuery(
    ['bien-contrats-garants', bienId],
    () => contratsService.getByBien(bienId),
    {
      select: (data) => data.data
    }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTypeGarantieBadge = (type: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'secondary'> = {
      'PHYSIQUE': 'success',
      'MORALE': 'info',
      'BANCAIRE': 'warning',
      'ASSURANCE': 'secondary'
    };
    return variants[type] || 'secondary';
  };

  const getTypeGarantieLabel = (type: string) => {
    const labels: Record<string, string> = {
      'PHYSIQUE': 'Physique',
      'MORALE': 'Moral',
      'BANCAIRE': 'Bancaire',
      'ASSURANCE': 'Assurance'
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Collecter tous les garants des locataires des contrats actifs
  const contratsArray = Array.isArray(contrats) ? contrats : (contrats?.contrats || []);
  console.log('🔍 BienGarantsSection - contrats data:', contrats);
  console.log('🔍 BienGarantsSection - contratsArray:', contratsArray);
  
  const allGarants = contratsArray
    ?.filter(contrat => contrat.statut === 'ACTIF')
    ?.flatMap(contrat => 
      contrat.locataires?.flatMap(cl => 
        cl.locataire.garants?.map(lg => ({
          ...lg.garant,
          locataire: cl.locataire,
          contrat: contrat
        }))
      ).filter(Boolean) || []
    ) || [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 flex items-center">
        <Shield className="h-5 w-5 text-blue-500 mr-2" />
        Garants associés au bien ({allGarants.length})
      </h3>

      {allGarants.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Aucun garant associé aux locataires de ce bien</p>
          <p className="text-sm text-gray-400 mt-1">
            Les garants sont associés dans la fiche de chaque locataire
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {allGarants.map((garant, index) => (
            <div key={`${garant.id}-${index}`} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {garant.civilite} {garant.prenom} {garant.nom}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={getTypeGarantieBadge(garant.typeGarantie)}>
                        {getTypeGarantieLabel(garant.typeGarantie)}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        pour {garant.locataire.prenom} {garant.locataire.nom}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>{garant.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>{garant.telephone}</span>
                  </div>
                  {garant.adresse && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>{garant.adresse}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  {garant.profession && (
                    <div>
                      <strong className="text-gray-700">Profession:</strong>{' '}
                      <span className="text-gray-600">{garant.profession}</span>
                    </div>
                  )}
                  {garant.revenus && garant.revenus > 0 && (
                    <div>
                      <strong className="text-gray-700">Revenus:</strong>{' '}
                      <span className="text-gray-600">{formatCurrency(garant.revenus)}/mois</span>
                    </div>
                  )}
                  <div>
                    <strong className="text-gray-700">Contrat:</strong>{' '}
                    <span className="text-gray-600">
                      {new Date(garant.contrat.dateDebut).toLocaleDateString('fr-FR')}
                      {garant.contrat.dateFin && ` - ${new Date(garant.contrat.dateFin).toLocaleDateString('fr-FR')}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {contrats && contrats.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Information:</strong> Pour ajouter ou modifier des garants, rendez-vous dans la fiche 
            de chaque locataire ou utilisez la section "Garants" du menu principal.
          </p>
        </div>
      )}
    </div>
  );
};

export default BienGarantsSection;