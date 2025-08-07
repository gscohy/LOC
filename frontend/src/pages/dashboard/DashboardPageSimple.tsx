import React from 'react';
import {
  Building2,
  Users,
  Home,
  Euro,
} from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color: string;
}

const StatsCard: React.FC<StatsCardProps> = (({
  title,
  value,
  icon: Icon,
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
      </div>
    </div>
  </div>
));

const DashboardPageSimple: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Tableau de bord - Version Test
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Vue d'ensemble de votre activité locative (version simplifiée)
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Propriétaires"
          value="--"
          icon={Users}
          color="bg-blue-500"
        />
        <StatsCard
          title="Biens immobiliers"
          value="--"
          icon={Home}
          color="bg-green-500"
        />
        <StatsCard
          title="Locataires actifs"
          value="--"
          icon={Building2}
          color="bg-purple-500"
        />
        <StatsCard
          title="Revenus mensuels"
          value="--€"
          icon={Euro}
          color="bg-orange-500"
        />
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Statut du système
        </h2>
        <p>✅ Frontend accessible</p>
        <p>✅ Backend accessible</p>
        <p>✅ Base de données connectée</p>
        <p>✅ Utilisateur créé : admin@gestion-locative.fr</p>
      </div>
    </div>
  );
};

export default DashboardPageSimple;