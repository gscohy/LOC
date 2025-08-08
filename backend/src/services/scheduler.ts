import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

interface ScheduledTask {
  name: string;
  lastRun?: Date;
  nextRun: Date;
  interval: number; // en millisecondes
  handler: () => Promise<void>;
}

class TaskScheduler {
  private tasks: ScheduledTask[] = [];
  private running = false;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.initializeTasks();
  }

  private initializeTasks() {
    // Tâche de génération des loyers - s'exécute chaque jour à 9h
    this.addTask({
      name: 'generation-loyers-automatique',
      nextRun: this.getNextRunTime(9, 0), // 9h00 chaque jour
      interval: 24 * 60 * 60 * 1000, // 24 heures
      handler: this.generateMissingRents.bind(this)
    });

    // Tâche de recalcul des statuts - s'exécute chaque jour à 8h
    this.addTask({
      name: 'recalcul-statuts-loyers',
      nextRun: this.getNextRunTime(8, 0), // 8h00 chaque jour
      interval: 24 * 60 * 60 * 1000, // 24 heures
      handler: this.recalculateRentStatuses.bind(this)
    });
  }

  private getNextRunTime(hour: number, minute: number): Date {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(hour, minute, 0, 0);

    // Si l'heure est déjà passée aujourd'hui, programmer pour demain
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
  }

  addTask(task: Omit<ScheduledTask, 'lastRun'>) {
    this.tasks.push({
      ...task,
      lastRun: undefined
    });
    logger.info(`Tâche planifiée ajoutée: ${task.name} - prochaine exécution: ${task.nextRun}`);
  }

  start() {
    if (this.running) {
      logger.warn('Le planificateur de tâches est déjà en cours d\'exécution');
      return;
    }

    this.running = true;
    logger.info('Démarrage du planificateur de tâches');

    // Vérifier les tâches toutes les minutes
    this.intervalId = setInterval(() => {
      this.checkAndRunTasks();
    }, 60 * 1000); // 1 minute

    // Exécution immédiate pour vérifier les tâches en attente
    this.checkAndRunTasks();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.running = false;
    logger.info('Arrêt du planificateur de tâches');
  }

  private async checkAndRunTasks() {
    const now = new Date();

    for (const task of this.tasks) {
      if (now >= task.nextRun) {
        try {
          logger.info(`Exécution de la tâche: ${task.name}`);
          await task.handler();
          
          // Mettre à jour les timestamps
          task.lastRun = now;
          task.nextRun = new Date(now.getTime() + task.interval);
          
          logger.info(`Tâche ${task.name} terminée avec succès. Prochaine exécution: ${task.nextRun}`);
        } catch (error) {
          logger.error(`Erreur lors de l'exécution de la tâche ${task.name}:`, error);
          
          // Reprogrammer la tâche dans 1 heure en cas d'erreur
          task.nextRun = new Date(now.getTime() + 60 * 60 * 1000);
          logger.info(`Tâche ${task.name} reprogrammée après erreur: ${task.nextRun}`);
        }
      }
    }
  }

  // Gestionnaire de tâche pour la génération automatique des loyers
  private async generateMissingRents(): Promise<void> {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const currentDay = currentDate.getDate();

    logger.info(`Vérification génération automatique des loyers - ${currentDate.toISOString()}`);

    const results = {
      loyersCrees: [],
      contratsTraites: 0,
      contratsActifsTotal: 0,
      erreurs: []
    };

    await prisma.$transaction(async (tx) => {
      // Récupérer tous les contrats actifs
      const contratsActifs = await tx.contrat.findMany({
        where: {
          statut: 'ACTIF',
          dateDebut: {
            lte: currentDate
          },
          OR: [
            { dateFin: null },
            { dateFin: { gte: currentDate } }
          ]
        },
        include: {
          bien: {
            select: {
              id: true,
              adresse: true,
              ville: true
            }
          },
          locataires: {
            include: {
              locataire: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true,
                  email: true
                }
              }
            }
          },
          loyers: {
            where: {
              mois: currentMonth,
              annee: currentYear
            }
          }
        }
      });

      results.contratsActifsTotal = contratsActifs.length;

      for (const contrat of contratsActifs) {
        try {
          results.contratsTraites++;

          // Vérifier si le jour de paiement est déjà passé
          const jourPaiementPasse = currentDay >= contrat.jourPaiement;
          
          // Vérifier si un loyer existe déjà pour ce mois
          const loyerExiste = contrat.loyers.length > 0;

          if (jourPaiementPasse && !loyerExiste) {
            // Calculer la date d'échéance (jour de paiement du mois courant)
            const dateEcheance = new Date(currentYear, currentMonth - 1, contrat.jourPaiement);

            // Créer le loyer manquant
            const nouveauLoyer = await tx.loyer.create({
              data: {
                contratId: contrat.id,
                mois: currentMonth,
                annee: currentYear,
                montantDu: contrat.loyer + contrat.chargesMensuelles,
                montantPaye: 0,
                dateEcheance: dateEcheance,
                statut: 'EN_ATTENTE',
                commentaires: `Loyer généré automatiquement par le scheduler le ${currentDate.toISOString()}`
              }
            });

            results.loyersCrees.push({
              loyerId: nouveauLoyer.id,
              contratId: contrat.id,
              mois: currentMonth,
              annee: currentYear,
              montantDu: nouveauLoyer.montantDu,
              dateEcheance: dateEcheance,
              adresse: contrat.bien.adresse,
              locataires: contrat.locataires.map(cl => 
                `${cl.locataire.prenom} ${cl.locataire.nom}`
              ).join(', ')
            });

            logger.info(`Loyer créé automatiquement: ${contrat.bien.adresse} - ${nouveauLoyer.montantDu}€`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          results.erreurs.push({
            contratId: contrat.id,
            adresse: contrat.bien.adresse,
            erreur: errorMessage
          });
          logger.error(`Erreur création loyer pour contrat ${contrat.id}:`, error);
        }
      }
    });

    if (results.loyersCrees.length > 0) {
      logger.info(`✅ ${results.loyersCrees.length} loyers créés automatiquement sur ${results.contratsActifsTotal} contrats actifs`);
    } else {
      logger.info(`ℹ️ Aucun loyer à créer (${results.contratsActifsTotal} contrats vérifiés)`);
    }

    if (results.erreurs.length > 0) {
      logger.warn(`⚠️ ${results.erreurs.length} erreurs lors de la génération automatique`);
    }
  }

  // Gestionnaire de tâche pour le recalcul des statuts
  private async recalculateRentStatuses(): Promise<void> {
    logger.info('Recalcul automatique des statuts des loyers');

    let updatesCount = 0;

    await prisma.$transaction(async (tx) => {
      // Récupérer tous les loyers avec leurs contrats
      const loyers = await tx.loyer.findMany({
        include: {
          contrat: {
            select: { jourPaiement: true }
          }
        }
      });

      for (const loyer of loyers) {
        const nouveauStatut = this.calculateLoyerStatut(
          loyer.montantDu,
          loyer.montantPaye,
          loyer.mois,
          loyer.annee,
          loyer.contrat.jourPaiement
        );

        // Ne mettre à jour que si le statut a changé
        if (nouveauStatut !== loyer.statut) {
          await tx.loyer.update({
            where: { id: loyer.id },
            data: { statut: nouveauStatut }
          });
          
          updatesCount++;
          logger.info(`Statut mis à jour pour loyer ${loyer.id}: ${loyer.statut} -> ${nouveauStatut}`);
        }
      }
    });

    logger.info(`✅ Recalcul des statuts terminé: ${updatesCount} loyers mis à jour`);
  }

  // Fonction utilitaire pour calculer le statut d'un loyer
  private calculateLoyerStatut(
    montantDu: number, 
    montantPaye: number, 
    mois: number, 
    annee: number, 
    jourPaiement: number
  ): string {
    // Si complètement payé
    if (montantPaye >= montantDu) {
      return 'PAYE';
    }
    
    // Calculer la date limite de paiement pour ce mois
    const dateLimitePaiement = new Date(annee, mois - 1, jourPaiement);
    const maintenant = new Date();
    
    // Si la date limite est dépassée
    if (maintenant > dateLimitePaiement) {
      return montantPaye > 0 ? 'PARTIEL' : 'RETARD';
    }
    
    // Sinon, c'est en attente (même si partiellement payé)
    return montantPaye > 0 ? 'PARTIEL' : 'EN_ATTENTE';
  }

  // Obtenir le statut des tâches
  getTasksStatus() {
    return this.tasks.map(task => ({
      name: task.name,
      lastRun: task.lastRun,
      nextRun: task.nextRun,
      running: this.running
    }));
  }

  // Forcer l'exécution d'une tâche
  async forceRunTask(taskName: string): Promise<void> {
    const task = this.tasks.find(t => t.name === taskName);
    if (!task) {
      throw new Error(`Tâche non trouvée: ${taskName}`);
    }

    logger.info(`Exécution forcée de la tâche: ${taskName}`);
    await task.handler();
    
    task.lastRun = new Date();
    task.nextRun = new Date(Date.now() + task.interval);
    
    logger.info(`Tâche ${taskName} exécutée avec succès`);
  }
}

export const taskScheduler = new TaskScheduler();