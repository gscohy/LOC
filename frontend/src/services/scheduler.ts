import { api } from '../lib/api';

export interface SchedulerTask {
  name: string;
  lastRun?: string;
  nextRun: string;
  running: boolean;
}

export interface SchedulerStatus {
  schedulerRunning: boolean;
  tasks: SchedulerTask[];
  currentTime: string;
}

export const schedulerService = {
  // Récupérer le statut du scheduler
  async getStatus(): Promise<SchedulerStatus> {
    const response = await api.get('/scheduler/status');
    return response.data.data;
  },

  // Forcer l'exécution d'une tâche
  async runTask(taskName: string): Promise<{ taskName: string; executionTime: string }> {
    const response = await api.post(`/scheduler/run-task/${taskName}`);
    return response.data.data;
  },

  // Générer manuellement les loyers manquants
  async generateMissingRents(): Promise<{
    loyersCrees: any[];
    contratsTraites: number;
    contratsActifsTotal: number;
    erreurs: any[];
  }> {
    const response = await api.post('/loyers/generer-loyers-manquants');
    return response.data.data;
  },

  // Recalculer les statuts des loyers
  async recalculateStatuses(): Promise<{ updates: any[] }> {
    const response = await api.post('/loyers/recalculate-statuts');
    return response.data.data;
  },

  // Utilitaires de formatage
  formatTaskName(taskName: string): string {
    const taskLabels: { [key: string]: string } = {
      'generation-loyers-automatique': 'Génération automatique des loyers',
      'recalcul-statuts-loyers': 'Recalcul des statuts des loyers'
    };
    
    return taskLabels[taskName] || taskName;
  },

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  getTaskDescription(taskName: string): string {
    const descriptions: { [key: string]: string } = {
      'generation-loyers-automatique': 'Vérifie chaque jour à 9h si des loyers doivent être créés pour les contrats dont le jour de paiement est passé',
      'recalcul-statuts-loyers': 'Met à jour quotidiennement à 8h les statuts des loyers (EN_ATTENTE, RETARD, PARTIEL, PAYE)'
    };
    
    return descriptions[taskName] || 'Tâche automatisée du système';
  },

  getTaskIcon(taskName: string): string {
    const icons: { [key: string]: string } = {
      'generation-loyers-automatique': '🏠',
      'recalcul-statuts-loyers': '🔄'
    };
    
    return icons[taskName] || '⚙️';
  }
};