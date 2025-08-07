import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Home,
  Euro,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import SimpleChart from '@/components/dashboard/SimpleChart';
import FinancialTable from '@/components/dashboard/FinancialTable';
import { dashboardService } from '@/services/dashboard';
import { proprietairesService } from '@/services/proprietaires';
import { biensService } from '@/services/biens';
import { locatairesService } from '@/services/locataires';

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
  <div className="card p-6 hover:shadow-lg transition-shadow">
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

const EnhancedDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartView, setChartView] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');

  const handleViewLoyersEnRetard = () => {
    navigate('/loyers?filter=en-retard');
  };

  const handleTraiterCharges = () => {
    navigate('/charges?filter=non-payees');
  };

  // Utiliser le nouveau service dashboard qui récupère tout
  const { data: dashboardStats, isLoading } = useQuery(
    ['dashboard-stats', selectedYear], 
    () => dashboardService.getStats(selectedYear),
    {
      staleTime: 30 * 1000, // Cache 30 secondes
      refetchOnWindowFocus: false
    }
  );

  // Récupérer le nombre de propriétaires
  const { data: proprietairesData } = useQuery(
    'proprietaires-count',
    () => proprietairesService.getAll({ limit: 1000 }),
    {
      staleTime: 60 * 1000, // Cache 60 secondes
      refetchOnWindowFocus: false
    }
  );

  // Préparer les données pour les graphiques
  const chartData = dashboardStats ? dashboardService.prepareChartData(dashboardStats, selectedYear) : [];
  
  const preparePieData = () => {
    if (!dashboardStats?.charges) return [];
    
    // Créer des données de répartition basées sur les charges réelles
    const totalCharges = dashboardStats.charges.total.montant;
    if (totalCharges === 0) return [];
    
    return [
      { name: 'Charges payées', value: dashboardStats.charges.payees.montant },
      { name: 'Charges non payées', value: dashboardStats.charges.nonPayees.montant }
    ];
  };

  const pieData = preparePieData();

  const totalProprietaires = proprietairesData?.data?.length || 0;
  const totalBiens = dashboardStats?.biens.total || 0;
  const totalLocataires = dashboardStats?.locataires.total || 0;
  
  // Calculer les totaux seulement jusqu'au mois en cours
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const maxMonth = selectedYear === currentYear ? currentMonth : 12;
  
  // Revenus jusqu'au mois en cours (avec déduplication intelligente)
  const loyersParMois = new Map();
  dashboardStats?.loyers.revenus.parMois
    ?.filter(m => m.mois <= maxMonth)
    ?.forEach(m => {
      const mois = m.mois;
      const montantPaye = m._sum.montantPaye || 0;
      
      // Si le mois existe déjà, garder le PREMIER montant trouvé (généralement le plus fiable)
      if (!loyersParMois.has(mois)) {
        loyersParMois.set(mois, montantPaye);
      }
      // Ignorer les doublons
    });
  
  const totalRevenue = Array.from(loyersParMois.values()).reduce((sum, montant) => sum + montant, 0);
  
  // Charges jusqu'au mois en cours
  const totalCharges = dashboardStats?.charges.parMois
    ?.filter(m => {
      const [, month] = m.mois.split('-');
      return parseInt(month) <= maxMonth;
    })
    ?.reduce((sum, m) => sum + m.total, 0) || 0;
    
  const beneficeNet = totalRevenue - totalCharges;
  
  // Debug pour comprendre les montants
  console.log('🔍 Dashboard Debug:', {
    selectedYear,
    currentMonth,
    maxMonth,
    totalRevenue,
    totalCharges,
    beneficeNet,
    loyersParMois: dashboardStats?.loyers.revenus.parMois,
    chargesParMois: dashboardStats?.charges.parMois
  });
  
  // Debug détaillé des revenus
  if (dashboardStats?.loyers.revenus.parMois) {
    console.log('💰 Détail revenus par mois (AVANT déduplication):');
    dashboardStats.loyers.revenus.parMois
      .filter(m => m.mois <= maxMonth)
      .forEach(m => {
        console.log(`Mois ${m.mois}: Payé=${m._sum.montantPaye}€, Dû=${m._sum.montantDu}€`);
      });
    
    console.log('💰 Détail revenus par mois (APRÈS déduplication):');
    loyersParMois.forEach((montant, mois) => {
      console.log(`Mois ${mois}: Payé=${montant}€`);
    });
    
    console.log(`💰 Total calculé: ${totalRevenue}€ (devrait être 4095€)`);
  }

  const yearOptions = Array.from({length: 5}, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Tableau de Bord Financier
          </h1>
          <p className="mt-1 text-lg text-gray-600">
            Analyse complète de votre activité locative
          </p>
        </div>
        <div className="flex space-x-3">
          <Select
            value={selectedYear.toString()}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            options={yearOptions}
            className="w-32"
          />
          <Button variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard
          title="Propriétaires"
          value={totalProprietaires}
          icon={Users}
          color="bg-blue-500"
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Biens"
          value={totalBiens}
          icon={Home}
          color="bg-green-500"
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Locataires"
          value={totalLocataires}
          icon={Building2}
          color="bg-purple-500"
          trend={{ value: 5, isPositive: false }}
        />
        <StatsCard
          title="Revenus"
          value={`${totalRevenue.toLocaleString()}€`}
          icon={Euro}
          color="bg-emerald-500"
        />
        <StatsCard
          title="Bénéfice Net"
          value={`${beneficeNet.toLocaleString()}€`}
          icon={TrendingUp}
          color={beneficeNet >= 0 ? "bg-green-600" : "bg-red-500"}
          trend={{ value: 22, isPositive: beneficeNet >= 0 }}
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleChart
          data={chartData}
          type="bar"
          title="Revenus vs Charges par Mois"
          height={350}
        />
        <SimpleChart
          data={chartData}
          type="line"
          title="Évolution du Bénéfice"
          height={350}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Répartition des Charges</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {pieData.map((item, index) => {
                  const total = pieData.reduce((sum, d) => sum + d.value, 0);
                  const percentage = total > 0 ? (item.value / total) * 100 : 0;
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded ${colors[index % colors.length]}`}></div>
                        <span className="text-sm text-gray-700">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{percentage.toFixed(1)}%</div>
                        <div className="text-xs text-gray-500">{item.value.toLocaleString()}€</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {pieData.length === 0 && (
                <p className="text-center text-gray-500 py-8">Aucune donnée disponible</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2">
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                Alertes et Tâches Prioritaires
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-red-900">
                      {dashboardStats?.loyers.totaux.enRetard || 0} loyers en retard
                    </p>
                    <p className="text-xs text-red-700">
                      + {dashboardStats?.loyers.totaux.enAttente || 0} en attente
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-red-700 border-red-300"
                    onClick={handleViewLoyersEnRetard}
                  >
                    Voir détails
                  </Button>
                </div>
                
                <div className="flex items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Calendar className="h-5 w-5 text-yellow-600" />
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-yellow-900">
                      {dashboardStats?.charges.nonPayees.nombre || 0} charges non payées
                    </p>
                    <p className="text-xs text-yellow-700">
                      Montant: {dashboardStats?.charges.nonPayees.montant?.toLocaleString() || 0}€
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-yellow-700 border-yellow-300"
                    onClick={handleTraiterCharges}
                  >
                    Traiter
                  </Button>
                </div>

                <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      Taux de rentabilité: {totalRevenue > 0 ? ((beneficeNet / totalRevenue) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-xs text-blue-700">
                      Objectif: 85% - {totalRevenue > 0 && ((beneficeNet / totalRevenue) * 100) >= 85 ? 'Atteint' : 'À améliorer'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau financier détaillé */}
      <FinancialTable year={selectedYear} />

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Button className="h-16 flex flex-col items-center justify-center">
          <Users className="h-6 w-6 mb-1" />
          <span className="text-sm">Nouveau propriétaire</span>
        </Button>
        <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
          <Home className="h-6 w-6 mb-1" />
          <span className="text-sm">Ajouter un bien</span>
        </Button>
        <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
          <Euro className="h-6 w-6 mb-1" />
          <span className="text-sm">Saisir loyer</span>
        </Button>
        <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
          <BarChart3 className="h-6 w-6 mb-1" />
          <span className="text-sm">Nouvelle charge</span>
        </Button>
      </div>
    </div>
  );
};

export default EnhancedDashboard;