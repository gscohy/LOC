import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import toast from 'react-hot-toast';
import {
  Clock,
  Settings,
  Play,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Activity,
  Zap,
  Home,
} from 'lucide-react';

import { schedulerService } from '@/services/scheduler';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface TaskCardProps {
  task: any;
  onRunTask: (taskName: string) => void;
  loading?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onRunTask, loading = false }) => {
  const isOverdue = task.nextRun && new Date(task.nextRun) < new Date();
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="text-2xl mr-3">
            {schedulerService.getTaskIcon(task.name)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {schedulerService.formatTaskName(task.name)}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {schedulerService.getTaskDescription(task.name)}
            </p>
          </div>
        </div>
        <Badge variant={task.running ? 'success' : 'gray'}>
          {task.running ? 'Actif' : 'Arrêté'}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Dernière exécution:
          </span>
          <span className="font-medium">
            {task.lastRun ? schedulerService.formatDate(task.lastRun) : 'Jamais'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Prochaine exécution:
          </span>
          <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
            {schedulerService.formatDate(task.nextRun)}
            {isOverdue && (
              <AlertTriangle className="h-4 w-4 ml-1 inline text-red-500" />
            )}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRunTask(task.name)}
          loading={loading}
          disabled={!task.running}
          className="w-full flex items-center justify-center"
        >
          <Play className="h-4 w-4 mr-2" />
          Exécuter maintenant
        </Button>
      </div>
    </div>
  );
};

interface ActionCardProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  buttonText: string;
  buttonColor?: string;
  onAction: () => void;
  loading?: boolean;
}

const ActionCard: React.FC<ActionCardProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  buttonText, 
  buttonColor = 'primary',
  onAction,
  loading = false 
}) => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-start mb-4">
      <div className="flex-shrink-0 p-3 bg-blue-50 rounded-lg mr-4">
        <Icon className="h-6 w-6 text-blue-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
    </div>
    <Button
      variant={buttonColor === 'primary' ? 'primary' : 'outline'}
      onClick={onAction}
      loading={loading}
      className="w-full"
    >
      {buttonText}
    </Button>
  </div>
);

const SchedulerPage: React.FC = () => {
  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  const { 
    data: schedulerStatus, 
    isLoading, 
    refetch,
    error 
  } = useQuery(
    'scheduler-status',
    schedulerService.getStatus,
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const runTaskMutation = useMutation(schedulerService.runTask, {
    onSuccess: (data) => {
      toast.success(`Tâche ${schedulerService.formatTaskName(data.taskName)} exécutée avec succès`);
      refetch();
      setRunningTask(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de l\'exécution');
      setRunningTask(null);
    },
  });

  const generateRentsMutation = useMutation(schedulerService.generateMissingRents, {
    onSuccess: (data) => {
      if (data.loyersCrees.length > 0) {
        toast.success(`${data.loyersCrees.length} loyers créés avec succès`);
      } else {
        toast.info('Aucun loyer à créer pour le moment');
      }
      refetch();
      setRunningAction(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la génération');
      setRunningAction(null);
    },
  });

  const recalculateStatusesMutation = useMutation(schedulerService.recalculateStatuses, {
    onSuccess: (data) => {
      toast.success(`${data.updates.length} statuts mis à jour`);
      refetch();
      setRunningAction(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors du recalcul');
      setRunningAction(null);
    },
  });

  const handleRunTask = (taskName: string) => {
    setRunningTask(taskName);
    runTaskMutation.mutate(taskName);
  };

  const handleGenerateRents = () => {
    setRunningAction('generate');
    generateRentsMutation.mutate();
  };

  const handleRecalculateStatuses = () => {
    setRunningAction('recalculate');
    recalculateStatusesMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
            <Settings className="h-6 w-6 mr-3 text-blue-500" />
            Planificateur de tâches
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez et surveillez les tâches automatisées du système
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          {schedulerStatus && (
            <Badge variant={schedulerStatus.schedulerRunning ? 'success' : 'danger'}>
              <Activity className="h-3 w-3 mr-1" />
              {schedulerStatus.schedulerRunning ? 'En fonctionnement' : 'Arrêté'}
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Erreur de connexion au planificateur
              </h3>
              <p className="mt-2 text-sm text-red-700">
                Impossible de récupérer le statut des tâches planifiées.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Chargement du statut...</span>
        </div>
      ) : schedulerStatus ? (
        <>
          {/* Statut global */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-blue-500 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-blue-900">
                  Statut du système automatisé
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Dernière vérification: {schedulerService.formatDate(schedulerStatus.currentTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Tâches planifiées */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Tâches automatisées
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {schedulerStatus.tasks.map((task) => (
                <TaskCard
                  key={task.name}
                  task={task}
                  onRunTask={handleRunTask}
                  loading={runningTask === task.name}
                />
              ))}
            </div>
          </div>

          {/* Actions manuelles */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Actions manuelles
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActionCard
                icon={Home}
                title="Générer les loyers manquants"
                description="Force la création des loyers pour tous les contrats actifs dont la date de paiement est passée"
                buttonText="Générer maintenant"
                onAction={handleGenerateRents}
                loading={runningAction === 'generate'}
              />
              <ActionCard
                icon={RefreshCw}
                title="Recalculer les statuts"
                description="Met à jour les statuts de tous les loyers selon les règles de gestion (retard, partiel, payé...)"
                buttonText="Recalculer maintenant"
                buttonColor="outline"
                onAction={handleRecalculateStatuses}
                loading={runningAction === 'recalculate'}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default SchedulerPage;