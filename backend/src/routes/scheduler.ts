import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { taskScheduler } from '../services/scheduler.js';

const router = express.Router();

// @route   GET /api/scheduler/status
// @desc    Get scheduler status and tasks
// @access  Private
router.get('/status', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tasksStatus = taskScheduler.getTasksStatus();
  
  res.json({
    success: true,
    data: {
      schedulerRunning: tasksStatus.length > 0 ? tasksStatus[0].running : false,
      tasks: tasksStatus,
      currentTime: new Date().toISOString()
    }
  });
}));

// @route   POST /api/scheduler/run-task/:taskName
// @desc    Force run a specific task
// @access  Private
router.post('/run-task/:taskName', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { taskName } = req.params;
  
  try {
    await taskScheduler.forceRunTask(taskName);
    
    res.json({
      success: true,
      message: `Tâche ${taskName} exécutée avec succès`,
      data: {
        taskName,
        executionTime: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur lors de l\'exécution de la tâche'
    });
  }
}));

export default router;