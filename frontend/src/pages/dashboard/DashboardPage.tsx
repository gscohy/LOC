import React from 'react';
import { useQuery } from 'react-query';
import {
  Building2,
  Users,
  Home,
  Euro,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

import { proprietairesService } from '@/services/proprietaires';
import { biensService } from '@/services/biens';
import { locatairesService } from '@/services/locataires';
import { loyersService } from '@/services/loyers';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color,
}) => (
  <div className="card p-6">
    <div className="flex items-center">
      <div className={`flex-shrink-0 p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="ml-4 flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {trend && (
          <div className="flex items-center mt-1">
            {trend.isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span
              className={`ml-1 text-sm ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {Math.abs(trend.value)}%
            </span>
          </div>
        )}
      </div>
    </div>
  </div>
);

interface RecentActivityItem {
  id: string;
  type: 'payment' | 'contract' | 'maintenance';
  title: string;
  description: string;
  date: string;
  amount?: number;
}

const ActivityItem: React.FC<{ item: RecentActivityItem }> = ({ item }) => {
  const getIcon = () => {
    switch (item.type) {
      case 'payment':
        return <Euro className="h-4 w-4 text-green-600" />;
      case 'contract':
        return <Building2 className="h-4 w-4 text-blue-600" />;
      case 'maintenance':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="flex items-center space-x-3 py-3">
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
        <p className="text-sm text-gray-500 truncate">{item.description}</p>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-900">{item.date}</p>
        {item.amount && (
          <p className="text-sm font-medium text-green-600">
            +{item.amount.toLocaleString()}€
          </p>
        )}
      </div>
    </div>
  );
};

const DashboardPage: React.FC = () => {
  const { data: proprietaires } = useQuery('proprietaires', () =>
    proprietairesService.getAll({ page: 1, limit: 1000 })
  );

  const { data: biens } = useQuery('biens', () =>
    biensService.getAll({ page: 1, limit: 1000 })
  );

  const { data: locataires } = useQuery('locataires', () =>
    locatairesService.getAll({ page: 1, limit: 1000 })
  );

  const { data: loyersStats } = useQuery('loyersStats', () =>
    loyersService.getStats()
  );

  // Mock data for recent activities
  const recentActivities: RecentActivityItem[] = [
    {
      id: '1',
      type: 'payment',
      title: 'Paiement loyer reçu',
      description: 'Appartement 15 rue de la Paix - Dupont',
      date: '28/07/2025',
      amount: 850,
    },
    {
      id: '2',
      type: 'contract',
      title: 'Nouveau contrat signé',
      description: 'Maison 42 avenue Victor Hugo - Martin',
      date: '27/07/2025',
    },
    {
      id: '3',
      type: 'maintenance',
      title: 'Demande de maintenance',
      description: 'Fuite dans la salle de bain - Appartement 8',
      date: '26/07/2025',
    },
  ];

  const totalProprietaires = proprietaires?.data?.length || 0;
  const totalBiens = biens?.data?.length || 0;
  const totalLocataires = locataires?.data?.length || 0;
  const totalRevenue = loyersStats?.revenus?.annee || 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Vue d'ensemble de votre activité locative
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Propriétaires"
          value={totalProprietaires}
          icon={Users}
          color="bg-blue-500"
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Biens immobiliers"
          value={totalBiens}
          icon={Home}
          color="bg-green-500"
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Locataires actifs"
          value={totalLocataires}
          icon={Building2}
          color="bg-purple-500"
          trend={{ value: 5, isPositive: false }}
        />
        <StatsCard
          title="Revenus mensuels"
          value={`${totalRevenue.toLocaleString()}€`}
          icon={Euro}
          color="bg-orange-500"
          trend={{ value: 15, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Activité récente
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-1">
                {recentActivities.map((activity) => (
                  <ActivityItem key={activity.id} item={activity} />
                ))}
              </div>
              <div className="mt-6">
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  Voir toute l'activité →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-6">
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Actions rapides
              </h2>
            </div>
            <div className="p-6 space-y-3">
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    Ajouter un propriétaire
                  </span>
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <Home className="h-5 w-5 text-green-600" />
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    Enregistrer un bien
                  </span>
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <Euro className="h-5 w-5 text-orange-600" />
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    Saisir un loyer
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Urgent tasks */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Tâches urgentes
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-900">
                      {loyersStats?.totaux?.enRetard || 0} loyers en retard
                    </p>
                    <p className="text-xs text-red-700">
                      Relances à envoyer
                    </p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-900">
                      2 contrats expirent bientôt
                    </p>
                    <p className="text-xs text-yellow-700">
                      Renouvellements à prévoir
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;